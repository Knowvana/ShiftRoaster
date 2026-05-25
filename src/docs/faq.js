const doc = {
  id: 'faq',
  title: 'FAQ & Troubleshooting',
  icon: 'HelpCircle',
  sections: [
    {
      heading: 'Frequently Asked Questions',
      content: `Below are answers to the most common questions about Shift Roster.`
    },
    {
      heading: 'Q: What is the default admin login?',
      content: `The default Site Admin credentials are:
• **Username:** \`admin\`
• **Password:** \`admin123\`

> ⚠️ Change this password immediately after your first login.`
    },
    {
      heading: 'Q: How do I log in as a Project Admin?',
      content: `Project Admin credentials are created automatically when a project is created. The login details are:
• **Username:** Your **email address** (the one entered during project creation)
• **Password:** The auto-generated password (sent to your email or shown in the credentials popup)

If you have lost your password, ask your Site Admin to reset it from the **Edit Project** modal.`
    },
    {
      heading: 'Q: Why can I not see certain menu items?',
      content: `Menu visibility depends on your role:

| Menu Item | Visible To |
|-----------|-----------|
| Dashboard, Roster, Docs | Everyone |
| Team Members, Shifts, Swap Requests, Email Config | Project Admin, Site Admin |
| Projects | Site Admin only |

If you need access to a page you can't see, contact your Site Admin to upgrade your role.`
    },
    {
      heading: 'Q: Can I undo a roster generation?',
      content: `There is no direct "undo" button. However:
• If you accidentally regenerate, the previous roster is overwritten
• For important rosters, **export to Excel** before making changes — this serves as a backup
• If Google Sheets is configured, you can check version history in the spreadsheet`
    },
    {
      heading: 'Q: How does auto-generation decide shift assignments?',
      content: `The roster auto-generator follows these rules:
1. Assigns the **default shift** to all members as a starting point
2. Distributes **week-offs** to ensure minimum days off per week (default: 2)
3. Ensures no more than **5 consecutive working days** (configurable)
4. Respects **planned leaves** (PL) that are already marked
5. **Rotates shifts** across the month to ensure fairness
6. Fills the **on-call rotation** among eligible members`
    },
    {
      heading: 'Q: What happens if I delete a project?',
      content: `Deleting a project permanently removes:
• All team members associated with the project
• All shift definitions
• All rosters (current and historical)
• All swap requests
• All Google Sheets tabs for this project
• The Project Admin account

> ⚠️ This action **cannot be undone**. Always export important rosters before deleting a project.`
    },
    {
      heading: 'Q: Does Shift Roster work offline?',
      content: `**Partially.** Shift Roster stores all data in the browser's localStorage, so:
• ✅ You can view and edit data without internet
• ✅ Changes are saved locally immediately
• ❌ Google Sheets sync requires internet
• ❌ Credential emails require internet

When internet is restored, the next page load will sync data with Google Sheets automatically.`
    },
    {
      heading: 'Q: How do I export the roster to print it?',
      content: `**Step 1:** Go to the **Roster** page and select the desired month.

**Step 2:** Click the **"Export Excel"** button (📥).

**Step 3:** Open the downloaded \`.xlsx\` file in Excel or Google Sheets.

**Step 4:** Print directly from Excel/Google Sheets. The roster is pre-formatted with colors, headers, and a shift legend.`
    },
    {
      heading: 'Common Issues & Solutions',
      content: `**Issue: "No Project Selected" on every page**
• **Cause:** No projects have been created yet
• **Fix:** Log in as Site Admin and create a project from the Projects page

**Issue: Roster shows blank / no data**
• **Cause:** Roster has not been generated for the selected month
• **Fix:** Click "Generate Roster" to create the roster

**Issue: Team members not appearing in roster**
• **Cause:** Members may be deactivated or of type "On-Call"
• **Fix:** Check the Team Members page — ensure members are active and of type "Resource"

**Issue: Changes not syncing to Google Sheets**
• **Cause:** Backend not configured or network issue
• **Fix:** Check \`app.json\` for correct Apps Script URL, verify internet connection

**Issue: Cannot log in**
• **Cause:** Wrong credentials or password has been reset
• **Fix:** Contact Site Admin to reset your password from the Edit Project modal`
    }
  ]
};

export default doc;
