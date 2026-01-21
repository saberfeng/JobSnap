document.getElementById('save-settings').addEventListener('click', () => {
    const config = {
        qwenUrl: document.getElementById('qwen-url').value,
        qwenKey: document.getElementById('qwen-key').value,
        userProfile: {
            langs: document.getElementById('user-langs').value,
            visas: document.getElementById('user-visas').value,
            exp: document.getElementById('user-exp').value,
            prefLang: document.getElementById('jd-pref-lang').value
        }
    };

    chrome.storage.sync.set(config, () => {
        const status = document.getElementById('status-msg');
        status.textContent = "Settings saved successfully!";
        setTimeout(() => status.textContent = "", 3000);
    });
});

// Load settings on startup
chrome.storage.sync.get(['qwenUrl', 'qwenKey', 'userProfile'], (data) => {
    if (data.qwenUrl) document.getElementById('qwen-url').value = data.qwenUrl;
    if (data.qwenKey) document.getElementById('qwen-key').value = data.qwenKey;
    if (data.userProfile) {
        document.getElementById('user-langs').value = data.userProfile.langs || "";
        document.getElementById('user-visas').value = data.userProfile.visas || "";
        document.getElementById('user-exp').value = data.userProfile.exp || 0;
        document.getElementById('jd-pref-lang').value = data.userProfile.prefLang || "";
    }
});