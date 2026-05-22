/**
 * ============================================================================
 * MainLayout.jsx — Main Application Layout
 * 
 * The primary layout wrapper for all authenticated pages.
 * Contains:
 * - Sidebar navigation (collapsible on mobile)
 * - Top header with project switcher and user menu
 * - Main content area where page routes render
 * 
 * This layout is only shown when the user is logged in.
 * ============================================================================
 */

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout() {
  // Control whether the sidebar is open on mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  /** Toggle sidebar visibility (used on mobile) */
  const toggleSidebar = () => {
    setIsSidebarOpen((previous) => !previous);
  };

  /** Close sidebar (used when clicking a nav link on mobile) */
  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-50 overflow-hidden">

      {/* ---- Sidebar: fixed on desktop, overlay on mobile ---- */}
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* ---- Main Content Area ---- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top header bar */}
        <Header onToggleSidebar={toggleSidebar} />

        {/* Page content: scrollable area where child routes render */}
        <main className="flex-1 overflow-y-auto">
          <div className="page-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
