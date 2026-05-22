/**
 * ============================================================================
 * usePermissions Hook — Role-Based Access Control
 * 
 * Provides permission checks based on the current user's role:
 *   - site_admin / super_admin: Full access to all projects and settings
 *   - project_admin: Can edit their assigned projects (members, shifts, roster)
 *   - resource: Read-only access to their assigned projects
 * 
 * Usage:
 *   const { isSiteAdmin, canEdit, canManageProjects, role } = usePermissions();
 * ============================================================================
 */

import { useAuth } from '@hooks/useAuth';
import { useProject } from '@hooks/useProject';

export function usePermissions() {
  const { currentUser, isLoggedIn } = useAuth();
  const { currentProject } = useProject();

  // If not logged in, no permissions at all (read-only public access)
  if (!isLoggedIn) {
    return {
      role: 'public',
      isSiteAdmin: false,
      isProjectAdmin: false,
      isAssignedToProject: false,
      canEdit: false,
      canManageProjects: false,
      canManageAdmins: false,
      canManageEmail: false,
    };
  }

  const role = currentUser?.role || 'resource';

  // Site admin (super_admin legacy alias) has full access everywhere
  const isSiteAdmin = role === 'site_admin' || role === 'super_admin';

  // Check if user is assigned to the current project
  const assignedProjects = currentUser?.projectIds || [];
  const isAssignedToProject = isSiteAdmin || (
    currentProject && assignedProjects.includes(currentProject.id)
  );

  // project_admin can edit their assigned projects
  const isProjectAdmin = role === 'project_admin';

  // Can the user edit data (members, shifts, roster, swaps)?
  const canEdit = isSiteAdmin || (isProjectAdmin && isAssignedToProject);

  // Can the user manage projects (create/delete/edit project settings)?
  const canManageProjects = isSiteAdmin;

  // Can the user manage admin accounts?
  const canManageAdmins = isSiteAdmin;

  // Can the user access email config?
  const canManageEmail = isSiteAdmin || (isProjectAdmin && isAssignedToProject);

  return {
    role,
    isSiteAdmin,
    isProjectAdmin,
    isAssignedToProject,
    canEdit,
    canManageProjects,
    canManageAdmins,
    canManageEmail,
  };
}
