/**
 * ============================================================================
 * onCallService.js — On-Call Resource Management
 * 
 * Manages on-call configuration, eligibility, and assignments.
 * 
 * Features:
 * - On-call config: number of resources per day, rotation period
 * - Member eligibility: toggle per member
 * - Auto-assignment: random selection with weekly rotation
 * - Daily tracking: each day has a list of on-call member IDs
 * 
 * Data stored in localStorage and synced with backend.
 * ============================================================================
 */

import { apiGet, apiPost, isBackendConfigured } from './apiClient';

// ---- Storage Keys ----
const STORAGE_PREFIX = 'oncall_';
const CONFIG_PREFIX = 'oncall_config_';

// ============================================================================
// ON-CALL CONFIGURATION (per project)
// ============================================================================

const DEFAULT_CONFIG = {
  resourcesPerDay: 1,
  rotationPeriodDays: 7,
  enabled: false,
};

/**
 * Get on-call config for a project
 */
export function getOnCallConfig(projectId) {
  if (!projectId) return { ...DEFAULT_CONFIG };
  const key = `${CONFIG_PREFIX}${projectId}`;
  const stored = localStorage.getItem(key);
  return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : { ...DEFAULT_CONFIG };
}

/**
 * Save on-call config for a project
 */
export function saveOnCallConfig(projectId, config) {
  if (!projectId) return;
  const key = `${CONFIG_PREFIX}${projectId}`;
  localStorage.setItem(key, JSON.stringify(config));
}

/**
 * Fetch on-call config from backend
 */
export async function fetchOnCallConfig(projectId) {
  if (!isBackendConfigured()) return getOnCallConfig(projectId);
  try {
    const res = await apiGet('getOnCallConfig', { projectId });
    const config = res.data || {};
    if (Object.keys(config).length > 0) {
      saveOnCallConfig(projectId, config);
      return { ...DEFAULT_CONFIG, ...config };
    }
    return getOnCallConfig(projectId);
  } catch {
    return getOnCallConfig(projectId);
  }
}

/**
 * Sync on-call config to backend
 */
export async function syncOnCallConfig(projectId, config) {
  saveOnCallConfig(projectId, config);
  if (!isBackendConfigured()) return;
  try {
    await apiPost('syncOnCallConfig', { projectId, config });
  } catch (err) {
    console.error('Failed to sync on-call config:', err);
  }
}

// ============================================================================
// ON-CALL ASSIGNMENTS (per project/month)
// ============================================================================

/**
 * Get storage key for on-call assignments
 */
function getStorageKey(projectId, year, month) {
  return `${STORAGE_PREFIX}${projectId}_${year}_${month}`;
}

/**
 * Get on-call assignments from localStorage
 * Returns: { '1': [memberId1, memberId2], '2': [memberId3], ... }
 * Each key is a day number, value is array of on-call member IDs
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

// ============================================================================
// ON-CALL AUTO-GENERATION ENGINE
// ============================================================================

/**
 * Generate on-call assignments for a month.
 * 
 * Algorithm:
 * 1. Get eligible members (isOnCallEligible === true, isActive === true)
 * 2. Shuffle them randomly
 * 3. Assign `resourcesPerDay` members per day
 * 4. Rotate every `rotationPeriodDays` days (default 7 = weekly)
 * 5. When all eligible members have been used, reshuffle and restart
 * 
 * @param {Array} eligibleMembers - Members with isOnCallEligible=true
 * @param {number} year
 * @param {number} month - 1-indexed
 * @param {Object} config - { resourcesPerDay, rotationPeriodDays }
 * @returns {Object} assignments - { '1': [id1, id2], '2': [id1, id2], ... }
 */
export function generateOnCallAssignments(eligibleMembers, year, month, config) {
  const { resourcesPerDay, rotationPeriodDays } = config;
  const totalDays = new Date(year, month, 0).getDate();
  const assignments = {};

  if (eligibleMembers.length === 0 || resourcesPerDay <= 0) {
    return assignments;
  }

  // Clamp resourcesPerDay to available members
  const perDay = Math.min(resourcesPerDay, eligibleMembers.length);

  // Shuffle members using Fisher-Yates
  const shuffled = [...eligibleMembers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Build rotation slots
  // Each "slot" is a group of `perDay` members that serve for `rotationPeriodDays` days
  let memberPool = [...shuffled];
  let currentSlot = [];
  let daysInCurrentSlot = 0;

  for (let day = 1; day <= totalDays; day++) {
    // Need a new rotation slot?
    if (daysInCurrentSlot === 0 || daysInCurrentSlot >= rotationPeriodDays) {
      // Pick next `perDay` members from pool
      currentSlot = [];
      for (let i = 0; i < perDay; i++) {
        if (memberPool.length === 0) {
          // Reshuffle all eligible members when pool is exhausted
          memberPool = [...shuffled];
          for (let k = memberPool.length - 1; k > 0; k--) {
            const j = Math.floor(Math.random() * (k + 1));
            [memberPool[k], memberPool[j]] = [memberPool[j], memberPool[k]];
          }
          // Remove members already picked for this slot to avoid duplicates
          memberPool = memberPool.filter((m) => !currentSlot.includes(m.id));
        }
        if (memberPool.length > 0) {
          const picked = memberPool.shift();
          currentSlot.push(picked.id);
        }
      }
      daysInCurrentSlot = 0;
    }

    assignments[String(day)] = [...currentSlot];
    daysInCurrentSlot++;
  }

  return assignments;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get on-call counts per member for a month
 * Returns: { memberId: count, ... }
 */
export function getOnCallCounts(assignments, totalDays) {
  const counts = {};

  for (let day = 1; day <= totalDays; day++) {
    const dayStr = String(day);
    const memberIds = assignments[dayStr];
    if (!memberIds || !Array.isArray(memberIds)) continue;

    for (const memberId of memberIds) {
      counts[memberId] = (counts[memberId] || 0) + 1;
    }
  }

  return counts;
}

/**
 * Check if a member is on-call on a specific day
 */
export function isOnCall(assignments, memberId, day) {
  const dayIds = assignments[String(day)];
  if (!dayIds || !Array.isArray(dayIds)) return false;
  return dayIds.includes(memberId);
}

/**
 * Get all on-call member IDs for a specific day
 */
export function getOnCallMembers(assignments, day) {
  const dayIds = assignments[String(day)];
  if (!dayIds || !Array.isArray(dayIds)) return [];
  return dayIds;
}

/**
 * Manually toggle a member's on-call status for a specific day
 */
export function toggleOnCall(assignments, memberId, day) {
  const dayStr = String(day);
  if (!assignments[dayStr]) {
    assignments[dayStr] = [];
  }
  const idx = assignments[dayStr].indexOf(memberId);
  if (idx >= 0) {
    assignments[dayStr].splice(idx, 1);
  } else {
    assignments[dayStr].push(memberId);
  }
  return { ...assignments };
}
