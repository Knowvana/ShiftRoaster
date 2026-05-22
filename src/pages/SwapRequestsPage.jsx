/**
 * ============================================================================
 * SwapRequestsPage.jsx — Shift Swap Requests
 * 
 * Allows admins to:
 * - Create a swap request between two members for a specific day
 * - Approve or reject pending requests
 * - Auto-update the roster when a swap is approved
 * - View swap history with tabs (Pending / Approved / Rejected)
 * 
 * Data is stored in localStorage via swapService.js.
 * Roster updates happen via rosterService.js.
 * ============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeftRight, Plus, CheckCircle, XCircle,
  Clock, Trash2, X, Check,
} from 'lucide-react';
import { useProject } from '@hooks/useProject';
import { useToast } from '@hooks/useToast';
import Modal from '@components/common/Modal';
import { getMembers } from '@services/memberService';
import { getShifts } from '@services/shiftService';
import {
  getRoster, saveRoster, getDaysInMonth,
} from '@services/rosterService';
import {
  getSwapRequests, createSwapRequest,
  approveSwap, rejectSwap, deleteSwapRequest,
} from '@services/swapService';

// ---- Month Names ----
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ---- Tab Definitions ----
const TABS = [
  { id: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-600' },
  { id: 'approved', label: 'Approved', icon: CheckCircle, color: 'text-emerald-600' },
  { id: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-rose-600' },
];

// ---- Create Swap Form ----
// Form to create a new swap request between two members
function CreateSwapForm({ members, shifts, onSubmit, onCancel, projectId }) {
  const now = new Date();
  const [formData, setFormData] = useState({
    requesterId: '',
    targetId: '',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    date: now.getDate(),
    reason: '',
  });

  const totalDays = getDaysInMonth(formData.year, formData.month);

  // Get shift assignments for the selected day
  const roster = getRoster(projectId, formData.year, formData.month);
  const requesterShift = roster?.assignments?.[formData.requesterId]?.[String(formData.date)] || '—';
  const targetShift = roster?.assignments?.[formData.targetId]?.[String(formData.date)] || '—';

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.requesterId || !formData.targetId) return;
    if (formData.requesterId === formData.targetId) return;
    onSubmit({
      ...formData,
      requesterShift,
      targetShift,
    });
  };

  const isValid = formData.requesterId && formData.targetId
    && formData.requesterId !== formData.targetId
    && requesterShift !== '—' && targetShift !== '—';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Date selection */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="field-label">Year</label>
          <select
            value={formData.year}
            onChange={(e) => handleChange('year', Number(e.target.value))}
            className="select-field"
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Month</label>
          <select
            value={formData.month}
            onChange={(e) => handleChange('month', Number(e.target.value))}
            className="select-field"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Day</label>
          <select
            value={formData.date}
            onChange={(e) => handleChange('date', Number(e.target.value))}
            className="select-field"
          >
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Requester selection */}
      <div>
        <label className="field-label">Requesting Member</label>
        <select
          value={formData.requesterId}
          onChange={(e) => handleChange('requesterId', e.target.value)}
          className="select-field"
        >
          <option value="">Select member...</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        {formData.requesterId && (
          <p className="text-xs text-slate-500 mt-1">
            Current shift: <span className="font-bold">{requesterShift}</span>
          </p>
        )}
      </div>

      {/* Swap arrow */}
      <div className="flex items-center justify-center">
        <ArrowLeftRight size={20} className="text-brand-400" />
      </div>

      {/* Target selection */}
      <div>
        <label className="field-label">Swap With</label>
        <select
          value={formData.targetId}
          onChange={(e) => handleChange('targetId', e.target.value)}
          className="select-field"
        >
          <option value="">Select member...</option>
          {members
            .filter((m) => m.id !== formData.requesterId)
            .map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
        </select>
        {formData.targetId && (
          <p className="text-xs text-slate-500 mt-1">
            Current shift: <span className="font-bold">{targetShift}</span>
          </p>
        )}
      </div>

      {/* Reason (optional) */}
      <div>
        <label className="field-label">Reason (optional)</label>
        <input
          type="text"
          value={formData.reason}
          onChange={(e) => handleChange('reason', e.target.value)}
          placeholder="e.g., Personal appointment"
          className="input-field"
        />
      </div>

      {/* Warning if same shift */}
      {formData.requesterId && formData.targetId && requesterShift === targetShift && (
        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
          Both members have the same shift ({requesterShift}). Swapping won't change anything.
        </p>
      )}

      {/* Actions */}
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
          disabled={!isValid}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                     bg-brand-600 text-white hover:bg-brand-700 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check size={16} />
          Create Request
        </button>
      </div>
    </form>
  );
}

