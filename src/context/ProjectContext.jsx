/**
 * ============================================================================
 * ProjectContext.jsx — Project State Management
 * 
 * Manages the list of projects and the currently selected project.
 * Each project has its own team members, shifts, rosters, and rules.
 * Data is stored in localStorage (with future Google Sheets integration).
 * 
 * Usage:
 *   const { projects, currentProject, switchProject, createProject } = useProject();
 * ============================================================================
 */

import React, { createContext, useState, useCallback, useEffect, useMemo, useContext } from 'react';
import { isBackendConfigured, apiGet, apiPost } from '@services/apiClient';
import { AuthContext } from '@context/AuthContext';

// Create the context
export const ProjectContext = createContext(null);

// ---- Storage Keys ----
const STORAGE_KEY_PROJECTS = 'shiftRoster_projects';
const STORAGE_KEY_CURRENT = 'shiftRoster_currentProject';

/**
 * Generate a simple unique ID for new projects.
 * Format: lowercase letters and numbers, e.g., "proj_abc123"
 */
function generateProjectId() {
  const random = Math.random().toString(36).substring(2, 8);
  return `proj_${random}`;
}

/**
 * Load all projects from localStorage.
 * Returns an array of project objects.
 */
function loadProjects() {
  const stored = localStorage.getItem(STORAGE_KEY_PROJECTS);

  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  return [];
}

/**
 * Save the full projects list to localStorage.
 */
function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
}

// ---- Project Provider Component ----
export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.currentUser;

  // On mount: load projects from backend (or localStorage fallback)
  useEffect(() => {
    async function init() {
      let allProjects = loadProjects(); // Start with local cache

      if (isBackendConfigured()) {
        try {
          const res = await apiGet('getProjects');
          if (res.data && res.data.length > 0) {
            allProjects = res.data;
            saveProjects(allProjects); // Update local cache
          } else if (allProjects.length > 0) {
            // Backend is empty but local has data — push local to backend
            await apiPost('saveProjects', { data: allProjects });
          }
        } catch (err) {
          console.warn('[ProjectContext] Backend fetch failed, using localStorage:', err.message);
        }
      }

      setProjects(allProjects);

      // Try to restore the last selected project
      const savedCurrentId = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (savedCurrentId && allProjects.length > 0) {
        const found = allProjects.find((p) => p.id === savedCurrentId);
        setCurrentProject(found || allProjects[0]);
      } else if (allProjects.length > 0) {
        setCurrentProject(allProjects[0]);
      }

      setIsLoading(false);
    }
    init();
  }, []);

  /**
   * Create a new project.
   * Returns the created project object.
   */
  const createProject = useCallback((name, description = '') => {
    const newProject = {
      id: generateProjectId(),
      name,
      description,
      createdAt: new Date().toISOString(),
    };

    const updated = [...projects, newProject];
    setProjects(updated);
    saveProjects(updated);

    // Sync to backend
    if (isBackendConfigured()) {
      apiPost('createProject', { data: newProject }).catch((err) =>
        console.warn('[ProjectContext] Failed to sync new project:', err.message)
      );
    }

    // Auto-switch to the new project
    setCurrentProject(newProject);
    localStorage.setItem(STORAGE_KEY_CURRENT, newProject.id);

    return newProject;
  }, [projects]);

  /**
   * Switch to a different project by its ID.
   */
  const switchProject = useCallback((projectId) => {
    const found = projects.find((p) => p.id === projectId);
    if (found) {
      setCurrentProject(found);
      localStorage.setItem(STORAGE_KEY_CURRENT, found.id);
    }
  }, [projects]);

  /**
   * Update a project's name or description.
   */
  const updateProject = useCallback((projectId, updates) => {
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return { ...p, ...updates };
      }
      return p;
    });

    setProjects(updated);
    saveProjects(updated);

    // Sync to backend
    if (isBackendConfigured()) {
      apiPost('updateProject', { projectId, data: updates }).catch((err) =>
        console.warn('[ProjectContext] Failed to sync project update:', err.message)
      );
    }

    // If the current project was updated, refresh it
    if (currentProject && currentProject.id === projectId) {
      const refreshed = updated.find((p) => p.id === projectId);
      setCurrentProject(refreshed);
    }
  }, [projects, currentProject]);

  /**
   * Delete a project by its ID.
   * Also removes all associated data (members, shifts, rosters).
   */
  const deleteProject = useCallback((projectId) => {
    const updated = projects.filter((p) => p.id !== projectId);
    setProjects(updated);
    saveProjects(updated);

    // Clean up associated localStorage data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(projectId)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    // Sync deletion to backend
    if (isBackendConfigured()) {
      apiPost('deleteProject', { projectId }).catch((err) =>
        console.warn('[ProjectContext] Failed to sync project deletion:', err.message)
      );
    }

    // If the deleted project was currently selected, switch to another
    if (currentProject && currentProject.id === projectId) {
      if (updated.length > 0) {
        setCurrentProject(updated[0]);
        localStorage.setItem(STORAGE_KEY_CURRENT, updated[0].id);
      } else {
        setCurrentProject(null);
        localStorage.removeItem(STORAGE_KEY_CURRENT);
      }
    }
  }, [projects, currentProject]);

  // ---- Filter projects by user role ----
  const visibleProjects = useMemo(() => {
    if (!currentUser) return projects;
    const role = currentUser.role || 'resource';
    // site_admin and super_admin (legacy) see everything
    if (role === 'site_admin' || role === 'super_admin') return projects;
    // Others only see their assigned projects
    const assignedIds = currentUser.projectIds || [];
    return projects.filter((p) => assignedIds.includes(p.id));
  }, [projects, currentUser]);

  // ---- Context Value ----
  const contextValue = {
    projects: visibleProjects,
    allProjects: projects, // for admin management screens
    currentProject,
    isLoading,
    createProject,
    switchProject,
    updateProject,
    deleteProject,
    hasProjects: visibleProjects.length > 0,
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
}
