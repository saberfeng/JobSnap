document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    async function sendMessageSafe(tabId, msg) {
        return new Promise(resolve => {
            if (!tabId) return resolve(null);
            try {
                chrome.tabs.sendMessage(tabId, msg, (resp) => {
                    if (chrome.runtime.lastError) {
                        resolve(null);
                    } else {
                        resolve(resp);
                    }
                });
            } catch (_) {
                resolve(null);
            }
        });
    }

    const basicInfo = tab ? await sendMessageSafe(tab.id, { action: "GET_JOB_BASIC_INFO" }) : null;
    if (basicInfo) {
        const response = basicInfo;
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
    } else {
        document.getElementById('status-msg').textContent = "Open a supported job page.";
    }

    // AI Toggle
    const toggleEl = document.getElementById('ai-toggle');
    chrome.storage.sync.get(['aiEnabled'], (s) => {
        if (typeof s.aiEnabled === 'undefined') {
            chrome.storage.sync.set({ aiEnabled: false });
            toggleEl.checked = false;
        } else {
            toggleEl.checked = s.aiEnabled === true;
        }
    });
    toggleEl.addEventListener('change', () => {
        chrome.storage.sync.set({ aiEnabled: toggleEl.checked });
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
    document.getElementById('copy-desc-btn').addEventListener('click', async () => {
        const data = window.currentJobData;
        if (!data) {
             document.getElementById('status-msg').textContent = "No data to copy.";
             return;
        }

        if (data.description) {
            copyMarkdown(data);
        } else {
            document.getElementById('status-msg').textContent = "Fetching description...";
            const resp = tab ? await sendMessageSafe(tab.id, { action: "GET_JOB_DESCRIPTION" }) : null;
            if (resp && resp.description) {
                data.description = resp.description;
                window.currentJobData.description = resp.description;
                copyMarkdown(data);
            } else {
                document.getElementById('status-msg').textContent = "Failed to fetch description.";
            }
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
