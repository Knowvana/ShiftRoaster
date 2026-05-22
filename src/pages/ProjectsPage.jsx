/**
 * ============================================================================
 * ProjectsPage.jsx — Project Management
 * 
 * Allows site admins to:
 * - Create new projects (with auto-generated project admin credentials)
 * - Edit all project & admin fields via popup modal
 * - Delete projects (with full Google Sheets cleanup + admin removal)
 * - Switch between projects
 * - Reset/regenerate project admin passwords
 * - Resend credential emails to project admins
 * 
 * Each project is an independent workspace with its own members, shifts,
 * and rosters. This enables multi-project use across different teams.
 * ============================================================================
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  FolderOpen, Plus, Trash2, Check, X, Key, Mail, Pencil,
  Eye, EyeOff, RefreshCw, Shield, Copy, User, Send,
  AlertTriangle, Calendar, Hash,
} from 'lucide-react';
import CryptoJS from 'crypto-js';
import { useProject } from '@hooks/useProject';
import { useAuth } from '@hooks/useAuth';
import { useToast } from '@hooks/useToast';
import { isBackendConfigured, apiPost } from '@services/apiClient';

// ============================================================================
// HELPERS
// ============================================================================

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

/** Basic email format validation */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================================================
// MODAL OVERLAY
// ============================================================================

function ModalOverlay({ isOpen, onClose, children, maxWidth = 'max-w-2xl' }) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      {/* Modal content */}
      <div className={`relative ${maxWidth} w-full bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto animate-slide-up z-10`}>
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// CREATE PROJECT MODAL
// ============================================================================

