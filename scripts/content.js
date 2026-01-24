chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_JOB_BASIC_INFO") {
        getJobBasicInfo(sendResponse);
        return true;
    }
    if (request.action === "GET_JOB_DESCRIPTION") {
        getJobDescription(sendResponse);
        return true;
    }
    if (request.action === "FETCH_PARSE_JD") {
        fetchAndParseJD(request.url).then(text => sendResponse({ text }));
        return true;
    }
    return true;
});

async function fetchAndParseJD(url) {
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
        console.error("JD Parse Error", e);
        return null;
    }
}

function getJobBasicInfo(sendResponse) {
    const roleAnchor = document.querySelector('.job-details-jobs-unified-top-card__job-title a');
    const roleName = roleAnchor ? roleAnchor.innerText.trim() : "Not Found";
    let jobLink = "Not Found";
    if (roleAnchor) {
        const path = roleAnchor.getAttribute('href').split('?')[0];
        jobLink = path.startsWith('http') ? path : `https://www.linkedin.com${path}`;
    }

    // 2. Extract Company
    const companyAnchor = document.querySelector('.job-details-jobs-unified-top-card__company-name a');
    const companyName = companyAnchor ? companyAnchor.innerText.trim() : "Not Found";

    // 3. Precise Location Extraction
    // We target the FIRST span with the specific LinkedIn emphasis class
    const locElement = document.querySelector(
        '.job-details-jobs-unified-top-card__primary-description-container span.tvm__text--low-emphasis');
    const jobLocation = locElement ? locElement.innerText.trim() : "Not Found";

    sendResponse({
        role: roleName,
        company: companyName,
        location: jobLocation, // e.g., "Tokyo, Tokyo, Japan" or "Central, Hong Kong SAR"
        link: jobLink
    });
}

function getJobDescription(sendResponse) {
    const description = extractDescription();
    sendResponse({
        description: description
    });
}

function extractDescription() {
    // 4. Extract Description
    // Try multiple selectors for better coverage
    const descriptionSelectors = [
        '#job-details',
        '.jobs-description__content',
        '.job-view-layout .description'
    ];

    let description = "Not Found";
    for (const selector of descriptionSelectors) {
        const el = document.querySelector(selector);
        if (el) {
            description = htmlToMarkdown(el);
            break;
        }
    }
    return description;
}

/**
 * Converts an HTML element to Markdown.
 * Handles headings, paragraphs, lists, bold, italic, and links.
 */
function htmlToMarkdown(element) {
    if (!element) return "";

    // Clone to avoid modifying the live DOM
    const clone = element.cloneNode(true);

    // Remove unwanted elements that add noise
    const removables = clone.querySelectorAll('script, style, noscript, iframe, svg, button, input, [hidden], [aria-hidden="true"]');
    removables.forEach(el => el.remove());

    function convert(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            // Collapse all whitespace sequences (newlines, tabs, spaces) into a single space
            // This fixes the "weird indentation" issue
            return node.textContent.replace(/\s+/g, ' ');
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return "";

        const tag = node.tagName.toLowerCase();
        let content = "";

        // Recursively process children
        for (const child of node.childNodes) {
            content += convert(child);
        }

        // Clean up content for block elements
        // (Don't trim inline content to preserve spacing between words)

        switch (tag) {
            case 'h1': return `\n# ${content.trim()}\n\n`;
            case 'h2': return `\n## ${content.trim()}\n\n`;
            case 'h3': return `\n### ${content.trim()}\n\n`;
            case 'h4': return `\n#### ${content.trim()}\n\n`;
            case 'h5': return `\n##### ${content.trim()}\n\n`;

            case 'p':
                return `\n\n${content.trim()}\n\n`;

            case 'br':
                return '  \n'; // Markdown line break (2 spaces + newline)

            case 'div':
            case 'section':
            case 'article':
                // If the div is just a wrapper, return content.
                // If it acts as a block separator, ensure newlines.
                // Simple heuristic: if it has content, surround with newlines.
                if (!content.trim()) return "";
                return `\n${content}\n`;

            case 'ul':
            case 'ol':
                return `\n${content}\n`;

            case 'li':
                // Always use bullets for simplicity. 
                // Ensure content is trimmed so the bullet is close to text.
                return `\n- ${content.trim()}`;

            case 'b':
            case 'strong':
                // Check if content is empty
                if (!content.trim()) return "";
                return ` **${content.trim()}** `;

            case 'i':
            case 'em':
                if (!content.trim()) return "";
                return ` *${content.trim()}* `;

            case 'a':
                const href = node.getAttribute('href');
                if (!content.trim()) return "";
                return href ? `[${content.trim()}](${href})` : content;

            default:
                return content;
        }
    }

    let md = convert(clone);

    // Post-processing
    // 1. Remove lines that contain only whitespace (spaces/tabs)
    // This prevents "empty" lines with spaces from blocking the newline collapse
    md = md.replace(/^[ \t]+$/gm, '');
    // 2. Collapse multiple newlines (3 or more) into 2
    // This ensures at most one empty line between blocks
    md = md.replace(/\n{3,}/g, '\n\n');
    // 3. Fix potential spacing issues like "word ** bold**" -> "word **bold**"
    // (The simple recursion might leave extra spaces, which Markdown generally ignores, 
    // but let's clean up leading/trailing newlines)
    return md.trim();
}

