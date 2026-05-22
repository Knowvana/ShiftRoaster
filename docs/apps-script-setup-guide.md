# Google Apps Script Backend — Setup Guide

This guide walks you through setting up Google Apps Script as a free, serverless backend for the Shift Roster app. After completing this guide, all app data (projects, members, shifts, rosters, swaps) will be stored in a Google Spreadsheet instead of browser localStorage.

---

## Prerequisites
- A Google account (the same one you used for the GCP project)
- The Shift Roster app source code

---

## Step 1: Create a Google Spreadsheet (Your Database)

1. Go to [sheets.google.com](https://sheets.google.com)
2. Click **Blank spreadsheet** (the big `+` button)
3. Name it: **`Shift Roster — Database`** (or any name you prefer)
4. Note the URL — it will look like:
   ```
   https://docs.google.com/spreadsheets/d/1ABCxyz.../edit
   ```
   The `1ABCxyz...` part is the **Spreadsheet ID** (you don't need it, but good to know).

**What is this spreadsheet?**
> This spreadsheet IS your database. Each tab (sheet) stores a different type of data:
> - `_projects` — your project list
> - `_admins` — admin login accounts
> - `_members_proj_xxx` — team members for each project
> - `_shifts_proj_xxx` — shift definitions for each project
> - `_roster_proj_xxx_2026_05` — raw roster data (JSON)
> - `May 2026 - ProjectName` — formatted, color-coded roster (human-readable)
> - `Legend` — shift color legend

---

## Step 2: Open Apps Script Editor

1. In your spreadsheet, go to **Extensions** → **Apps Script**
2. This opens the Apps Script editor in a new tab
3. You'll see a default file called `Code.gs` with an empty function

**What is Google Apps Script?**
> Apps Script is a JavaScript-based scripting platform built into Google Workspace.
> Think of it as a mini Node.js server that runs on Google's infrastructure — for free.
> It can read/write Google Sheets, send emails, create calendar events, etc.
> When deployed as a "Web App", it becomes an API endpoint that your React app can call.

---

## Step 3: Paste the Backend Code

1. **Delete** all the existing code in `Code.gs`
2. Open the file `apps-script/Code.gs` from this project
3. **Copy the entire contents** and paste it into the Apps Script editor
4. Press **Ctrl+S** to save

The code contains:
- **`doGet(e)`** — Handles GET requests (read operations like fetching members, projects)
- **`doPost(e)`** — Handles POST requests (write operations like saving roster, creating projects)
- **Sheet helper functions** — Read/write data to spreadsheet tabs
- **`createFormattedRosterSheet()`** — Creates beautiful, color-coded monthly roster tabs
- **`initializeSpreadsheet()`** — One-time setup function

---

## Step 4: Initialize the Spreadsheet

1. In the Apps Script editor, select **`initializeSpreadsheet`** from the function dropdown (top toolbar)
2. Click the **Run** button (▶)
3. **First time only:** Google will ask for permissions:
   - Click **Review permissions**
   - Choose your Google account
   - Click **Advanced** → **Go to Shift Roster (unsafe)** (this is normal for personal scripts)
   - Click **Allow**
4. Check your spreadsheet — you should see two new tabs:
   - `_projects` (with headers: id, name, description, createdAt)
   - `_admins` (with the default admin account)

**Why does it say "unsafe"?**
> Google shows this warning for ANY personal Apps Script that hasn't gone through Google's
> review process. Since this is YOUR script running on YOUR account accessing YOUR spreadsheet,
> it's completely safe. Google just warns you because technically any script could do anything
> with your data — but this one only touches the spreadsheet it's attached to.

---

## Step 5: Deploy as Web App

This is the key step — it turns your script into an API endpoint.

1. In Apps Script editor, click **Deploy** → **New deployment**
2. Click the gear icon ⚙ next to "Select type" → choose **Web app**
3. Fill in:
   - **Description:** `Shift Roster API v1`
   - **Execute as:** `Me` (your Google account)
   - **Who has access:** `Anyone`
4. Click **Deploy**
5. **Copy the Web app URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycbx.../exec
   ```
   **This is your API endpoint URL.** Save it — you'll need it in the next step.

**Understanding the deployment settings:**

| Setting | Value | Why |
|---------|-------|-----|
| Execute as | **Me** | The script runs with YOUR Google account's permissions. It can access YOUR spreadsheet. Users of the app never get access to your account. |
| Who has access | **Anyone** | This allows your React app (running in anyone's browser) to call the API. The `APP_TOKEN` in the code provides an additional security layer. |

**Security:**
> - The URL alone gives access to your API, but the `APP_TOKEN` check in the code means only requests with the correct token are processed.
> - Even without the token, the worst someone can do is read/write to your roster spreadsheet — not access your Gmail, Drive, or anything else.
> - You can change the token anytime in both `Code.gs` and `app.json`.

---

## Step 6: Configure Your React App

1. Open `src/config/app.json`
2. Set the `appsScriptUrl` to the URL you copied in Step 5:
   ```json
   {
     "appsScriptUrl": "https://script.google.com/macros/s/AKfycbx.../exec",
     "appsScriptToken": "shiftRoster2026"
   }
   ```
3. Save the file
4. The app will hot-reload and start using Google Sheets as the backend

**How does the app decide where to store data?**
> The `apiClient.js` service checks if `appsScriptUrl` is set:
> - **URL is set** → All read/write operations go to Google Sheets via the Apps Script API
> - **URL is empty** → Everything uses localStorage (offline mode, for development)
> - **Network error** → Automatically falls back to localStorage cache

---

## Step 7: Test the Connection

1. Open your app in the browser (http://localhost:3000)
2. Open browser DevTools (F12) → Console tab
3. You should NOT see any red errors
4. Try these actions:
   - **Login** (admin / admin123) — should work normally
   - **Create a project** — check your spreadsheet, `_projects` tab should have a new row
   - **Add members** — `_members_proj_xxx` tab should appear
   - **Generate a roster** — raw data saved + formatted color-coded sheet created!
5. Open the Google Spreadsheet and browse the tabs — your data is there!

---

## Step 8: Update Deployment (After Code Changes)

If you ever modify `Code.gs`:
1. In Apps Script editor, click **Deploy** → **Manage deployments**
2. Click the pencil icon ✏ on your deployment
3. Change "Version" to **New version**
4. Click **Deploy**

> **Important:** Always create a "New version" when updating. If you just edit and save
> without creating a new version, the old deployed code continues to run.

---

## Troubleshooting

### "Unauthorized" error
- Check that `appsScriptToken` in `app.json` matches `APP_TOKEN` in `Code.gs`
- Both must be exactly the same string

### "TypeError: Failed to fetch" or CORS error
- Make sure "Who has access" is set to **Anyone** in the deployment
- Apps Script uses redirects — the `apiClient.js` has `redirect: 'follow'` to handle this
- The POST request uses `Content-Type: text/plain` to avoid CORS preflight issues

### Data not appearing in spreadsheet
- Open your spreadsheet and check if new tabs were created
- In Apps Script editor, check the **Executions** tab (left sidebar, clock icon) for error logs

### "Script function not found" error
- Make sure you pasted the entire `Code.gs` file
- Check that `doGet` and `doPost` functions exist at the top level

### Slow first request
- Apps Script has a "cold start" — the first request after ~5 minutes of inactivity takes 2-5 seconds
- Subsequent requests are fast (< 1 second)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Pages (Static Site)                     │
│                                                                   │
│  React App ──── apiClient.js ──── fetch() ────────────────┐     │
│       │                                                    │     │
│       │ (if no URL)                                        │     │
│       ▼                                                    ▼     │
│  localStorage                                                    │
│  (offline cache)                          Internet               │
└─────────────────────────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              Google Apps Script (Free Serverless API)             │
│                                                                   │
│  doGet() ◄─── GET requests (read data)                           │
│  doPost() ◄── POST requests (write data)                         │
│       │                                                           │
│       ▼                                                           │
│  SpreadsheetApp ──── Read/Write ──── Google Sheets               │
│                                      (Your Database)              │
│                                                                   │
│  Tabs: _projects, _admins, _members_*, _shifts_*, _roster_*     │
│        May 2026 - ProjectName (formatted), Legend                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cost

**$0 forever.** Google Apps Script free tier includes:
- 20,000 URL fetch calls per day
- 6 minutes of execution time per call
- 50 MB of spreadsheet storage
- No credit card required

This is more than enough for a shift roster app with hundreds of users.
