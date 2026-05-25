/**
 * ============================================================================
 * MainLayout.jsx — Main Application Layout
 * 
 * The primary layout wrapper for all authenticated pages.
 * Contains:
 * - Sidebar navigation (collapsible and resizable on desktop)
 * - Top header with project switcher and user menu
 * - Main content area where page routes render
 * 
 * Features:
 * - Collapsible sidebar with toggle button
 * - Smooth drag-to-resize on desktop (min: 160px, max: 400px)
 * - Sidebar width persisted to localStorage
 * - Mobile: overlay sidebar (not resizable)
 * ============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const SIDEBAR_COLLAPSED_WIDTH = 56;
const SIDEBAR_MIN_WIDTH = 180;
const SIDEBAR_MAX_WIDTH = 400;
const SIDEBAR_DEFAULT_WIDTH = 220;
const SIDEBAR_WIDTH_KEY = 'shiftRoster_sidebarWidth';
const SIDEBAR_COLLAPSED_KEY = 'shiftRoster_sidebarCollapsed';

export default function MainLayout() {
  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Desktop sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : SIDEBAR_DEFAULT_WIDTH;
  });

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved ? JSON.parse(saved) : false;
  });

  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef(null);

  // Persist sidebar width to localStorage
  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  // Persist collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Handle resize drag
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const newWidth = e.clientX;
      if (newWidth >= SIDEBAR_MIN_WIDTH && newWidth <= SIDEBAR_MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  /** Toggle sidebar visibility (used on mobile) */
  const toggleSidebar = () => {
    setIsSidebarOpen((previous) => !previous);
  };

  /** Close sidebar (used when clicking a nav link on mobile) */
  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  /** Toggle sidebar collapse on desktop */
  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  const displayWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth;

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-50 overflow-hidden">

      {/* ---- Sidebar: fixed on desktop, overlay on mobile ---- */}
      <div
        style={{
          width: `${displayWidth}px`,
          transition: isResizing ? 'none' : 'width 0.3s ease-out',
        }}
        className="hidden lg:block flex-shrink-0 overflow-hidden"
      >
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
          sidebarWidth={sidebarWidth}
        />
      </div>

      {/* ---- Resize Handle (Desktop Only) ---- */}
      {!isCollapsed && (
        <div
          ref={resizeRef}
          onMouseDown={() => setIsResizing(true)}
          className="hidden lg:block w-1 bg-slate-200 hover:bg-brand-400 cursor-col-resize transition-colors duration-200 flex-shrink-0"
          title="Drag to resize sidebar"
        />
      )}

      {/* ---- Mobile Sidebar Overlay ---- */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}
      <div className="lg:hidden fixed inset-y-0 left-0 z-50">
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      </div>

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
