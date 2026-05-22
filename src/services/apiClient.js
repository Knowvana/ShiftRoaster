/**
 * ============================================================================
 * apiClient.js — API Client for Google Apps Script Backend
 *
 * This module handles all HTTP communication between the React frontend
 * and the Google Apps Script web app (our serverless backend).
 *
 * HOW IT WORKS:
 *   - GET requests: read operations (fetch data)
 *   - POST requests: write operations (save/update/delete data)
 *   - All requests include the APP_TOKEN for simple auth
 *   - Apps Script returns JSON: { success, data?, error? }
 *
 * CONFIGURATION:
 *   Set the Apps Script deployment URL and token in src/config/app.json:
 *     "appsScriptUrl": "https://script.google.com/macros/s/XXXXX/exec"
 *     "appsScriptToken": "shiftRoster2026"
 *
 * OFFLINE FALLBACK:
 *   If the Apps Script URL is not configured, all operations fall back
 *   to localStorage so the app still works offline / during development.
 * ============================================================================
 */

import appConfig from '@config/app.json';

// ---- Configuration ----
const SCRIPT_URL = appConfig.appsScriptUrl || '';
const APP_TOKEN = appConfig.appsScriptToken || 'shiftRoster2026';

/**
 * Check if the backend is configured (Apps Script URL is set).
 * If false, services should use localStorage fallback.
 */
export function isBackendConfigured() {
  return !!SCRIPT_URL && SCRIPT_URL.startsWith('https://');
}

/**
 * Make a GET request to the Apps Script backend.
 *
 * @param {string} action — The action name (e.g., 'getProjects', 'getMembers')
 * @param {Object} params — Additional query parameters (e.g., { projectId: '...' })
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export async function apiGet(action, params = {}) {
  if (!isBackendConfigured()) {
    throw new Error('Backend not configured');
  }

  const url = new URL(SCRIPT_URL);
  url.searchParams.set('token', APP_TOKEN);
  url.searchParams.set('action', action);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`API GET failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Unknown API error');
  }

  return result;
}

/**
 * Make a POST request to the Apps Script backend.
 *
 * @param {string} action — The action name (e.g., 'saveMembers', 'saveRoster')
 * @param {Object} body — The request body (will include action and token automatically)
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export async function apiPost(action, body = {}) {
  if (!isBackendConfigured()) {
    throw new Error('Backend not configured');
  }

  const payload = {
    ...body,
    action,
    token: APP_TOKEN,
  };

  const response = await fetch(SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain', // Apps Script requires text/plain to avoid CORS preflight
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`API POST failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Unknown API error');
  }

  return result;
}

/**
 * Test the connection to the Apps Script backend.
 * Returns true if the backend responds with a successful ping.
 */
export async function testConnection() {
  try {
    const result = await apiGet('ping');
    return result.success === true;
  } catch {
    return false;
  }
}
