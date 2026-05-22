/**
 * ============================================================================
 * Sidebar.jsx — Navigation Sidebar
 * 
 * The left-hand navigation panel with links to all main pages.
 * - Fixed on desktop (lg: and above), overlay on mobile
 * - Highlights the currently active page
 * - Shows the app logo and version at the top
 * - Collapsible on mobile via hamburger menu in Header
 * ============================================================================
 */

import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  ArrowLeftRight,
  FolderOpen,
  X,
  Shield,
  Mail,
} from 'lucide-react';
import appConfig from '@config/app.json';
import { usePermissions } from '@hooks/usePermissions';

// ---- Navigation Items ----
// Each item has a label, path, and icon component
// minRole: 'resource' = everyone, 'project_admin' = admins only, 'site_admin' = site admin only
const NAV_ITEMS = [
  { label: 'Dashboard',     path: '/dashboard',    icon: LayoutDashboard, minRole: 'resource' },
  { label: 'Roster',        path: '/roster',       icon: Calendar,        minRole: 'resource' },
  { label: 'Team Members',  path: '/members',      icon: Users,           minRole: 'resource' },
  { label: 'Shifts',        path: '/shifts',       icon: Clock,           minRole: 'resource' },
  { label: 'Swap Requests', path: '/swaps',        icon: ArrowLeftRight,  minRole: 'resource' },
  { label: 'Email Config',  path: '/email-config', icon: Mail,            minRole: 'project_admin' },
  { label: 'Projects',      path: '/projects',     icon: FolderOpen,      minRole: 'site_admin' },
];

// ---- Single Nav Link Component ----
// Renders one navigation item with active state highlighting
function SidebarLink({ item, onClick }) {
  const IconComponent = item.icon;

  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
        ${isActive
          ? 'bg-brand-50 text-brand-700 shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
        }`
      }
    >
      <IconComponent size={18} className="flex-shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  );
}

// ---- Main Sidebar Component ----
export default function Sidebar({ isOpen, onClose }) {
  const { isSiteAdmin, isProjectAdmin } = usePermissions();

  const visibleItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      if (item.minRole === 'site_admin') return isSiteAdmin;
      if (item.minRole === 'project_admin') return isSiteAdmin || isProjectAdmin;
      return true; // 'resource' — everyone sees it
    });
  }, [isSiteAdmin, isProjectAdmin]);

  return (
    <>
      {/* Mobile overlay backdrop (only visible when sidebar is open on mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-teal-50/60 via-white to-white border-r border-teal-100
          transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:z-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">

          {/* ---- Logo & App Name ---- */}
          <div className="flex items-center justify-between px-5 py-5 border-b border-teal-100">
            <div className="flex items-center gap-3">
              {/* App icon */}
              <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md">
                <Shield size={18} className="text-white" />
              </div>
              {/* App name and version */}
              <div>
                <h1 className="text-base font-bold text-slate-800">{appConfig.appName}</h1>
                <p className="text-[10px] text-slate-400 font-medium">v{appConfig.version}</p>
              </div>
            </div>

            {/* Close button (mobile only) */}
            <button
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close sidebar"
            >
              <X size={20} />
            </button>
          </div>

          {/* ---- Navigation Links ---- */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {visibleItems.map((item) => (
              <SidebarLink key={item.path} item={item} onClick={onClose} />
            ))}
          </nav>

          {/* ---- Footer ---- */}
          <div className="px-5 py-4 border-t border-teal-100">
            <p className="text-[10px] text-slate-400 text-center">
              {appConfig.appName} &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
