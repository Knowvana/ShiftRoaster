/**
 * ============================================================================
 * ProjectsPage.jsx — Project Management
 * 
 * Allows site admins to:
 * - Create new projects (with auto-generated project admin credentials)
 * - Edit project name and description
 * - Delete projects (with full Google Sheets cleanup + admin removal)
 * - Switch between projects
 * - Reset/regenerate project admin passwords
 * - Send credential emails to project admins
 * 
 * Each project is an independent workspace with its own members, shifts,
 * and rosters. This enables multi-project use across different teams.
 * ============================================================================
 */

import React, { useState, useMemo } from 'react';
import {
  FolderOpen, Plus, Trash2, Check, X, Key, Mail,
  Eye, EyeOff, RefreshCw, Shield, Copy, User,
} from 'lucide-react';
import CryptoJS from 'crypto-js';
import { useProject } from '@hooks/useProject';
import { useAuth } from '@hooks/useAuth';
import { useToast } from '@hooks/useToast';
import { isBackendConfigured, apiPost } from '@services/apiClient';

// ---- Helpers ----

/** Generate a random alphanumeric password of given length */
function generatePassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/** Generate a project admin username from project name */
function generateUsername(projectName) {
  const base = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 20);
  const suffix = Math.random().toString(36).substring(2, 5);
  return `${base}_admin_${suffix}`;
}

// ---- Create Project Form ----
function CreateProjectForm({ onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminDisplayName, setAdminDisplayName] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    if (!adminEmail.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      adminEmail: adminEmail.trim(),
      adminDisplayName: adminDisplayName.trim() || name.trim() + ' Admin',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4 animate-slide-up">
      <h3 className="text-sm font-semibold text-slate-800">New Project</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Project name input */}
        <div>
          <label htmlFor="projectName" className="field-label">Project Name *</label>
          <input
            id="projectName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Operations Team Q1"
            className="input-field"
            autoFocus
          />
        </div>

        {/* Description input */}
        <div>
          <label htmlFor="projectDesc" className="field-label">Description (optional)</label>
          <input
            id="projectDesc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this project"
            className="input-field"
          />
        </div>

        {/* Project admin email */}
        <div>
          <label htmlFor="adminEmail" className="field-label">Project Admin Email *</label>
          <input
            id="adminEmail"
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="admin@example.com"
            className="input-field"
          />
          <p className="text-[10px] text-slate-400 mt-1">Login credentials will be auto-generated and emailed</p>
        </div>

        {/* Admin display name */}
        <div>
          <label htmlFor="adminName" className="field-label">Admin Display Name</label>
          <input
            id="adminName"
            type="text"
            value={adminDisplayName}
            onChange={(e) => setAdminDisplayName(e.target.value)}
            placeholder="e.g., John Doe"
            className="input-field"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!name.trim() || !adminEmail.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                     bg-brand-600 text-white hover:bg-brand-700 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check size={16} />
          Create Project
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                     bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
        >
          <X size={16} />
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---- Credentials Display ----
function CredentialsDisplay({ username, password, onClose }) {
  const [showPassword, setShowPassword] = useState(true);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="card p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 space-y-3 animate-slide-up">
      <div className="flex items-center gap-2">
        <Key size={16} className="text-emerald-600" />
        <h3 className="text-sm font-bold text-emerald-800">Project Admin Credentials Generated</h3>
      </div>
      <p className="text-xs text-emerald-700">Save these credentials — the password cannot be recovered after dismissing.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-emerald-200">
          <label className="text-[10px] font-semibold text-slate-500 uppercase">Username</label>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-sm font-mono text-slate-800 flex-1">{username}</code>
            <button onClick={() => copyToClipboard(username, 'Username')} className="p-1 rounded hover:bg-slate-100" title="Copy">
              <Copy size={14} className="text-slate-400" />
            </button>
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-emerald-200">
          <label className="text-[10px] font-semibold text-slate-500 uppercase">Password</label>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-sm font-mono text-slate-800 flex-1">
              {showPassword ? password : '••••••••••••'}
            </code>
            <button onClick={() => setShowPassword(!showPassword)} className="p-1 rounded hover:bg-slate-100" title="Toggle visibility">
              {showPassword ? <EyeOff size={14} className="text-slate-400" /> : <Eye size={14} className="text-slate-400" />}
            </button>
            <button onClick={() => copyToClipboard(password, 'Password')} className="p-1 rounded hover:bg-slate-100" title="Copy">
              <Copy size={14} className="text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="text-xs font-medium text-emerald-700 hover:text-emerald-900 transition-colors"
      >
        Dismiss
      </button>
    </div>
  );
}

