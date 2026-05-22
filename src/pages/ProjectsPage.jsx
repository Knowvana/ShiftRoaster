/**
 * ============================================================================
 * ProjectsPage.jsx — Project Management
 * 
 * Allows admins to:
 * - Create new projects
 * - Edit project name and description
 * - Delete projects
 * - Switch between projects
 * 
 * Each project is an independent workspace with its own members, shifts,
 * and rosters. This enables multi-project use across different teams.
 * ============================================================================
 */

import React, { useState } from 'react';
import { FolderOpen, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useProject } from '@hooks/useProject';
import { useToast } from '@hooks/useToast';

// ---- Create Project Form ----
// A simple inline form to create a new project
function CreateProjectForm({ onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), description.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4 animate-slide-up">
      <h3 className="text-sm font-semibold text-slate-800">New Project</h3>

      {/* Project name input */}
      <div>
        <label htmlFor="projectName" className="field-label">Project Name</label>
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

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!name.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                     bg-brand-600 text-white hover:bg-brand-700 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check size={16} />
          Create
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

// ---- Single Project Card ----
// Displays one project with edit/delete actions
function ProjectCard({ project, isCurrent, onSwitch, onDelete }) {
  return (
    <div
      className={`card p-5 flex items-center justify-between transition-all duration-200
        ${isCurrent ? 'ring-2 ring-brand-500 border-transparent' : 'hover:shadow-card-lg'}
      `}
    >
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
        {/* Switch button (only if not already current) */}
        {!isCurrent && (
          <button
            onClick={() => onSwitch(project.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
          >
            Switch
          </button>
        )}

        {/* Current indicator */}
        {isCurrent && (
          <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500 text-white">
            Active
          </span>
        )}

        {/* Delete button */}
        <button
          onClick={() => onDelete(project.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
          title="Delete project"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

// ---- Main Projects Page ----
export default function ProjectsPage() {
  const { projects, currentProject, createProject, switchProject, deleteProject } = useProject();
  const { showToast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  /** Handle creating a new project */
  const handleCreate = (name, description) => {
    createProject(name, description);
    setIsCreating(false);
    showToast(`Project "${name}" created!`, 'success');
  };

  /** Handle deleting a project with confirmation */
  const handleDelete = (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const confirmed = window.confirm(
      `Delete "${project.name}"? This will remove all members, shifts, and rosters for this project. This cannot be undone.`
    );

    if (confirmed) {
      deleteProject(projectId);
      showToast(`Project "${project.name}" deleted`, 'info');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ---- Page Header ---- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Projects</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your shift roster projects
          </p>
        </div>

        {/* Create button */}
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

      {/* ---- Create Form (shown when creating) ---- */}
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
              onSwitch={switchProject}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        /* Empty state */
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
