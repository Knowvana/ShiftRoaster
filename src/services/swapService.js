/**
 * ============================================================================
 * swapService.js — Shift Swap Request Data Service
 * 
 * Handles all CRUD operations for shift swap requests within a project.
 * Data is stored in localStorage with the key format:
 *   shiftRoster_{projectId}_swaps
 * 
 * Each swap request object has:
 *   - id: unique string identifier
 *   - requesterId: member ID of the person requesting the swap
 *   - targetId: member ID of the person being asked to swap
 *   - date: the day of the month (number)
 *   - month: month number (1-indexed)
 *   - year: year number
 *   - requesterShift: shift code the requester currently has
 *   - targetShift: shift code the target currently has
 *   - reason: optional reason for the swap
 *   - status: 'pending' | 'approved' | 'rejected'
 *   - createdAt: ISO timestamp when request was created
 *   - resolvedAt: ISO timestamp when request was approved/rejected (or null)
 * ============================================================================
 */

import { isBackendConfigured, apiGet, apiPost } from '@services/apiClient';

// ---- Storage Key Helper ----
function getStorageKey(projectId) {
  return `shiftRoster_${projectId}_swaps`;
}

// ---- Generate Unique ID ----
function generateSwapId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `swap_${timestamp}_${random}`;
}

/**
 * Get all swap requests for a project.
 * Returns an array sorted by creation date (newest first).
 */
export function getSwapRequests(projectId) {
  if (!projectId) return [];

  const key = getStorageKey(projectId);
  const stored = localStorage.getItem(key);

  if (!stored) return [];

  try {
    const swaps = JSON.parse(stored);
    return swaps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch {
    return [];
  }
}

/**
 * Get swap requests filtered by status.
 * @param {string} status - 'pending', 'approved', or 'rejected'
 */
export function getSwapsByStatus(projectId, status) {
  const swaps = getSwapRequests(projectId);
  return swaps.filter((s) => s.status === status);
}

/**
 * Get swap requests for a specific month/year.
 */
export function getSwapsForMonth(projectId, year, month) {
  const swaps = getSwapRequests(projectId);
  return swaps.filter((s) => s.year === year && s.month === month);
}

/**
 * Get the count of pending swap requests.
 */
export function getPendingSwapCount(projectId) {
  return getSwapsByStatus(projectId, 'pending').length;
}

/**
 * Create a new swap request.
 * Returns the created swap object.
 */
export function createSwapRequest(projectId, requestData) {
  const swaps = getSwapRequests(projectId);

  const newSwap = {
    id: generateSwapId(),
    requesterId: requestData.requesterId,
    targetId: requestData.targetId,
    date: requestData.date,
    month: requestData.month,
    year: requestData.year,
    requesterShift: requestData.requesterShift,
    targetShift: requestData.targetShift,
    reason: (requestData.reason || '').trim(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };

  swaps.push(newSwap);
  saveSwaps(projectId, swaps);

  return newSwap;
}

/**
 * Approve a swap request.
 * This updates the swap status but does NOT modify the roster.
 * The caller (SwapRequestsPage) should also update the roster assignments.
 * Returns the updated swap or null if not found.
 */
export function approveSwap(projectId, swapId) {
  return updateSwapStatus(projectId, swapId, 'approved');
}

/**
 * Reject a swap request.
 * Returns the updated swap or null if not found.
 */
export function rejectSwap(projectId, swapId) {
  return updateSwapStatus(projectId, swapId, 'rejected');
}

/**
 * Delete a swap request entirely.
 * Returns true if found and deleted.
 */
export function deleteSwapRequest(projectId, swapId) {
  const swaps = getSwapRequests(projectId);
  const filtered = swaps.filter((s) => s.id !== swapId);

  if (filtered.length === swaps.length) return false;

  saveSwaps(projectId, filtered);
  return true;
}

// ---- Internal Helpers ----

/** Update the status of a swap request */
function updateSwapStatus(projectId, swapId, status) {
  const swaps = getSwapRequests(projectId);
  let updatedSwap = null;

  const updatedList = swaps.map((swap) => {
    if (swap.id === swapId) {
      updatedSwap = {
        ...swap,
        status,
        resolvedAt: new Date().toISOString(),
      };
      return updatedSwap;
    }
    return swap;
  });

  if (updatedSwap) {
    saveSwaps(projectId, updatedList);
  }

  return updatedSwap;
}

/** Save swaps array to localStorage */
function saveSwaps(projectId, swaps) {
  const key = getStorageKey(projectId);
  localStorage.setItem(key, JSON.stringify(swaps));
}

// ============================================================================
// ASYNC API-BACKED FUNCTIONS (for Google Sheets backend)
// ============================================================================

/**
 * Fetch swaps from backend (or localStorage if offline).
 */
export async function fetchSwaps(projectId) {
  if (!isBackendConfigured()) return getSwapRequests(projectId);
  try {
    const res = await apiGet('getSwaps', { projectId });
    const swaps = res.data || [];
    saveSwaps(projectId, swaps);
    return swaps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch {
    return getSwapRequests(projectId);
  }
}

/**
 * Save swaps to backend (and localStorage cache).
 */
export async function syncSwaps(projectId, swaps) {
  saveSwaps(projectId, swaps);
  if (!isBackendConfigured()) return;
  try {
    await apiPost('saveSwaps', { projectId, data: swaps });
  } catch (err) {
    console.warn('[swapService] Failed to sync to backend:', err.message);
  }
}
