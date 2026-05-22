/**
 * ============================================================================
 * SyncContext.jsx — Global Syncing State
 * 
 * Provides a global context for tracking when data is being synced from
 * the backend (Google Sheets). This allows the Header to display a syncing
 * indicator visible across all pages.
 * ============================================================================
 */

import React, { createContext, useState, useCallback } from 'react';

export const SyncContext = createContext();

export function SyncProvider({ children }) {
  const [isSyncing, setIsSyncing] = useState(false);

  const startSync = useCallback(() => setIsSyncing(true), []);
  const stopSync = useCallback(() => setIsSyncing(false), []);

  return (
    <SyncContext.Provider value={{ isSyncing, startSync, stopSync }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = React.useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within SyncProvider');
  }
  return context;
}
