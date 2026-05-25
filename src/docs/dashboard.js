const doc = {
  id: 'dashboard',
  title: 'Dashboard',
  icon: 'LayoutDashboard',
  sections: [
    {
      heading: 'Overview',
      content: `The **Dashboard** is the landing page of Shift Roster. It provides a quick, at-a-glance overview of your team's roster status for today. The Dashboard is accessible to everyone — no login required.`
    },
    {
      heading: 'Quick Stats Cards',
      content: `At the top of the Dashboard, you will see four stat cards:

| Card | What It Shows |
|------|---------------|
| **Total Members** | The number of active team members in the current project |
| **Working Today** | How many members are on a working shift today |
| **On Leave** | How many members are on planned leave (PL) today |
| **Pending Swaps** | Number of swap requests waiting for approval |

These numbers update automatically whenever the roster or team data changes.`
    },
    {
      heading: 'Today\'s Shift Breakdown',
      content: `Below the stat cards, you will see a color-coded breakdown of today's shifts:

• Each shift type is shown as a **colored bar** with the shift name and count
• The bar width is proportional to the number of members on that shift
• This lets you quickly see how your workforce is distributed across shifts today

For example:
• 🟦 Morning: 4 members
• 🟩 Afternoon: 6 members
• 🟪 Night: 3 members
• ⬜ Week Off: 2 members`
    },
    {
      heading: 'Quick Actions',
      content: `The Dashboard provides quick action links to navigate to commonly used pages:

• **View Roster** — Jump directly to the Roster page
• **Manage Members** — Go to the Team Members page
• **View Swaps** — Navigate to Swap Requests

These links save time by providing one-click access to the most frequently used sections.`
    },
    {
      heading: 'Project Context',
      content: `The Dashboard always shows data for the **currently selected project**. To switch projects:

1. Click the **project name dropdown** in the top header bar
2. Select a different project from the list

The Dashboard will automatically reload with the new project's data.

> 💡 **Note:** If no project is selected or no projects exist yet, the Dashboard will show a prompt to create your first project.`
    }
  ]
};

export default doc;
