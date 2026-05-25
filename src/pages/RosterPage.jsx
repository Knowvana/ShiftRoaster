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

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Wand2,
  Trash2, Save, Users, Download, CalendarDays, CalendarRange, PhoneCall,
} from 'lucide-react';
import { useProject } from '@hooks/useProject';
import { useToast } from '@hooks/useToast';
import { usePermissions } from '@hooks/usePermissions';
import { useSync } from '@context/SyncContext';
import { getMembers, fetchMembers } from '@services/memberService';
import { getShifts, fetchShifts } from '@services/shiftService';
import {
  getRoster, saveRoster, getDaysInMonth,
  getDayOfWeek, getDayName, deleteRoster,
  fetchRoster, syncRoster, syncDeleteRoster, syncFormattedRoster,
} from '@services/rosterService';
import { generateRoster, adjustForLeave } from '@services/rosterEngine';
import { exportRosterToExcel } from '@utils/exportExcel';
import {
  getOnCallAssignments, saveOnCallAssignments, fetchOnCallAssignments,
  syncOnCallAssignments, getOnCallCounts, getOnCallConfig, isOnCall,
  getOnCallMembers, generateOnCallAssignments, saveOnCallConfig,
} from '@services/onCallService';
import { getOnCallEligibleMembers } from '@services/memberService';
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

// ---- Helper: pick dark or light text color based on background luminance ----
function getContrastTextColor(hexColor) {
  if (!hexColor || hexColor.length < 7) return '#ffffff';
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  // Relative luminance (sRGB)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1e293b' : '#ffffff';
}

