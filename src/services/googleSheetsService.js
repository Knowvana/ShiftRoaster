/**
 * ============================================================================
 * googleSheetsService.js — Google Sheets API Integration
 * 
 * Provides browser-based Google Sheets integration using:
 * - Google Identity Services (GIS) for OAuth 2.0 authentication
 * - Google Sheets API v4 for creating/updating spreadsheets
 * 
 * This service runs entirely in the browser — no backend server required.
 * The user signs in with their Google account and grants Sheets access.
 * 
 * SETUP REQUIRED:
 *   1. Create a Google Cloud project at https://console.cloud.google.com
 *   2. Enable the Google Sheets API
 *   3. Create OAuth 2.0 credentials (Web application type)
 *   4. Add your app's origin to Authorized JavaScript origins
 *   5. Set the Client ID in src/config/app.json → googleSheetsClientId
 *   See docs/google-sheets-setup.md for detailed instructions.
 * 
 * localStorage keys used:
 *   shiftRoster_gsheets_token    — cached OAuth access token
 *   shiftRoster_gsheets_links    — map of projectId_year_month → spreadsheet URL
 * ============================================================================
 */

// ---- Constants ----
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const TOKEN_KEY = 'shiftRoster_gsheets_token';
const LINKS_KEY = 'shiftRoster_gsheets_links';

// ---- Module-level state ----
let tokenClient = null;
let gapiLoaded = false;
let gisLoaded = false;

// ============================================================================
// SCRIPT LOADING — Load Google API + GIS libraries dynamically
// ============================================================================

/**
 * Load the Google API (gapi) client library script.
 * Returns a promise that resolves when gapi.client is ready.
 */
function loadGapiScript() {
  return new Promise((resolve, reject) => {
    if (gapiLoaded) { resolve(); return; }

    // Check if already in DOM
    if (window.gapi && window.gapi.client) {
      gapiLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({});
          await window.gapi.client.load(DISCOVERY_DOC);
          gapiLoaded = true;
          resolve();
        } catch (err) {
          reject(new Error('Failed to initialize Google API client: ' + err.message));
        }
      });
    };
    script.onerror = () => reject(new Error('Failed to load Google API script'));
    document.head.appendChild(script);
  });
}

/**
 * Load the Google Identity Services (GIS) script.
 * Returns a promise that resolves when google.accounts.oauth2 is available.
 */
function loadGisScript() {
  return new Promise((resolve, reject) => {
    if (gisLoaded) { resolve(); return; }

    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      gisLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gisLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Initialize the Google Sheets service.
 * Loads both Google scripts and sets up the token client.
 * Must be called before any other method.
 * 
 * @param {string} clientId — Your Google OAuth 2.0 Client ID
 * @returns {Promise<void>}
 */
export async function initGoogleSheets(clientId) {
  if (!clientId) {
    throw new Error('Google OAuth Client ID is required. Set it in app.json → googleSheetsClientId');
  }

  await Promise.all([loadGapiScript(), loadGisScript()]);

  // Create the token client (GIS)
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: () => {}, // Will be overridden per-call
  });

  // Restore cached token if available — validate it first
  const cached = getCachedToken();
  if (cached && cached.access_token) {
    window.gapi.client.setToken(cached);
    // Quick validation: if the token is stale, clear it
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' + cached.access_token);
      if (!res.ok) {
        console.log('[GoogleSheets] Cached token is expired, clearing.');
        window.gapi.client.setToken(null);
        clearCachedToken();
      }
    } catch {
      window.gapi.client.setToken(null);
      clearCachedToken();
    }
  }
}

/**
 * Check if the user is currently authenticated with a valid token.
 */
export function isAuthenticated() {
  const token = window.gapi?.client?.getToken();
  return !!token && !!token.access_token;
}

/**
 * Sign in the user via Google OAuth popup.
 * Returns a promise that resolves with the token on success.
 */
export function signIn() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Google Sheets not initialized. Call initGoogleSheets() first.'));
      return;
    }

    tokenClient.callback = (response) => {
      if (response.error) {
        reject(new Error(response.error_description || response.error));
        return;
      }
      // Cache the token
      const token = window.gapi.client.getToken();
      cacheToken(token);
      resolve(token);
    };

    // Always request a fresh token to avoid stale-token errors
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

/**
 * Sign out — revoke the token and clear cache.
 */
export function signOut() {
  const token = window.gapi?.client?.getToken();
  if (token) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken(null);
  }
  clearCachedToken();
}

/**
 * Get the signed-in user's email (from the token info endpoint).
 */
