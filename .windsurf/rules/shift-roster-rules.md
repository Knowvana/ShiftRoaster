# Shift Roster — Universal UI & Coding Standards

These rules apply to ALL files in the Shift Roster project without exception.

---

## 1. Universal UI Design Standards

### Color Theme (Consistent Across ALL Pages)
- **Primary/Brand:** Indigo (`brand-500` = `#6366f1`) — buttons, links, active states, headers
- **Success:** Emerald (`emerald-500`) — confirmations, active/online indicators
- **Warning:** Amber (`amber-500`) — alerts, pending states, caution messages
- **Danger:** Rose (`rose-500`) — errors, destructive actions, critical alerts
- **Neutral:** Slate — text (`slate-800`), borders (`slate-200`), backgrounds (`slate-50`)
- **Shift colors** are user-customizable per project and stored in config

### Typography
- **Font family:** Inter (loaded from Google Fonts)
- **Headings:** `font-semibold` or `font-bold`, `text-slate-800`
- **Body text:** `text-sm`, `text-slate-600`
- **Labels:** `text-sm font-medium text-slate-700`
- **Captions/help:** `text-xs text-slate-500`

### Spacing & Layout
- **Page container:** `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6`
- **Card/section:** `bg-white rounded-xl border border-slate-200 shadow-card p-5`
- **Section gap:** `space-y-6` between major sections
- **Form field gap:** `space-y-4` between form fields
- **Button gap:** `gap-3` between adjacent buttons

### Buttons (3 Variants Only)
- **Primary:** `bg-brand-600 text-white hover:bg-brand-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors`
- **Secondary:** `bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors`
- **Danger:** `bg-rose-600 text-white hover:bg-rose-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors`
- **Disabled:** Add `opacity-50 cursor-not-allowed` to any variant

### Inputs & Selects
- **All inputs:** `w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all`
- **Labels above inputs:** `block text-sm font-medium text-slate-700 mb-1`

### Modals
- **Backdrop:** `fixed inset-0 bg-black/50 z-50`
- **Modal box:** `bg-white rounded-2xl shadow-modal max-w-lg w-full mx-4 animate-slide-up`
- **Header:** `px-6 py-4 border-b border-slate-200`
- **Body:** `px-6 py-4`
- **Footer:** `px-6 py-4 border-t border-slate-100 flex justify-end gap-3`

### Tables
- **Header row:** `bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider`
- **Body rows:** `text-sm text-slate-700 border-b border-slate-100 hover:bg-slate-50/50`
- **Cell padding:** `px-4 py-3`

### Toast Notifications
- **Success:** Green left border + emerald icon
- **Error:** Red left border + rose icon
- **Info:** Blue left border + brand icon
- **Position:** Top-right, stacked, auto-dismiss after 4 seconds

### Icons
- **Library:** Lucide React (only)
- **Size:** 16px (inline), 18px (buttons), 20px (headers), 24px (page icons)
- **Color:** Match parent text color or use brand gradient for emphasis

### Responsive Design
- **Mobile-first:** All pages must work on mobile (min 320px)
- **Breakpoints:** `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`
- **Sidebar:** Collapsible on mobile, visible on `lg:` and above

---

## 2. Coding Standards

### Readability First
- **Simple logic only:** No complex ternary chains. Use if/else for clarity.
- **Meaningful variable names:** `shiftCode` not `sc`, `memberName` not `mn`
- **One function = one job:** Functions should do exactly one thing
- **Max function length:** ~50 lines. Break larger functions into helpers.
- **No magic numbers/strings:** Use named constants or config values

### Comments
- **File header:** Every file starts with a JSDoc block explaining purpose
- **Section comments:** Use `// ---- Section Name ----` for visual separation
- **Function comments:** Brief JSDoc for every exported function
- **Inline comments:** Explain WHY, not WHAT (the code shows what)

### File Organization
- **Imports** at the top, grouped: React → third-party → local
- **Constants** after imports
- **Helper functions** before the main component
- **Main component** as the default export
- **No inline styles** — use Tailwind classes only

### React Patterns
- **Functional components only** (no class components)
- **Custom hooks** for shared logic (useAuth, useProject, useRoster)
- **Context** for global state (auth, current project, toast notifications)
- **Props destructuring** in function signature
- **Key prop** always from unique ID, never array index

### Import Aliases
- `@components/` → `src/components/`
- `@services/` → `src/services/`
- `@hooks/` → `src/hooks/`
- `@config/` → `src/config/`
- `@utils/` → `src/utils/`
- `@pages/` → `src/pages/`
- `@context/` → `src/context/`

---

## 3. Data Storage Rules

### Google Sheets as Backend
- **All reads/writes** go through `src/services/sheetsApi.js` — never call Google API directly
- **Sheet naming convention:** `{projectId}_members`, `{projectId}_shifts`, `{projectId}_roster_{YYYY_MM}`
- **Error handling:** Every API call wrapped in try/catch with user-friendly toast messages
- **Loading states:** Show spinner/skeleton while data loads

### Local Fallback
- When Google Sheets is not configured, the app uses **localStorage** as fallback
- Same API interface — components don't know which backend is active
- Data key format: `shiftRoster_{projectId}_{dataType}`
