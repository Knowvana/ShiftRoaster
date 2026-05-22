/**
 * ============================================================================
 * useProject Hook — Access Project Context
 * 
 * A convenience hook to access the ProjectContext from any component.
 * Throws an error if used outside of ProjectProvider.
 * 
 * Usage:
 *   const { currentProject, projects, switchProject } = useProject();
 * ============================================================================
 */

import { useContext } from 'react';
import { ProjectContext } from '@context/ProjectContext';

export function useProject() {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error('useProject must be used inside a <ProjectProvider>');
  }

  return context;
}
