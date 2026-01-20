chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_JOB_BASIC_INFO") {
        // 1. Extract Role and Link (Same robust logic)
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
    
    if (request.action === "GET_JOB_DESCRIPTION") {
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
                // Clone to modify without affecting the page
                const clone = el.cloneNode(true);
                
                // Replace <br> with newline
                clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
                
                // Handle list items to look like Markdown bullets
                clone.querySelectorAll('li').forEach(li => {
                    const bullet = document.createTextNode("- ");
                    li.prepend(bullet);
                });
                
                // Get text. innerText handles block elements by adding newlines.
                description = clone.innerText.trim();
                break;
            }
        }

        sendResponse({
            description: description
        });
    }
    return true;
});