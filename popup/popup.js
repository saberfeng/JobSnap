document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // immediately get job info after popup is opened
    chrome.tabs.sendMessage(tab.id, { action: "GET_JOB_BASIC_INFO" }, (response) => {
        if (response) {
            const date = new Date().toLocaleDateString();
            // Split location logic (e.g., "Central, Hong Kong SAR")
            const parts = response.location.split(',').map(s => s.trim());
            const place = parts[0] || "";
            const state = parts.length > 1 ? parts[parts.length - 1] : parts[0];
            const status = "to apply";

            // Update the UI
            document.getElementById('view-company').textContent = response.company;
            document.getElementById('view-role').textContent = response.role;

            // Create Tab-Separated String for Google Sheets
            // Format: Company, Position, place, state, date, link
            const tsvRow = `${response.company}\t${response.role}\t${place}\t${status}\t${date}\t${response.link}`;

            const rowElement = document.getElementById('sheet-row');
            rowElement.textContent = tsvRow;

            // Immediate save to pasteboard
            navigator.clipboard.writeText(tsvRow).then(() => {
                document.getElementById('status-msg').textContent = "Copied to clipboard!";
            });

            window.currentJobData = { ...response, place, state, date };
        }
    });

    // Save job info to Google Sheets via API button
    document.getElementById('save-btn').addEventListener('click', () => {
        if (!window.currentJobData) return;

        // Filter data for GAS (Only send what's needed)
        const payload = {
            role: window.currentJobData.role,
            company: window.currentJobData.company,
            location: window.currentJobData.location,
            link: window.currentJobData.link
        };

        chrome.runtime.sendMessage({ action: "SAVE_DATA", data: payload }, (res) => {
            document.getElementById('status-msg').textContent = res.success ? "[Success] Saved to Sheet!" : "[Error] API Error. Use manual paste.";
        });
    });

    // Copy Description Button
    document.getElementById('copy-desc-btn').addEventListener('click', () => {
        const data = window.currentJobData;
        if (!data) {
             document.getElementById('status-msg').textContent = "No data to copy.";
             return;
        }

        if (data.description) {
            copyMarkdown(data);
        } else {
            document.getElementById('status-msg').textContent = "Fetching description...";
            chrome.tabs.sendMessage(tab.id, { action: "GET_JOB_DESCRIPTION" }, (resp) => {
                if (resp && resp.description) {
                    data.description = resp.description;
                    window.currentJobData.description = resp.description; // Update global state
                    copyMarkdown(data);
                } else {
                    document.getElementById('status-msg').textContent = "Failed to fetch description.";
                }
            });
        }
    });

    function copyMarkdown(data) {
        const title = `${data.role} - ${data.company}`;
        const link = data.link !== "Not Found" ? data.link : "";
        const description = data.description || "";
        
        // Markdown format
        // # [Role - Company](Link)
        const header = link ? `# [${title}](${link})` : `# ${title}`;
        const markdown = `${header}\n\n${description}`;

        navigator.clipboard.writeText(markdown).then(() => {
            document.getElementById('status-msg').textContent = "Job Description Copied!";
        });
    }
});