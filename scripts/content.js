chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_JOB_BASIC_INFO") {
        getJobBasicInfo();
        return true;
    }
    if (request.action === "GET_JOB_DESCRIPTION") {
        getJobDescription();
        return true;
    }

    if (request.action == "")
    return true;
});

function getJobBasicInfo() {
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

function getJobDescription() {
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

    sendResponse({
        description: description
    });
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