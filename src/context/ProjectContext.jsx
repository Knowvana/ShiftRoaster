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

import React, { createContext, useState, useCallback, useEffect } from 'react';

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

  // On mount: load projects and restore the last selected project
  useEffect(() => {
    const allProjects = loadProjects();
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

  // ---- Context Value ----
  const contextValue = {
    projects,
    currentProject,
    isLoading,
    createProject,
    switchProject,
    updateProject,
    deleteProject,
    hasProjects: projects.length > 0,
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
}
