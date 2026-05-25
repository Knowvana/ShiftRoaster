const doc = {
  id: 'managing-projects',
  title: 'Managing Projects',
  icon: 'FolderOpen',
  sections: [
    {
      heading: 'Overview',
      content: `The **Projects** page is the central hub for managing all your shift roster projects. Only **Site Admins** can access this page.

Each project is an independent workspace with its own team members, shifts, rosters, and swap requests. This allows you to manage multiple teams or departments from a single Shift Roster instance.`
    },
    {
      heading: 'Creating a New Project',
      content: `**Step 1:** Click the **"+ New Project"** button in the top-right corner of the Projects page.

**Step 2:** A popup modal will appear with two sections:

**Project Details:**
• **Project Name** *(required)* — Give your project a meaningful name (e.g., "Operations Team Q3")
• **Description** — A brief description of what this project is for

**Project Admin:**
• **Admin Email** *(required)* — The email address of the person who will manage this project. This email will also be used as their **login username**
• **Admin Display Name** — The admin's name as it will appear in the system. If left blank, it defaults to "Project Name Admin"

**Step 3:** Click **"Create Project"**. The system will:
1. Create the project
2. Auto-generate a secure password for the Project Admin
3. Send the login credentials to the admin's email
4. Display the generated password in a popup table

> 💡 **Tip:** The admin's email address is their login username. There is no separate username — the email IS the username.

**Step 4:** The credentials popup shows:
| Field | Value |
|-------|-------|
| **Project** | Your project name |
| **Login Username** | The admin's email address |
| **Password** | Auto-generated secure password |

Use the **copy buttons** (📋) next to the username and password to copy them to your clipboard. Click **"Done"** to close.`
    },
    {
      heading: 'Editing a Project',
      content: `**Step 1:** Find the project card in the list and click the **pencil icon** (✏️) on the right side.

**Step 2:** The Edit Project modal will open showing:

**Project Details Section:**
• **Project ID** — Read-only unique identifier (e.g., \`proj_z16x0a\`)
• **Created Date** — When the project was created
• **Project Name** — Editable
• **Description** — Editable

**Project Admin Section:**
• **Admin Display Name** — Editable
• **Admin Email** — Editable
• **Login Username** — Shows the admin's email (read-only display)

**Admin Action Buttons:**
• **Reset Password** — Generates a new password, emails it to the admin, and shows it in a popup
• **Resend Credentials Email** — Generates a new password and emails all credentials to the admin

**Step 3:** Make your changes and click **"Save Changes"**.

> ⚠️ If you try to close the modal with unsaved changes, you'll see a confirmation dialog asking if you want to discard your changes.`
    },
    {
      heading: 'Switching Between Projects',
      content: `There are two ways to switch between projects:

**Method 1: From the Projects Page**
Click the **"Switch"** button on any project card that is not currently active.

**Method 2: From the Header**
Click the **project name dropdown** in the top-left header bar. Select a different project from the list.

The currently active project is shown with an **"Active"** badge and a teal border on its card.`
    },
    {
      heading: 'Deleting a Project',
      content: `> ⚠️ **Warning:** Deleting a project is **permanent and cannot be undone**.

**Step 1:** Click the **trash icon** (🗑️) on the project card.

**Step 2:** A confirmation dialog will appear listing everything that will be deleted:
• All team members
• All shift definitions
• All rosters (current and historical)
• All swap requests
• All Google Sheets tabs for this project
• The Project Admin account

**Step 3:** Click **"OK"** to confirm deletion, or **"Cancel"** to abort.

After deletion, if the deleted project was the active one, the system will automatically switch to the next available project.`
    },
    {
      heading: 'Resending Admin Credentials',
      content: `If a Project Admin has lost their login credentials or needs a password reset:

**Step 1:** Click the **pencil icon** (✏️) on the project card to open the Edit modal.

**Step 2:** In the **Project Admin** section, click one of:
• **"Reset Password"** — Generates a new password only
• **"Resend Credentials Email"** — Generates a new password AND sends a full credentials email

**Step 3:** The new password will be shown in a popup. The admin will also receive an email with their updated credentials.

> 💡 **Note:** Both actions generate a NEW password. The old password will no longer work.`
    }
  ]
};

export default doc;
