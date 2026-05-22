/**
 * ============================================================================
 * memberService.js — Team Member Data Service
 * 
 * Handles all CRUD operations for team members within a project.
 * 
 * STORAGE: Uses Google Sheets (via Apps Script) when backend is configured,
 *          falls back to localStorage for offline/development use.
 * 
 * Each member object has:
 *   - id: unique string identifier
 *   - name: full name (required)
 *   - email: email address (optional)
 *   - phone: phone number (optional)
 *   - role: team role/designation (optional)
 *   - memberType: 'resource' (shift worker) or 'manager' (supervisor, not assigned to shifts)
 *   - isActive: whether the member is currently active (default true)
 *   - createdAt: ISO timestamp of creation
 * ============================================================================
 */

import { isBackendConfigured, apiGet, apiPost } from '@services/apiClient';

// ---- Storage Key Helper ----
// Builds the localStorage key for a specific project's members
function getStorageKey(projectId) {
  return `shiftRoster_${projectId}_members`;
}

// ---- Generate Unique ID ----
// Creates a simple unique ID for new members
function generateMemberId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `mem_${timestamp}_${random}`;
}

/**
 * Get all members for a specific project.
 * Returns an array of member objects, sorted by name.
 */
export function getMembers(projectId) {
  if (!projectId) return [];

  const key = getStorageKey(projectId);
  const stored = localStorage.getItem(key);

  if (!stored) return [];

  try {
    const members = JSON.parse(stored);
    // Sort alphabetically by name
    return members.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

/**
 * Get a single member by their ID.
 * Returns the member object or null if not found.
 */
export function getMemberById(projectId, memberId) {
  const members = getMembers(projectId);
  return members.find((member) => member.id === memberId) || null;
}

/**
 * Add a new member to a project.
 * Returns the created member object.
 */
export function addMember(projectId, memberData) {
  const members = getMembers(projectId);

  const newMember = {
    id: generateMemberId(),
    name: memberData.name.trim(),
    email: (memberData.email || '').trim(),
    phone: (memberData.phone || '').trim(),
    role: (memberData.role || '').trim(),
    memberType: memberData.memberType || 'resource',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  members.push(newMember);
  saveMembers(projectId, members);

  return newMember;
}

/**
 * Update an existing member's details.
 * Returns the updated member object, or null if not found.
 */
export function updateMember(projectId, memberId, updates) {
  const members = getMembers(projectId);
  let updatedMember = null;

  const updatedList = members.map((member) => {
    if (member.id === memberId) {
      updatedMember = {
        ...member,
        name: updates.name !== undefined ? updates.name.trim() : member.name,
        email: updates.email !== undefined ? updates.email.trim() : member.email,
        phone: updates.phone !== undefined ? updates.phone.trim() : member.phone,
        role: updates.role !== undefined ? updates.role.trim() : member.role,
        memberType: updates.memberType !== undefined ? updates.memberType : (member.memberType || 'resource'),
        isActive: updates.isActive !== undefined ? updates.isActive : member.isActive,
      };
      return updatedMember;
    }
    return member;
  });

  if (updatedMember) {
    saveMembers(projectId, updatedList);
  }

  return updatedMember;
}

/**
 * Delete a member from a project by their ID.
 * Returns true if the member was found and deleted.
 */
export function deleteMember(projectId, memberId) {
  const members = getMembers(projectId);
  const filtered = members.filter((member) => member.id !== memberId);

  if (filtered.length === members.length) {
    return false; // Member not found
  }

  saveMembers(projectId, filtered);
  return true;
}

/**
 * Get the count of active members in a project.
 */
export function getActiveMemberCount(projectId) {
  const members = getMembers(projectId);
  return members.filter((member) => member.isActive).length;
}

/**
 * Import multiple members at once (e.g., from a CSV or bulk add).
 * Each item in the array should have at least a 'name' property.
 * Returns the count of successfully added members.
 */
export function importMembers(projectId, memberList) {
  let addedCount = 0;

  for (const memberData of memberList) {
    if (memberData.name && memberData.name.trim()) {
      addMember(projectId, memberData);
      addedCount++;
    }
  }

  return addedCount;
}

/**
 * Get only shift resources (memberType = 'resource' or missing memberType).
 * Returns active resources sorted by name.
 */
export function getResources(projectId) {
  return getMembers(projectId).filter((m) => (m.memberType || 'resource') === 'resource');
}

/**
 * Get only managers/supervisors (memberType = 'manager').
 * Returns managers sorted by name.
 */
export function getManagers(projectId) {
  return getMembers(projectId).filter((m) => m.memberType === 'manager');
}

// ---- Internal: Save Members to localStorage ----
function saveMembers(projectId, members) {
  const key = getStorageKey(projectId);
  localStorage.setItem(key, JSON.stringify(members));
}

// ============================================================================
// ASYNC API-BACKED FUNCTIONS (for Google Sheets backend)
// These are used by pages when the backend is configured.
// They sync data to Google Sheets AND update localStorage as a cache.
// ============================================================================

/**
 * Fetch members from backend (or localStorage if offline).
 */
export async function fetchMembers(projectId) {
  // Return cached data instantly — no waiting for backend
  const cached = getMembers(projectId);
  if (!isBackendConfigured()) return cached;

  // Fetch from backend (may be slow due to Apps Script cold start)
  try {
    const res = await apiGet('getMembers', { projectId });
    const members = res.data || [];
    if (members.length > 0) {
      saveMembers(projectId, members);
      return members.sort((a, b) => a.name.localeCompare(b.name));
    }
    return cached;
  } catch {
    return cached;
  }
}

/**
 * Save members to backend (and localStorage cache).
 */
export async function syncMembers(projectId, members) {
  saveMembers(projectId, members); // Always update local cache
  if (!isBackendConfigured()) return;
  try {
    await apiPost('saveMembers', { projectId, data: members });
  } catch (err) {
    console.warn('[memberService] Failed to sync to backend:', err.message);
  }
}
