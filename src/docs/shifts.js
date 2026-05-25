const doc = {
  id: 'shifts',
  title: 'Managing Shifts',
  icon: 'Clock',
  sections: [
    {
      heading: 'Overview',
      content: `The **Shifts** page lets you define the types of shifts your team works. Each shift has a code, name, color, and time range. These shift definitions are used when generating rosters.

Only **Project Admins** and **Site Admins** can manage shifts.`
    },
    {
      heading: 'Default Shifts',
      content: `When a new project is created, Shift Roster pre-configures five default shifts:

| Code | Name | Color | Time | Type |
|------|------|-------|------|------|
| **M** | Morning | Light Blue | 06:00 – 13:30 | Working |
| **A** | Afternoon | Teal | 13:00 – 22:30 | Working (Default) |
| **N** | Night | Dark Blue | 22:00 – 06:30 | Working |
| **WO** | Week Off | Gray | — | Non-Working |
| **PL** | Planned Leave | Light Red | — | Non-Working |

You can edit these defaults or add new shift types to match your team's schedule.`
    },
    {
      heading: 'Adding a New Shift',
      content: `**Step 1:** Click the **"+ Add Shift"** button on the Shifts page.

**Step 2:** Fill in the shift details:
• **Shift Code** *(required)* — A short code (1–4 characters) like "M", "A", "N", "E1"
• **Shift Name** *(required)* — Full name like "Morning", "Evening Shift"
• **Color** — Pick a color for this shift. This color will be used in the roster grid and Excel exports
• **Start Time** — When the shift starts (e.g., 06:00)
• **End Time** — When the shift ends (e.g., 14:00)
• **Is Working Shift** — Toggle ON for shifts where the member is working, OFF for leave/off-duty shifts

**Step 3:** Click **"Add"** to save.

> 💡 **Tip:** Use distinct colors for each shift so the roster grid is easy to read at a glance. The color appears as the cell background in both the web roster and exported Excel files.`
    },
    {
      heading: 'Editing a Shift',
      content: `**Step 1:** Click the **pencil icon** (✏️) next to the shift you want to edit.

**Step 2:** Modify any field — code, name, color, times, or working status.

**Step 3:** Click **"Save"** to apply changes.

> ⚠️ **Note:** Changing a shift code will NOT automatically update existing rosters that use the old code. Only new roster generations will use the updated shift definitions.`
    },
    {
      heading: 'Setting a Default Shift',
      content: `One shift can be marked as the **default shift**. This is the shift that gets assigned to members when the roster auto-generator fills in the schedule.

To set a shift as default, click the **star icon** (⭐) next to the shift. The current default will be un-starred automatically.

The default shift is typically the most common working shift (e.g., Afternoon or Day shift).`
    },
    {
      heading: 'Deleting a Shift',
      content: `**Step 1:** Click the **trash icon** (🗑️) next to the shift.

**Step 2:** Confirm the deletion.

> ⚠️ **Warning:** Deleting a shift will not remove it from already-generated rosters, but it will no longer be available for new roster generation. Make sure no one is using this shift type before deleting.`
    },
    {
      heading: 'Working vs Non-Working Shifts',
      content: `Shifts are categorized as either **working** or **non-working**:

**Working Shifts** (e.g., Morning, Afternoon, Night):
• Count toward the member's working days
• Are included in the staff count on the roster summary row
• Appear in the shift breakdown on the Dashboard

**Non-Working Shifts** (e.g., Week Off, Planned Leave):
• Do NOT count as working days
• Are tracked separately in member summaries (WO count, Leave count)
• Help enforce roster rules like minimum days off per week`
    }
  ]
};

export default doc;
