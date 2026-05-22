/**
 * ============================================================================
 * onCallService.js — On-Call Resource Management
 * 
 * Manages on-call assignments for shift resources.
 * On-call is tracked daily per weekday/weekend, not per shift.
 * Data is stored in localStorage and synced with backend.
 * ============================================================================
 */

import { apiGet, apiPost, isBackendConfigured } from './apiClient';

const STORAGE_PREFIX = 'oncall_';

/**
 * Get storage key for on-call data
 */
function getStorageKey(projectId, year, month) {
  return `${STORAGE_PREFIX}${projectId}_${year}_${month}`;
}

/**
 * Get on-call assignments from localStorage
 * Returns: { memberId: { '1': 'weekday'|'weekend', '2': 'weekday'|'weekend', ... }, ... }
 */
export function getOnCallAssignments(projectId, year, month) {
  if (!projectId) return {};
  const key = getStorageKey(projectId, year, month);
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : {};
}

/**
 * Save on-call assignments to localStorage
 */
export function saveOnCallAssignments(projectId, year, month, assignments) {
  if (!projectId) return;
  const key = getStorageKey(projectId, year, month);
  localStorage.setItem(key, JSON.stringify(assignments));
}

/**
 * Fetch on-call assignments from backend
 */
export async function fetchOnCallAssignments(projectId, year, month) {
  if (!isBackendConfigured()) {
    return getOnCallAssignments(projectId, year, month);
  }

  try {
    const res = await apiGet('getOnCallAssignments', { projectId, year, month });
    const assignments = res.data || {};
    if (Object.keys(assignments).length > 0) {
      saveOnCallAssignments(projectId, year, month, assignments);
      return assignments;
    }
    return getOnCallAssignments(projectId, year, month);
  } catch {
    return getOnCallAssignments(projectId, year, month);
  }
}

/**
 * Sync on-call assignments to backend
 */
export async function syncOnCallAssignments(projectId, year, month, assignments) {
  saveOnCallAssignments(projectId, year, month, assignments);
  
  if (!isBackendConfigured()) return;

  try {
    await apiPost('syncOnCallAssignments', {
      projectId,
      year,
      month,
      assignments,
    });
  } catch (err) {
    console.error('Failed to sync on-call assignments:', err);
  }
}

/**
 * Get on-call counts per member for a month
 * Returns: { memberId: { weekday: count, weekend: count }, ... }
 */
export function getOnCallCounts(assignments, year, month, totalDays) {
  const counts = {};

  for (const [memberId, days] of Object.entries(assignments)) {
    let weekdayCount = 0;
    let weekendCount = 0;

    for (let day = 1; day <= totalDays; day++) {
      const dayStr = String(day);
      const type = days[dayStr];
      if (!type) continue;

      const date = new Date(year, month - 1, day);
      const dow = date.getDay();
      const isWeekend = dow === 0 || dow === 6;

      if (isWeekend && type === 'weekend') {
        weekendCount++;
      } else if (!isWeekend && type === 'weekday') {
        weekdayCount++;
      }
    }

    counts[memberId] = { weekday: weekdayCount, weekend: weekendCount };
  }

  return counts;
}

/**
 * Check if a member is on-call on a specific day
 */
export function isOnCall(assignments, memberId, day) {
  return assignments[memberId]?.[String(day)] ? true : false;
}

/**
 * Get on-call type for a day (weekday or weekend)
 */
export function getOnCallType(assignments, memberId, day) {
  return assignments[memberId]?.[String(day)] || null;
}

/**
 * Set on-call assignment for a member on a day
 */
export function setOnCall(assignments, memberId, day, type) {
  if (!assignments[memberId]) {
    assignments[memberId] = {};
  }
  if (type) {
    assignments[memberId][String(day)] = type;
  } else {
    delete assignments[memberId][String(day)];
  }
  return assignments;
}
