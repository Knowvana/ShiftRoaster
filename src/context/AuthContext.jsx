/**
 * ============================================================================
 * AuthContext.jsx — Authentication State Management
 * 
 * Manages admin login/logout state using static credentials.
 * Passwords are stored as SHA-256 hashes (not plain text).
 * Session is persisted in localStorage so admins stay logged in
 * across browser refreshes.
 * 
 * Usage:
 *   const { isLoggedIn, currentUser, login, logout } = useAuth();
 * ============================================================================
 */

import React, { createContext, useState, useCallback, useEffect } from 'react';
import CryptoJS from 'crypto-js';

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
    role: 'super_admin',
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

  // On mount: load admins list and restore session
  useEffect(() => {
    const adminList = loadAdmins();
    setAdmins(adminList);

    const savedSession = loadSession();
    if (savedSession) {
      setCurrentUser(savedSession);
    }

    setIsLoading(false);
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
  const addAdmin = useCallback((username, password, displayName) => {
    // Check if username already exists
    const exists = admins.some((admin) => admin.username === username);
    if (exists) {
      return { success: false, message: 'Username already exists' };
    }

    const newAdmin = {
      username,
      passwordHash: CryptoJS.SHA256(password).toString(),
      displayName,
      role: 'admin',
    };

    const updatedAdmins = [...admins, newAdmin];
    localStorage.setItem(STORAGE_KEY_ADMINS, JSON.stringify(updatedAdmins));
    setAdmins(updatedAdmins);

    return { success: true };
  }, [admins]);

  /**
   * Remove an admin account by username.
   * Cannot remove the last super_admin.
   */
  const removeAdmin = useCallback((username) => {
    const targetAdmin = admins.find((a) => a.username === username);

    if (!targetAdmin) {
      return { success: false, message: 'Admin not found' };
    }

    // Prevent removing the last super admin
    if (targetAdmin.role === 'super_admin') {
      const superAdminCount = admins.filter((a) => a.role === 'super_admin').length;
      if (superAdminCount <= 1) {
        return { success: false, message: 'Cannot remove the last super admin' };
      }
    }

    const updatedAdmins = admins.filter((a) => a.username !== username);
    localStorage.setItem(STORAGE_KEY_ADMINS, JSON.stringify(updatedAdmins));
    setAdmins(updatedAdmins);

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
    removeAdmin,
    changePassword,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
