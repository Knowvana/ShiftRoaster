/**
 * ============================================================================
 * AuthContext.jsx — Authentication State Management
 * 
 * Manages login/logout state using hashed credentials.
 * Passwords are stored as SHA-256 hashes (not plain text).
 * Session is persisted in localStorage so users stay logged in
 * across browser refreshes.
 * 
 * Roles:
 *   - site_admin: Full access to all projects and settings
 *   - project_admin: Can edit assigned projects (members, shifts, roster)
 *   - resource: Read-only access to assigned projects
 * 
 * Usage:
 *   const { isLoggedIn, currentUser, login, logout } = useAuth();
 * ============================================================================
 */

import React, { createContext, useState, useCallback, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import { isBackendConfigured, apiGet, apiPost } from '@services/apiClient';

// Create the context
export const AuthContext = createContext(null);

// ---- Storage Keys ----
const STORAGE_KEY_SESSION = 'shiftRoster_session';
const STORAGE_KEY_ADMINS = 'shiftRoster_admins';

// ---- Default Admin Account ----
// This is the initial admin that exists when the app is first used.
// Password: "admin123" — should be changed after first login.
const DEFAULT_ADMINS = [
  {
    username: 'admin',
    passwordHash: CryptoJS.SHA256('admin123').toString(),
    displayName: 'Administrator',
    role: 'site_admin',
    projectIds: [], // site_admin sees all projects regardless
  },
];

/**
 * Initialize the admin list in localStorage if it doesn't exist yet.
 * Returns the current list of admin accounts.
 */
function loadAdmins() {
  const stored = localStorage.getItem(STORAGE_KEY_ADMINS);

  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // If corrupt, reset to defaults
      localStorage.setItem(STORAGE_KEY_ADMINS, JSON.stringify(DEFAULT_ADMINS));
      return DEFAULT_ADMINS;
    }
  }

  // First time: save default admins
  localStorage.setItem(STORAGE_KEY_ADMINS, JSON.stringify(DEFAULT_ADMINS));
  return DEFAULT_ADMINS;
}

/**
 * Load the saved session from localStorage.
 * Returns the user object if a valid session exists, or null.
 */
function loadSession() {
  const stored = localStorage.getItem(STORAGE_KEY_SESSION);

  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem(STORAGE_KEY_SESSION);
      return null;
    }
  }

  return null;
}

