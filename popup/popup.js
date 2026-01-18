document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, { action: "GET_JOB_INFO" }, (response) => {
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

    // Save via API button
    document.getElementById('save-btn').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "SAVE_DATA", data: window.currentJobData }, (res) => {
            document.getElementById('status-msg').textContent = res.success ? "✅ Saved to Sheet!" : "❌ API Error. Use manual paste.";
        });
    });
});