# JobSnap - A Job Application Tracker Extension 🚀

An open-source Chrome Extension designed to streamline the job application process. With one click, extract job details (Role, Company, Location, and Link) from **LinkedIn** and sync them directly to your own **Google Sheet**.

## Features

* **One-Click Scraping:** Automatically detects Job Title, Company, and Location from the LinkedIn "Split View" or individual job pages.
* **Automatic Clipboard:** Copies a Tab-Separated (TSV) row to your pasteboard immediately upon opening the popup—ready for manual pasting into Google Sheets.
* **Direct Sheet Sync:** Uses a lightweight Google Apps Script "bridge" to append data to specific tabs (HK, JP, NZ) based on the job location.
* **Privacy First:** No centralized server. You host your own backend via Google Apps Script. No one else has access to your data.

---

## 🛠 Installation

### 1. Load the Extension

1. Clone this repository: `git clone https://github.com/your-username/job-tracker-extension.git`
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (top right toggle).
4. Click **Load unpacked** and select the root directory of this project.
5. **Pin** the extension to your toolbar for easy access.

### 2. Set Up the Google Sheet Backend

1. Create a new **Google Sheet**.
2. Add headers to the first row: `Company, Position, place, state, date, link`.
3. Go to **Extensions > Apps Script**.
4. Copy the code from `/google-apps-script/Code.gs` in this repo and paste it into the script editor.
5. Click **Deploy > New Deployment**.
   * **Type:** Web App
   * **Execute as:** Me (Your Google Account)
   * **Who has access:** Anyone
6. **Copy the Web App URL** provided after deployment.

### 3. Configuration

1. Right-click the Job Tracker icon in your browser and select **Options**.
2. Paste your **Google Web App URL**.
3. (Optional) Set a **Secret Token** if you modified the `Code.gs` to require authentication.
4. Click **Save Settings**.

---

## 📂 Project Structure

```text
├── manifest.json          # Extension metadata & permissions
├── options/               # User configuration page
├── popup/                 # Main UI and clipboard logic
├── scripts/
│   ├── content.js         # DOM Scraper (LinkedIn specific)
│   └── background.js      # API communicator (Service Worker)
├── styles/                # UI styling
└── google-apps-script/
    └── Code.gs            # The backend logic for your Google Sheet
```





## 🔒 Security & Privacy
Data Sovereignty: Your data never touches a third-party server. It travels directly from your browser to your Google account.

Access Control: By setting "Execute as Me," the script uses your credentials to write to the sheet. The "Anyone" access setting is secured by the fact that your unique Deployment URL is private and hard to guess.

Open Source: The extraction logic is transparent—no hidden tracking or analytics.

## 📄 License
Distributed under the MIT License.

