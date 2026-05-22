/**
 * ============================================================================
 * emailConfigService.js — Email Notification Configuration Service
 * 
 * Manages email notification settings per project.
 * Controls which emails are sent, when, and to whom.
 * Data stored in localStorage with Google Sheets backend sync.
 * 
 * EmailConfig object shape:
 *   {
 *     shiftStartEmail: {
 *       enabled: true,
 *       minutesBefore: 30,
 *       sendToResources: true,
 *       sendToSupervisors: true,
 *     },
 *     shiftEndEmail: {
 *       enabled: true,
 *       sendToResources: true,
 *       sendToSupervisors: true,
 *     },
 *     dailyConsolidatedEmail: {
 *       enabled: true,
 *       sendTime: '20:00',
 *       sendToSupervisors: true,
 *       sendToResources: false,
 *     },
 *     swapNotificationEmail: {
 *       enabled: true,
 *       sendToResources: true,
 *       sendToSupervisors: true,
 *     },
 *     additionalRecipients: ['manager@example.com'],
 *     senderName: 'Shift Roster',
 *     updatedAt: '2026-01-15T10:30:00.000Z'
 *   }
 * ============================================================================
 */

import { isBackendConfigured, apiGet, apiPost } from '@services/apiClient';

// ---- Storage Key Helper ----
function getStorageKey(projectId) {
  return `shiftRoster_${projectId}_emailConfig`;
}

// ---- Default Email Configuration ----
export const DEFAULT_EMAIL_CONFIG = {
  shiftStartEmail: {
    enabled: true,
    minutesBefore: 30,
    sendToResources: true,
    sendToSupervisors: true,
  },
  shiftEndEmail: {
    enabled: true,
    sendToResources: true,
    sendToSupervisors: true,
  },
  dailyConsolidatedEmail: {
    enabled: true,
    sendTime: '20:00',
    sendToSupervisors: true,
    sendToResources: false,
  },
  swapNotificationEmail: {
    enabled: true,
    sendToResources: true,
    sendToSupervisors: true,
  },
  additionalRecipients: [],
  senderName: 'Shift Roster',
  updatedAt: null,
};

// ============================================================================
// LOCAL STORAGE FUNCTIONS
// ============================================================================

/** Get email config for a project (returns defaults if none saved) */
export function getEmailConfig(projectId) {
  const key = getStorageKey(projectId);
  const data = localStorage.getItem(key);
  if (!data) return { ...DEFAULT_EMAIL_CONFIG };

  try {
    const config = JSON.parse(data);
    // Merge with defaults to ensure all keys exist
    return {
      ...DEFAULT_EMAIL_CONFIG,
      ...config,
      shiftStartEmail: { ...DEFAULT_EMAIL_CONFIG.shiftStartEmail, ...config.shiftStartEmail },
      shiftEndEmail: { ...DEFAULT_EMAIL_CONFIG.shiftEndEmail, ...config.shiftEndEmail },
      dailyConsolidatedEmail: { ...DEFAULT_EMAIL_CONFIG.dailyConsolidatedEmail, ...config.dailyConsolidatedEmail },
      swapNotificationEmail: { ...DEFAULT_EMAIL_CONFIG.swapNotificationEmail, ...config.swapNotificationEmail },
    };
  } catch {
    return { ...DEFAULT_EMAIL_CONFIG };
  }
}

/** Save email config to localStorage */
export function saveEmailConfig(projectId, config) {
  const key = getStorageKey(projectId);
  const updated = { ...config, updatedAt: new Date().toISOString() };
  localStorage.setItem(key, JSON.stringify(updated));
  return updated;
}

// ============================================================================
// ASYNC API-BACKED FUNCTIONS (for Google Sheets backend)
// ============================================================================

/**
 * Fetch email config from backend (or localStorage if offline).
 */
export async function fetchEmailConfig(projectId) {
  if (!isBackendConfigured()) return getEmailConfig(projectId);
  try {
    const res = await apiGet('getEmailConfig', { projectId });
    if (res.data && Object.keys(res.data).length > 0) {
      const merged = {
        ...DEFAULT_EMAIL_CONFIG,
        ...res.data,
        shiftStartEmail: { ...DEFAULT_EMAIL_CONFIG.shiftStartEmail, ...res.data.shiftStartEmail },
        shiftEndEmail: { ...DEFAULT_EMAIL_CONFIG.shiftEndEmail, ...res.data.shiftEndEmail },
        dailyConsolidatedEmail: { ...DEFAULT_EMAIL_CONFIG.dailyConsolidatedEmail, ...res.data.dailyConsolidatedEmail },
        swapNotificationEmail: { ...DEFAULT_EMAIL_CONFIG.swapNotificationEmail, ...res.data.swapNotificationEmail },
      };
      const key = getStorageKey(projectId);
      localStorage.setItem(key, JSON.stringify(merged));
      return merged;
    }
    return getEmailConfig(projectId);
  } catch {
    return getEmailConfig(projectId);
  }
}

/**
 * Save email config to backend (and localStorage cache).
 */
export async function syncEmailConfig(projectId, config) {
  const saved = saveEmailConfig(projectId, config);
  if (!isBackendConfigured()) return saved;
  try {
    await apiPost('saveEmailConfig', { projectId, data: saved });
  } catch (err) {
    console.warn('[emailConfigService] Failed to sync to backend:', err.message);
  }
  return saved;
}

/**
 * Trigger a test email via backend.
 */
export async function sendTestEmail(projectId, emailType, recipientEmail) {
  if (!isBackendConfigured()) {
    throw new Error('Backend not configured. Set the Apps Script URL in app.json.');
  }
  const res = await apiPost('sendTestEmail', { projectId, emailType, recipientEmail });
  return res;
}
