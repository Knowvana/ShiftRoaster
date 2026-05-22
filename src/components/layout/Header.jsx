/**
 * ============================================================================
 * Header.jsx — Top Header Bar
 * 
 * The top bar shown on all authenticated pages.
 * Contains:
 * - Hamburger menu button (mobile only) to toggle sidebar
 * - Project switcher dropdown to change the active project
 * - Current user display with logout button
 * ============================================================================
 */

import React, { useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, LogOut, User, FolderOpen } from 'lucide-react';
import { useAuth } from '@hooks/useAuth';
import { useProject } from '@hooks/useProject';

// ---- Project Switcher Dropdown ----
// Shows the current project name and a dropdown to switch projects
function ProjectSwitcher() {
  const { projects, currentProject, switchProject } = useProject();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // If no projects exist, show a placeholder
  if (projects.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <FolderOpen size={16} />
        <span>No projects yet</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 
                   bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 
                   transition-colors"
      >
        <FolderOpen size={16} className="text-brand-500" />
        <span className="max-w-[160px] truncate">
          {currentProject ? currentProject.name : 'Select Project'}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg border border-slate-200 shadow-card-lg z-50 animate-fade-in">
          <div className="py-1">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  switchProject(project.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors
                  ${currentProject && currentProject.id === project.id
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-50'
                  }`}
              >
                {project.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Main Header Component ----
export default function Header({ onToggleSidebar }) {
  const { currentUser, logout } = useAuth();

  return (
    <header className="h-14 bg-gradient-to-r from-white via-white to-teal-50/50 border-b border-teal-100/60 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">

      {/* Left side: hamburger + project switcher */}
      <div className="flex items-center gap-3">
        {/* Hamburger menu (mobile only) */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden text-slate-500 hover:text-slate-700 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={22} />
        </button>

        {/* Project switcher */}
        <ProjectSwitcher />
      </div>

      {/* Right side: user info + logout */}
      <div className="flex items-center gap-4">
        {/* User display */}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center">
            <User size={14} className="text-brand-600" />
          </div>
          <span className="hidden sm:inline font-medium">
            {currentUser ? currentUser.displayName : 'Admin'}
          </span>
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                     text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          title="Sign out"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
