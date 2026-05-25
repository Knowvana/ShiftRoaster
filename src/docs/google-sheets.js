const doc = {
  id: 'google-sheets',
  title: 'Google Sheets Setup',
  icon: 'Database',
  sections: [
    {
      heading: 'Overview',
      content: `Shift Roster uses **Google Sheets** as its cloud backend for data persistence. All project data — team members, shifts, rosters, admin accounts — is stored both locally (in the browser's localStorage) and remotely in a Google Spreadsheet via Google Apps Script.

This section guides you through setting up the Google Sheets backend.`
    },
    {
      heading: 'Why Google Sheets?',
      content: `• **Free** — No server costs, uses your existing Google account
• **Real-time sync** — Data is saved to the cloud automatically
• **Accessible** — View and edit data directly in Google Sheets if needed
• **Shareable** — Share the spreadsheet with team members for transparency
• **Backups** — Google Sheets has built-in version history`
    },
    {
      heading: 'Step 1: Create a Google Spreadsheet',
      content: `1. Go to [Google Sheets](https://sheets.google.com)
2. Click **"+ Blank spreadsheet"** to create a new spreadsheet
3. Name it something meaningful like **"Shift Roster Data"**
4. Copy the **Spreadsheet ID** from the URL:
   \`https://docs.google.com/spreadsheets/d/\`**SPREADSHEET_ID**\`/edit\`

> 💡 The Spreadsheet ID is the long string of characters between \`/d/\` and \`/edit\` in the URL.`
    },
    {
      heading: 'Step 2: Set Up Google Apps Script',
      content: `1. In your Google Spreadsheet, go to **Extensions → Apps Script**
2. This opens the Apps Script editor
3. Delete any default code in the editor
4. Copy the entire contents of the \`apps-script/Code.gs\` file from the Shift Roster project
5. Paste it into the Apps Script editor
6. At the top of the script, update the **SPREADSHEET_ID** constant with your spreadsheet ID:

\`\`\`javascript
const SPREADSHEET_ID = 'your-spreadsheet-id-here';
\`\`\`

7. Click **Save** (💾) or press Ctrl+S`
    },
    {
      heading: 'Step 3: Deploy as Web App',
      content: `1. In the Apps Script editor, click **Deploy → New deployment**
2. Click the **gear icon** next to "Select type" and choose **"Web app"**
3. Configure:
   • **Description:** "Shift Roster API"
   • **Execute as:** "Me" (your Google account)
   • **Who has access:** "Anyone"
4. Click **Deploy**
5. **Authorize** the script when prompted (click through the "unsafe" warning — this is your own script)
6. Copy the **Web app URL** that appears — you will need this

The URL looks like:
\`https://script.google.com/macros/s/ABCDEF.../exec\``
    },
    {
      heading: 'Step 4: Configure the App',
      content: `1. Open \`src/config/app.json\` in the Shift Roster project
2. Update these two fields:

\`\`\`json
{
  "appsScriptUrl": "YOUR_WEB_APP_URL_HERE",
  "appsScriptToken": "shiftRoster2026"
}
\`\`\`

3. The **appsScriptToken** must match the token in your Apps Script code. The default is \`"shiftRoster2026"\`.
4. Save the file and restart the development server

> ⚠️ **Security:** The token provides basic authentication. For production use, consider implementing OAuth2.`
    },
    {
      heading: 'Step 5: Initialize the Spreadsheet',
      content: `1. In the Apps Script editor, find the function \`initializeSpreadsheet()\`
2. Select it from the function dropdown at the top
3. Click **Run** (▶)
4. This creates the required sheets in your spreadsheet:
   • **Admins** — Admin account data
   • **Projects** — Project metadata
   • Various project-specific sheets (created automatically when data is saved)

> 💡 You only need to run this once. After that, sheets are managed automatically.`
    },
    {
      heading: 'Verifying the Setup',
      content: `After configuration, verify everything works:

1. Open Shift Roster in your browser
2. Create or edit any data (e.g., add a team member)
3. Check your Google Spreadsheet — you should see the data appear
4. Look at the browser console (F12 → Console) for any sync errors

**Healthy sync messages:**
\`\`\`
[ProjectContext] Synced projects to backend
[AuthContext] Synced admins to backend
\`\`\`

**Error messages to watch for:**
\`\`\`
[AuthContext] Backend fetch failed, using localStorage: ...
[ProjectContext] Backend fetch failed, using localStorage: ...
\`\`\`

These errors mean the backend isn't reachable. Double-check your Apps Script URL and deployment status.`
    },
    {
      heading: 'Troubleshooting',
      content: `**Data not syncing?**
• Verify the Apps Script URL in \`app.json\` is correct
• Ensure the script is deployed (not just saved)
• Check that the token matches between app config and script
• Try redeploying the Apps Script (Deploy → Manage deployments → Edit)

**Getting "Authorization required" errors?**
• Open the Apps Script editor and run any function manually
• This triggers the authorization flow
• Accept all permissions when prompted

**Spreadsheet seems empty?**
• Run the \`initializeSpreadsheet()\` function from the Apps Script editor
• Check that you're looking at the correct spreadsheet

**Changes not appearing immediately?**
• Data syncs in the background — there may be a 1-2 second delay
• Hard refresh the browser (Ctrl+Shift+R) to force a re-fetch
• Check the browser console for sync errors`
    }
  ]
};

export default doc;
