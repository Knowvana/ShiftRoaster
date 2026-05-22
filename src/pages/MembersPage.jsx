/**
 * ============================================================================
 * MembersPage.jsx — Team Members Management
 * 
 * Full CRUD page for managing team members within a project:
 * - View all members in a clean table
 * - Add new members via a modal form
 * - Edit existing member details
 * - Delete members with confirmation
 * - Toggle active/inactive status
 * - Search/filter members by name
 * 
 * Data is stored in localStorage via memberService.js
 * ============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Plus, Pencil, Trash2, Search,
  UserCheck, UserX, X, Check, AlertCircle, UserCog, Briefcase, PhoneCall,
} from 'lucide-react';
import { useProject } from '@hooks/useProject';
import { useToast } from '@hooks/useToast';
import { usePermissions } from '@hooks/usePermissions';
import { useSync } from '@context/SyncContext';
import Modal from '@components/common/Modal';
import {
  getMembers,
  addMember,
  updateMember,
  deleteMember,
  fetchMembers,
  syncMembers,
  getResources,
  getManagers,
} from '@services/memberService';

// ---- Empty Form State ----
// Used when creating a new member (all fields blank)
const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  role: '',
  memberType: 'resource',
  isOnCallEligible: false,
};

// ---- Member Form Component ----
// Shared form used for both creating and editing a member
function MemberForm({ formData, onChange, onSubmit, onCancel, isEditing }) {
  /**
   * Handle input changes by updating the form data.
   * Uses the input's 'name' attribute as the field key.
   */
  const handleChange = (event) => {
    const { name, value } = event.target;
    onChange({ ...formData, [name]: value });
  };

  /** Handle form submit with basic validation */
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name (required) */}
      <div>
        <label htmlFor="memberName" className="field-label">
          Full Name <span className="text-rose-500">*</span>
        </label>
        <input
          id="memberName"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Atul Gupta"
          className="input-field"
          autoFocus
          required
        />
      </div>

      {/* Email (optional) */}
      <div>
        <label htmlFor="memberEmail" className="field-label">Email</label>
        <input
          id="memberEmail"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="e.g., atul.gupta@accenture.com"
          className="input-field"
        />
      </div>

      {/* Phone (optional) */}
      <div>
        <label htmlFor="memberPhone" className="field-label">Phone</label>
        <input
          id="memberPhone"
          name="phone"
          type="text"
          value={formData.phone}
          onChange={handleChange}
          placeholder="e.g., +91 9876543210"
          className="input-field"
        />
      </div>

      {/* Member Type */}
      <div>
        <label htmlFor="memberType" className="field-label">
          Member Type <span className="text-rose-500">*</span>
        </label>
        <select
          id="memberType"
          name="memberType"
          value={formData.memberType}
          onChange={handleChange}
          className="input-field"
        >
          <option value="resource">Shift Resource</option>
          <option value="manager">Manager / Supervisor</option>
        </select>
        <p className="text-xs text-slate-400 mt-1">
          {formData.memberType === 'manager'
            ? 'Managers cannot be assigned to shifts. They receive email notifications.'
            : 'Shift resources are assigned to shifts in the roster.'}
        </p>
      </div>

      {/* Role/Designation (optional) */}
      <div>
        <label htmlFor="memberRole" className="field-label">Role / Designation</label>
        <input
          id="memberRole"
          name="role"
          type="text"
          value={formData.role}
          onChange={handleChange}
          placeholder="e.g., Senior Analyst"
          className="input-field"
        />
      </div>

      {/* On-Call Eligibility (only for resources) */}
      {formData.memberType === 'resource' && (
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-200">
          <div>
            <p className="text-sm font-medium text-slate-700">On-Call Eligible</p>
            <p className="text-xs text-slate-400">Include in on-call rotation pool</p>
          </div>
          <button
            type="button"
            onClick={() => onChange({ ...formData, isOnCallEligible: !formData.isOnCallEligible })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${formData.isOnCallEligible ? 'bg-violet-600' : 'bg-slate-300'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm
                ${formData.isOnCallEligible ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>
      )}

      {/* Action buttons in modal footer area */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                     bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
        >
          <X size={16} />
          Cancel
        </button>
        <button
          type="submit"
          disabled={!formData.name.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                     bg-brand-600 text-white hover:bg-brand-700 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check size={16} />
          {isEditing ? 'Save Changes' : 'Add Member'}
        </button>
      </div>
    </form>
  );
}

// ---- Main Members Page ----
export default function MembersPage() {
  const { currentProject } = useProject();
  const { showToast } = useToast();
  const { canEdit } = usePermissions();

  // ---- State ----
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null); // null = not editing
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const { startSync, stopSync } = useSync();

  // ---- Load members: instant from cache, then background refresh ----
  useEffect(() => {
    if (currentProject) {
      // Phase 1: Instant from localStorage
      setMembers(getMembers(currentProject.id));
      // Phase 2: Background refresh from backend
      startSync();
      fetchMembers(currentProject.id)
        .then((data) => setMembers(data))
        .catch(() => {})
        .finally(() => stopSync());
    } else {
      setMembers([]);
    }
  }, [currentProject]);

  // ---- Reload members from storage and sync to backend ----
  const reloadMembers = () => {
    if (currentProject) {
      const loaded = getMembers(currentProject.id);
      setMembers(loaded);
      syncMembers(currentProject.id, loaded);
    }
  };

  // ---- Filtered members based on search query ----
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;

    const query = searchQuery.toLowerCase();
    return members.filter((member) => {
      return (
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.role.toLowerCase().includes(query)
      );
    });
  }, [members, searchQuery]);

  // ---- Handlers ----

  /** Open the Add Member modal with a blank form */
  const handleOpenAdd = () => {
    setFormData({ ...EMPTY_FORM });
    setEditingMember(null);
    setIsAddModalOpen(true);
  };

  /** Open the Edit Member modal with the member's data pre-filled */
  const handleOpenEdit = (member) => {
    setFormData({
      name: member.name,
      email: member.email || '',
      phone: member.phone || '',
      role: member.role || '',
      memberType: member.memberType || 'resource',
      isOnCallEligible: member.isOnCallEligible || false,
    });
    setEditingMember(member);
    setIsAddModalOpen(true);
  };

  /** Close the modal and reset form state */
  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingMember(null);
    setFormData({ ...EMPTY_FORM });
  };

  /** Submit the form — either create or update */
  const handleFormSubmit = (data) => {
    if (editingMember) {
      updateMember(currentProject.id, editingMember.id, data);
      showToast(`${data.name} updated`, 'success');
    } else {
      addMember(currentProject.id, data);
      showToast(`${data.name} added to the team`, 'success');
    }

    handleCloseModal();
    reloadMembers(); // syncs to backend
  };

  /** Delete a member with confirmation */
  const handleDelete = (member) => {
    const confirmed = window.confirm(
      `Remove "${member.name}" from this project? This cannot be undone.`
    );

    if (confirmed) {
      deleteMember(currentProject.id, member.id);
      showToast(`${member.name} removed`, 'info');
      reloadMembers(); // syncs to backend
    }
  };

  /** Toggle a member's active/inactive status */
  const handleToggleActive = (member) => {
    const newStatus = !member.isActive;
    updateMember(currentProject.id, member.id, { isActive: newStatus });
    showToast(
      `${member.name} is now ${newStatus ? 'active' : 'inactive'}`,
      newStatus ? 'success' : 'info'
    );
    reloadMembers();
  };

  /** Toggle a member's on-call eligibility */
  const handleToggleOnCall = (member) => {
    const newStatus = !member.isOnCallEligible;
    updateMember(currentProject.id, member.id, { isOnCallEligible: newStatus });
    showToast(
      `${member.name} is now ${newStatus ? 'eligible' : 'not eligible'} for on-call`,
      newStatus ? 'success' : 'info'
    );
    reloadMembers();
  };

  // ---- No project state ----

  // ---- No Project Selected State ----
  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mb-4">
          <Users size={28} className="text-brand-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">No Project Selected</h2>
        <p className="text-sm text-slate-500">Select or create a project to manage team members.</p>
      </div>
    );
  }

  // ---- Count stats ----
  const activeCount = members.filter((m) => m.isActive).length;
  const inactiveCount = members.filter((m) => !m.isActive).length;
  const resourceCount = members.filter((m) => (m.memberType || 'resource') === 'resource').length;
  const managerCount = members.filter((m) => m.memberType === 'manager').length;
  const onCallEligibleCount = members.filter((m) => m.isOnCallEligible).length;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ---- Page Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Team Members</h1>
          <p className="text-sm text-slate-500 mt-1">
            {members.length} member{members.length !== 1 ? 's' : ''} in{' '}
            <span className="font-medium text-slate-700">{currentProject.name}</span>
            {members.length > 0 && (
              <span className="text-slate-400">
                {' '}({resourceCount} resources, {managerCount} managers &bull; {activeCount} active)
              </span>
            )}
          </p>
        </div>

        {/* Add Member button (hidden for read-only users) */}
        {canEdit && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                       bg-brand-600 text-white hover:bg-brand-700 transition-colors self-start"
          >
            <Plus size={16} />
            Add Member
          </button>
        )}
      </div>

      {/* ---- Search Bar ---- */}
      {members.length > 0 && (
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or role..."
            className="input-field pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* ---- Members Table ---- */}
      {filteredMembers.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table header */}
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider hidden sm:table-cell">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider hidden md:table-cell">
                    Role
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider hidden lg:table-cell">
                    On-Call
                  </th>
                  {canEdit && (
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              {/* Table body */}
              <tbody>
                {filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Name cell with avatar initial */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar circle with first letter of name */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0
                          ${!member.isActive ? 'bg-slate-400' : member.memberType === 'manager' ? 'bg-amber-500' : 'bg-brand-500'}`}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-800">{member.name}</p>
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase
                              ${member.memberType === 'manager'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-brand-50 text-brand-700 border border-brand-200'}`}
                            >
                              {member.memberType === 'manager' ? <><UserCog size={10} /> Mgr</> : <><Briefcase size={10} /> Res</>}
                            </span>
                          </div>
                          {/* Show email on mobile (hidden in separate column) */}
                          <p className="text-xs text-slate-400 sm:hidden">{member.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Email cell (hidden on small screens) */}
                    <td className="px-4 py-3 text-sm text-slate-600 hidden sm:table-cell">
                      {member.email || <span className="text-slate-300">—</span>}
                    </td>

                    {/* Role cell (hidden on small/medium screens) */}
                    <td className="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">
                      {member.role || <span className="text-slate-300">—</span>}
                    </td>

                    {/* Status toggle */}
                    <td className="px-4 py-3 text-center">
                      {canEdit ? (
                        <button
                          onClick={() => handleToggleActive(member)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors
                            ${member.isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          title={`Click to ${member.isActive ? 'deactivate' : 'activate'}`}
                        >
                          {member.isActive ? (
                            <><UserCheck size={12} /> Active</>
                          ) : (
                            <><UserX size={12} /> Inactive</>
                          )}
                        </button>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                          ${member.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {member.isActive ? (
                            <><UserCheck size={12} /> Active</>
                          ) : (
                            <><UserX size={12} /> Inactive</>
                          )}
                        </span>
                      )}
                    </td>

                    {/* On-Call Eligibility toggle */}
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      {(member.memberType || 'resource') === 'resource' ? (
                        canEdit ? (
                          <button
                            onClick={() => handleToggleOnCall(member)}
                            className="inline-flex items-center gap-2 cursor-pointer group"
                            title={`Click to ${member.isOnCallEligible ? 'remove from' : 'add to'} on-call pool`}
                          >
                            {/* Toggle switch */}
                            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                              ${member.isOnCallEligible ? 'bg-violet-600' : 'bg-slate-300 group-hover:bg-slate-400'}`}
                            >
                              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm
                                ${member.isOnCallEligible ? 'translate-x-[18px]' : 'translate-x-[3px]'}`}
                              />
                            </div>
                            <span className={`text-xs font-medium ${member.isOnCallEligible ? 'text-violet-700' : 'text-slate-400'}`}>
                              {member.isOnCallEligible ? 'Eligible' : 'Not Eligible'}
                            </span>
                          </button>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                            ${member.isOnCallEligible
                              ? 'bg-violet-50 text-violet-700'
                              : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            <PhoneCall size={12} />
                            {member.isOnCallEligible ? 'Eligible' : 'Not Eligible'}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-300 text-xs">N/A</span>
                      )}
                    </td>

                    {/* Action buttons: Edit, Delete (hidden for read-only) */}
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(member)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="Edit member"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(member)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Remove member"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : members.length > 0 ? (
        /* Search returned no results */
        <div className="card p-8 text-center">
          <AlertCircle size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            No members match "<span className="font-medium">{searchQuery}</span>"
          </p>
        </div>
      ) : (
        /* Empty state — no members yet */
        <div className="card p-8 text-center">
          <Users size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm mb-4">
            No team members yet. Add your first member to get started.
          </p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                       bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            <Plus size={16} />
            Add Member
          </button>
        </div>
      )}

      {/* ---- Add/Edit Modal ---- */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        title={editingMember ? 'Edit Member' : 'Add New Member'}
      >
        <MemberForm
          formData={formData}
          onChange={setFormData}
          onSubmit={handleFormSubmit}
          onCancel={handleCloseModal}
          isEditing={!!editingMember}
        />
      </Modal>
    </div>
  );
}
