chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "SAVE_DATA") {
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
                .then(result => sendResponse({ success: true }))
                .catch(err => sendResponse({ success: false, error: err.message }));
        });
        return true;
    }
});