// ---- Single Swap Card ----
// Displays one swap request with approve/reject actions
function SwapCard({ swap, members, shifts, onApprove, onReject, onDelete }) {
  // Look up member names
  const requester = members.find((m) => m.id === swap.requesterId);
  const target = members.find((m) => m.id === swap.targetId);
  const requesterName = requester ? requester.name : 'Unknown';
  const targetName = target ? target.name : 'Unknown';

  // Look up shift colors
  const reqShift = shifts.find((s) => s.code === swap.requesterShift);
  const tgtShift = shifts.find((s) => s.code === swap.targetShift);

  const dateLabel = `${swap.date} ${MONTH_NAMES[swap.month - 1]} ${swap.year}`;

  // Status badge
  const statusConfig = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending' },
    approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Approved' },
    rejected: { bg: 'bg-rose-50', text: 'text-rose-700', label: 'Rejected' },
  };
  const status = statusConfig[swap.status] || statusConfig.pending;

  return (
    <div className="card p-4 space-y-3">
      {/* Header: date + status */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{dateLabel}</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.bg} ${status.text}`}>
          {status.label}
        </span>
      </div>

      {/* Swap details: Requester ⇄ Target */}
      <div className="flex items-center gap-3">
        {/* Requester */}
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold text-slate-800 truncate">{requesterName}</p>
          <div
            className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white mt-1"
            style={{ backgroundColor: reqShift ? reqShift.color : '#94a3b8' }}
          >
            {swap.requesterShift}
          </div>
        </div>

        {/* Arrow */}
        <ArrowLeftRight size={18} className="text-slate-400 flex-shrink-0" />

        {/* Target */}
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold text-slate-800 truncate">{targetName}</p>
          <div
            className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white mt-1"
            style={{ backgroundColor: tgtShift ? tgtShift.color : '#94a3b8' }}
          >
            {swap.targetShift}
          </div>
        </div>
      </div>

      {/* Reason */}
      {swap.reason && (
        <p className="text-xs text-slate-500 italic">"{swap.reason}"</p>
      )}

      {/* Actions (only for pending) */}
      {swap.status === 'pending' && (
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <button
            onClick={() => onApprove(swap)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <CheckCircle size={13} />
            Approve
          </button>
          <button
            onClick={() => onReject(swap)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
          >
            <XCircle size={13} />
            Reject
          </button>
        </div>
      )}

      {/* Delete for resolved swaps */}
      {swap.status !== 'pending' && (
        <div className="flex justify-end pt-1 border-t border-slate-100">
          <button
            onClick={() => onDelete(swap)}
            className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Main Swap Requests Page ----
export default function SwapRequestsPage() {
  const { currentProject } = useProject();
  const { showToast } = useToast();

  // ---- State ----
  const [swaps, setSwaps] = useState([]);
  const [members, setMembers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // ---- Load data ----
  useEffect(() => {
    if (!currentProject) {
      setSwaps([]);
      setMembers([]);
      setShifts([]);
      return;
    }

    setSwaps(getSwapRequests(currentProject.id));
    setMembers(getMembers(currentProject.id).filter((m) => m.isActive));
    setShifts(getShifts(currentProject.id));
  }, [currentProject]);

  const reloadSwaps = () => {
    if (currentProject) {
      setSwaps(getSwapRequests(currentProject.id));
    }
  };

  // ---- Filtered swaps by tab ----
  const filteredSwaps = useMemo(() => {
    return swaps.filter((s) => s.status === activeTab);
  }, [swaps, activeTab]);

  // ---- Tab counts ----
  const tabCounts = useMemo(() => {
    const counts = { pending: 0, approved: 0, rejected: 0 };
    for (const swap of swaps) {
      if (counts[swap.status] !== undefined) {
        counts[swap.status]++;
      }
    }
    return counts;
  }, [swaps]);

  // ---- Handlers ----

  /** Create a new swap request */
  const handleCreate = (formData) => {
    createSwapRequest(currentProject.id, formData);
    setIsCreateOpen(false);
    showToast('Swap request created', 'success');
    reloadSwaps();
  };

  /**
   * Approve a swap and update the roster.
   * Swaps the two members' shift assignments on the specified day.
   */
  const handleApprove = (swap) => {
    // Update swap status
    approveSwap(currentProject.id, swap.id);

    // Update the roster: swap the two members' shifts on that day
    const roster = getRoster(currentProject.id, swap.year, swap.month);
    if (roster && roster.assignments) {
      const dayStr = String(swap.date);

      // Perform the swap
      if (roster.assignments[swap.requesterId] && roster.assignments[swap.targetId]) {
        const temp = roster.assignments[swap.requesterId][dayStr];
        roster.assignments[swap.requesterId][dayStr] = roster.assignments[swap.targetId][dayStr];
        roster.assignments[swap.targetId][dayStr] = temp;

        saveRoster(currentProject.id, swap.year, swap.month, roster);
      }
    }

    showToast('Swap approved — roster updated!', 'success');
    reloadSwaps();
  };

  /** Reject a swap request */
  const handleReject = (swap) => {
    rejectSwap(currentProject.id, swap.id);
    showToast('Swap request rejected', 'info');
    reloadSwaps();
  };

  /** Delete a resolved swap from history */
  const handleDelete = (swap) => {
    deleteSwapRequest(currentProject.id, swap.id);
    showToast('Swap request removed', 'info');
    reloadSwaps();
  };

  // ---- No Project State ----
  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mb-4">
          <ArrowLeftRight size={28} className="text-brand-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">No Project Selected</h2>
        <p className="text-sm text-slate-500">Select or create a project to manage swap requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ---- Page Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Swap Requests</h1>
          <p className="text-sm text-slate-500 mt-1">
            {swaps.length} total request{swaps.length !== 1 ? 's' : ''} for{' '}
            <span className="font-medium text-slate-700">{currentProject.name}</span>
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                     bg-brand-600 text-white hover:bg-brand-700 transition-colors self-start"
        >
          <Plus size={16} />
          New Swap
        </button>
      </div>

      {/* ---- Tabs ---- */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = tabCounts[tab.id] || 0;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                ${isActive
                  ? `${tab.color} border-current`
                  : 'text-slate-500 border-transparent hover:text-slate-700'
                }`}
            >
              <Icon size={14} />
              {tab.label}
              {count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                  ${isActive ? 'bg-current/10' : 'bg-slate-100 text-slate-500'}
                `}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ---- Swap Cards Grid ---- */}
      {filteredSwaps.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSwaps.map((swap) => (
            <SwapCard
              key={swap.id}
              swap={swap}
              members={members}
              shifts={shifts}
              onApprove={handleApprove}
              onReject={handleReject}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center">
          <ArrowLeftRight size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">
            No {activeTab} swap requests.
          </p>
        </div>
      )}

      {/* ---- Create Swap Modal ---- */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="New Swap Request"
        size="md"
      >
        <CreateSwapForm
          members={members}
          shifts={shifts}
          projectId={currentProject.id}
          onSubmit={handleCreate}
          onCancel={() => setIsCreateOpen(false)}
        />
      </Modal>
    </div>
  );
}
