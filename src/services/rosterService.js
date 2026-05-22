/**
 * ============================================================================
 * rosterService.js — Roster Data Service
 * 
 * Handles all CRUD operations for monthly roster data within a project.
 * Data is stored in localStorage with the key format:
 *   shiftRoster_{projectId}_roster_{YYYY}_{MM}
 * 
 * The roster data structure is:
 *   {
 *     year: 2026,
 *     month: 2,       // 1-indexed (1=January, 2=February)
 *     projectId: 'proj_abc123',
 *     generatedAt: '2026-02-01T10:00:00Z',
 *     assignments: {
 *       'mem_abc123': {     // member ID as key
 *         '1': 'M',        // day number (1-28/30/31) : shift code
 *         '2': 'A',
 *         '3': 'WO',
 *         ...
 *       },
 *       'mem_def456': { ... }
 *     },
 *     onCall: {
 *       '1': 'mem_abc123',  // day number : member ID for on-call
 *       '2': 'mem_abc123',
 *       ...
 *     }
 *   }
 * ============================================================================
 */

import { isBackendConfigured, apiGet, apiPost } from '@services/apiClient';

// ---- Storage Key Helper ----
// Builds the localStorage key for a specific project + month roster
function getStorageKey(projectId, year, month) {
  const monthStr = String(month).padStart(2, '0');
  return `shiftRoster_${projectId}_roster_${year}_${monthStr}`;
}

/**
 * Get the number of days in a specific month.
 * Month is 1-indexed (1 = January).
 */
export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Get the day of the week for a specific date.
 * Returns 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
 */
export function getDayOfWeek(year, month, day) {
  return new Date(year, month - 1, day).getDay();
}

/**
 * Get the short day name for a day of the week.
 * 0 = Sun, 1 = Mon, ..., 6 = Sat.
 */
export function getDayName(dayOfWeek) {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return names[dayOfWeek];
}

/**
 * Check if a specific day is a weekend (Saturday or Sunday).
 */
export function isWeekend(year, month, day) {
  const dow = getDayOfWeek(year, month, day);
  return dow === 0 || dow === 6;
}

/**
 * Get the roster data for a specific project, year, and month.
 * Returns the roster object or null if no roster exists for that month.
 */
export function getRoster(projectId, year, month) {
  if (!projectId) return null;

  const key = getStorageKey(projectId, year, month);
  const stored = localStorage.getItem(key);

  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Save the roster data for a specific project, year, and month.
 * The rosterData should follow the structure described in the file header.
 */
export function saveRoster(projectId, year, month, rosterData) {
  const key = getStorageKey(projectId, year, month);
  const data = {
    ...rosterData,
    year,
    month,
    projectId,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(key, JSON.stringify(data));
  return data;
}

/**
 * Get a single member's assignment for a specific day.
 * Returns the shift code string (e.g., "M", "WO") or null.
 */
export function getAssignment(projectId, year, month, memberId, day) {
  const roster = getRoster(projectId, year, month);
  if (!roster || !roster.assignments || !roster.assignments[memberId]) {
    return null;
  }
  return roster.assignments[memberId][String(day)] || null;
}

/**
 * Update a single cell in the roster (one member, one day).
 * Creates the roster if it doesn't exist yet.
 */
export function updateAssignment(projectId, year, month, memberId, day, shiftCode) {
  let roster = getRoster(projectId, year, month);

  // Create empty roster if none exists
  if (!roster) {
    roster = {
      year,
      month,
      projectId,
      generatedAt: null,
      assignments: {},
      onCall: {},
    };
  }

  // Ensure the member has an assignments object
  if (!roster.assignments[memberId]) {
    roster.assignments[memberId] = {};
  }

  // Set the assignment
  roster.assignments[memberId][String(day)] = shiftCode;

  // Save back
  return saveRoster(projectId, year, month, roster);
}

/**
 * Get the shift code counts for a specific day across all members.
 * Returns an object like: { 'M': 3, 'A': 5, 'N': 2, 'WO': 4, 'PL': 1 }
 */
export function getDayShiftCounts(projectId, year, month, day) {
  const roster = getRoster(projectId, year, month);
  if (!roster || !roster.assignments) return {};

  const counts = {};
  const dayStr = String(day);

  for (const memberId of Object.keys(roster.assignments)) {
    const shiftCode = roster.assignments[memberId][dayStr];
    if (shiftCode) {
      counts[shiftCode] = (counts[shiftCode] || 0) + 1;
    }
  }

  return counts;
}

/**
 * Get the shift code counts for a specific member across the whole month.
 * Returns an object like: { 'M': 8, 'A': 7, 'N': 6, 'WO': 8, 'PL': 1 }
 */
export function getMemberMonthCounts(projectId, year, month, memberId) {
  const roster = getRoster(projectId, year, month);
  if (!roster || !roster.assignments || !roster.assignments[memberId]) return {};

  const counts = {};
  const memberAssignments = roster.assignments[memberId];

  for (const day of Object.keys(memberAssignments)) {
    const shiftCode = memberAssignments[day];
    if (shiftCode) {
      counts[shiftCode] = (counts[shiftCode] || 0) + 1;
    }
  }

  return counts;
}

/**
 * Delete the roster for a specific month.
 */
export function deleteRoster(projectId, year, month) {
  const key = getStorageKey(projectId, year, month);
  localStorage.removeItem(key);
}

/**
 * Check if a roster exists for a specific month.
 */
export function hasRoster(projectId, year, month) {
  const key = getStorageKey(projectId, year, month);
  return localStorage.getItem(key) !== null;
}

/**
 * Get a list of all months that have rosters for a project.
 * Scans localStorage keys matching the pattern.
 * Returns array of { year, month } objects.
 */
export function getAvailableMonths(projectId) {
  const months = [];
  const prefix = `shiftRoster_${projectId}_roster_`;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const parts = key.replace(prefix, '').split('_');
      if (parts.length === 2) {
        months.push({
          year: parseInt(parts[0], 10),
          month: parseInt(parts[1], 10),
        });
      }
    }
  }

  // Sort by year then month (newest first)
  months.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  return months;
}

