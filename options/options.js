document.getElementById('save').addEventListener('click', () => {
    const url = document.getElementById('url').value;
    const token = document.getElementById('token').value;

    chrome.storage.sync.set({ webAppUrl: url, secretToken: token }, () => {
        const status = document.getElementById('status');
        status.textContent = 'Settings saved!';
        setTimeout(() => { status.textContent = ''; }, 2000);
    });
});

// Load existing settings
chrome.storage.sync.get(['webAppUrl', 'secretToken'], (items) => {
    if (items.webAppUrl) document.getElementById('url').value = items.webAppUrl;
    if (items.secretToken) document.getElementById('token').value = items.secretToken;
});