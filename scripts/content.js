chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_JOB_INFO") {
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
    return true;
});