// ---- Auth Provider Component ----
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: load admins from backend (or localStorage fallback) and restore session
  useEffect(() => {
    async function init() {
      let adminList = loadAdmins();

      if (isBackendConfigured()) {
        try {
          const res = await apiGet('getAdmins');
          if (res.data && res.data.length > 0) {
            adminList = res.data;
            localStorage.setItem(STORAGE_KEY_ADMINS, JSON.stringify(adminList));
          }
        } catch (err) {
          console.warn('[AuthContext] Backend fetch failed, using localStorage:', err.message);
        }
      }

      setAdmins(adminList);

      const savedSession = loadSession();
      if (savedSession) {
        setCurrentUser(savedSession);
      }

      setIsLoading(false);
    }
    init();
  }, []);

  /**
   * Attempt to log in with username and password.
   * Returns { success: true } or { success: false, message: '...' }
   */
  const login = useCallback((username, password) => {
    // Hash the provided password to compare against stored hash
    const passwordHash = CryptoJS.SHA256(password).toString();

    // Find a matching admin account
    const matchingAdmin = admins.find(
      (admin) => admin.username === username && admin.passwordHash === passwordHash
    );

    if (!matchingAdmin) {
      return { success: false, message: 'Invalid username or password' };
    }

    // Build the session object (never store the password hash in session)
    const session = {
      username: matchingAdmin.username,
      displayName: matchingAdmin.displayName,
      role: matchingAdmin.role,
      projectIds: matchingAdmin.projectIds || [],
      loggedInAt: new Date().toISOString(),
    };

    // Save session and update state
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    setCurrentUser(session);

    return { success: true };
  }, [admins]);

  /**
   * Log out the current user. Clears the session from localStorage.
   */
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_SESSION);
    setCurrentUser(null);
  }, []);

  /**
   * Add a new admin account.
   * Returns { success: true } or { success: false, message: '...' }
   */
  const addAdmin = useCallback((username, password, displayName, role = 'resource', projectIds = [], email = '') => {
    // Check if username already exists
    const exists = admins.some((admin) => admin.username === username);
    if (exists) {
      return { success: false, message: 'Username already exists' };
    }

    const newAdmin = {
      username,
      passwordHash: CryptoJS.SHA256(password).toString(),
      displayName,
      role,
      projectIds,
      email: email || '',
    };

    const updatedAdmins = [...admins, newAdmin];
    localStorage.setItem(STORAGE_KEY_ADMINS, JSON.stringify(updatedAdmins));
    setAdmins(updatedAdmins);

    // Sync to backend
    if (isBackendConfigured()) {
      apiPost('saveAdmins', { data: updatedAdmins }).catch((err) =>
        console.warn('[AuthContext] Failed to sync admins:', err.message)
      );
    }

    return { success: true };
  }, [admins]);

  /**
   * Update an admin's role, project assignments, display name, and email.
   */
  const updateAdmin = useCallback((username, updates) => {
    const updatedAdmins = admins.map((admin) => {
      if (admin.username === username) {
        return {
          ...admin,
          ...(updates.displayName !== undefined && { displayName: updates.displayName }),
          ...(updates.role !== undefined && { role: updates.role }),
          ...(updates.projectIds !== undefined && { projectIds: updates.projectIds }),
          ...(updates.email !== undefined && { email: updates.email }),
        };
      }
      return admin;
    });

    localStorage.setItem(STORAGE_KEY_ADMINS, JSON.stringify(updatedAdmins));
    setAdmins(updatedAdmins);

    // Sync to backend
    if (isBackendConfigured()) {
      apiPost('saveAdmins', { data: updatedAdmins }).catch((err) =>
        console.warn('[AuthContext] Failed to sync admins:', err.message)
      );
    }

    return { success: true };
  }, [admins]);

  /**
   * Remove an admin account by username.
   * Cannot remove the last site_admin.
   */
  const removeAdmin = useCallback((username) => {
    const targetAdmin = admins.find((a) => a.username === username);

    if (!targetAdmin) {
      return { success: false, message: 'Admin not found' };
    }

    // Prevent removing the last site admin
    if (targetAdmin.role === 'site_admin' || targetAdmin.role === 'super_admin') {
      const siteAdminCount = admins.filter((a) => a.role === 'site_admin' || a.role === 'super_admin').length;
      if (siteAdminCount <= 1) {
        return { success: false, message: 'Cannot remove the last site admin' };
      }
    }

    const updatedAdmins = admins.filter((a) => a.username !== username);
    localStorage.setItem(STORAGE_KEY_ADMINS, JSON.stringify(updatedAdmins));
    setAdmins(updatedAdmins);

    // Sync to backend
    if (isBackendConfigured()) {
      apiPost('saveAdmins', { data: updatedAdmins }).catch((err) =>
        console.warn('[AuthContext] Failed to sync admins:', err.message)
      );
    }

    return { success: true };
  }, [admins]);

  /**
   * Change password for an admin account.
   */
  const changePassword = useCallback((username, newPassword) => {
    const updatedAdmins = admins.map((admin) => {
      if (admin.username === username) {
        return { ...admin, passwordHash: CryptoJS.SHA256(newPassword).toString() };
      }
      return admin;
    });

    localStorage.setItem(STORAGE_KEY_ADMINS, JSON.stringify(updatedAdmins));
    setAdmins(updatedAdmins);

    // Sync to backend
    if (isBackendConfigured()) {
      apiPost('saveAdmins', { data: updatedAdmins }).catch((err) =>
        console.warn('[AuthContext] Failed to sync admins:', err.message)
      );
    }

    return { success: true };
  }, [admins]);

  // ---- Context Value ----
  const contextValue = {
    isLoggedIn: currentUser !== null,
    isLoading,
    currentUser,
    admins,
    login,
    logout,
    addAdmin,
    updateAdmin,
    removeAdmin,
    changePassword,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