// ---- Single Project Card ----
function ProjectCard({ project, isCurrent, admin, onSwitch, onDelete, onResetPassword }) {
  return (
    <div
      className={`card p-5 transition-all duration-200
        ${isCurrent ? 'ring-2 ring-brand-500 border-transparent' : 'hover:shadow-card-lg'}
      `}
    >
      <div className="flex items-center justify-between">
        {/* Project info */}
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
            ${isCurrent ? 'bg-brand-500' : 'bg-slate-200'}`}
          >
            <FolderOpen size={18} className={isCurrent ? 'text-white' : 'text-slate-500'} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-800 truncate">{project.name}</h3>
            {project.description && (
              <p className="text-xs text-slate-500 truncate mt-0.5">{project.description}</p>
            )}
            <p className="text-[10px] text-slate-400 mt-1">
              Created {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {!isCurrent && (
            <button
              onClick={() => onSwitch(project.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium
                         bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
            >
              Switch
            </button>
          )}
          {isCurrent && (
            <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500 text-white">
              Active
            </span>
          )}
          <button
            onClick={() => onDelete(project.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
            title="Delete project"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Project Admin info */}
      {admin && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <User size={13} className="text-slate-400" />
            <span>Admin: <strong className="text-slate-700">{admin.displayName}</strong></span>
            <span className="text-slate-300">|</span>
            <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono">{admin.username}</code>
            {admin.email && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-slate-400">{admin.email}</span>
              </>
            )}
          </div>
          <button
            onClick={() => onResetPassword(project.id, admin.username)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium
                       text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
            title="Reset project admin password"
          >
            <RefreshCw size={11} />
            Reset Password
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Main Projects Page ----
export default function ProjectsPage() {
  const { projects, currentProject, createProject, switchProject, deleteProject } = useProject();
  const { admins, addAdmin, removeAdmin, changePassword, currentUser } = useAuth();
  const { showToast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [newCredentials, setNewCredentials] = useState(null); // { username, password, projectName }

  // Build projectId → admin map
  const projectAdminMap = useMemo(() => {
    const map = {};
    for (const admin of admins) {
      if (admin.role === 'project_admin' && admin.projectIds) {
        const pIds = Array.isArray(admin.projectIds) ? admin.projectIds :
          (typeof admin.projectIds === 'string' ? JSON.parse(admin.projectIds || '[]') : []);
        for (const pid of pIds) {
          map[pid] = admin;
        }
      }
    }
    return map;
  }, [admins]);

  /** Handle creating a new project with auto-generated admin credentials */
  const handleCreate = ({ name, description, adminEmail, adminDisplayName }) => {
    // Create the project
    const project = createProject(name, description);

    // Generate credentials
    const username = generateUsername(name);
    const password = generatePassword(12);

    // Create the project admin account
    const result = addAdmin(username, password, adminDisplayName, 'project_admin', [project.id]);
    if (!result.success) {
      showToast(`Project created, but admin account failed: ${result.message}`, 'error');
      setIsCreating(false);
      return;
    }

    // Store the email on the admin record (update after creation)
    // We need to update the admin with the email — store it in the admin's record
    const storedAdmins = JSON.parse(localStorage.getItem('shiftRoster_admins') || '[]');
    const idx = storedAdmins.findIndex((a) => a.username === username);
    if (idx >= 0) {
      storedAdmins[idx].email = adminEmail;
      localStorage.setItem('shiftRoster_admins', JSON.stringify(storedAdmins));
      // Sync to backend
      if (isBackendConfigured()) {
        apiPost('saveAdmins', { data: storedAdmins }).catch(() => {});
      }
    }

    // Show credentials to site admin
    setNewCredentials({ username, password, projectName: name });

    // Send email notification to project admin with CC to site admin
    if (isBackendConfigured()) {
      apiPost('sendProjectAdminCredentials', {
        projectId: project.id,
        projectName: name,
        adminEmail,
        adminDisplayName,
        username,
        password,
        siteAdminEmail: currentUser?.email || '',
      }).then(() => {
        showToast(`Project "${name}" created! Credentials emailed to ${adminEmail}`, 'success');
      }).catch(() => {
        showToast(`Project "${name}" created! Email failed — share credentials manually.`, 'info');
      });
    } else {
      showToast(`Project "${name}" created! Share credentials with the admin manually.`, 'success');
    }

    setIsCreating(false);
  };

  /** Handle resetting a project admin's password */
  const handleResetPassword = (projectId, username) => {
    const confirmed = window.confirm(
      `Reset password for "${username}"? A new password will be generated.`
    );
    if (!confirmed) return;

    const newPassword = generatePassword(12);
    const result = changePassword(username, newPassword);

    if (!result.success) {
      showToast(`Password reset failed: ${result.message}`, 'error');
      return;
    }

    // Find the admin's email to send the new password
    const admin = admins.find((a) => a.username === username);
    const project = projects.find((p) => p.id === projectId);

    // Show the new credentials
    setNewCredentials({ username, password: newPassword, projectName: project?.name || 'Unknown' });

    // Send email with new credentials
    if (isBackendConfigured() && admin?.email) {
      apiPost('sendProjectAdminCredentials', {
        projectId,
        projectName: project?.name || '',
        adminEmail: admin.email,
        adminDisplayName: admin.displayName,
        username,
        password: newPassword,
        siteAdminEmail: currentUser?.email || '',
        isReset: true,
      }).then(() => {
        showToast(`Password reset! New credentials emailed to ${admin.email}`, 'success');
      }).catch(() => {
        showToast('Password reset! Email failed — share credentials manually.', 'info');
      });
    } else {
      showToast('Password reset! Share the new credentials with the admin manually.', 'success');
    }
  };

  /** Handle deleting a project with confirmation */
  const handleDelete = (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const confirmed = window.confirm(
      `Delete "${project.name}"? This will remove ALL data including:\n` +
      `• All members, shifts, rosters, and swaps\n` +
      `• All Google Sheets tabs for this project\n` +
      `• The project admin account\n\n` +
      `This cannot be undone.`
    );

    if (!confirmed) return;

    // Remove the project admin account
    const admin = projectAdminMap[projectId];
    if (admin) {
      removeAdmin(admin.username);
    }

    // Delete the project (handles localStorage + backend cleanup)
    deleteProject(projectId);

    showToast(`Project "${project.name}" and all associated data deleted`, 'info');
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ---- Page Header ---- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Projects</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage shift roster projects and their admin accounts
          </p>
        </div>

        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                       bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            <Plus size={16} />
            New Project
          </button>
        )}
      </div>

      {/* ---- Credentials Display (after create/reset) ---- */}
      {newCredentials && (
        <CredentialsDisplay
          username={newCredentials.username}
          password={newCredentials.password}
          onClose={() => setNewCredentials(null)}
        />
      )}

      {/* ---- Create Form ---- */}
      {isCreating && (
        <CreateProjectForm
          onSubmit={handleCreate}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {/* ---- Project List ---- */}
      {projects.length > 0 ? (
        <div className="space-y-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isCurrent={currentProject && currentProject.id === project.id}
              admin={projectAdminMap[project.id] || null}
              onSwitch={switchProject}
              onDelete={handleDelete}
              onResetPassword={handleResetPassword}
            />
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center">
          <FolderOpen size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm mb-4">
            No projects yet. Create your first project to get started.
          </p>
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                         bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >
              <Plus size={16} />
              Create Project
            </button>
          )}
        </div>
      )}
    </div>
  );
}
