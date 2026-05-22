/**
 * ============================================================================
 * RosterPage.jsx — Roster View (Daily / Weekly / Monthly)
 * 
 * Three view tabs sharing the same data and actions:
 * - Daily:   Single-day vertical list of all members with shift badges
 * - Weekly:  7-day grid (Mon–Sun) for all members
 * - Monthly: Full calendar grid (rows = members, columns = days of month)
 * 
 * Common features across all views:
 * - Color-coded shift cells with click-to-edit shift picker
 * - Auto-generate, save, export, clear actions
 * - Shift legend
 * 
 * Data flow:
 *   Members → memberService.js
 *   Shifts → shiftService.js
 *   Roster data → rosterService.js
 *   Auto-generation → rosterEngine.js
 * ============================================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Wand2,
  Trash2, Save, Users, Download, CalendarDays, CalendarRange,
} from 'lucide-react';
import { useProject } from '@hooks/useProject';
import { useToast } from '@hooks/useToast';
import { getMembers } from '@services/memberService';
import { getShifts } from '@services/shiftService';
import {
  getRoster, saveRoster, getDaysInMonth,
  getDayOfWeek, getDayName, deleteRoster,
} from '@services/rosterService';
import { generateRoster, adjustForLeave } from '@services/rosterEngine';
import { exportRosterToExcel } from '@utils/exportExcel';
import appConfig from '@config/app.json';

// ---- Constants ----
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const VIEW_TABS = [
  { id: 'daily',   label: 'Daily',   icon: CalendarDays },
  { id: 'weekly',  label: 'Weekly',  icon: CalendarRange },
  { id: 'monthly', label: 'Monthly', icon: Calendar },
];

function getCurrentDate() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

// ============================================================================
// SHARED SUB-COMPONENTS
// ============================================================================

// ---- Shift Cell Picker Popover ----
function ShiftPicker({ shifts, currentCode, onSelect }) {
  return (
    <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg border border-slate-200 shadow-card-lg p-2 min-w-[120px] animate-fade-in">
      <div className="grid grid-cols-3 gap-1">
        {shifts.map((shift) => (
          <button
            key={shift.id || shift.code}
            onClick={() => onSelect(shift.code)}
            className={`px-2 py-1.5 rounded text-[10px] font-bold text-white text-center transition-all
              ${currentCode === shift.code ? 'ring-2 ring-slate-800 scale-105' : 'hover:scale-105'}
            `}
            style={{ backgroundColor: shift.color }}
            title={shift.name}
          >
            {shift.code}
          </button>
        ))}
      </div>
      <button
        onClick={() => onSelect(null)}
        className="w-full mt-1 px-2 py-1 rounded text-[10px] font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
      >
        Clear
      </button>
    </div>
  );
}

// ---- Single Roster Cell (used in Weekly + Monthly grids) ----
function RosterCell({ shiftCode, shiftColor, allShifts, onSelect }) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  return (
    <td className="relative p-0 border border-slate-100">
      <button
        onClick={() => setIsPickerOpen(true)}
        className="w-full h-8 flex items-center justify-center text-[10px] font-bold cursor-pointer
                   hover:opacity-80 transition-opacity"
        style={{
          backgroundColor: shiftCode && shiftColor ? shiftColor : 'transparent',
          color: shiftCode && shiftColor ? '#ffffff' : '#cbd5e1',
        }}
        title={shiftCode || 'Click to assign'}
      >
        {shiftCode || '—'}
      </button>
      {isPickerOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsPickerOpen(false)} />
          <ShiftPicker
            shifts={allShifts}
            currentCode={shiftCode}
            onSelect={(code) => { onSelect(code); setIsPickerOpen(false); }}
          />
        </>
      )}
    </td>
  );
}

// ---- Shift Legend (shared by all views) ----
function ShiftLegend({ shifts }) {
  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Shift Legend</h3>
      <div className="flex flex-wrap gap-2">
        {shifts.map((shift) => (
          <div key={shift.id || shift.code} className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-100">
            <div
              className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white"
              style={{ backgroundColor: shift.color }}
            >
              {shift.code}
            </div>
            <span className="text-[10px] text-slate-600 font-medium">{shift.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// DAILY VIEW
// ============================================================================

function DailyView({ members, shifts, shiftMap, assignments, selectedYear, selectedMonth, selectedDay, onCellChange }) {
  const totalDays = getDaysInMonth(selectedYear, selectedMonth);
  const dow = getDayOfWeek(selectedYear, selectedMonth, selectedDay);
  const dayName = getDayName(dow);
  const isWeekend = dow === 0 || dow === 6;

  // Count working / on-leave members for this day
  let workingCount = 0;
  let leaveCount = 0;
  for (const member of members) {
    const code = assignments[member.id]?.[String(selectedDay)] || null;
    const shift = code ? shiftMap[code] : null;
    if (shift && shift.isWorkingShift) workingCount++;
    else if (code && shift && !shift.isWorkingShift) leaveCount++;
  }

  return (
    <div className="space-y-4">
      {/* Day summary header */}
      <div className="card p-4 flex items-center justify-between">
        <div>
          <span className={`text-lg font-bold ${isWeekend ? 'text-rose-600' : 'text-slate-800'}`}>
            {dayName}, {selectedDay} {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </span>
          <p className="text-xs text-slate-500 mt-0.5">
            Day {selectedDay} of {totalDays}
          </p>
        </div>
        <div className="flex gap-4 text-xs font-medium">
          <span className="text-emerald-600">Working: {workingCount}</span>
          <span className="text-amber-600">Off/Leave: {leaveCount}</span>
        </div>
      </div>

      {/* Member list */}
      <div className="space-y-1.5">
        {members.map((member) => {
          const code = assignments[member.id]?.[String(selectedDay)] || null;
          const shift = code ? shiftMap[code] : null;

          return (
            <DailyMemberRow
              key={member.id}
              member={member}
              shiftCode={code}
              shift={shift}
              allShifts={shifts}
              onSelect={(newCode) => onCellChange(member.id, selectedDay, newCode)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ---- Single member row in Daily view ----
function DailyMemberRow({ member, shiftCode, shift, allShifts, onSelect }) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  return (
    <div className="card p-3 flex items-center justify-between gap-3 relative">
      {/* Member info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0
          ${shift && shift.isWorkingShift ? 'bg-teal-500' : 'bg-slate-400'}`}
        >
          {member.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{member.name}</p>
          {member.role && <p className="text-[10px] text-slate-400">{member.role}</p>}
        </div>
      </div>

      {/* Shift badge (clickable) */}
      <button
        onClick={() => setIsPickerOpen(true)}
        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white min-w-[50px] text-center transition-all hover:scale-105"
        style={{ backgroundColor: shift ? shift.color : '#e2e8f0', color: shift ? '#fff' : '#94a3b8' }}
      >
        {shiftCode || '—'}
      </button>

      {/* Picker popover */}
      {isPickerOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsPickerOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50">
            <ShiftPicker
              shifts={allShifts}
              currentCode={shiftCode}
              onSelect={(code) => { onSelect(code); setIsPickerOpen(false); }}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// WEEKLY VIEW
// ============================================================================

function WeeklyView({ members, shifts, shiftMap, assignments, selectedYear, selectedMonth, selectedDay, onCellChange }) {
  const totalDays = getDaysInMonth(selectedYear, selectedMonth);

  // Calculate the week (Mon–Sun) containing the selected day
  const weekDays = useMemo(() => {
    // Find Monday of the week containing selectedDay
    const date = new Date(selectedYear, selectedMonth - 1, selectedDay);
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(selectedYear, selectedMonth - 1, selectedDay + mondayOffset + i);
      const dayNum = d.getDate();
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const isInMonth = m === selectedMonth && y === selectedYear;
      const dow = d.getDay();
      days.push({
        day: dayNum,
        month: m,
        year: y,
        isInMonth,
        dayName: getDayName(dow),
        isWeekend: dow === 0 || dow === 6,
        dateLabel: `${dayNum} ${MONTH_NAMES[m - 1].substring(0, 3)}`,
      });
    }
    return days;
  }, [selectedYear, selectedMonth, selectedDay]);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-center">
          <thead>
            {/* Day name + date header */}
            <tr className="bg-slate-50">
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-500 text-left border-b border-r border-slate-200 min-w-[140px]">
                Member
              </th>
              {weekDays.map((wd, i) => (
                <th
                  key={i}
                  className={`px-2 py-2 text-xs font-medium border-b border-slate-200 min-w-[80px]
                    ${wd.isWeekend ? 'bg-rose-50 text-rose-500' : 'text-slate-600'}
                    ${!wd.isInMonth ? 'opacity-40' : ''}
                  `}
                >
                  <div>{wd.dayName}</div>
                  <div className="text-[10px] font-bold mt-0.5">{wd.dateLabel}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50/30">
                <td className="sticky left-0 z-10 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 text-left border-r border-b border-slate-100 truncate max-w-[140px]">
                  {member.name}
                </td>
                {weekDays.map((wd, i) => {
                  // Only allow editing days within the current month
                  if (!wd.isInMonth) {
                    return (
                      <td key={i} className="p-0 border border-slate-100 bg-slate-50/50">
                        <div className="h-8 flex items-center justify-center text-[10px] text-slate-300">—</div>
                      </td>
                    );
                  }
                  const code = assignments[member.id]?.[String(wd.day)] || null;
                  const shiftObj = code ? shiftMap[code] : null;
                  return (
                    <RosterCell
                      key={i}
                      shiftCode={code}
                      shiftColor={shiftObj ? shiftObj.color : null}
                      allShifts={shifts}
                      onSelect={(c) => onCellChange(member.id, wd.day, c)}
                    />
                  );
                })}
              </tr>
            ))}

            {/* Availability row */}
            <tr className="bg-slate-50 border-t-2 border-slate-300">
              <td className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-600 text-left border-r border-slate-200">
                Availability
              </td>
              {weekDays.map((wd, i) => {
                if (!wd.isInMonth) return <td key={i} className="border border-slate-200 bg-slate-50" />;
                let wc = 0;
                for (const m of members) {
                  const c = assignments[m.id]?.[String(wd.day)];
                  if (c && shiftMap[c] && shiftMap[c].isWorkingShift) wc++;
                }
                return (
                  <td key={i} className="px-0 py-2 text-[10px] font-bold border border-slate-200 text-center">
                    <span className={wc > 0 ? 'text-emerald-600' : 'text-slate-300'}>{wc}</span>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// MONTHLY VIEW
// ============================================================================

function MonthlyView({ members, shifts, shiftMap, assignments, selectedYear, selectedMonth, onCellChange }) {
  const totalDays = getDaysInMonth(selectedYear, selectedMonth);

  // Build day headers
  const dayHeaders = useMemo(() => {
    const headers = [];
    for (let day = 1; day <= totalDays; day++) {
      const dow = getDayOfWeek(selectedYear, selectedMonth, day);
      headers.push({ day, dayName: getDayName(dow), isWeekend: dow === 0 || dow === 6 });
    }
    return headers;
  }, [selectedYear, selectedMonth, totalDays]);

  // Daily shift counts (bottom summary)
  const dailyShiftCounts = useMemo(() => {
    const counts = {};
    for (let day = 1; day <= totalDays; day++) {
      const dayStr = String(day);
      const dayCounts = {};
      for (const member of members) {
        const code = assignments[member.id]?.[dayStr];
        if (code) dayCounts[code] = (dayCounts[code] || 0) + 1;
      }
      counts[day] = dayCounts;
    }
    return counts;
  }, [assignments, members, totalDays]);

  // Member shift counts (right summary)
  const memberShiftCounts = useMemo(() => {
    const counts = {};
    for (const member of members) {
      const mc = {};
      for (let day = 1; day <= totalDays; day++) {
        const code = assignments[member.id]?.[String(day)];
        if (code) mc[code] = (mc[code] || 0) + 1;
      }
      counts[member.id] = mc;
    }
    return counts;
  }, [assignments, members, totalDays]);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-center">
          <thead>
            {/* Day names row */}
            <tr className="bg-slate-50">
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-1 text-[10px] font-semibold text-slate-500 text-left border-b border-r border-slate-200 min-w-[120px]">
                Member
              </th>
              {dayHeaders.map(({ day, dayName, isWeekend }) => (
                <th key={day} className={`px-0 py-1 text-[9px] font-medium border-b border-slate-200 w-9 ${isWeekend ? 'bg-rose-50 text-rose-400' : 'text-slate-400'}`}>
                  {dayName}
                </th>
              ))}
              <th className="px-2 py-1 text-[10px] font-semibold text-slate-500 border-b border-l border-slate-200 bg-slate-50 min-w-[60px]">
                Summary
              </th>
            </tr>
            {/* Day numbers row */}
            <tr className="bg-slate-50">
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-600 text-left border-b border-r border-slate-200" />
              {dayHeaders.map(({ day, isWeekend }) => (
                <th key={day} className={`px-0 py-1 text-[10px] font-bold border-b border-slate-200 ${isWeekend ? 'bg-rose-50 text-rose-600' : 'text-slate-700'}`}>
                  {day}
                </th>
              ))}
              <th className="px-2 py-1 border-b border-l border-slate-200 bg-slate-50" />
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50/30">
                <td className="sticky left-0 z-10 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 text-left border-r border-b border-slate-100 truncate max-w-[120px]">
                  {member.name}
                </td>
                {dayHeaders.map(({ day }) => {
                  const code = assignments[member.id]?.[String(day)] || null;
                  const shiftObj = code ? shiftMap[code] : null;
                  return (
                    <RosterCell
                      key={`${member.id}_${day}`}
                      shiftCode={code}
                      shiftColor={shiftObj ? shiftObj.color : null}
                      allShifts={shifts}
                      onSelect={(c) => onCellChange(member.id, day, c)}
                    />
                  );
                })}
                <td className="px-2 py-1 text-[9px] text-slate-500 border-l border-b border-slate-100 text-left whitespace-nowrap">
                  {memberShiftCounts[member.id] && (
                    <div className="flex flex-wrap gap-0.5">
                      {Object.entries(memberShiftCounts[member.id]).map(([code, count]) => {
                        const s = shiftMap[code];
                        return (
                          <span key={code} className="inline-flex items-center px-1 rounded text-white font-bold" style={{ backgroundColor: s ? s.color : '#94a3b8', fontSize: '8px' }}>
                            {code}:{count}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {/* Daily availability row */}
            <tr className="bg-slate-50 border-t-2 border-slate-300">
              <td className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-600 text-left border-r border-slate-200">
                Availability
              </td>
              {dayHeaders.map(({ day }) => {
                const counts = dailyShiftCounts[day] || {};
                let wc = 0;
                for (const [code, cnt] of Object.entries(counts)) {
                  if (shiftMap[code] && shiftMap[code].isWorkingShift) wc += cnt;
                }
                return (
                  <td key={day} className="px-0 py-2 text-[10px] font-bold border border-slate-200 text-center">
                    <span className={wc > 0 ? 'text-emerald-600' : 'text-slate-300'}>{wc}</span>
                  </td>
                );
              })}
              <td className="px-2 py-2 border-l border-slate-200 bg-slate-50" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN ROSTER PAGE
// ============================================================================

export default function RosterPage() {
  const { currentProject } = useProject();
  const { showToast } = useToast();

  // ---- State ----
  const [activeView, setActiveView] = useState('monthly');
  const [selectedYear, setSelectedYear] = useState(() => getCurrentDate().year);
  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentDate().month);
  const [selectedDay, setSelectedDay] = useState(() => getCurrentDate().day);
  const [members, setMembers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // ---- Computed ----
  const totalDays = useMemo(() => getDaysInMonth(selectedYear, selectedMonth), [selectedYear, selectedMonth]);
  const monthLabel = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

  const shiftMap = useMemo(() => {
    const map = {};
    for (const shift of shifts) map[shift.code] = shift;
    return map;
  }, [shifts]);

  // ---- Load data ----
  useEffect(() => {
    if (!currentProject) {
      setMembers([]); setShifts([]); setAssignments({});
      return;
    }
    setMembers(getMembers(currentProject.id).filter((m) => m.isActive));
    setShifts(getShifts(currentProject.id));
    const roster = getRoster(currentProject.id, selectedYear, selectedMonth);
    setAssignments(roster?.assignments || {});
    setHasUnsavedChanges(false);
  }, [currentProject, selectedYear, selectedMonth]);

  // Clamp selectedDay when month changes
  useEffect(() => {
    if (selectedDay > totalDays) setSelectedDay(totalDays);
  }, [totalDays, selectedDay]);

  // ---- Navigation ----
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) { setSelectedYear(selectedYear - 1); setSelectedMonth(12); }
    else setSelectedMonth(selectedMonth - 1);
  };
  const goToNextMonth = () => {
    if (selectedMonth === 12) { setSelectedYear(selectedYear + 1); setSelectedMonth(1); }
    else setSelectedMonth(selectedMonth + 1);
  };
  const goToToday = () => {
    const { year, month, day } = getCurrentDate();
    setSelectedYear(year); setSelectedMonth(month); setSelectedDay(day);
  };

  // Day navigation (Daily view)
  const goToPrevDay = () => {
    if (selectedDay > 1) setSelectedDay(selectedDay - 1);
    else { goToPreviousMonth(); /* day will clamp via effect */ setSelectedDay(31); }
  };
  const goToNextDay = () => {
    if (selectedDay < totalDays) setSelectedDay(selectedDay + 1);
    else { goToNextMonth(); setSelectedDay(1); }
  };

  // Week navigation (Weekly view)
  const goToPrevWeek = () => {
    const newDay = selectedDay - 7;
    if (newDay >= 1) setSelectedDay(newDay);
    else { goToPreviousMonth(); setSelectedDay(Math.max(1, 28 + newDay)); }
  };
  const goToNextWeek = () => {
    const newDay = selectedDay + 7;
    if (newDay <= totalDays) setSelectedDay(newDay);
    else { goToNextMonth(); setSelectedDay(Math.min(newDay - totalDays, 7)); }
  };

  // ---- Handlers ----
  const handleCellChange = useCallback((memberId, day, shiftCode) => {
    setAssignments((prev) => {
      const updated = { ...prev };
      if (!updated[memberId]) updated[memberId] = {};
      if (shiftCode) {
        updated[memberId] = { ...updated[memberId], [String(day)]: shiftCode };
      } else {
        const copy = { ...updated[memberId] };
        delete copy[String(day)];
        updated[memberId] = copy;
      }
      return updated;
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleGenerate = () => {
    if (members.length === 0) { showToast('Add team members first', 'error'); return; }
    if (shifts.filter((s) => s.isWorkingShift).length === 0) { showToast('Add at least one working shift', 'error'); return; }
    const confirmed = Object.keys(assignments).length > 0 ? window.confirm('This will replace the current roster. Continue?') : true;
    if (!confirmed) return;
    const generated = generateRoster(members, shifts, selectedYear, selectedMonth, appConfig.rosterRules || {}, assignments);
    setAssignments(generated);
    setHasUnsavedChanges(true);
    showToast('Roster generated! Review and save.', 'success');
  };

  const handleSave = () => {
    saveRoster(currentProject.id, selectedYear, selectedMonth, { assignments, generatedAt: new Date().toISOString() });
    setHasUnsavedChanges(false);
    showToast('Roster saved!', 'success');
  };

  const handleClear = () => {
    if (window.confirm('Clear the entire roster for this month?')) {
      deleteRoster(currentProject.id, selectedYear, selectedMonth);
      setAssignments({});
      setHasUnsavedChanges(false);
      showToast('Roster cleared', 'info');
    }
  };

  const handleExport = () => {
    if (Object.keys(assignments).length === 0) { showToast('Nothing to export', 'error'); return; }
    exportRosterToExcel(currentProject.name, members, shifts, assignments, selectedYear, selectedMonth);
    showToast('Excel file downloaded!', 'success');
  };

  // ---- No Project ----
  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mb-4">
          <Calendar size={28} className="text-brand-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">No Project Selected</h2>
        <p className="text-sm text-slate-500">Select or create a project to view the roster.</p>
      </div>
    );
  }

  // ---- No Members ----
  if (members.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Roster</h1>
          <p className="text-sm text-slate-500 mt-1">
            Shift schedule for <span className="font-medium text-slate-700">{currentProject.name}</span>
          </p>
        </div>
        <div className="card p-8 text-center">
          <Users size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Add team members first, then come back to manage the roster.</p>
        </div>
      </div>
    );
  }

  // ---- Navigation label & arrows based on active view ----
  let navLabel = monthLabel;
  let onPrev = goToPreviousMonth;
  let onNext = goToNextMonth;

  if (activeView === 'daily') {
    const dayName = getDayName(getDayOfWeek(selectedYear, selectedMonth, selectedDay));
    navLabel = `${dayName}, ${selectedDay} ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;
    onPrev = goToPrevDay;
    onNext = goToNextDay;
  } else if (activeView === 'weekly') {
    navLabel = `Week of ${selectedDay} ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;
    onPrev = goToPrevWeek;
    onNext = goToNextWeek;
  }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ---- Page Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Roster</h1>
          <p className="text-sm text-slate-500 mt-1">
            <span className="font-medium text-slate-700">{currentProject.name}</span>
            {hasUnsavedChanges && <span className="ml-2 text-amber-600 font-medium">● Unsaved</span>}
          </p>
        </div>
        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleGenerate} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors">
            <Wand2 size={14} /> Auto Generate
          </button>
          <button onClick={handleSave} disabled={!hasUnsavedChanges} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <Save size={14} /> Save
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors">
            <Download size={14} /> Export
          </button>
          <button onClick={handleClear} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors">
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>

      {/* ---- View Tabs + Date Navigation ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* View toggle tabs */}
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          {VIEW_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                  ${isActive
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <button onClick={onPrev} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors" title="Previous">
            <ChevronLeft size={18} />
          </button>
          <button onClick={goToToday} className="px-4 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors min-w-[180px] text-center">
            {navLabel}
          </button>
          <button onClick={onNext} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors" title="Next">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ---- View Content ---- */}
      {activeView === 'daily' && (
        <DailyView
          members={members} shifts={shifts} shiftMap={shiftMap}
          assignments={assignments} selectedYear={selectedYear}
          selectedMonth={selectedMonth} selectedDay={selectedDay}
          onCellChange={handleCellChange}
        />
      )}

      {activeView === 'weekly' && (
        <WeeklyView
          members={members} shifts={shifts} shiftMap={shiftMap}
          assignments={assignments} selectedYear={selectedYear}
          selectedMonth={selectedMonth} selectedDay={selectedDay}
          onCellChange={handleCellChange}
        />
      )}

      {activeView === 'monthly' && (
        <MonthlyView
          members={members} shifts={shifts} shiftMap={shiftMap}
          assignments={assignments} selectedYear={selectedYear}
          selectedMonth={selectedMonth} onCellChange={handleCellChange}
        />
      )}

      {/* ---- Shift Legend ---- */}
      <ShiftLegend shifts={shifts} />
    </div>
  );
}
