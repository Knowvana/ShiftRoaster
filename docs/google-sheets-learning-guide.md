# Google Sheets API — Learning Guide (Concepts + Setup)

This guide teaches you **why** we do each step, not just **how**. By the end, you'll understand OAuth 2.0, API keys vs Client IDs, consent screens, and how browser-based apps talk to Google APIs.

---

## 🧠 The Big Picture — What Problem Are We Solving?

Our Shift Roster app runs **entirely in the browser**. All data lives in `localStorage`. But we want to **push roster data to Google Sheets** so users can share, print, and collaborate.

Here's the challenge:
- Google Sheets belongs to a **user's Google account**
- Our app can't just write to someone's Google Drive without permission
- We need the user to **explicitly grant permission** via a secure login flow

This is where **OAuth 2.0** comes in.

---

## 🔐 Concept 1: What is OAuth 2.0?

**OAuth 2.0** is an industry-standard protocol that lets a user grant a third-party app (our Shift Roster) limited access to their account (Google) **without sharing their password**.

### The Analogy
Think of it like a hotel key card:
- You (the guest) check in at reception (Google's login page)
- Reception gives you a **key card** (access token) that only opens your room (Sheets access)
- The key card **expires** after checkout (token expires after ~1 hour)
- The hotel app (our code) never sees your master key (password)

### The Flow in Our App
```
1. User clicks "Connect Google Account" in our app
2. A Google popup appears asking them to sign in
3. Google asks: "Shift Roster wants to access your Google Sheets. Allow?"
4. User clicks "Allow"
5. Google gives our app a temporary ACCESS TOKEN
6. Our app uses that token to call the Sheets API
7. Token expires after ~1 hour → user re-authenticates if needed
```

---

## 🏗️ Concept 2: What is a Google Cloud Project?

A **Google Cloud Project** is a container that organizes everything related to your app's use of Google services. Think of it as a "folder" in Google's cloud that holds:

- Which Google APIs your app uses (Sheets, Drive, Maps, etc.)
- Your app's credentials (Client IDs, API keys)
- Your app's OAuth consent screen (what users see when logging in)
- Usage quotas and analytics

**Why do we need one?** Because Google needs to know WHO is making API calls. The project is how Google identifies your app.

**Cost:** Free. Creating a project costs nothing. The Sheets API itself is free.

---

## 🔑 Concept 3: Client ID vs API Key — What's the Difference?

Google offers two types of credentials:

| Credential | Purpose | When to Use |
|-----------|---------|-------------|
| **API Key** | Identifies your app for PUBLIC data (no user login) | Reading public Google Sheets, Maps embed |
| **OAuth Client ID** | Identifies your app + authenticates a USER | When you need to access a user's private data (their Sheets, Drive) |

**We use a Client ID** because we need to create spreadsheets **in the user's Google Drive** — that requires their permission.

The Client ID is like your app's "business card" that tells Google: "I'm the Shift Roster app, and I'd like to request access on behalf of this user."

---

## 📋 Concept 4: What is the OAuth Consent Screen?

When a user clicks "Connect Google Account," they see a Google-branded popup that says something like:

```
┌─────────────────────────────────────┐
│          Sign in with Google        │
│                                     │
│  "Shift Roster" wants to:          │
│  ✔ View and manage your Google     │
│    Sheets spreadsheets              │
│                                     │
│        [Allow]    [Deny]            │
└─────────────────────────────────────┘
```

The **OAuth Consent Screen** is what you configure in Google Cloud to control:
- Your app's name shown to users
- What permissions (scopes) you're requesting
- Your app's logo and privacy policy (optional for testing)
- Who can use it (test users vs. everyone)

**Testing vs. Production mode:**
- **Testing:** Only Google accounts you manually add as "test users" can sign in (up to 100). No verification needed.
- **Production:** Anyone with a Google account can sign in. Requires Google's review (takes a few days).

For our use case, **Testing mode is perfectly fine** — you'll add your own email as a test user.

---

## 🌐 Concept 5: Authorized JavaScript Origins

When you create a Client ID, Google asks: "Where will your app run?"

This is a **security measure**. Google will ONLY allow OAuth requests from domains you've pre-approved. If someone steals your Client ID and tries to use it from a different website, Google blocks it.

For our app:
- **Local development:** `http://localhost:3000` (Vite dev server)
- **GitHub Pages:** `https://yourusername.github.io` (after deployment)

This is why the Client ID is safe to put in client-side code — it's useless without being on an authorized origin.

---

## 📚 Concept 6: Scopes — What Permissions Are We Requesting?

A **scope** defines what your app can do with the user's data. We request:

```
https://www.googleapis.com/auth/spreadsheets
```

This grants: **Read and write access to Google Sheets** (create new spreadsheets, update existing ones).

We do NOT request:
- `drive` (full Drive access — too broad)
- `drive.file` (access all files — too broad)
- `spreadsheets.readonly` (can't create sheets — too limited)

**Principle of least privilege:** Always request the minimum permissions needed.

---

## 🔄 Concept 7: How Our Code Uses All This

Here's how the pieces connect in our codebase:

```
┌──────────────────────────────────────────────────────────┐
│  src/config/app.json                                     │
│  └── googleSheetsClientId: "123...googleusercontent.com" │
│       ↓                                                  │
│  src/services/googleSheetsService.js                     │
│  ├── initGoogleSheets(clientId)                          │
│  │   ├── Loads Google API script (gapi)                  │
│  │   └── Loads Google Identity Services script (GIS)     │
│  ├── signIn()                                            │
│  │   ├── Opens OAuth popup via GIS                       │
│  │   └── Receives access token → caches in localStorage  │
│  ├── createRosterSpreadsheet(...)                        │
│  │   ├── Uses gapi.client.sheets to CREATE a sheet       │
│  │   ├── Writes roster data as rows/columns              │
│  │   └── Applies color formatting to shift cells         │
│  └── updateRosterSpreadsheet(...)                        │
│       └── Clears + rewrites data in existing sheet       │
│                                                          │
│  src/pages/GoogleSheetsPage.jsx                          │
│  └── UI: Connect button, month selector, create/update   │
└──────────────────────────────────────────────────────────┘
```

Two Google libraries are loaded dynamically in the browser:

| Library | What It Does |
|---------|-------------|
| **gapi** (Google API Client) | Makes HTTP calls to the Sheets API v4. Handles request formatting, authentication headers, error handling |
| **GIS** (Google Identity Services) | Shows the OAuth popup, handles the sign-in flow, returns the access token |

---

# 🛠️ HANDS-ON SETUP — Step by Step

Now that you understand the concepts, let's do the actual setup.

---

## Step 1: Create a Google Cloud Project

**What we're doing:** Creating a container for our app's Google API configuration.

1. Open [Google Cloud Console](https://console.cloud.google.com)
2. If you've never used it, accept the Terms of Service
3. At the top-left, click the project dropdown (it might say "Select a project")
4. Click **New Project** in the popup
5. Enter:
   - **Project name:** `Shift Roster` (or any name you like)
   - **Organization:** Leave as "No organization" if you see that option
6. Click **Create**
7. Wait a few seconds, then click **Select Project** in the notification

**What happened:** You now have a Google Cloud Project. It's like an empty box — no APIs enabled, no credentials yet.

---

## Step 2: Enable the Google Sheets API

**What we're doing:** Telling Google "my app wants to use the Sheets API." APIs are disabled by default for security.

1. In the left sidebar, click **APIs & Services** → **Library**
   (Or search "API Library" in the top search bar)
2. In the search box, type **Google Sheets API**
3. Click on the result: **Google Sheets API** (by Google)
4. Click the big blue **Enable** button
5. Wait for it to enable (takes a few seconds)

**What happened:** Your project can now make Google Sheets API calls. Without this, any call to create/update sheets would return "API not enabled" error.

---

## Step 3: Configure the OAuth Consent Screen

**What we're doing:** Defining what users see when they sign in through our app. This is the "permission request" screen.

1. Go to **APIs & Services** → **OAuth consent screen** (left sidebar)
2. Select **External** → Click **Create**
   - "External" means any Google user can potentially use it (vs. "Internal" which is only for Google Workspace organizations)
3. Fill in the **App information:**
   - **App name:** `Shift Roster`
   - **User support email:** Select your email from the dropdown
   - **App logo:** Skip (optional)
4. Scroll down to **Developer contact information:**
   - Enter your email address
5. Click **Save and Continue**
6. **Scopes page:** Click **Add or Remove Scopes**
   - In the search/filter box, type `spreadsheets`
   - Check the box next to: `https://www.googleapis.com/auth/spreadsheets`
   - Click **Update** at the bottom
   - Click **Save and Continue**
7. **Test users page:** Click **+ Add Users**
   - Enter your Google email address (the one you'll use to sign in)
   - Click **Add**
   - Click **Save and Continue**
8. Click **Back to Dashboard**

**What happened:** You've configured the consent screen. When you sign in via the app, you'll see "Shift Roster wants to access your Google Sheets" — this is what you just configured.

**Important:** Your app is in "Testing" mode. Only the test user(s) you added can use it. This is fine for personal/team use.

---

## Step 4: Create OAuth 2.0 Credentials (Client ID)

**What we're doing:** Generating the Client ID that our app uses to identify itself to Google.

1. Go to **APIs & Services** → **Credentials** (left sidebar)
2. Click **+ CREATE CREDENTIALS** at the top → Choose **OAuth client ID**
3. **Application type:** Select **Web application**
4. **Name:** `Shift Roster Web Client` (just a label for your reference)
5. **Authorized JavaScript origins:** Click **+ ADD URI** and add:
   - `http://localhost:3000` (for local development with Vite)
   - If you'll deploy to GitHub Pages later, also add: `https://yourusername.github.io`
6. **Authorized redirect URIs:** Leave empty (not needed for our flow)
7. Click **Create**
8. A popup appears with your **Client ID** — it looks like:
   ```
   123456789012-abcdefghijklmnop.apps.googleusercontent.com
   ```
9. **Copy this Client ID** — you'll need it in the next step

**What happened:** Google generated a unique identifier for your app. When our code opens the OAuth popup, it sends this Client ID so Google knows which app is requesting access.

---

## Step 5: Add Client ID to Your App

**What we're doing:** Wiring the Client ID into our app so `googleSheetsService.js` can use it.

Open `src/config/app.json` and add the `googleSheetsClientId` field:

```json
{
  "appName": "Shift Roster",
  "version": "1.0.0",
  "googleSheetsClientId": "PASTE_YOUR_CLIENT_ID_HERE",
  ...rest of config...
}
```

**What happened:** Our service reads this ID on initialization and passes it to the Google Identity Services library, which uses it to open the correct OAuth popup.

---

## Step 6: Test It

1. Make sure the dev server is running (`npm run dev`)
2. Log in to the Shift Roster app
3. Click **Google Sheets** in the sidebar
4. Click **Connect Google Account**
5. Sign in with the Google account you added as a test user
6. Grant the Sheets permission
7. Select a month that has saved roster data
8. Click **Create Spreadsheet**
9. A new tab opens with your color-coded roster in Google Sheets!

---

## 🎓 Key Takeaways

1. **OAuth 2.0** lets users grant limited access without sharing passwords
2. **Google Cloud Projects** organize your API usage — they're free
3. **Client IDs** identify your app; they're safe in client-side code
4. **Scopes** control what permissions your app requests — always ask for minimum
5. **Consent Screen** is what users see — you control the messaging
6. **Authorized Origins** prevent Client ID misuse from unauthorized domains
7. **The Sheets API is free** — no billing, no credit card, no trial period