export async function getUserEmail() {
  const token = window.gapi?.client?.getToken();
  if (!token) return null;

  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo`,
      { headers: { Authorization: `Bearer ${token.access_token}` } }
    );
    const data = await res.json();
    return data.email || null;
  } catch {
    return null;
  }
}

// ---- Token caching helpers ----
function getCachedToken() {
  try {
    const stored = localStorage.getItem(TOKEN_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

function cacheToken(token) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
}

function clearCachedToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ============================================================================
// SPREADSHEET OPERATIONS
// ============================================================================

/**
 * Ensure the Sheets discovery doc is loaded so gapi.client.sheets is available.
 * Re-loads it if missing (can happen after token refresh).
 */
async function ensureSheetsLoaded() {
  if (window.gapi?.client?.sheets) return;
  console.log('[GoogleSheets] Loading Sheets discovery document...');
  try {
    await window.gapi.client.load('sheets', 'v4');
    console.log('[GoogleSheets] Sheets API loaded successfully');
  } catch (err) {
    throw new Error('Failed to load Sheets API: ' + (err?.message || err?.body || JSON.stringify(err)));
  }
}

/**
 * Create a new Google Spreadsheet with the roster data.
 * Returns the spreadsheet URL.
 * 
 * @param {string} title — Spreadsheet title (e.g., "Roster - May 2026 - ProjectName")
 * @param {Array} members — Array of member objects
 * @param {Array} shifts — Array of shift definition objects
 * @param {Object} assignments — Roster assignments { memberId: { day: shiftCode } }
 * @param {number} year — Roster year
 * @param {number} month — Roster month (1-indexed)
 * @returns {Promise<{ spreadsheetId: string, spreadsheetUrl: string }>}
 */
export async function createRosterSpreadsheet(title, members, shifts, assignments, year, month) {
  if (!isAuthenticated()) throw new Error('Not authenticated');
  await ensureSheetsLoaded();

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const daysInMonth = new Date(year, month, 0).getDate();

  // Build the shift code → color map
  const shiftColorMap = {};
  for (const s of shifts) {
    shiftColorMap[s.code] = s.color;
  }

  // ---- Build the header rows ----
  // Row 1: "Member" + day numbers (1, 2, 3, ...)
  const headerRow = ['Member'];
  for (let d = 1; d <= daysInMonth; d++) headerRow.push(String(d));
  headerRow.push('Total Working');

  // Row 2: "" + day names (Mon, Tue, ...)
  const dayNameRow = [''];
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNameRow.push(names[dow]);
  }
  dayNameRow.push('');

  // ---- Build member rows ----
  const dataRows = [];
  for (const member of members) {
    const row = [member.name];
    let workingDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const code = assignments[member.id]?.[String(d)] || '';
      row.push(code);
      const shift = code ? shifts.find((s) => s.code === code) : null;
      if (shift && shift.isWorkingShift) workingDays++;
    }
    row.push(String(workingDays));
    dataRows.push(row);
  }

  // ---- Availability summary row ----
  const availRow = ['Availability'];
  for (let d = 1; d <= daysInMonth; d++) {
    let count = 0;
    for (const member of members) {
      const code = assignments[member.id]?.[String(d)] || '';
      const shift = code ? shifts.find((s) => s.code === code) : null;
      if (shift && shift.isWorkingShift) count++;
    }
    availRow.push(String(count));
  }
  availRow.push('');

  // ---- Create the spreadsheet ----
  // NOTE: gapi.client sends top-level object keys as query params unless wrapped in `resource`.
  const sheetName = `${MONTH_NAMES[month - 1]} ${year}`;
  const createRes = await window.gapi.client.sheets.spreadsheets.create({
    resource: {
      properties: {
        title: title || `Roster - ${MONTH_NAMES[month - 1]} ${year}`,
      },
      sheets: [
        {
          properties: {
            title: sheetName,
            gridProperties: {
              rowCount: members.length + 4,
              columnCount: daysInMonth + 2,
            },
          },
        },
        {
          properties: {
            title: 'Legend',
          },
        },
      ],
    },
  });

  const spreadsheetId = createRes.result.spreadsheetId;
  const spreadsheetUrl = createRes.result.spreadsheetUrl;

  // Extract the actual sheet ID assigned by Google (don't assume 0)
  const rosterSheetId = createRes.result.sheets[0].properties.sheetId;
  console.log('[GoogleSheets] Created spreadsheet:', spreadsheetId, 'sheetId:', rosterSheetId);

  // ---- Write the data ----
  const allRows = [headerRow, dayNameRow, ...dataRows, availRow];

  await window.gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName}'!A1`,
    valueInputOption: 'RAW',
    resource: { values: allRows },
  });

  // ---- Write the legend sheet ----
  const legendRows = [['Shift Code', 'Shift Name', 'Color', 'Working']];
  for (const s of shifts) {
    legendRows.push([s.code, s.name, s.color, s.isWorkingShift ? 'Yes' : 'No']);
  }

  await window.gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'Legend'!A1`,
    valueInputOption: 'RAW',
    resource: { values: legendRows },
  });

  // ---- Apply color formatting to shift cells ----
  const requests = [];

  // Format header rows (bold, background)
  requests.push({
    repeatCell: {
      range: { sheetId: rosterSheetId, startRowIndex: 0, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: daysInMonth + 2 },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.92, green: 0.96, blue: 0.94 },
          textFormat: { bold: true, fontSize: 9 },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
    },
  });

  // Color each shift cell based on its shift code
  for (let rowIdx = 0; rowIdx < members.length; rowIdx++) {
    for (let d = 1; d <= daysInMonth; d++) {
      const code = assignments[members[rowIdx].id]?.[String(d)] || '';
      if (code && shiftColorMap[code]) {
        const hex = shiftColorMap[code];
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        requests.push({
          repeatCell: {
            range: {
              sheetId: rosterSheetId,
              startRowIndex: rowIdx + 2,
              endRowIndex: rowIdx + 3,
              startColumnIndex: d,
              endColumnIndex: d + 1,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: r, green: g, blue: b },
                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 9 },
                horizontalAlignment: 'CENTER',
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
          },
        });
      }
    }
  }

  // Format availability row
  requests.push({
    repeatCell: {
      range: {
        sheetId: rosterSheetId,
        startRowIndex: members.length + 2,
        endRowIndex: members.length + 3,
        startColumnIndex: 0,
        endColumnIndex: daysInMonth + 2,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
          textFormat: { bold: true, fontSize: 9 },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
    },
  });

  // Freeze first column and first 2 rows
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId: rosterSheetId,
        gridProperties: { frozenRowCount: 2, frozenColumnCount: 1 },
      },
      fields: 'gridProperties.frozenRowCount,gridProperties.frozenColumnCount',
    },
  });

  // Auto-resize member name column
  requests.push({
    autoResizeDimensions: {
      dimensions: { sheetId: rosterSheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 },
    },
  });

  // Apply all formatting
  if (requests.length > 0) {
    await window.gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests },
    });
  }

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Update an existing spreadsheet with new roster data.
 * Clears existing data and rewrites it.
 */
export async function updateRosterSpreadsheet(spreadsheetId, members, shifts, assignments, year, month) {
  if (!isAuthenticated()) throw new Error('Not authenticated');
  await ensureSheetsLoaded();

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const sheetName = `${MONTH_NAMES[month - 1]} ${year}`;
  const daysInMonth = new Date(year, month, 0).getDate();

  // Build data (same logic as create)
  const headerRow = ['Member'];
  for (let d = 1; d <= daysInMonth; d++) headerRow.push(String(d));
  headerRow.push('Total Working');

  const dayNameRow = [''];
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNameRow.push(names[dow]);
  }
  dayNameRow.push('');

  const dataRows = [];
  for (const member of members) {
    const row = [member.name];
    let wd = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const code = assignments[member.id]?.[String(d)] || '';
      row.push(code);
      const shift = code ? shifts.find((s) => s.code === code) : null;
      if (shift && shift.isWorkingShift) wd++;
    }
    row.push(String(wd));
    dataRows.push(row);
  }

  const availRow = ['Availability'];
  for (let d = 1; d <= daysInMonth; d++) {
    let count = 0;
    for (const member of members) {
      const code = assignments[member.id]?.[String(d)] || '';
      const shift = code ? shifts.find((s) => s.code === code) : null;
      if (shift && shift.isWorkingShift) count++;
    }
    availRow.push(String(count));
  }
  availRow.push('');

  // Clear and rewrite
  await window.gapi.client.sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${sheetName}'!A1:ZZ`,
  });

  const allRows = [headerRow, dayNameRow, ...dataRows, availRow];
  await window.gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName}'!A1`,
    valueInputOption: 'RAW',
    resource: { values: allRows },
  });

  return { spreadsheetId };
}

// ============================================================================
// LINK MANAGEMENT — Remember which spreadsheets belong to which roster months
// ============================================================================

/**
 * Get the saved spreadsheet link for a project + month.
 * Returns { spreadsheetId, spreadsheetUrl } or null.
 */
export function getSavedLink(projectId, year, month) {
  const links = getAllLinks();
  const key = `${projectId}_${year}_${String(month).padStart(2, '0')}`;
  return links[key] || null;
}

/**
 * Save a spreadsheet link for a project + month.
 */
export function saveLink(projectId, year, month, spreadsheetId, spreadsheetUrl) {
  const links = getAllLinks();
  const key = `${projectId}_${year}_${String(month).padStart(2, '0')}`;
  links[key] = { spreadsheetId, spreadsheetUrl };
  localStorage.setItem(LINKS_KEY, JSON.stringify(links));
}

/**
 * Get all saved spreadsheet links.
 */
function getAllLinks() {
  try {
    const stored = localStorage.getItem(LINKS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
}
