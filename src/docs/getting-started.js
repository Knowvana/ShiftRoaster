const doc = {
  id: 'getting-started',
  title: 'Getting Started',
  icon: 'Rocket',
  sections: [
    {
      heading: 'Welcome to Shift Roster',
      content: `Shift Roster is a comprehensive shift management platform designed for teams that need to plan, schedule, and coordinate work shifts efficiently. Whether you manage a small team or a large workforce, Shift Roster helps you:

• **Create and manage shift schedules** — Define shift types (Morning, Afternoon, Night, etc.) with custom timings and colors
• **Auto-generate monthly rosters** — Let the system create optimized rosters based on your rules
• **Handle leave and time-off** — Track planned leaves, week-offs, and availability
• **Process swap requests** — Team members can request shift swaps, and admins can approve them
• **Export to Excel** — Download rosters as color-coded Excel files for offline use
• **Sync with Google Sheets** — All data is backed up to Google Sheets in real-time`
    },
    {
      heading: 'How Shift Roster is Organized',
      content: `Shift Roster uses a **project-based** structure. Each project is an independent workspace with its own:

• Team members
• Shift definitions
• Monthly rosters
• Swap requests

This means you can manage multiple teams or departments from a single Shift Roster instance. A **Site Admin** creates projects and assigns **Project Admins** who manage their respective teams.`
    },
    {
      heading: 'User Roles',
      content: `There are three roles in Shift Roster:

**1. Site Admin**
The top-level administrator who manages the entire platform.
• Can create, edit, and delete projects
• Can create Project Admin accounts
• Has access to all projects and settings

**2. Project Admin**
Manages a specific project (team).
• Can add/edit team members and shifts
• Can generate and edit rosters
• Can approve or reject swap requests
• Can configure email notifications

**3. Resource (Team Member)**
A regular team member with read-only access.
• Can view the roster and dashboard
• Can submit swap requests (if enabled)`
    },
    {
      heading: 'First-Time Setup (Site Admin)',
      content: `If you are setting up Shift Roster for the first time, follow these steps:

**Step 1: Log In**
Navigate to the Shift Roster URL. Click **"Admin Sign In"** in the top-right corner. Use the default credentials:
• Username: \`admin\`
• Password: \`admin123\`

> ⚠️ **Important:** Change your password after your first login for security.

**Step 2: Create a Project**
Go to **Projects** in the left sidebar. Click **"+ New Project"**. Fill in:
• **Project Name** — e.g., "Operations Team Q1"
• **Description** — Brief description of the project
• **Admin Email** — The email of the person who will manage this project
• **Admin Display Name** — Their name as it will appear in the system

Click **"Create Project"**. The system will:
1. Create the project
2. Generate login credentials for the Project Admin (email = username)
3. Email the credentials to the Project Admin
4. Show you the generated password in a popup

**Step 3: Hand Over to Project Admin**
Share the credentials with the Project Admin. They can now log in and start setting up their team.`
    },
    {
      heading: 'Quick Navigation Guide',
      content: `Here is what each menu item in the sidebar does:

| Menu Item | Purpose | Who Can Access |
|-----------|---------|----------------|
| **Dashboard** | Overview of today's roster, stats, and quick actions | Everyone |
| **Roster** | View and generate monthly shift rosters | Everyone (edit: Admins) |
| **Team Members** | Add, edit, and manage team members | Project Admin, Site Admin |
| **Shifts** | Define shift types with timings and colors | Project Admin, Site Admin |
| **Swap Requests** | View and manage shift swap requests | Project Admin, Site Admin |
| **Email Config** | Configure email notification settings | Project Admin, Site Admin |
| **Projects** | Create and manage projects and admin accounts | Site Admin only |
| **Documentation** | This user guide | Everyone |`
    }
  ]
};

export default doc;
