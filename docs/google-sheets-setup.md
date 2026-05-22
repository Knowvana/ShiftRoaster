# Google Sheets API Integration — Setup Guide

This guide walks you through setting up Google Sheets integration for the Shift Roster app. The integration runs entirely in the browser using OAuth 2.0 — no backend server required.

---

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com)

---

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a project** → **New Project**
3. Enter a project name (e.g., `Shift Roster`)
4. Click **Create**
5. Make sure your new project is selected in the top dropdown

---

## Step 2: Enable the Google Sheets API

1. In the Cloud Console, go to **APIs & Services** → **Library**
2. Search for **Google Sheets API**
3. Click on it and press **Enable**

---

## Step 3: Configure the OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type → Click **Create**
3. Fill in:
   - **App name**: `Shift Roster`
   - **User support email**: your email
   - **Developer contact email**: your email
4. Click **Save and Continue** through the remaining steps
5. Under **Scopes**, add:
   - `https://www.googleapis.com/auth/spreadsheets`
6. Under **Test users**, add your Google email
7. Click **Save and Continue** → **Back to Dashboard**

> **Note:** While in "Testing" mode, only test users you've added can use the OAuth flow. For production, you'd submit for verification.

---

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. **Application type**: Web application
4. **Name**: `Shift Roster Web Client`
5. **Authorized JavaScript origins** — Add ALL origins where your app runs:
   - For local development: `http://localhost:3000`
   - For GitHub Pages: `https://yourusername.github.io`
   - For custom domain: `https://yourdomain.com`
6. Leave **Authorized redirect URIs** empty (not needed for GIS)
7. Click **Create**
8. **Copy the Client ID** — it looks like: `123456789-abcdef.apps.googleusercontent.com`

---

## Step 5: Add the Client ID to Your App

Open `src/config/app.json` and add the `googleSheetsClientId` field:

```json
{
  "appName": "Shift Roster",
  "version": "1.0.0",
  "googleSheetsClientId": "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com",
  ...
}
```

Replace `YOUR_CLIENT_ID_HERE.apps.googleusercontent.com` with your actual Client ID from Step 4.

---

## Step 6: Test the Integration

1. Start the app: `npm run dev`
2. Log in and navigate to **Google Sheets** in the sidebar
3. Click **Connect Google Account**
4. Sign in with a Google account listed as a test user
5. Grant the Sheets permission
6. Select a month with roster data and click **Create Spreadsheet**
7. The spreadsheet opens in a new tab with color-coded shifts

---

## How It Works

The integration uses two Google libraries loaded dynamically in the browser:

| Library | Purpose |
|---------|---------|
| **Google Identity Services (GIS)** | OAuth 2.0 popup for user authentication |
| **Google API Client (gapi)** | Sheets API v4 calls to create/update spreadsheets |

### Data Flow

```
Browser (localStorage) → googleSheetsService.js → Google Sheets API v4 → Google Spreadsheet
```

- The roster data from localStorage is formatted into rows/columns
- A new spreadsheet is created in the user's Google Drive
- Shift cells are color-coded to match the app's shift colors
- A Legend sheet is added with shift definitions
- Headers are frozen for easy scrolling

### Token Management

- The OAuth access token is cached in localStorage (`shiftRoster_gsheets_token`)
- Tokens expire after ~1 hour; the user will be prompted to re-authenticate
- Clicking "Disconnect" revokes the token and clears the cache

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Setup Required" message | Add `googleSheetsClientId` to `app.json` |
| OAuth popup blocked | Allow popups for localhost in your browser |
| "Access denied" error | Add your email as a test user in the OAuth consent screen |
| "API not enabled" | Enable the Google Sheets API in Cloud Console |
| CORS errors | Make sure your origin is in Authorized JavaScript origins |
| Token expired | Click Connect again to re-authenticate |

---

## Security Notes

- The OAuth Client ID is **safe to include in client-side code** — it only identifies your app
- The **access token** is stored in localStorage and grants Sheets access only
- Users must explicitly grant permission via the Google OAuth popup
- No secrets or API keys are embedded in the code
- The app can only access spreadsheets it creates (scoped to the user's Drive)
