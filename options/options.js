function setupTagInput(containerId) {
    const container = document.getElementById(containerId);
    const input = document.createElement('input');
    const values = [];
    container.appendChild(input);

    function render() {
        container.querySelectorAll('.tag-chip').forEach(el => el.remove());
        values.forEach((v, idx) => {
            const chip = document.createElement('span');
            chip.className = 'tag-chip';
            chip.textContent = v;
            const remove = document.createElement('span');
            remove.className = 'remove';
            remove.textContent = '\u00D7';
            remove.addEventListener('click', () => {
                values.splice(idx, 1);
                render();
            });
            chip.appendChild(remove);
            container.insertBefore(chip, input);
        });
    }

    function addValue(val) {
        const t = val.trim().toLowerCase();
        if (!t) return;
        if (!values.includes(t)) values.push(t);
        input.value = '';
        render();
    }

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addValue(input.value);
        } else if (e.key === 'Backspace' && !input.value && values.length) {
            values.pop();
            render();
        }
    });

    container.addEventListener('paste', (e) => {
        const text = (e.clipboardData || window.clipboardData).getData('text');
        if (text && text.includes(',')) {
            e.preventDefault();
            text.split(',').forEach(addValue);
        }
    });

    return {
        getValues: () => values.slice(),
        setValues: (arr) => {
            values.splice(0, values.length, ...((arr || []).map(v => String(v).trim().toLowerCase()).filter(Boolean)));
            render();
        }
    };
}

const inputs = {
    languages: setupTagInput('profile-languages'),
    visa_places: setupTagInput('profile-visa-places'),
    residence_places: setupTagInput('profile-residence-places'),
    expected_jd_languages: setupTagInput('profile-jd-languages')
};

document.getElementById('save-settings').addEventListener('click', () => {
    const config = {
        qwenUrl: document.getElementById('qwen-url').value,
        qwenKey: document.getElementById('qwen-key').value,
        userProfile: {
            languages: inputs.languages.getValues(),
            visa_places: inputs.visa_places.getValues(),
            residence_places: inputs.residence_places.getValues(),
            experience: Number(document.getElementById('user-exp').value) || 0,
            expected_jd_languages: inputs.expected_jd_languages.getValues()
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
    const up = data.userProfile || {};

    // Migration from legacy fields
    const legacyLangs = up.langs ? String(up.langs).split(',').map(s => s.trim()) : [];
    const legacyVisas = up.visas ? String(up.visas).split(',').map(s => s.trim()) : [];
    const legacyPrefLang = up.prefLang ? String(up.prefLang).split(',').map(s => s.trim()) : [];

    inputs.languages.setValues(up.languages || legacyLangs);
    inputs.visa_places.setValues(up.visa_places || legacyVisas);
    inputs.residence_places.setValues(up.residence_places || []);
    document.getElementById('user-exp').value = up.experience ?? up.exp ?? 0;
    inputs.expected_jd_languages.setValues(up.expected_jd_languages || legacyPrefLang);
});
