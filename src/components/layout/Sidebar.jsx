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
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import appConfig from '@config/app.json';
import { usePermissions } from '@hooks/usePermissions';
import { useAuth } from '@hooks/useAuth';

// ---- Navigation Items ----
// Each item has a label, path, and icon component
// minRole: 'public' = no login needed, 'project_admin' = admins only, 'site_admin' = site admin only
const NAV_ITEMS = [
  { label: 'Dashboard',     path: '/dashboard',    icon: LayoutDashboard, minRole: 'public' },
  { label: 'Roster',        path: '/roster',       icon: Calendar,        minRole: 'public' },
  { label: 'Team Members',  path: '/members',      icon: Users,           minRole: 'project_admin' },
  { label: 'Shifts',        path: '/shifts',       icon: Clock,           minRole: 'project_admin' },
  { label: 'Swap Requests', path: '/swaps',        icon: ArrowLeftRight,  minRole: 'project_admin' },
  { label: 'Email Config',  path: '/email-config', icon: Mail,            minRole: 'project_admin' },
  { label: 'Projects',      path: '/projects',     icon: FolderOpen,      minRole: 'site_admin' },
  { type: 'separator' },
  { label: 'Documentation', path: '/docs',         icon: BookOpen,        minRole: 'public' },
];

// ---- Single Nav Link Component ----
// Renders one navigation item with active state highlighting
function SidebarLink({ item, onClick, isCollapsed }) {
  const IconComponent = item.icon;

  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      title={item.label}
      className={({ isActive }) =>
        `flex items-center rounded-lg text-sm font-medium transition-all duration-200
        ${isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'}
        ${isActive
          ? 'bg-brand-50 text-brand-700 shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
        }`
      }
    >
      <IconComponent size={18} className="flex-shrink-0" />
      {!isCollapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

// ---- Main Sidebar Component ----
export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse, sidebarWidth }) {
  const { isLoggedIn } = useAuth();
  const { isSiteAdmin, isProjectAdmin } = usePermissions();

  const visibleItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      if (item.type === 'separator') return true; // Always show separators
      if (item.minRole === 'public') return true; // Always visible
      if (!isLoggedIn) return false; // Hide admin items when not logged in
      if (item.minRole === 'site_admin') return isSiteAdmin;
      if (item.minRole === 'project_admin') return isSiteAdmin || isProjectAdmin;
      return true;
    });
  }, [isLoggedIn, isSiteAdmin, isProjectAdmin]);

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

      {/* Sidebar panel — on desktop fills parent container, on mobile uses fixed overlay */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-56 bg-gradient-to-b from-teal-50/60 via-white to-white border-r border-teal-100
          transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:z-0 lg:w-full lg:h-full
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full overflow-hidden">

          {/* ---- Logo & App Name ---- */}
          <div className={`flex items-center border-b border-teal-100 ${isCollapsed ? 'justify-center px-2 py-4' : 'justify-between px-4 py-4'}`}>
            {isCollapsed ? (
              /* Collapsed: show only the app icon as expand button */
              <button
                onClick={onToggleCollapse}
                className="w-9 h-9 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
                title="Expand sidebar"
              >
                <ChevronRight size={16} className="text-white" />
              </button>
            ) : (
              /* Expanded: show full header */
              <>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                    <Shield size={18} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-sm font-bold text-slate-800 truncate">{appConfig.appName}</h1>
                    <p className="text-[10px] text-slate-400 font-medium">v{appConfig.version}</p>
                  </div>
                </div>

                {/* Collapse button (desktop only) */}
                {onToggleCollapse && (
                  <button
                    onClick={onToggleCollapse}
                    className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
                    title="Collapse sidebar"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}

                {/* Close button (mobile only) */}
                <button
                  onClick={onClose}
                  className="lg:hidden text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                  aria-label="Close sidebar"
                >
                  <X size={20} />
                </button>
              </>
            )}
          </div>

          {/* ---- Navigation Links ---- */}
          <nav className={`flex-1 py-3 space-y-1 overflow-y-auto ${isCollapsed ? 'px-1.5' : 'px-3'}`}>
            {visibleItems.map((item, index) =>
              item.type === 'separator'
                ? <div key={`sep-${index}`} className="my-2 border-t border-slate-200" />
                : <SidebarLink key={item.path} item={item} onClick={onClose} isCollapsed={isCollapsed} />
            )}
          </nav>

          {/* ---- Footer ---- */}
          {!isCollapsed && (
            <div className="px-4 py-3 border-t border-teal-100">
              <p className="text-[10px] text-slate-400 text-center truncate">
                {appConfig.appName} &copy; {new Date().getFullYear()}
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
