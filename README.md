# Shift Roster

A free, multi-project shift roster management web app with auto-generation, leave handling, and swap facility.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## Default Login

- **Username:** admin
- **Password:** admin123

## Features

- Multi-project support (manage multiple teams)
- Customizable shifts (define your own shift codes, colors, times)
- Auto-generate monthly rosters with fair rotation
- Leave handling with auto-adjustment
- Shift swap requests and approvals
- Dashboard with stats and availability
- Export to Excel

## Tech Stack

- React 18 + Vite
- TailwindCSS + Lucide Icons
- localStorage (with Google Sheets integration planned)
- GitHub Pages hosting (free)

## Deploy to GitHub Pages

Automatic deployment via GitHub Actions on every push to `main` or feature branches.

[![Deploy to GitHub Pages](https://github.com/Knowvana/ShiftRoaster/actions/workflows/deploy.yml/badge.svg)](https://github.com/Knowvana/ShiftRoaster/actions/workflows/deploy.yml)

**Deployment URLs:**
- Main: `https://knowvana.github.io/ShiftRoaster/`
- Feature branches: `https://knowvana.github.io/ShiftRoaster/feature/branch-name/`

## Documentation

See the `docs/` folder for detailed documentation.
