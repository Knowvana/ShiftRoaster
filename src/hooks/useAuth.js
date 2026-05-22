/**
 * ============================================================================
 * useAuth Hook — Access Authentication Context
 * 
 * A convenience hook to access the AuthContext from any component.
 * Throws an error if used outside of AuthProvider.
 * 
 * Usage:
 *   const { isLoggedIn, currentUser, login, logout } = useAuth();
 * ============================================================================
 */

import { useContext } from 'react';
import { AuthContext } from '@context/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }

  return context;
}
