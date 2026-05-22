/**
 * ============================================================================
 * ToastContext.jsx — Global Toast Notification System
 * 
 * Provides a simple way to show success, error, and info messages
 * from anywhere in the app using the useToast() hook.
 * 
 * Usage:
 *   const { showToast } = useToast();
 *   showToast('Roster saved!', 'success');
 *   showToast('Something went wrong', 'error');
 * ============================================================================
 */

import React, { createContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

// Create the context
export const ToastContext = createContext(null);

// ---- Toast Item Component ----
// Displays a single toast notification with icon, message, and close button
function ToastItem({ toast, onClose }) {
  // Pick the right icon and border color based on toast type
  const styles = {
    success: {
      border: 'border-l-emerald-500',
      icon: <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />,
    },
    error: {
      border: 'border-l-rose-500',
      icon: <XCircle size={18} className="text-rose-500 flex-shrink-0" />,
    },
    info: {
      border: 'border-l-brand-500',
      icon: <Info size={18} className="text-brand-500 flex-shrink-0" />,
    },
  };

  const style = styles[toast.type] || styles.info;

  return (
    <div
      className={`
        flex items-start gap-3 bg-white rounded-lg shadow-card-lg 
        border border-slate-200 border-l-4 ${style.border}
        px-4 py-3 min-w-[320px] max-w-[420px] animate-slide-down
      `}
      role="alert"
    >
      {/* Icon */}
      {style.icon}

      {/* Message text */}
      <p className="text-sm text-slate-700 flex-1">{toast.message}</p>

      {/* Close button */}
      <button
        onClick={() => onClose(toast.id)}
        className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// ---- Toast Provider ----
// Wraps the app and manages the list of active toasts
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // Add a new toast notification
  // type: 'success' | 'error' | 'info'
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();

    // Add the toast to the list
    setToasts((previous) => [...previous, { id, message, type }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((previous) => previous.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Manually remove a toast by its id
  const removeToast = useCallback((id) => {
    setToasts((previous) => previous.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container: fixed to top-right corner */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