// ============================================================================
// ASYNC API-BACKED FUNCTIONS (for Google Sheets backend)
// ============================================================================

/**
 * Fetch roster from backend (or localStorage if offline).
 */
export async function fetchRoster(projectId, year, month) {
  if (!isBackendConfigured()) return getRoster(projectId, year, month);
  try {
    const res = await apiGet('getRoster', { projectId, year, month });
    const roster = res.data;
    if (roster) {
      // Cache locally
      const key = getStorageKey(projectId, year, month);
      localStorage.setItem(key, JSON.stringify(roster));
    }
    return roster;
  } catch {
    return getRoster(projectId, year, month);
  }
}

/**
 * Save roster to backend (and localStorage cache).
 */
export async function syncRoster(projectId, year, month, rosterData) {
  // Always save locally
  saveRoster(projectId, year, month, rosterData);
  if (!isBackendConfigured()) return;
  try {
    await apiPost('saveRoster', { projectId, year, month, data: rosterData });
  } catch (err) {
    console.warn('[rosterService] Failed to sync roster to backend:', err.message);
  }
}

/**
 * Delete roster from backend (and localStorage).
 */
export async function syncDeleteRoster(projectId, year, month) {
  deleteRoster(projectId, year, month);
  if (!isBackendConfigured()) return;
  try {
    await apiPost('deleteRoster', { projectId, year, month });
  } catch (err) {
    console.warn('[rosterService] Failed to delete roster from backend:', err.message);
  }
}

/**
 * Create a formatted (color-coded) roster sheet in Google Sheets.
 * Only works when backend is configured. No-op otherwise.
 */
export async function syncFormattedRoster(projectId, projectName, year, month, members, shifts, assignments) {
  if (!isBackendConfigured()) return;
  try {
    await apiPost('createFormattedRoster', {
      projectId, projectName, year, month, members, shifts, assignments
    });
  } catch (err) {
    console.warn('[rosterService] Failed to create formatted roster:', err.message);
  }
}

/**
 * Fetch available roster months from backend.
 */
export async function fetchAvailableMonths(projectId) {
  if (!isBackendConfigured()) return getAvailableMonths(projectId);
  try {
    const res = await apiGet('getAvailableMonths', { projectId });
    return res.data || [];
  } catch {
    return getAvailableMonths(projectId);
  }
}
