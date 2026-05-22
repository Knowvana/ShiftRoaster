# Shift Roster Web App — Project Plan

A free, multi-project shift roster app with auto-generation, Google Sheets as backend, static admin auth, hosted on GitHub Pages.

---

## Architecture

```
┌─────────────────────┐       ┌──────────────────────┐
│  GitHub Pages (SPA)  │──────▶│  Google Sheets API    │
│  React + Vite        │◀──────│  (Database backend)   │
│  TailwindCSS         │       │  One sheet per project │
└─────────────────────┘       └──────────────────────┘
```

- **Frontend:** React 18 + Vite + TailwindCSS, hosted free on GitHub Pages
- **Backend/DB:** Google Sheets (one spreadsheet, multiple sheets per project). Falls back to localStorage when Sheets is not configured.
- **Auth:** Static admin credentials stored as SHA-256 hashes. Client-side verification. No external auth service.

---

## Features

1. **Multi-Project Support** — Create/switch between projects
2. **Customizable Shifts** — Admin defines shift codes, names, colors, times per project
3. **Auto-Generate Roster** — Algorithm ensures ≥2 days off/week, shift rotation, balanced staffing
4. **Manual Override** — Click to change any cell after auto-generation
5. **Leave Handling** — Mark leave, auto-adjust remaining roster to maintain coverage
6. **Swap Facility** — Request/approve shift swaps between team members
7. **On-Call Rotation** — Weekly primary on-call assignment
8. **Dashboard Stats** — Shift counts, availability, leave summary
9. **Export** — Download as Excel (.xlsx)

---

## Implementation Steps

| # | Step | Status |
|---|------|--------|
| 1 | Scaffold: Vite + React + Tailwind + routing + rules + docs | ✅ Done |
| 2 | Shared UI components (Button, Modal, Toast, Layout) | ✅ Done |
| 3 | Google Sheets API service layer | Pending |
| 4 | Auth service + Admin Login page | ✅ Done |
| 5 | Project Management (create/list/switch) | ✅ Done |
| 6 | Member Management (add/edit/remove) | Pending |
| 7 | Shift Definition (custom shifts with colors) | Pending |
| 8 | Roster Grid UI (monthly calendar view) | Pending |
| 9 | Auto-Generation Engine (algorithm) | Pending |
| 10 | Leave handling + auto-adjust roster | Pending |
| 11 | Swap facility (request/approve swaps) | Pending |
| 12 | Dashboard & Stats | Pending |
| 13 | On-Call Management | Pending |
| 14 | Export (Excel download) | Pending |
| 15 | GitHub Pages deploy pipeline | Pending |

---

## Tech Stack

| Layer | Technology | Cost |
|---|---|---|
| Framework | React 18 + Vite | Free |
| Styling | TailwindCSS + Lucide icons | Free |
| Google Sheets | googleapis npm package | Free |
| Export | SheetJS (xlsx) | Free |
| Hosting | GitHub Pages | Free |
| CI/CD | GitHub Actions | Free |

---

## Default Admin Credentials

- **Username:** admin
- **Password:** admin123
- Change after first login
