/**
 * ============================================================================
 * useToast Hook — Access Toast Notification Context
 * 
 * A convenience hook to show toast notifications from any component.
 * 
 * Usage:
 *   const { showToast } = useToast();
 *   showToast('Saved successfully!', 'success');
 * ============================================================================
 */

import { useContext } from 'react';
import { ToastContext } from '@context/ToastContext';

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside a <ToastProvider>');
  }

  return context;
}
