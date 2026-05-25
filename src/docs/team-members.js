const doc = {
  id: 'team-members',
  title: 'Team Members',
  icon: 'Users',
  sections: [
    {
      heading: 'Overview',
      content: `The **Team Members** page lets Project Admins manage the people who will be assigned shifts in the roster. Each team member has a name, type, and active status.

Only **Project Admins** and **Site Admins** can access this page.`
    },
    {
      heading: 'Adding a Team Member',
      content: `**Step 1:** On the Team Members page, click the **"+ Add Member"** button.

**Step 2:** Fill in the member details:
• **Name** *(required)* — The full name of the team member (e.g., "John Doe")
• **Member Type** — Choose one of:
  - **Resource** *(default)* — A regular team member who gets assigned shifts
  - **On-Call** — A member who is available for on-call duties

**Step 3:** Click **"Add"** or press Enter to save the member.

The new member will appear in the list and will be included in future roster generation.

> 💡 **Tip:** You can add multiple members quickly by filling in the form and pressing Enter repeatedly.`
    },
    {
      heading: 'Editing a Team Member',
      content: `**Step 1:** Find the member in the list and click the **pencil icon** (✏️) next to their name.

**Step 2:** Modify any of the following:
• **Name** — Update the member's display name
• **Member Type** — Change between Resource and On-Call

**Step 3:** Click **"Save"** to apply changes.`
    },
    {
      heading: 'Deactivating / Reactivating a Member',
      content: `Instead of deleting members (which would remove their historical data), you can deactivate them:

**To deactivate:** Click the **toggle switch** next to the member's name. Deactivated members:
• Will **not** be included in new roster generation
• Will still appear in historical rosters
• Are shown with a faded/greyed-out appearance in the list

**To reactivate:** Click the toggle switch again to re-enable the member.

> 💡 **Best Practice:** Deactivate members who are on extended leave or have left the team, rather than deleting them. This preserves roster history.`
    },
    {
      heading: 'Deleting a Team Member',
      content: `**Step 1:** Click the **trash icon** (🗑️) next to the member's name.

**Step 2:** Confirm the deletion in the dialog.

> ⚠️ **Warning:** Deleting a member removes them from the system entirely. They will still appear in already-generated rosters, but cannot be added to new ones. Consider **deactivating** instead.`
    },
    {
      heading: 'Understanding Member Types',
      content: `| Type | Description | Roster Behavior |
|------|-------------|-----------------|
| **Resource** | Regular team member | Assigned to daily shifts (M, A, N, WO, PL) |
| **On-Call** | Available for on-call duties | Shown in the On-Call row at the bottom of the roster |

When generating a roster, **Resources** get regular shift assignments while **On-Call** members are assigned to the on-call rotation.`
    }
  ]
};

export default doc;
