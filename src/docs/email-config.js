const doc = {
  id: 'email-config',
  title: 'Email Configuration',
  icon: 'Mail',
  sections: [
    {
      heading: 'Overview',
      content: `The **Email Config** page lets Project Admins configure email notification settings for their project. When configured, Shift Roster can send automated emails for roster updates, swap request notifications, and admin credential delivery.

Only **Project Admins** and **Site Admins** can access this page.`
    },
    {
      heading: 'Google Sheets Backend Setup',
      content: `Email notifications in Shift Roster are powered by **Google Apps Script**. Before you can use email features, the Site Admin must set up the Google Sheets backend. This involves:

1. Creating a Google Spreadsheet
2. Deploying the Apps Script code (Code.gs)
3. Configuring the Apps Script URL and token in the app settings

> 📘 For detailed setup instructions, refer to the **Google Sheets Setup Guide** in the \`docs/\` folder of the project repository.`
    },
    {
      heading: 'What Emails Are Sent',
      content: `Shift Roster sends the following types of emails:

| Email Type | When It's Sent | Recipient |
|-----------|----------------|-----------|
| **Admin Credentials** | When a new project is created | Project Admin |
| **Password Reset** | When admin password is reset | Project Admin |
| **Credentials Resend** | When credentials are resent from Edit Project | Project Admin |

All credential emails include:
• Welcome message with Shift Roster description
• Project details (name, created by)
• Login credentials (username = email, password)
• Security notice to change password
• Admin support contact information`
    },
    {
      heading: 'Email Template',
      content: `Credential emails are professionally branded with:

• **Header Banner** — Teal gradient with Shift Roster branding and calendar icon
• **Action Badge** — Green "Account Created" or amber "Password Reset" indicator
• **Welcome Section** — Personalized greeting with Shift Roster platform description
• **Project Details Card** — Project name and creator's email
• **Credentials Card** — Login username and password in a clean green card
• **Security Notice** — Amber warning about credential security
• **Support Contact** — Blue info box with Site Admin's email for help
• **Footer** — Automated message notice with copyright

The email is CC'd to the Site Admin for record-keeping.`
    },
    {
      heading: 'Troubleshooting',
      content: `**Emails not being sent?**
• Verify the Google Apps Script URL is correctly configured in \`src/config/app.json\`
• Check that the Apps Script is deployed as a web app with "Anyone" access
• Verify the API token matches between the app config and Apps Script
• Check the Apps Script execution logs for errors

**Emails going to spam?**
• Google Apps Script emails are sent from your Google account
• Ask recipients to check their spam folder and mark as "Not Spam"
• The sender name will appear as "Shift Roster"

**Password not working after email?**
• Ensure the admin is using their **email address** as the username (not a separate username)
• Passwords are case-sensitive
• If the password was reset after the email was sent, use the newest password`
    }
  ]
};

export default doc;