function injectAITags(card, analysis) {
    // Remove loading indicator if it exists
    const loader = card.querySelector('.ai-loading-status');
    if (loader) loader.remove();

    const tagWrapper = document.createElement('div');
    tagWrapper.className = 'ai-tag-wrapper';

    const metrics = [
        { key: 'lang_match', label: 'Lang' },
        { key: 'visa_match', label: 'Visa' },
        { key: 'exp_match', label: 'Exp' }
    ];

    metrics.forEach(m => {
        const status = analysis[m.key] || 'neutral';
        const span = document.createElement('span');
        span.className = `ai-tag ai-tag-${status}`;
        span.innerText = m.label;
        tagWrapper.appendChild(span);
    });

    // Inject into the card's metadata area
    card.appendChild(tagWrapper);
}

function showLoading(card) {
    const loader = document.createElement('span');
    loader.className = 'ai-loading';
    loader.innerText = '[Loading...]';
    card.appendChild(loader);
}

function hideLoading(card) {
    const loader = card.querySelector('.ai-loading');
    if (loader) loader.remove();
}

// Function to scan the list for new, unprocessed jobs
const jobQueue = [];
let isProcessingQueue = false;

function scanJobCards() {
    const cards = document.querySelectorAll('.scaffold-layout__list-item:not(.ai-processed)');

    cards.forEach(card => {
        card.classList.add('ai-processed');

        // Extract the Job ID from the URL inside the card
        const linkElement = card.querySelector('a[href*="/jobs/view/"]');
        if (!linkElement) return;

        const href = linkElement.getAttribute('href');
        const jobIdMatch = href.match(/\/view\/(\d+)/);
        const jobId = jobIdMatch ? jobIdMatch[1] : null;

        if (jobId) {
            // Add a small loading indicator
            const loader = document.createElement('div');
            loader.className = 'ai-loading-status';
            loader.innerText = 'Queued...';
            card.appendChild(loader);

            jobQueue.push({ card, jobId, loader });
        }
    });

    processJobQueue();
}

async function processJobQueue() {
    if (isProcessingQueue || jobQueue.length === 0) return;
    isProcessingQueue = true;

    const { card, jobId, loader } = jobQueue.shift();
    loader.innerText = 'Clicking...';

    try {
        // 1. Click the card to load details
        // Find the clickable container (usually the title or the card itself)
        // a.job-card-list__title--link
        const clickTarget = card.querySelector('a.job-card-list__title--link') || card;
        
        // Scroll into view to ensure click works and mimics user
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Small delay after scroll
        await new Promise(r => setTimeout(r, 300));
        
        clickTarget.click();
        loader.innerText = 'Loading JD...';

        // 2. Wait for the right panel to load the specific Job ID
        const loaded = await waitForJobDetailsLoad(jobId);
        
        if (loaded) {
            loader.innerText = 'AI Analysing...';
            // 3. Extract Description
            const description = extractDescription();
            
            if (description && description.length > 50) {
                 // 4. Send to background
                 const result = await sendMessageAsync({ 
                     action: "ANALYZE_WITH_CONTENT", 
                     text: description 
                 });

                 if (result && !result.error) {
                     injectAITags(card, result);
                 } else {
                     loader.innerText = 'AI Failed';
                     loader.style.color = '#d93025';
                 }
            } else {
                 loader.innerText = 'No JD Text';
            }
        } else {
            loader.innerText = 'Load Timeout';
        }

    } catch (e) {
        console.error("Job Processing Error", e);
        loader.innerText = 'Error';
    }

    // Process next with a delay to allow UI to settle
    setTimeout(() => {
        isProcessingQueue = false;
        processJobQueue();
    }, 1500);
}

function sendMessageAsync(msg) {
    return new Promise(resolve => {
        chrome.runtime.sendMessage(msg, response => {
            resolve(response);
        });
    });
}

function waitForJobDetailsLoad(jobId) {
    return new Promise(resolve => {
        let checks = 0;
        const interval = setInterval(() => {
            checks++;
            // Check URL param
            const params = new URLSearchParams(window.location.search);
            const currentId = params.get('currentJobId');
            
            if (currentId === jobId) {
                // Wait a tiny bit more for text to render
                setTimeout(() => {
                    clearInterval(interval);
                    resolve(true);
                }, 500);
                return;
            }

            // Timeout after 5 seconds
            if (checks > 50) {
                clearInterval(interval);
                resolve(false);
            }
        }, 100);
    });
}

// Performance-optimized observer
// Trailing Edge Debounce: delays execution until 500ms of silence.
let timeout = null;
const observer = new MutationObserver(() => {
    if (timeout) 
        clearTimeout(timeout);
    timeout = setTimeout(scanJobCards, 500);
});

// Start observing the job list container
observer.observe(document.body, { childList: true, subtree: true });
// Initial scan for jobs already on the page
scanJobCards();