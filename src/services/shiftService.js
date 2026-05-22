/**
 * ============================================================================
 * shiftService.js — Shift Definition Data Service
 * 
 * Handles all CRUD operations for custom shift types within a project.
 * Data is stored in localStorage with the key format:
 *   shiftRoster_{projectId}_shifts
 * 
 * Each shift object has:
 *   - id: unique string identifier
 *   - code: short code displayed in the roster grid (e.g., "M", "A", "WO")
 *   - name: full name (e.g., "Morning", "Week Off")
 *   - color: hex color for the roster cell background
 *   - startTime: shift start time string (e.g., "06:00") or null
 *   - endTime: shift end time string (e.g., "14:00") or null
 *   - isWorkingShift: true for work shifts, false for WO/Leave/CO
 *   - order: display order in the roster legend
 * 
 * When a project has no shifts defined, the default shifts from
 * app.json are automatically loaded as a starting point.
 * ============================================================================
 */

import appConfig from '@config/app.json';

// ---- Storage Key Helper ----
function getStorageKey(projectId) {
  return `shiftRoster_${projectId}_shifts`;
}

// ---- Generate Unique ID ----
function generateShiftId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `shift_${timestamp}_${random}`;
}

/**
 * Get all shifts for a specific project.
 * If no shifts exist, loads the default shifts from app config.
 * Returns an array of shift objects sorted by order.
 */
export function getShifts(projectId) {
  if (!projectId) return [];

  const key = getStorageKey(projectId);
  const stored = localStorage.getItem(key);

  if (stored) {
    try {
      const shifts = JSON.parse(stored);
      return shifts.sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch {
      return loadDefaults(projectId);
    }
  }

  // First time: load default shifts from app config
  return loadDefaults(projectId);
}

/**
 * Get only the working shifts (excludes WO, Leave, CO, etc.).
 */
export function getWorkingShifts(projectId) {
  const allShifts = getShifts(projectId);
  return allShifts.filter((shift) => shift.isWorkingShift);
}

/**
 * Get only the non-working shifts (WO, Leave, CO, etc.).
 */
export function getNonWorkingShifts(projectId) {
  const allShifts = getShifts(projectId);
  return allShifts.filter((shift) => !shift.isWorkingShift);
}

/**
 * Get a single shift by its ID.
 */
export function getShiftById(projectId, shiftId) {
  const shifts = getShifts(projectId);
  return shifts.find((shift) => shift.id === shiftId) || null;
}

/**
 * Get a single shift by its code (e.g., "M", "WO").
 */
export function getShiftByCode(projectId, code) {
  const shifts = getShifts(projectId);
  return shifts.find((shift) => shift.code === code) || null;
}

/**
 * Add a new shift to a project.
 * Returns { success, shift?, message? }
 */
export function addShift(projectId, shiftData) {
  const shifts = getShifts(projectId);

  // Check for duplicate code
  const codeExists = shifts.some(
    (s) => s.code.toUpperCase() === shiftData.code.trim().toUpperCase()
  );
  if (codeExists) {
    return { success: false, message: `Shift code "${shiftData.code}" already exists` };
  }

  const newShift = {
    id: generateShiftId(),
    code: shiftData.code.trim().toUpperCase(),
    name: shiftData.name.trim(),
    color: shiftData.color || '#6366f1',
    startTime: shiftData.startTime || null,
    endTime: shiftData.endTime || null,
    isWorkingShift: shiftData.isWorkingShift !== false,
    order: shifts.length,
  };

  shifts.push(newShift);
  saveShifts(projectId, shifts);

  return { success: true, shift: newShift };
}

/**
 * Update an existing shift's details.
 * Returns { success, shift?, message? }
 */
export function updateShift(projectId, shiftId, updates) {
  const shifts = getShifts(projectId);

  // If the code is being changed, check for duplicates
  if (updates.code) {
    const codeExists = shifts.some(
      (s) => s.id !== shiftId && s.code.toUpperCase() === updates.code.trim().toUpperCase()
    );
    if (codeExists) {
      return { success: false, message: `Shift code "${updates.code}" already exists` };
    }
  }

  let updatedShift = null;

  const updatedList = shifts.map((shift) => {
    if (shift.id === shiftId) {
      updatedShift = {
        ...shift,
        code: updates.code !== undefined ? updates.code.trim().toUpperCase() : shift.code,
        name: updates.name !== undefined ? updates.name.trim() : shift.name,
        color: updates.color !== undefined ? updates.color : shift.color,
        startTime: updates.startTime !== undefined ? updates.startTime : shift.startTime,
        endTime: updates.endTime !== undefined ? updates.endTime : shift.endTime,
        isWorkingShift: updates.isWorkingShift !== undefined ? updates.isWorkingShift : shift.isWorkingShift,
        order: updates.order !== undefined ? updates.order : shift.order,
      };
      return updatedShift;
    }
    return shift;
  });

  if (updatedShift) {
    saveShifts(projectId, updatedList);
    return { success: true, shift: updatedShift };
  }

  return { success: false, message: 'Shift not found' };
}

/**
 * Delete a shift from a project by its ID.
 * Returns true if found and deleted.
 */
export function deleteShift(projectId, shiftId) {
  const shifts = getShifts(projectId);
  const filtered = shifts.filter((shift) => shift.id !== shiftId);

  if (filtered.length === shifts.length) {
    return false; // Not found
  }

  // Re-order remaining shifts
  const reordered = filtered.map((shift, index) => ({ ...shift, order: index }));
  saveShifts(projectId, reordered);
  return true;
}

/**
 * Reset shifts to the default set from app.json.
 * Returns the new list of default shifts.
 */
export function resetToDefaults(projectId) {
  return loadDefaults(projectId);
}

// ---- Internal Helpers ----

/** Save the shifts array to localStorage */
function saveShifts(projectId, shifts) {
  const key = getStorageKey(projectId);
  localStorage.setItem(key, JSON.stringify(shifts));
}

/** Load default shifts from app config and save to storage */
function loadDefaults(projectId) {
  const defaults = (appConfig.defaultShifts || []).map((shift, index) => ({
    id: generateShiftId(),
    code: shift.code,
    name: shift.name,
    color: shift.color,
    startTime: shift.startTime,
    endTime: shift.endTime,
    isWorkingShift: shift.isWorkingShift,
    order: index,
  }));

  saveShifts(projectId, defaults);
  return defaults;
}
