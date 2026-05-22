/**
 * ============================================================================
 * Modal.jsx — Reusable Modal Dialog Component
 * 
 * A centered modal overlay used across all pages for forms,
 * confirmations, and detail views.
 * 
 * Props:
 *   - isOpen: boolean — controls visibility
 *   - onClose: function — called when backdrop or X is clicked
 *   - title: string — modal header text
 *   - children: React nodes — modal body content
 *   - size: 'sm' | 'md' | 'lg' — width control (default 'md')
 *   - footer: React node — optional footer with action buttons
 * ============================================================================
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

// ---- Size Classes Map ----
const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
  // Close modal when Escape key is pressed
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Don't render anything if not open
  if (!isOpen) return null;

  const widthClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">

      {/* ---- Backdrop ---- */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ---- Modal Box ---- */}
      <div className={`relative bg-white rounded-2xl shadow-modal ${widthClass} w-full mx-4 animate-slide-up`}>

        {/* ---- Header ---- */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* ---- Body ---- */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {children}
        </div>

        {/* ---- Footer (optional) ---- */}
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
