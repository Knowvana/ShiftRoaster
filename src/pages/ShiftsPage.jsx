/**
 * ============================================================================
 * ShiftsPage.jsx — Shift Definition Management
 * 
 * Full CRUD page for defining custom shift types per project:
 * - Add/edit/delete shift definitions
 * - Set shift code, name, color, start/end times
 * - Toggle working vs non-working (WO, Leave, CO)
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
  Check, X, Briefcase, Coffee,
} from 'lucide-react';
import { useProject } from '@hooks/useProject';
import { useToast } from '@hooks/useToast';
import Modal from '@components/common/Modal';
import {
  getShifts,
  addShift,
  updateShift,
  deleteShift,
  resetToDefaults,
} from '@services/shiftService';

// ---- Preset Color Palette ----
// A curated set of colors for the shift color picker
const COLOR_PRESETS = [
  '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#a855f7',
  '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4',
  '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#94a3b8',
  '#64748b',
];

// ---- Empty Form State ----
const EMPTY_FORM = {
  code: '',
  name: '',
  color: '#6366f1',
  startTime: '',
  endTime: '',
  isWorkingShift: true,
};

// ---- Color Picker Component ----
// A simple grid of preset colors + custom hex input
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

      {/* Custom hex input */}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg border border-slate-300 flex-shrink-0"
          style={{ backgroundColor: value }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#6366f1"
          className="input-field text-xs font-mono w-28"
          maxLength={7}
        />
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
            : 'Non-working: Week Off, Leave, Comp Off, etc.'
          }
        </p>
      </div>

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
function ShiftCard({ shift, onEdit, onDelete }) {
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

            {/* Time range (if set) */}
            {shift.startTime && shift.endTime && (
              <span className="text-[10px] text-slate-400">
                {shift.startTime} — {shift.endTime}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: action buttons */}
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
    </div>
  );
}

// ---- Main Shifts Page ----
export default function ShiftsPage() {
  const { currentProject } = useProject();
  const { showToast } = useToast();

  // ---- State ----
  const [shifts, setShifts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  // ---- Load shifts when project changes ----
  useEffect(() => {
    if (currentProject) {
      setShifts(getShifts(currentProject.id));
    } else {
      setShifts([]);
    }
  }, [currentProject]);

  // ---- Reload from storage ----
  const reloadShifts = () => {
    if (currentProject) {
      setShifts(getShifts(currentProject.id));
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

        <div className="flex items-center gap-2 self-start">
          {/* Reset to defaults button */}
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                       bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors"
            title="Reset to default shifts"
          >
            <RotateCcw size={14} />
            Reset
          </button>

          {/* Add Shift button */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                       bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            <Plus size={16} />
            Add Shift
          </button>
        </div>
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
              />
            ))}
          </div>
        </div>
      )}

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
