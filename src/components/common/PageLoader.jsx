/**
 * ============================================================================
 * PageLoader.jsx — Modal overlay loading spinner
 * 
 * Shown while async data is being fetched from the backend.
 * Displays a centered card with teal spinner over a semi-transparent backdrop.
 * ============================================================================
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function PageLoader({ message = 'Syncing...' }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
      <div className="bg-brand-600 rounded-full shadow-lg px-4 py-2 flex items-center gap-2">
        <Loader2 size={14} className="text-white animate-spin" />
        <p className="text-xs font-medium text-white">{message}</p>
      </div>
    </div>
  );
}
