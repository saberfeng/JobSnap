chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "SAVE_DATA") {
        // Retrieve user settings from storage
        return handleGoogleSheets(request, sender, sendResponse);
    }
    if (request.action === "ANALYZE_BATCH") {
        (async () => {
            const jdText = await fetchJD(request.jobId);
            if (!jdText) {
                sendResponse({ error: "Could not fetch JD" });
                return;
            }
            const analysis = await handleAIAnalysis(jdText); // Your Qwen logic
            sendResponse(analysis);
        })();
        return true;
    }
});

function handleGoogleSheets(request, sender, sendResponse) {
    // Retrieve user settings from storage
    chrome.storage.sync.get(['webAppUrl', 'secretToken'], (settings) => {
        if (!settings.webAppUrl) {
            sendResponse({ success: false, error: "No URL configured" });
            return;
        }

        fetch(settings.webAppUrl, {
            method: 'POST',
            body: JSON.stringify({
                ...request.data,
                secret: settings.secretToken // Send the token for validation
            })
        })
            .then(res => res.json())
            .then(result => sendResponse({ success: true, data: result }))
            .catch(err => sendResponse({ success: false, error: err.message }));
    });
    return true;
}


const QWEN_ENDPOINT = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";


async function handleAIAnalysis(jdText) {
    const settings = await chrome.storage.sync.get(['qwenUrl', 'qwenKey', 'userProfile']);
    // Use the stored URL, or fall back to the Qwen default if empty
    const apiUrl = settings.qwenUrl || QWEN_ENDPOINT;
    if (!settings.qwenKey) return { error: "Missing API Key" };

    const systemPrompt = `
        You are a recruiter. Analyze the JD against the user's status. 
        User Status: ${JSON.stringify(settings.userProfile)}
        
        Requirements to check:
        1. Language: Cantonese, Japanese, English, Mandarin.
        2. Visa: Check holding status vs JD requirement/support.
        3. Experience: Compare years.
        4. JD Language: Is it the expected language?

        Return ONLY a JSON object:
        {
        "lang_match": "positive" | "negative" | "neutral",
        "visa_match": "positive" | "negative" | "neutral",
        "exp_match": "positive" | "negative" | "neutral",
        "jd_lang_match": "positive" | "negative",
        "summary": "one short sentence"
        }`;
    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${settings.qwenKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "qwen-plus",
                messages: [
                    { role: "system", content: systemPrompt }, // System prompt from previous step
                    { role: "user", content: `JD: ${jdText}` }
                ],
                response_format: { type: "json_object" }
            })
        });
        const data = await response.json();
        return JSON.parse(data.choices[0].message.content);
    } catch (error) {
        return { error: "AI Fetch Error" };
    }
}


async function fetchJD(jobId) {
    const url = `https://www.linkedin.com/jobs/view/${jobId}/`;
    try {
        const response = await fetch(url);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Strategy 3: Find the "About the job" header and get its parent container's text
        const headers = Array.from(doc.querySelectorAll('h2, h3'));
        const aboutHeader = headers.find(h =>
            /about the job|job description|description/i.test(h.innerText)
        );

        if (aboutHeader) {
            // Typically, the content is in a sibling or a parent container
            // We'll take the parent container's text as a safe bet for full JD context
            return aboutHeader.parentElement.innerText;
        }

        // Fallback: If no header found, take the largest <article> or <main> text
        const mainContent = doc.querySelector('article') || doc.querySelector('main');
        return mainContent ? mainContent.innerText : null;
    } catch (e) {
        return null;
    }
}

let isProcessing = false;
const queue = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "ANALYZE_BATCH") {
        queue.push({ jobId: request.jobId, sendResponse });
        processQueue();
        return true; // Keep channel open
    }
});

async function processQueue() {
    if (isProcessing || queue.length === 0) return;
    isProcessing = true;

    const { jobId, sendResponse } = queue.shift();

    // 1. Fetch the JD
    const jdText = await fetchJD(jobId);

    if (jdText) {
        // 2. Analyze with Qwen
        const result = await handleAIAnalysis(jdText);
        sendResponse(result);
    } else {
        sendResponse({ error: "No JD found" });
    }

    // 3. Wait 1.5 seconds before next job to avoid detection
    setTimeout(() => {
        isProcessing = false;
        processQueue();
    }, 1500);
}