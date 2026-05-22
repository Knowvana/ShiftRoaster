/**
 * ============================================================================
 * ShiftsPage.jsx — Shift Definition Management
 * 
 * Full CRUD page for defining custom shift types per project:
 * - Add/edit/delete shift definitions
 * - Set shift code, name, color, start/end times
 * - Toggle working vs non-working (WO, Leave)
 * - Visual color picker with preset palette
 * - Reset to defaults
 * 
 * Data is stored in localStorage via shiftService.js.
 * Default shifts are loaded from app.json on first use.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Clock, Plus, Pencil, Trash2, RotateCcw,
  Check, X, Briefcase, Coffee, PhoneCall, Minus,
} from 'lucide-react';
import { useProject } from '@hooks/useProject';
import { useToast } from '@hooks/useToast';
import { usePermissions } from '@hooks/usePermissions';
import { useSync } from '@context/SyncContext';
import Modal from '@components/common/Modal';
import {
  getShifts,
  addShift,
  updateShift,
  deleteShift,
  resetToDefaults,
  fetchShifts,
  syncShifts,
} from '@services/shiftService';
import {
  getOnCallConfig,
  saveOnCallConfig,
  fetchOnCallConfig,
  syncOnCallConfig,
} from '@services/onCallService';
import { getOnCallEligibleMembers } from '@services/memberService';

// ---- Preset Color Palette ----
// A curated set of soothing colors for the shift color picker
const COLOR_PRESETS = [
  '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1',
  '#6ee7b7', '#34d399', '#10b981', '#059669',
  '#c4b5fd', '#a78bfa', '#8b5cf6',
  '#fca5a5', '#f87171', '#cbd5e1', '#94a3b8', '#d8b4fe',
];

// ---- Empty Form State ----
const EMPTY_FORM = {
  code: '',
  name: '',
  color: '#38bdf8',
  startTime: '',
  endTime: '',
  isWorkingShift: true,
  isDefault: false,
};

// ---- Color Picker Component ----
// Preset color grid + native browser color picker + custom hex input
function ColorPicker({ value, onChange }) {
  return (
    <div className="space-y-2">
      {/* Preset color grid */}
      <div className="flex flex-wrap gap-2">
        {COLOR_PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`w-7 h-7 rounded-lg border-2 transition-all duration-150
              ${value === color
                ? 'border-slate-800 scale-110 shadow-md'
                : 'border-transparent hover:border-slate-300 hover:scale-105'
              }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>

      {/* Native color picker + hex input */}
      <div className="flex items-center gap-2">
        <label className="relative cursor-pointer flex-shrink-0">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className="w-8 h-8 rounded-lg border-2 border-slate-300 hover:border-slate-400 transition-colors shadow-sm"
            style={{ backgroundColor: value }}
            title="Click to open color picker"
          />
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#7dd3fc"
          className="input-field text-xs font-mono w-28"
          maxLength={7}
        />
        <span className="text-[10px] text-slate-400">Click swatch or type hex</span>
      </div>
    </div>
  );
}

// ---- Shift Form Component ----
// Shared form for both creating and editing a shift
function ShiftForm({ formData, onChange, onSubmit, onCancel, isEditing }) {
  /** Handle text input changes */
  const handleChange = (event) => {
    const { name, value } = event.target;
    onChange({ ...formData, [name]: value });
  };

  /** Handle the working/non-working toggle */
  const handleToggleWorking = (isWorking) => {
    const updated = { ...formData, isWorkingShift: isWorking };

    // Clear times if switching to non-working
    if (!isWorking) {
      updated.startTime = '';
      updated.endTime = '';
    }

    onChange(updated);
  };

  /** Handle form submit */
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Shift Code and Name — side by side */}
      <div className="grid grid-cols-3 gap-3">
        {/* Code (short, e.g., "M", "WO") */}
        <div>
          <label htmlFor="shiftCode" className="field-label">
            Code <span className="text-rose-500">*</span>
          </label>
          <input
            id="shiftCode"
            name="code"
            type="text"
            value={formData.code}
            onChange={handleChange}
            placeholder="M"
            className="input-field text-center font-bold uppercase"
            maxLength={4}
            autoFocus
            required
          />
        </div>

        {/* Full Name */}
        <div className="col-span-2">
          <label htmlFor="shiftName" className="field-label">
            Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="shiftName"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="Morning"
            className="input-field"
            required
          />
        </div>
      </div>

      {/* Working / Non-Working Toggle */}
      <div>
        <label className="field-label">Type</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleToggleWorking(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors
              ${formData.isWorkingShift
                ? 'bg-brand-50 border-brand-300 text-brand-700'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
          >
            <Briefcase size={14} />
            Working Shift
          </button>
          <button
            type="button"
            onClick={() => handleToggleWorking(false)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors
              ${!formData.isWorkingShift
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
          >
            <Coffee size={14} />
            Non-Working
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {formData.isWorkingShift
            ? 'Working shifts count toward staffing requirements'
            : 'Non-working: Week Off, Leave, etc.'
          }
        </p>
      </div>

      {/* Default Shift toggle (only for working shifts) */}
      {formData.isWorkingShift && (
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-200">
          <div>
            <p className="text-sm font-medium text-slate-700">Default Shift</p>
            <p className="text-xs text-slate-400">Assign this shift to default-shift-only members</p>
          </div>
          <button
            type="button"
            onClick={() => onChange({ ...formData, isDefault: !formData.isDefault })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${formData.isDefault ? 'bg-brand-600' : 'bg-slate-300'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm
                ${formData.isDefault ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>
      )}

      {/* Start/End Times (only for working shifts) */}
      {formData.isWorkingShift && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="startTime" className="field-label">Start Time</label>
            <input
              id="startTime"
              name="startTime"
              type="time"
              value={formData.startTime}
              onChange={handleChange}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="endTime" className="field-label">End Time</label>
            <input
              id="endTime"
              name="endTime"
              type="time"
              value={formData.endTime}
              onChange={handleChange}
              className="input-field"
            />
          </div>
        </div>
      )}

      {/* Color Picker */}
      <div>
        <label className="field-label">Color</label>
        <ColorPicker
          value={formData.color}
          onChange={(color) => onChange({ ...formData, color })}
        />
      </div>

      {/* Action Buttons */}
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
          disabled={!formData.code.trim() || !formData.name.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                     bg-brand-600 text-white hover:bg-brand-700 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check size={16} />
          {isEditing ? 'Save Changes' : 'Add Shift'}
        </button>
      </div>
    </form>
  );
}

// ---- Single Shift Card ----
// Displays one shift definition with edit/delete actions
function ShiftCard({ shift, onEdit, onDelete, canEdit }) {
  return (
    <div className="card p-4 flex items-center justify-between hover:shadow-card-lg transition-shadow">
      {/* Left: color badge + shift info */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Color badge with shift code */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0"
          style={{ backgroundColor: shift.color }}
        >
          {shift.code}
        </div>

        {/* Shift details */}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{shift.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {/* Working/Non-Working badge */}
            {shift.isWorkingShift ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                <Briefcase size={10} /> Working
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                <Coffee size={10} /> Non-Working
              </span>
            )}

            {/* Default badge */}
            {shift.isDefault && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                ★ Default
              </span>
            )}

            {/* Time range (if set) */}
            {shift.startTime && shift.endTime && (
              <span className="text-[10px] text-slate-400">
                {shift.startTime} — {shift.endTime}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: action buttons (hidden for read-only) */}
      {canEdit && (
        <div className="flex items-center gap-1 flex-shrink-0 ml-3">
          <button
            onClick={() => onEdit(shift)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            title="Edit shift"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(shift)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Delete shift"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Main Shifts Page ----
export default function ShiftsPage() {
  const { currentProject } = useProject();
  const { showToast } = useToast();
  const { canEdit } = usePermissions();

  // ---- State ----
  const [shifts, setShifts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [onCallConfig, setOnCallConfig] = useState({ resourcesPerDay: 1, rotationPeriodDays: 7, enabled: false });
  const [eligibleCount, setEligibleCount] = useState(0);
  const { startSync, stopSync } = useSync();

  // ---- Load shifts + on-call config: instant from cache, then background refresh ----
  useEffect(() => {
    if (currentProject) {
      // Phase 1: Instant from localStorage
      setShifts(getShifts(currentProject.id));
      setOnCallConfig(getOnCallConfig(currentProject.id));
      setEligibleCount(getOnCallEligibleMembers(currentProject.id).length);
      // Phase 2: Background refresh from backend
      startSync();
      Promise.all([
        fetchShifts(currentProject.id),
        fetchOnCallConfig(currentProject.id),
      ])
        .then(([shiftsData, configData]) => {
          setShifts(shiftsData);
          setOnCallConfig(configData);
        })
        .catch(() => {})
        .finally(() => stopSync());
    } else {
      setShifts([]);
      setOnCallConfig({ resourcesPerDay: 1, rotationPeriodDays: 7, enabled: false });
      setEligibleCount(0);
    }
  }, [currentProject]);

  // ---- Re-read eligible count from localStorage on every render ----
  // This ensures the count is always fresh when navigating back from Members page.
  // useMemo re-computes whenever members change in localStorage (read on each render).
  const liveEligibleCount = currentProject
    ? getOnCallEligibleMembers(currentProject.id).length
    : 0;
  if (liveEligibleCount !== eligibleCount) {
    setEligibleCount(liveEligibleCount);
  }

  // ---- Reload from storage and sync to backend ----
  const reloadShifts = () => {
    if (currentProject) {
      const loaded = getShifts(currentProject.id);
      setShifts(loaded);
      // Sync to backend (Google Sheets)
      startSync();
      syncShifts(currentProject.id, loaded)
        .catch(() => {})
        .finally(() => stopSync());
    }
  };

  // ---- Handlers ----

  /** Open Add modal */
  const handleOpenAdd = () => {
    setFormData({ ...EMPTY_FORM });
    setEditingShift(null);
    setIsModalOpen(true);
  };

  /** Open Edit modal with pre-filled data */
  const handleOpenEdit = (shift) => {
    setFormData({
      code: shift.code,
      name: shift.name,
      color: shift.color,
      startTime: shift.startTime || '',
      endTime: shift.endTime || '',
      isWorkingShift: shift.isWorkingShift,
      isDefault: shift.isDefault || false,
    });
    setEditingShift(shift);
    setIsModalOpen(true);
  };

  /** Close modal */
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingShift(null);
    setFormData({ ...EMPTY_FORM });
  };

  /** Submit form — create or update */
  const handleFormSubmit = (data) => {
    if (editingShift) {
      const result = updateShift(currentProject.id, editingShift.id, data);
      if (result.success) {
        showToast(`Shift "${data.code}" updated`, 'success');
        handleCloseModal();
        reloadShifts();
      } else {
        showToast(result.message, 'error');
      }
    } else {
      const result = addShift(currentProject.id, data);
      if (result.success) {
        showToast(`Shift "${data.code}" added`, 'success');
        handleCloseModal();
        reloadShifts();
      } else {
        showToast(result.message, 'error');
      }
    }
  };

  /** Delete with confirmation */
  const handleDelete = (shift) => {
    const confirmed = window.confirm(
      `Delete shift "${shift.code} — ${shift.name}"? This cannot be undone.`
    );
    if (confirmed) {
      deleteShift(currentProject.id, shift.id);
      showToast(`Shift "${shift.code}" deleted`, 'info');
      reloadShifts();
    }
  };

  // ---- On-Call Config Handlers ----

  /** Toggle on-call enabled */
  const handleToggleOnCall = () => {
    const updated = { ...onCallConfig, enabled: !onCallConfig.enabled };
    setOnCallConfig(updated);
    saveOnCallConfig(currentProject.id, updated);
    syncOnCallConfig(currentProject.id, updated);
    showToast(updated.enabled ? 'On-call enabled' : 'On-call disabled', 'info');
  };

  /** Update resources per day */
  const handleResourcesChange = (delta) => {
    const newVal = Math.max(1, Math.min(10, onCallConfig.resourcesPerDay + delta));
    const updated = { ...onCallConfig, resourcesPerDay: newVal };
    setOnCallConfig(updated);
    saveOnCallConfig(currentProject.id, updated);
    syncOnCallConfig(currentProject.id, updated);
  };

  /** Update rotation period */
  const handleRotationChange = (e) => {
    const val = parseInt(e.target.value, 10) || 7;
    const updated = { ...onCallConfig, rotationPeriodDays: Math.max(1, Math.min(30, val)) };
    setOnCallConfig(updated);
    saveOnCallConfig(currentProject.id, updated);
    syncOnCallConfig(currentProject.id, updated);
  };

  /** Reset all shifts to defaults */
  const handleResetDefaults = () => {
    const confirmed = window.confirm(
      'Reset all shifts to the default set? Your custom shifts will be removed.'
    );
    if (confirmed) {
      resetToDefaults(currentProject.id);
      showToast('Shifts reset to defaults', 'info');
      reloadShifts();
    }
  };

  // ---- No project state ----

  // ---- No Project State ----
  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mb-4">
          <Clock size={28} className="text-brand-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">No Project Selected</h2>
        <p className="text-sm text-slate-500">Select or create a project to manage shifts.</p>
      </div>
    );
  }

  // ---- Separate working and non-working shifts for display ----
  const workingShifts = shifts.filter((s) => s.isWorkingShift);
  const nonWorkingShifts = shifts.filter((s) => !s.isWorkingShift);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ---- Page Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Shift Definitions</h1>
          <p className="text-sm text-slate-500 mt-1">
            {shifts.length} shift{shifts.length !== 1 ? 's' : ''} configured for{' '}
            <span className="font-medium text-slate-700">{currentProject.name}</span>
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 self-start">
            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                         bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors"
              title="Reset to default shifts"
            >
              <RotateCcw size={14} />
              Reset
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                         bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >
              <Plus size={16} />
              Add Shift
            </button>
          </div>
        )}
      </div>

      {/* ---- Working Shifts Section ---- */}
      {workingShifts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Briefcase size={14} className="text-brand-500" />
            Working Shifts ({workingShifts.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {workingShifts.map((shift) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
                canEdit={canEdit}
              />
            ))}
          </div>
        </div>
      )}

      {/* ---- Non-Working Shifts Section ---- */}
      {nonWorkingShifts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Coffee size={14} className="text-amber-500" />
            Non-Working ({nonWorkingShifts.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {nonWorkingShifts.map((shift) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
                canEdit={canEdit}
              />
            ))}
          </div>
        </div>
      )}

      {/* ---- On-Call Configuration Section ---- */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <PhoneCall size={16} className="text-violet-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">On-Call Configuration</h2>
              <p className="text-xs text-slate-400">Configure on-call rotation for this project</p>
            </div>
          </div>
          {canEdit && (
            <button
              onClick={handleToggleOnCall}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${onCallConfig.enabled ? 'bg-violet-600' : 'bg-slate-300'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${onCallConfig.enabled ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          )}
        </div>

        {onCallConfig.enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            {/* Resources per day */}
            <div>
              <label className="field-label">Resources Per Day</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleResourcesChange(-1)}
                  disabled={!canEdit || onCallConfig.resourcesPerDay <= 1}
                  className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center
                             text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="w-10 text-center text-lg font-bold text-slate-800">
                  {onCallConfig.resourcesPerDay}
                </span>
                <button
                  onClick={() => handleResourcesChange(1)}
                  disabled={!canEdit || onCallConfig.resourcesPerDay >= 10}
                  className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center
                             text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">How many people on-call each day</p>
            </div>

            {/* Rotation period */}
            <div>
              <label className="field-label">Rotation Period (days)</label>
              <input
                type="number"
                value={onCallConfig.rotationPeriodDays}
                onChange={handleRotationChange}
                min={1}
                max={30}
                disabled={!canEdit}
                className="input-field w-24"
              />
              <p className="text-[10px] text-slate-400 mt-1">Days before rotating to next group</p>
            </div>

            {/* Eligible members info */}
            <div>
              <label className="field-label">Eligible Members</label>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-lg font-bold ${eligibleCount > 0 ? 'text-violet-600' : 'text-rose-500'}`}>
                  {eligibleCount}
                </span>
                <span className="text-xs text-slate-400">members in on-call pool</span>
              </div>
              {eligibleCount === 0 && (
                <p className="text-[10px] text-rose-400 mt-1">
                  Go to Members page to mark members as on-call eligible
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ---- Empty State ---- */}
      {shifts.length === 0 && (
        <div className="card p-8 text-center">
          <Clock size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm mb-4">
            No shifts defined yet. Add your first shift or load defaults.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                         bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw size={14} />
              Load Defaults
            </button>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                         bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >
              <Plus size={16} />
              Add Shift
            </button>
          </div>
        </div>
      )}

      {/* ---- Add/Edit Modal ---- */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingShift ? `Edit Shift: ${editingShift.code}` : 'Add New Shift'}
      >
        <ShiftForm
          formData={formData}
          onChange={setFormData}
          onSubmit={handleFormSubmit}
          onCancel={handleCloseModal}
          isEditing={!!editingShift}
        />
      </Modal>
    </div>
  );
}
