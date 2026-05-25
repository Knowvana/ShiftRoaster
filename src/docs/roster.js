const doc = {
  id: 'roster',
  title: 'Roster Management',
  icon: 'Calendar',
  sections: [
    {
      heading: 'Overview',
      content: `The **Roster** page is the heart of Shift Roster. It displays the monthly shift schedule in a grid format — members on the left, days across the top, and shift codes in each cell.

Everyone can **view** the roster, but only **Project Admins** and **Site Admins** can generate and edit it.`
    },
    {
      heading: 'Understanding the Roster Grid',
      content: `The roster grid is structured as follows:

**Header Row:**
• First column: "Member" label
• Remaining columns: Day numbers (1, 2, 3, ... 28/30/31) with day-of-week abbreviations

**Member Rows:**
• Each row represents one active team member
• Each cell contains a **shift code** (M, A, N, WO, PL, etc.)
• Cells are **color-coded** to match the shift definition colors

**Summary Columns (right side):**
• **WO** — Total Week Offs for the member this month
• **Lv** — Total Leaves (PL) for the member this month
• **WD** — Total Working Days for the member this month
• **OC** — On-Call days for the member this month

**On-Call Row:**
• Shows which member is assigned on-call duty for each day
• Displays the member's name instead of a shift code

**Staff Row (bottom):**
• Shows the total number of staff working on each day
• Helps identify understaffed or overstaffed days at a glance`
    },
    {
      heading: 'Selecting a Month',
      content: `At the top of the Roster page, you will see month/year selection controls:

**Step 1:** Use the **left/right arrow buttons** (◀ ▶) to navigate between months.

**Step 2:** Or click the **month/year display** to jump to a specific month.

The roster loads automatically for the selected month. If no roster has been generated for that month, you will see a prompt to generate one.`
    },
    {
      heading: 'Generating a Roster',
      content: `**Step 1:** Navigate to the month you want to generate a roster for.

**Step 2:** Click the **"Generate Roster"** button.

**Step 3:** The system will auto-generate the roster based on:
• Active team members
• Defined shift types
• Roster rules (min days off, max consecutive work days, etc.)
• The default shift assignment

The auto-generator follows these rules:
• Each member gets at least **2 days off per week** (configurable)
• No more than **5 consecutive working days** (configurable)
• Shifts are **rotated** to ensure fairness
• Members with planned leaves (PL) are respected

**Step 4:** Review the generated roster. You can manually edit any cell if needed.

> 💡 **Tip:** Generate the roster early in the month and make manual adjustments as needed. The auto-generator provides a solid starting point.`
    },
    {
      heading: 'Editing the Roster Manually',
      content: `After generating a roster, you can manually adjust individual cells:

**Step 1:** Click on any cell in the roster grid.

**Step 2:** A dropdown will appear showing all available shift codes.

**Step 3:** Select the new shift to assign.

The cell will update immediately with the new shift code and color. The summary columns (WO, Lv, WD) and the Staff row will recalculate automatically.

> 💡 **Tip:** Manual edits are saved automatically. There is no separate "Save" button needed.`
    },
    {
      heading: 'Generating On-Call Schedule',
      content: `On-Call assignments can be generated separately:

**Step 1:** After the main roster is generated, click **"Generate On-Call"**.

**Step 2:** The system assigns on-call duty to eligible members based on rotation.

**Step 3:** On-Call assignments appear in the **On-Call row** at the bottom of the roster grid, showing the assigned member's name for each day.`
    },
    {
      heading: 'Exporting to Excel',
      content: `You can download the roster as a formatted Excel file:

**Step 1:** Click the **"Export Excel"** button (📥) at the top of the Roster page.

**Step 2:** A \`.xlsx\` file will be downloaded containing:

**Sheet 1 — Roster Grid:**
• Color-coded cells matching the shift colors on screen
• Member summary columns (WO, Lv, WD, OC)
• On-Call row with member names
• Resource Summary row with total staff count

**Sheet 2 — Shift Legend:**
• Table showing all shift codes, names, and their colors
• Useful reference when reading the printed roster

> 💡 **Tip:** The Excel export is perfect for printing, sharing with team members who don't have system access, or archiving monthly rosters.`
    },
    {
      heading: 'Syncing with Google Sheets',
      content: `If Google Sheets backend is configured, the roster automatically syncs:

• **Saving:** When you generate or edit a roster, changes are saved to both localStorage and Google Sheets
• **Formatted Sheet:** A beautifully formatted roster sheet is created in your Google Spreadsheet with the naming format: \`"Month YYYY - ProjectName"\` (e.g., "January 2026 - Operations Team")
• **Loading:** When you open the roster page, data is loaded from Google Sheets (with localStorage as fallback)

The formatted Google Sheet includes color-coded cells, headers, and the shift legend — ready to share or print directly from Google Sheets.`
    }
  ]
};

export default doc;