// ---- Single Roster Cell (used in Weekly + Monthly grids) ----
function RosterCell({ shiftCode, shiftColor, allShifts, onSelect, children }) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const textColor = shiftCode && shiftColor ? getContrastTextColor(shiftColor) : '#cbd5e1';
  const isEditable = typeof onSelect === 'function';

  return (
    <td className="relative p-0 border border-slate-100">
      <div
        onClick={isEditable ? () => setIsPickerOpen(true) : undefined}
        className={`w-full h-8 flex items-center justify-center text-[10px] font-bold transition-opacity
                   ${isEditable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
        style={{
          backgroundColor: shiftCode && shiftColor ? shiftColor : 'transparent',
          color: textColor,
        }}
        title={shiftCode || (isEditable ? 'Click to assign' : '')}
      >
        {shiftCode || '—'}
      </div>
      {children}
      {isEditable && isPickerOpen && (
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
  const summaryItems = [
    { code: 'LV', name: 'Leave', color: '#fecaca' },
    { code: 'WD', name: 'Working Days', color: '#e5e7eb' },
    { code: 'OC', name: 'On-Call', color: '#c4b5fd' },
  ];

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-3">
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[9px] font-semibold text-slate-600 uppercase tracking-wide mr-1">Shift Legend:</span>
        {shifts.map((shift) => (
          <div key={shift.id || shift.code} className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-100 bg-white">
            <div
              className="w-4 h-4 rounded flex items-center justify-center text-[7px] font-bold"
              style={{ backgroundColor: shift.color, color: getContrastTextColor(shift.color) }}
            >
              {shift.code}
            </div>
            <span className="text-[9px] text-slate-600 font-medium">{shift.name}</span>
          </div>
        ))}
        {summaryItems.map((item) => (
          <div key={item.code} className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-100 bg-white">
            <div
              className="w-4 h-4 rounded flex items-center justify-center text-[7px] font-bold"
              style={{ backgroundColor: item.color, color: getContrastTextColor(item.color) }}
            >
              {item.code}
            </div>
            <span className="text-[9px] text-slate-600 font-medium">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// DAILY VIEW
// ============================================================================

function DailyView({ members, shifts, shiftMap, assignments, selectedYear, selectedMonth, selectedDay, onCellChange, onCallAssignments }) {
  const totalDays = getDaysInMonth(selectedYear, selectedMonth);
  const dow = getDayOfWeek(selectedYear, selectedMonth, selectedDay);
  const dayName = getDayName(dow);
  const isWeekend = dow === 0 || dow === 6;

  // Count working / on-leave / on-call members for this day
  let workingCount = 0;
  let leaveCount = 0;
  const onCallToday = getOnCallMembers(onCallAssignments || {}, selectedDay);
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
          {onCallToday.length > 0 && <span className="text-violet-600">On-Call: {onCallToday.length}</span>}
        </div>
      </div>

      {/* Member list */}
      <div className="space-y-1.5">
        {members.map((member) => {
          const code = assignments[member.id]?.[String(selectedDay)] || null;
          const shift = code ? shiftMap[code] : null;

          const memberOnCall = onCallToday.includes(member.id);

          return (
            <DailyMemberRow
              key={member.id}
              member={member}
              shiftCode={code}
              shift={shift}
              allShifts={shifts}
              onSelect={(newCode) => onCellChange(member.id, selectedDay, newCode)}
              isOnCall={memberOnCall}
            />
          );
        })}
      </div>
    </div>
  );
}

// ---- Single member row in Daily view ----
function DailyMemberRow({ member, shiftCode, shift, allShifts, onSelect, isOnCall: memberIsOnCall }) {
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
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-slate-800 truncate">{member.name}</p>
            {memberIsOnCall && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-violet-100 text-violet-700 flex-shrink-0">
                <PhoneCall size={11} /> OC
              </span>
            )}
          </div>
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

function WeeklyView({ members, shifts, shiftMap, assignments, selectedYear, selectedMonth, selectedDay, onCellChange, onCallAssignments }) {
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

            {/* On-Call row */}
            <tr className="bg-violet-50 border-t border-violet-200">
              <td className="sticky left-0 z-10 bg-violet-50 px-3 py-2 text-[10px] font-bold text-violet-700 text-left border-r border-violet-200">
                <span className="flex items-center gap-1"><PhoneCall size={10} /> On-Call</span>
              </td>
              {weekDays.map((wd, i) => {
                if (!wd.isInMonth) return <td key={i} className="border border-violet-100 bg-slate-50" />;
                const ocMembers = getOnCallMembers(onCallAssignments || {}, wd.day);
                const count = ocMembers.length;
                const nameLabels = ocMembers.map((id) => {
                  const m = members.find((mem) => mem.id === id);
                  if (!m) return '?';
                  const parts = m.name.split(' ');
                  return parts[0].length <= 8 ? parts[0] : (parts[0][0] + (parts[1] ? parts[1][0] : ''));
                });
                const fullNames = ocMembers.map((id) => {
                  const m = members.find((mem) => mem.id === id);
                  return m ? m.name : '?';
                }).join(', ');
                return (
                  <td key={i} className={`px-1 py-1 text-[9px] font-bold border border-violet-100 text-center ${count > 0 ? 'bg-violet-100 text-violet-700' : 'text-slate-300'}`} title={count > 0 ? fullNames : 'No on-call'}>
                    {count > 0 ? nameLabels.join(', ') : '\u2014'}
                  </td>
                );
              })}
            </tr>
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
// Strip unknown/legacy shift codes from roster assignments
// ============================================================================

function cleanAssignments(assignments, shiftMap) {
  const cleaned = {};
  for (const [memberId, days] of Object.entries(assignments)) {
    cleaned[memberId] = {};
    for (const [day, code] of Object.entries(days)) {
      if (shiftMap[code]) cleaned[memberId][day] = code;
    }
  }
  return cleaned;
}

// ============================================================================
// MONTHLY VIEW
// ============================================================================

function MonthlyView({ members, shifts, shiftMap, assignments, selectedYear, selectedMonth, onCellChange, onCallAssignments }) {
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

  // Per-member summary: WO, Leave, Shift days, On-call days
  const memberSummary = useMemo(() => {
    const summary = {};
    for (const member of members) {
      let woCount = 0, leaveCount = 0, shiftCount = 0, onCallCount = 0;
      for (let day = 1; day <= totalDays; day++) {
        const dayStr = String(day);
        const code = assignments[member.id]?.[dayStr];
        if (code === 'WO') woCount++;
        else if (code && !shiftMap[code]?.isWorkingShift) leaveCount++;
        else if (code && shiftMap[code]?.isWorkingShift) shiftCount++;
        if (isOnCall(onCallAssignments, member.id, day)) onCallCount++;
      }
      summary[member.id] = { woCount, leaveCount, shiftCount, onCallCount };
    }
    return summary;
  }, [assignments, members, totalDays, shiftMap, onCallAssignments]);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-center">
          <thead>
            {/* Day names row */}
            <tr className="bg-slate-50">
              <th className="sticky left-0 z-10 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500 text-left border-b border-r border-slate-200">
                Member
              </th>
              {dayHeaders.map(({ day, dayName, isWeekend }) => (
                <th key={day} className={`px-0 py-1 text-[9px] font-medium border-b border-slate-200 w-9 ${isWeekend ? 'bg-rose-50 text-rose-400' : 'text-slate-400'}`}>
                  {dayName}
                </th>
              ))}
              <th className="px-1 py-1 text-[10px] font-semibold text-slate-500 border-b border-l border-slate-200 bg-slate-50 min-w-[100px]" colSpan={1}>
                <div className="grid grid-cols-4 gap-px text-[7px] font-bold">
                  <span className="text-slate-500">WO</span>
                  <span className="text-amber-600">Lv</span>
                  <span className="text-violet-600">OC</span>
                  <span className="text-emerald-600">WD</span>
                </div>
              </th>
            </tr>
            {/* Day numbers row */}
            <tr className="bg-slate-50">
              <th className="sticky left-0 z-10 bg-slate-50 px-2 py-1 text-[10px] font-bold text-brand-600 text-left border-b border-r border-slate-200">
                Dates →
              </th>
              {dayHeaders.map(({ day, isWeekend }) => (
                <th key={day} className={`px-0 py-1 text-[10px] font-bold border-b border-slate-200 ${isWeekend ? 'bg-rose-50 text-rose-600' : 'text-slate-700'}`}>
                  {day}
                </th>
              ))}
              <th className="px-1 py-1 border-b border-l border-slate-200 bg-slate-50 min-w-[100px]" />
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50/30">
                <td className="sticky left-0 z-10 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 text-left border-r border-b border-slate-100 whitespace-nowrap">
                  {member.name}
                </td>
                {dayHeaders.map(({ day }) => {
                  const code = assignments[member.id]?.[String(day)] || null;
                  const shiftObj = code ? shiftMap[code] : null;
                  const memberOnCallToday = isOnCall(onCallAssignments, member.id, day);
                  return (
                    <RosterCell
                      key={`${member.id}_${day}`}
                      shiftCode={code}
                      shiftColor={shiftObj ? shiftObj.color : null}
                      allShifts={shifts}
                      onSelect={(c) => onCellChange(member.id, day, c)}
                    >
                      {memberOnCallToday && (
                        <span className="absolute -top-0.5 -right-0.5 z-10 w-4.5 h-4.5 bg-yellow-400 border-2 border-white rounded-full flex items-center justify-center shadow-sm" title="On-Call">
                          <PhoneCall size={10} className="text-yellow-900" />
                        </span>
                      )}
                    </RosterCell>
                  );
                })}
                <td className="px-1 py-1 text-[9px] text-slate-600 border-l border-b border-slate-100 text-center">
                  {memberSummary[member.id] && (
                    <div className="grid grid-cols-4 gap-px">
                      <span className="font-bold text-slate-600 bg-gray-100 px-1 py-0.5 rounded">{memberSummary[member.id].woCount}</span>
                      <span className="font-bold text-amber-600 bg-gray-100 px-1 py-0.5 rounded">{memberSummary[member.id].leaveCount}</span>
                      <span className="font-bold text-violet-600 px-1 py-0.5 rounded">{memberSummary[member.id].onCallCount}</span>
                      <span className="font-bold text-emerald-600 bg-green-100 px-1 py-0.5 rounded">{memberSummary[member.id].shiftCount}</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {/* On-Call row */}
            <tr className="bg-gradient-to-r from-violet-50 to-purple-50 border-t border-violet-200">
              <td className="sticky left-0 z-10 bg-gradient-to-r from-violet-50 to-purple-50 px-2 py-2 text-[10px] font-bold text-violet-700 text-left border-r border-violet-200 uppercase tracking-wide whitespace-nowrap">
                <span className="flex items-center gap-1"><PhoneCall size={10} /> On-Call</span>
              </td>
              {dayHeaders.map(({ day }) => {
                const ocMembers = getOnCallMembers(onCallAssignments, day);
                const count = ocMembers.length;
                // Resolve names (first name if short, otherwise initials)
                const nameLabels = ocMembers.map((id) => {
                  const m = members.find((mem) => mem.id === id);
                  if (!m) return '?';
                  const parts = m.name.split(' ');
                  return parts[0].length <= 6 ? parts[0] : (parts[0][0] + (parts[1] ? parts[1][0] : ''));
                });
                const fullNames = ocMembers.map((id) => {
                  const m = members.find((mem) => mem.id === id);
                  return m ? m.name : '?';
                }).join(', ');
                return (
                  <td
                    key={day}
                    className={`px-0 py-1 text-[8px] font-bold border border-violet-100 text-center transition-colors leading-tight ${count > 0 ? 'bg-violet-100 text-violet-700' : 'bg-slate-50 text-slate-300'}`}
                    title={count > 0 ? fullNames : 'No on-call'}
                  >
                    {count > 0 ? (
                      <div className="flex flex-col items-center gap-0">
                        <span className="text-[9px] font-extrabold text-violet-800">{count}</span>
                        {nameLabels.map((n, i) => <span key={i} className="text-[7px] text-violet-600">{n}</span>)}
                      </div>
                    ) : '—'}
                  </td>
                );
              })}
              <td className="px-2 py-2 border-l border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50" />
            </tr>
            {/* Daily availability row */}
            <tr className="bg-gradient-to-r from-emerald-50 to-teal-50 border-t-2 border-emerald-200">
              <td className="sticky left-0 z-10 bg-gradient-to-r from-emerald-50 to-teal-50 px-2 py-2.5 text-[10px] font-bold text-emerald-700 text-left border-r border-emerald-200 uppercase tracking-wide whitespace-nowrap">
                👥 Staff
              </td>
              {dayHeaders.map(({ day }) => {
                const counts = dailyShiftCounts[day] || {};
                let wc = 0;
                for (const [code, cnt] of Object.entries(counts)) {
                  if (shiftMap[code] && shiftMap[code].isWorkingShift) wc += cnt;
                }
                return (
                  <td key={day} className={`px-0 py-2.5 text-[11px] font-bold border border-emerald-100 text-center transition-colors ${wc > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-50 text-slate-300'}`}>
                    {wc}
                  </td>
                );
              })}
              <td className="px-2 py-2.5 border-l border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50" />
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
  const { canEdit } = usePermissions();

  // ---- State ----
  const [activeView, setActiveView] = useState('monthly');
  const [selectedYear, setSelectedYear] = useState(() => getCurrentDate().year);
  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentDate().month);
  const [selectedDay, setSelectedDay] = useState(() => getCurrentDate().day);
  const [members, setMembers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [onCallAssignments, setOnCallAssignments] = useState({});
  const [hasUnsavedChanges, _setHasUnsavedChanges] = useState(false);
  const hasUnsavedRef = useRef(false);
  const setHasUnsavedChanges = useCallback((val) => { hasUnsavedRef.current = val; _setHasUnsavedChanges(val); }, []);
  const { isSyncing, startSync, stopSync } = useSync();

  // ---- Computed ----
  const totalDays = useMemo(() => getDaysInMonth(selectedYear, selectedMonth), [selectedYear, selectedMonth]);
  const monthLabel = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

  const shiftMap = useMemo(() => {
    const map = {};
    for (const shift of shifts) map[shift.code] = shift;
    return map;
  }, [shifts]);

  // ---- Load data: instant from cache, then background refresh ----
  useEffect(() => {
    if (!currentProject) {
      setMembers([]); setShifts([]); setAssignments({});
      return;
    }

    // Helper: build a shift lookup map from an array
    const buildMap = (arr) => { const m = {}; for (const s of arr) m[s.code] = s; return m; };

    // Phase 1: Instant from localStorage
    const cachedMembers = getMembers(currentProject.id)
      .filter((mem) => mem.isActive && (mem.memberType || 'resource') === 'resource');
    const cachedShifts = getShifts(currentProject.id);
    const cachedRoster = getRoster(currentProject.id, selectedYear, selectedMonth);
    const cachedOnCall = getOnCallAssignments(currentProject.id, selectedYear, selectedMonth);
    setMembers(cachedMembers);
    setShifts(cachedShifts);
    setAssignments(cleanAssignments(cachedRoster?.assignments || {}, buildMap(cachedShifts)));
    setOnCallAssignments(cachedOnCall);
    setHasUnsavedChanges(false);

    // Phase 2: Background refresh from backend
    startSync();
    Promise.all([
      fetchMembers(currentProject.id),
      fetchShifts(currentProject.id),
      fetchRoster(currentProject.id, selectedYear, selectedMonth),
      fetchOnCallAssignments(currentProject.id, selectedYear, selectedMonth),
    ]).then(([m, s, r, oc]) => {
      // Skip overwriting roster if user has made local edits (e.g., just generated)
      if (hasUnsavedRef.current) return;
      const freshShiftMap = buildMap(s);
      setMembers(m.filter((mem) => mem.isActive && (mem.memberType || 'resource') === 'resource'));
      setShifts(s);
      setAssignments(cleanAssignments(r?.assignments || {}, freshShiftMap));
      setOnCallAssignments(oc);
      setHasUnsavedChanges(false);
    }).catch(() => {}).finally(() => stopSync());
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
    const generated = generateRoster(members, shifts, selectedYear, selectedMonth, appConfig.rosterRules || {}, assignments);
    setAssignments(generated);
    setHasUnsavedChanges(true);

    // Also generate on-call assignments if enabled
    const ocConfig = getOnCallConfig(currentProject.id);
    if (ocConfig.enabled) {
      const eligible = getOnCallEligibleMembers(currentProject.id);
      if (eligible.length > 0) {
        const ocGenerated = generateOnCallAssignments(eligible, selectedYear, selectedMonth, ocConfig);
        setOnCallAssignments(ocGenerated);
        saveOnCallAssignments(currentProject.id, selectedYear, selectedMonth, ocGenerated);
        syncOnCallAssignments(currentProject.id, selectedYear, selectedMonth, ocGenerated);
        showToast(`Roster + on-call generated for ${eligible.length} eligible members!`, 'success');
      } else {
        showToast('Roster generated! On-call skipped — no eligible members.', 'success');
      }
    } else {
      showToast('Roster generated! Review and save.', 'success');
    }
  };

  const handleSave = () => {
    const rosterData = { assignments, generatedAt: new Date().toISOString() };
    saveRoster(currentProject.id, selectedYear, selectedMonth, rosterData);
    syncRoster(currentProject.id, selectedYear, selectedMonth, rosterData);
    // Also create formatted sheet in Google Sheets
    syncFormattedRoster(currentProject.id, currentProject.name, selectedYear, selectedMonth, members, shifts, assignments);
    setHasUnsavedChanges(false);
    showToast('Roster saved!', 'success');
  };

  const handleClear = () => {
    deleteRoster(currentProject.id, selectedYear, selectedMonth);
    syncDeleteRoster(currentProject.id, selectedYear, selectedMonth);
    setAssignments({});
    setHasUnsavedChanges(false);
    showToast('Roster cleared', 'info');
  };

  const handleExport = () => {
    if (Object.keys(assignments).length === 0) { showToast('Nothing to export', 'error'); return; }
    exportRosterToExcel(currentProject.name, members, shifts, assignments, selectedYear, selectedMonth, onCallAssignments);
    showToast('Excel file downloaded!', 'success');
  };

  const handleGenerateOnCall = () => {
    const config = getOnCallConfig(currentProject.id);
    if (!config.enabled) { showToast('Enable on-call in Shifts page first', 'error'); return; }
    const eligible = getOnCallEligibleMembers(currentProject.id);
    if (eligible.length === 0) { showToast('No eligible on-call members. Mark members as eligible in Members page.', 'error'); return; }
    const generated = generateOnCallAssignments(eligible, selectedYear, selectedMonth, config);
    setOnCallAssignments(generated);
    saveOnCallAssignments(currentProject.id, selectedYear, selectedMonth, generated);
    syncOnCallAssignments(currentProject.id, selectedYear, selectedMonth, generated);
    showToast(`On-call generated for ${eligible.length} eligible members!`, 'success');
  };

  // ---- No project state ----

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

      {/* ---- Page Header (consolidated) ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Title + Project Name + View Tabs + Date Navigator */}
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Roster</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              <span className="font-medium text-slate-700">{currentProject.name}</span>
              {hasUnsavedChanges && <span className="ml-2 text-amber-600 font-medium">● Unsaved</span>}
            </p>
          </div>
          
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

          {/* Date Navigation */}
          <div className="flex items-center gap-1.5">
            <button onClick={onPrev} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors" title="Previous">
              <ChevronLeft size={16} />
            </button>
            <button onClick={goToToday} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors min-w-[140px] text-center">
              {navLabel}
            </button>
            <button onClick={onNext} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors" title="Next">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <button onClick={handleGenerate} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors">
              <Wand2 size={14} /> Auto Generate
            </button>
          )}
          {canEdit && (
            <button onClick={handleSave} disabled={!hasUnsavedChanges} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Save size={14} /> Save
            </button>
          )}
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors">
            <Download size={14} /> Export
          </button>
          {canEdit && (
            <button onClick={handleClear} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors">
              <Trash2 size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ---- Shift Legend (Top) ---- */}
      <ShiftLegend shifts={shifts} />

      {/* ---- View Content ---- */}
      {activeView === 'daily' && (
        <DailyView
          members={members} shifts={shifts} shiftMap={shiftMap}
          assignments={assignments} selectedYear={selectedYear}
          selectedMonth={selectedMonth} selectedDay={selectedDay}
          onCellChange={canEdit ? handleCellChange : undefined}
          onCallAssignments={onCallAssignments}
        />
      )}

      {activeView === 'weekly' && (
        <WeeklyView
          members={members} shifts={shifts} shiftMap={shiftMap}
          assignments={assignments} selectedYear={selectedYear}
          selectedMonth={selectedMonth} selectedDay={selectedDay}
          onCellChange={canEdit ? handleCellChange : undefined}
          onCallAssignments={onCallAssignments}
        />
      )}

      {activeView === 'monthly' && (
        <MonthlyView
          members={members} shifts={shifts} shiftMap={shiftMap}
          assignments={assignments} selectedYear={selectedYear}
          selectedMonth={selectedMonth} onCellChange={canEdit ? handleCellChange : undefined}
          onCallAssignments={onCallAssignments}
        />
      )}

    </div>
  );
}
