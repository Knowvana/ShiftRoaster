const doc = {
  id: 'swap-requests',
  title: 'Swap Requests',
  icon: 'ArrowLeftRight',
  sections: [
    {
      heading: 'Overview',
      content: `The **Swap Requests** page allows team members to request shift swaps and admins to manage those requests. This feature helps handle schedule changes after the roster has been generated.

Only **Project Admins** and **Site Admins** can access the Swap Requests management page.`
    },
    {
      heading: 'How Swap Requests Work',
      content: `A swap request is when one team member wants to exchange their assigned shift with another member on a specific date. The flow is:

1. **Request Created** — An admin creates a swap request on behalf of team members
2. **Pending Review** — The request appears with a "Pending" status
3. **Approved or Rejected** — An admin reviews and approves or rejects the request
4. **Roster Updated** — If approved, the roster is automatically updated to reflect the swap`
    },
    {
      heading: 'Creating a Swap Request',
      content: `**Step 1:** On the Swap Requests page, click **"+ New Swap Request"**.

**Step 2:** Fill in the swap details:
• **Requester** — The member who wants to swap their shift
• **Swap With** — The member they want to swap with
• **Date** — The date of the swap
• **Reason** *(optional)* — Why the swap is needed

**Step 3:** Click **"Submit"** to create the request.

The request will appear in the list with a **"Pending"** status badge.`
    },
    {
      heading: 'Reviewing Swap Requests',
      content: `Pending swap requests are displayed at the top of the list with an orange "Pending" badge.

**To Approve:** Click the **checkmark button** (✅) on the request. The roster will be updated automatically — the two members' shifts will be swapped for the specified date.

**To Reject:** Click the **X button** (❌) on the request. The roster remains unchanged.

Once a request is approved or rejected, its status badge changes to green ("Approved") or red ("Rejected").`
    },
    {
      heading: 'Swap Request Statuses',
      content: `| Status | Color | Meaning |
|--------|-------|---------|
| **Pending** | Orange | Waiting for admin review |
| **Approved** | Green | Swap has been approved and roster updated |
| **Rejected** | Red | Swap was denied, no roster changes made |`
    },
    {
      heading: 'Tips & Best Practices',
      content: `• Review swap requests promptly so team members know their updated schedules
• Check for conflicts before approving — ensure minimum staffing levels are maintained
• Use the **reason field** to document why swaps are requested for record-keeping
• Approved swaps are reflected immediately in the roster grid and Excel exports`
    }
  ]
};

export default doc;