function CreateProjectModal({ isOpen, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminDisplayName, setAdminDisplayName] = useState('');
  const [errors, setErrors] = useState({});

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setName(''); setDescription(''); setAdminEmail(''); setAdminDisplayName('');
      setErrors({});
    }
  }, [isOpen]);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Project name is required';
    if (!adminEmail.trim()) e.adminEmail = 'Admin email is required';
    else if (!isValidEmail(adminEmail.trim())) e.adminEmail = 'Invalid email format';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      adminEmail: adminEmail.trim(),
      adminDisplayName: adminDisplayName.trim() || name.trim() + ' Admin',
    });
  };

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-brand-50 to-teal-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center">
              <Plus size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">New Project</h2>
              <p className="text-[11px] text-slate-500">Create a new project with admin credentials</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Project Section */}
          <div>
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <FolderOpen size={12} className="text-brand-500" />
              Project Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Project Name <span className="text-rose-500">*</span></label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Operations Team Q1" className={`input-field ${errors.name ? 'ring-2 ring-rose-300 border-rose-300' : ''}`} autoFocus />
                {errors.name && <p className="text-[10px] text-rose-500 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="field-label">Description</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this project" className="input-field" />
              </div>
            </div>
          </div>

          {/* Admin Section */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Shield size={12} className="text-brand-500" />
              Project Admin
            </h3>
            <p className="text-[10px] text-slate-400 mb-3">A unique username and password will be auto-generated and emailed to the admin.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Admin Email <span className="text-rose-500">*</span></label>
                <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@example.com" className={`input-field ${errors.adminEmail ? 'ring-2 ring-rose-300 border-rose-300' : ''}`} />
                {errors.adminEmail && <p className="text-[10px] text-rose-500 mt-1">{errors.adminEmail}</p>}
              </div>
              <div>
                <label className="field-label">Admin Display Name</label>
                <input type="text" value={adminDisplayName} onChange={(e) => setAdminDisplayName(e.target.value)} placeholder="e.g., John Doe" className="input-field" />
                <p className="text-[10px] text-slate-400 mt-1">Defaults to "Project Name Admin" if left blank</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors">
            <Check size={16} />
            Create Project
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

// ============================================================================
// EDIT PROJECT MODAL
// ============================================================================

function EditProjectModal({ isOpen, onClose, project, admin, onSave, onResetPassword, onResendEmail }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminDisplayName, setAdminDisplayName] = useState('');
  const [errors, setErrors] = useState({});

  // Populate form when modal opens or project changes
  useEffect(() => {
    if (isOpen && project) {
      setName(project.name || '');
      setDescription(project.description || '');
      setAdminEmail(admin?.email || '');
      setAdminDisplayName(admin?.displayName || '');
      setErrors({});
    }
  }, [isOpen, project, admin]);

  const hasProjectChanges = project && (
    name.trim() !== (project.name || '') ||
    description.trim() !== (project.description || '')
  );
  const hasAdminChanges = admin && (
    adminEmail.trim() !== (admin.email || '') ||
    adminDisplayName.trim() !== (admin.displayName || '')
  );
  const hasChanges = hasProjectChanges || hasAdminChanges;

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Project name is required';
    if (adminEmail.trim() && !isValidEmail(adminEmail.trim())) e.adminEmail = 'Invalid email format';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    onSave({
      projectId: project.id,
      name: name.trim(),
      description: description.trim(),
      adminEmail: adminEmail.trim(),
      adminDisplayName: adminDisplayName.trim(),
      adminUsername: admin?.username,
    });
  };

  const handleClose = () => {
    if (hasChanges) {
      if (!window.confirm('You have unsaved changes. Discard?')) return;
    }
    onClose();
  };

  if (!project) return null;

  return (
    <ModalOverlay isOpen={isOpen} onClose={handleClose}>
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-brand-50 to-teal-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center">
              <Pencil size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Edit Project</h2>
              <p className="text-[11px] text-slate-500">Update project details and admin settings</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Project metadata (read-only) */}
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1"><Hash size={11} /> ID: <code className="font-mono bg-slate-100 px-1 rounded">{project.id}</code></span>
            <span className="flex items-center gap-1"><Calendar size={11} /> Created: {new Date(project.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>

          {/* Project details */}
          <div>
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <FolderOpen size={12} className="text-brand-500" />
              Project Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Project Name <span className="text-rose-500">*</span></label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={`input-field ${errors.name ? 'ring-2 ring-rose-300 border-rose-300' : ''}`} />
                {errors.name && <p className="text-[10px] text-rose-500 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="field-label">Description</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" className="input-field" />
              </div>
            </div>
          </div>

          {/* Admin section */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Shield size={12} className="text-brand-500" />
              Project Admin
            </h3>

            {admin ? (
              <div className="space-y-4">
                {/* Editable fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Admin Display Name</label>
                    <input type="text" value={adminDisplayName} onChange={(e) => setAdminDisplayName(e.target.value)} className="input-field" placeholder="Full name" />
                  </div>
                  <div>
                    <label className="field-label">Admin Email</label>
                    <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className={`input-field ${errors.adminEmail ? 'ring-2 ring-rose-300 border-rose-300' : ''}`} placeholder="admin@example.com" />
                    {errors.adminEmail && <p className="text-[10px] text-rose-500 mt-1">{errors.adminEmail}</p>}
                  </div>
                </div>

                {/* Read-only username + action buttons */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <User size={13} className="text-slate-400" />
                    <span>Login Username:</span>
                    <code className="bg-white px-2 py-0.5 rounded font-mono text-[11px] border border-slate-200 text-slate-700">{admin.username}</code>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onResetPassword(project.id, admin.username)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium
                                 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                    >
                      <RefreshCw size={12} />
                      Reset Password
                    </button>
                    <button
                      type="button"
                      onClick={() => onResendEmail(project.id, admin.username)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium
                                 text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors"
                    >
                      <Send size={12} />
                      Resend Credentials Email
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-xs text-amber-700">
                <AlertTriangle size={14} />
                <span>No project admin is assigned. This project was created before admin auto-generation was enabled.</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button type="button" onClick={handleClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={!hasChanges || !name.trim()} className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <Check size={16} />
            Save Changes
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

// ============================================================================
// CREDENTIALS DISPLAY (inline banner after create/reset)
// ============================================================================

function CredentialsDisplay({ username, password, onClose }) {
  const [showPassword, setShowPassword] = useState(true);
  const copyToClipboard = (text) => { navigator.clipboard.writeText(text).catch(() => {}); };

  return (
    <div className="card p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 space-y-3 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key size={16} className="text-emerald-600" />
          <h3 className="text-sm font-bold text-emerald-800">Project Admin Credentials Generated</h3>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-emerald-100 text-emerald-500 hover:text-emerald-700">
          <X size={14} />
        </button>
      </div>
      <p className="text-xs text-emerald-700">Save these credentials — the password cannot be recovered after dismissing.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-emerald-200">
          <label className="text-[10px] font-semibold text-slate-500 uppercase">Username</label>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-sm font-mono text-slate-800 flex-1">{username}</code>
            <button onClick={() => copyToClipboard(username)} className="p-1 rounded hover:bg-slate-100" title="Copy username">
              <Copy size={14} className="text-slate-400" />
            </button>
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-emerald-200">
          <label className="text-[10px] font-semibold text-slate-500 uppercase">Password</label>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-sm font-mono text-slate-800 flex-1">{showPassword ? password : '••••••••••••'}</code>
            <button onClick={() => setShowPassword(!showPassword)} className="p-1 rounded hover:bg-slate-100" title="Toggle visibility">
              {showPassword ? <EyeOff size={14} className="text-slate-400" /> : <Eye size={14} className="text-slate-400" />}
            </button>
            <button onClick={() => copyToClipboard(password)} className="p-1 rounded hover:bg-slate-100" title="Copy password">
              <Copy size={14} className="text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SINGLE PROJECT CARD
// ============================================================================

function ProjectCard({ project, isCurrent, admin, onSwitch, onDelete, onEdit }) {
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
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
            >
              Switch
            </button>
          )}
          {isCurrent && (
            <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500 text-white">Active</span>
          )}
          <button onClick={() => onEdit(project.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Edit project">
            <Pencil size={16} />
          </button>
          <button onClick={() => onDelete(project.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors" title="Delete project">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Project Admin info */}
      {admin && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
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
      )}
    </div>
  );
}

// ============================================================================
// MAIN PROJECTS PAGE
// ============================================================================

export default function ProjectsPage() {
  const { projects, currentProject, createProject, switchProject, deleteProject, updateProject } = useProject();
  const { admins, addAdmin, removeAdmin, changePassword, currentUser } = useAuth();
  const { showToast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null); // project object or null
  const [newCredentials, setNewCredentials] = useState(null);

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

  /** Helper: update admin fields in localStorage + backend */
  const updateAdminField = useCallback((username, updates) => {
    const storedAdmins = JSON.parse(localStorage.getItem('shiftRoster_admins') || '[]');
    const idx = storedAdmins.findIndex((a) => a.username === username);
    if (idx >= 0) {
      Object.assign(storedAdmins[idx], updates);
      localStorage.setItem('shiftRoster_admins', JSON.stringify(storedAdmins));
      if (isBackendConfigured()) {
        apiPost('saveAdmins', { data: storedAdmins }).catch(() => {});
      }
    }
  }, []);

  /** Helper: send credentials email */
  const sendCredentialsEmail = useCallback((payload) => {
    if (!isBackendConfigured()) return Promise.reject(new Error('Backend not configured'));
    return apiPost('sendProjectAdminCredentials', payload);
  }, []);

  // ---- CREATE ----
  const handleCreate = useCallback(({ name, description, adminEmail, adminDisplayName }) => {
    const project = createProject(name, description);
    const username = generateUsername(name);
    const password = generatePassword(12);

    const result = addAdmin(username, password, adminDisplayName, 'project_admin', [project.id]);
    if (!result.success) {
      showToast(`Project created, but admin account failed: ${result.message}`, 'error');
      setIsCreateOpen(false);
      return;
    }

    updateAdminField(username, { email: adminEmail });
    setNewCredentials({ username, password, projectName: name });
    setIsCreateOpen(false);

    sendCredentialsEmail({
      projectId: project.id, projectName: name, adminEmail, adminDisplayName,
      username, password, siteAdminEmail: currentUser?.email || '',
    }).then(() => {
      showToast(`Project "${name}" created! Credentials emailed to ${adminEmail}`, 'success');
    }).catch(() => {
      showToast(`Project "${name}" created! Email failed — share credentials manually.`, 'info');
    });
  }, [createProject, addAdmin, updateAdminField, sendCredentialsEmail, currentUser, showToast]);

  // ---- EDIT SAVE ----
  const handleEditSave = useCallback(({ projectId, name, description, adminEmail, adminDisplayName, adminUsername }) => {
    updateProject(projectId, { name, description });

    if (adminUsername) {
      updateAdminField(adminUsername, { email: adminEmail, displayName: adminDisplayName });
    }

    setEditingProject(null);
    showToast(`Project "${name}" updated!`, 'success');
  }, [updateProject, updateAdminField, showToast]);

  // ---- RESET PASSWORD ----
  const handleResetPassword = useCallback((projectId, username) => {
    if (!window.confirm(`Reset password for "${username}"? A new password will be generated.`)) return;

    const newPassword = generatePassword(12);
    const result = changePassword(username, newPassword);
    if (!result.success) { showToast(`Password reset failed: ${result.message}`, 'error'); return; }

    const admin = admins.find((a) => a.username === username);
    const project = projects.find((p) => p.id === projectId);
    setNewCredentials({ username, password: newPassword, projectName: project?.name || 'Unknown' });

    if (isBackendConfigured() && admin?.email) {
      sendCredentialsEmail({
        projectId, projectName: project?.name || '', adminEmail: admin.email,
        adminDisplayName: admin.displayName, username, password: newPassword,
        siteAdminEmail: currentUser?.email || '', isReset: true,
      }).then(() => showToast(`Password reset! Emailed to ${admin.email}`, 'success'))
        .catch(() => showToast('Password reset! Email failed — share manually.', 'info'));
    } else {
      showToast('Password reset! Share the new credentials manually.', 'success');
    }
  }, [admins, projects, changePassword, sendCredentialsEmail, currentUser, showToast]);

  // ---- RESEND EMAIL ----
  const handleResendEmail = useCallback((projectId, username) => {
    const admin = admins.find((a) => a.username === username);
    if (!admin?.email) { showToast('No email set for this admin. Edit the project to add one first.', 'error'); return; }
    if (!window.confirm(`Resend credentials to ${admin.email}?\nA new password will be generated and emailed.`)) return;

    const newPassword = generatePassword(12);
    const result = changePassword(username, newPassword);
    if (!result.success) { showToast(`Failed: ${result.message}`, 'error'); return; }

    const project = projects.find((p) => p.id === projectId);
    setNewCredentials({ username, password: newPassword, projectName: project?.name || 'Unknown' });

    sendCredentialsEmail({
      projectId, projectName: project?.name || '', adminEmail: admin.email,
      adminDisplayName: admin.displayName, username, password: newPassword,
      siteAdminEmail: currentUser?.email || '', isReset: true,
    }).then(() => showToast(`New credentials emailed to ${admin.email}`, 'success'))
      .catch(() => showToast('Email failed — share credentials manually.', 'info'));
  }, [admins, projects, changePassword, sendCredentialsEmail, currentUser, showToast]);

  // ---- DELETE ----
  const handleDelete = useCallback((projectId) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    if (!window.confirm(
      `Delete "${project.name}"? This will remove ALL data including:\n` +
      `• All members, shifts, rosters, and swaps\n` +
      `• All Google Sheets tabs for this project\n` +
      `• The project admin account\n\nThis cannot be undone.`
    )) return;

    const admin = projectAdminMap[projectId];
    if (admin) removeAdmin(admin.username);

    deleteProject(projectId);
    if (editingProject?.id === projectId) setEditingProject(null);

    showToast(`Project "${project.name}" and all associated data deleted`, 'info');
  }, [projects, projectAdminMap, removeAdmin, deleteProject, editingProject, showToast]);

  // ---- OPEN EDIT ----
  const openEdit = useCallback((projectId) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) setEditingProject(project);
  }, [projects]);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ---- Page Header ---- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Projects</h1>
          <p className="text-sm text-slate-500 mt-1">Manage shift roster projects and their admin accounts</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* ---- Credentials Display ---- */}
      {newCredentials && (
        <CredentialsDisplay
          username={newCredentials.username}
          password={newCredentials.password}
          onClose={() => setNewCredentials(null)}
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
              onEdit={openEdit}
            />
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center">
          <FolderOpen size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm mb-4">No projects yet. Create your first project to get started.</p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            <Plus size={16} />
            Create Project
          </button>
        </div>
      )}

      {/* ---- Create Modal ---- */}
      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
      />

      {/* ---- Edit Modal ---- */}
      <EditProjectModal
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        project={editingProject}
        admin={editingProject ? projectAdminMap[editingProject.id] || null : null}
        onSave={handleEditSave}
        onResetPassword={handleResetPassword}
        onResendEmail={handleResendEmail}
      />
    </div>
  );
}
