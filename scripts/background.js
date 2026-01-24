chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "SAVE_DATA") {
        // Retrieve user settings from storage
        return handleGoogleSheets(request, sender, sendResponse);
    }
    if (request.action === "ANALYZE_JD") {
        return handleAnalyzeJD(request, sender, sendResponse);
    }
    return true;
});

function handleAnalyzeJD(request, sender, sendResponse) {
    queue.push({ 
        jobId: request.jobId, 
        sendResponse,
        tabId: sender.tab.id // Capture tab ID for callback
    });
    processQueue();
    return true;
}

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

let isProcessing = false;
const queue = [];

async function processQueue() {
    if (isProcessing || queue.length === 0) return;
    isProcessing = true;

    const { jobId, sendResponse, tabId } = queue.shift();
    const url = `https://www.linkedin.com/jobs/view/${jobId}/`;

    // 1. Ask content script to fetch and parse JD
    try {
        chrome.tabs.sendMessage(tabId, { action: "FETCH_PARSE_JD", url }, async (response) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                sendResponse({ error: "Tab closed or error" });
                next();
                return;
            }

            if (response && response.text) {
                // 2. Analyze with Qwen
                const result = await handleAIAnalysis(response.text);
                sendResponse(result);
            } else {
                sendResponse({ error: "Could not fetch JD" });
            }
            next();
        });
    } catch (e) {
        console.error("Message sending failed", e);
        sendResponse({ error: "Communication Error" });
        next();
    }

    function next() {
        // 3. Wait 1.5 seconds before next job to avoid detection
        setTimeout(() => {
            isProcessing = false;
            processQueue();
        }, 1500);
    }
}

const QWEN_ENDPOINT = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const model_name = "qwen-flash";

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

        If the given content is not a proper JD, 
        return an empty JSON object.

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
                model: model_name,
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

