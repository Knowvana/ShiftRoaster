/**
 * ============================================================================
 * DashboardPage.jsx — Main Dashboard
 * 
 * Shows a live overview of the current project's roster status:
 * - Quick stats (total members, working today, on-leave, pending swaps)
 * - Today's shift breakdown (color-coded bars)
 * - On-call info for today
 * - This week's overview (daily staffing levels)
 * - Member availability for today (who's working what shift)
 * - Quick action links
 * 
 * All data is read live from localStorage services on every render.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, Clock, CalendarOff, ArrowLeftRight,
  Calendar, Briefcase, ChevronRight, PhoneCall, Shield,
  CalendarDays, TrendingUp, UserCheck,
} from 'lucide-react';
import { useProject } from '@hooks/useProject';
import { useSync } from '@context/SyncContext';
import { getMembers, fetchMembers } from '@services/memberService';
import { getShifts, fetchShifts } from '@services/shiftService';
import { getRoster, fetchRoster, getDaysInMonth, getDayOfWeek, getDayName } from '@services/rosterService';
import { getSwapRequests, fetchSwaps } from '@services/swapService';
import { getOnCallAssignments, getOnCallMembers } from '@services/onCallService';

// ---- Month Names ----
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---- Stat Card Component ----
function StatCard({ icon: Icon, label, value, color, subtext }) {
  return (
    <div className="card p-4 flex items-center gap-3.5 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} shadow-sm`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-slate-800 leading-tight">{value}</p>
        <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">{label}</p>
        {subtext && <p className="text-[9px] text-slate-400 mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}

// ---- Quick Action Link ----
function QuickAction({ to, icon: Icon, label, badge }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all group"
    >
      <Icon size={16} className="text-brand-500" />
      <span className="text-sm font-medium text-slate-700 group-hover:text-brand-600 flex-1">{label}</span>
      {badge > 0 && (
        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-600">{badge}</span>
      )}
      <ChevronRight size={14} className="text-slate-400" />
    </Link>
  );
}

// ---- Build dashboard data from raw arrays ----
function buildDashboardData(allMembers, shifts, roster, swaps, onCallData) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.getDate();
  const dayOfWeek = getDayOfWeek(year, month, today);
  const dayName = getDayName(dayOfWeek);
  const totalDays = getDaysInMonth(year, month);

  const activeMembers = allMembers.filter((m) => m.isActive && (m.memberType || 'resource') === 'resource');
  const pendingSwaps = swaps.filter((s) => s.status === 'pending').length;

  const shiftMap = {};
  for (const shift of shifts) shiftMap[shift.code] = shift;

  const todayStr = String(today);
  const todayShiftCounts = {};
  const todayMemberShifts = [];
  let workingCount = 0;
  let onLeaveCount = 0;
  let weekOffCount = 0;

  for (const member of activeMembers) {
    const code = roster?.assignments?.[member.id]?.[todayStr] || null;
    const shift = code ? shiftMap[code] : null;
    todayMemberShifts.push({ member, shiftCode: code, shift });
    if (code) {
      todayShiftCounts[code] = (todayShiftCounts[code] || 0) + 1;
      if (shift && shift.isWorkingShift) workingCount++;
      else if (code === 'WO') weekOffCount++;
      else if (code === 'PL' || code === 'CO' || code === 'CL' || code === 'SL' || code === 'EL' || code === 'LV') onLeaveCount++;
    }
  }

  // On-call members for today
  const onCallToday = getOnCallMembers(onCallData || {}, today);
  const onCallNames = onCallToday.map((id) => {
    const m = activeMembers.find((mem) => mem.id === id);
    return m ? m.name : '?';
  });

  // This week's daily staffing (Mon-Sun containing today)
  const todayDate = new Date(year, month - 1, today);
  const todayDow = todayDate.getDay();
  const mondayOffset = todayDow === 0 ? -6 : 1 - todayDow;
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(year, month - 1, today + mondayOffset + i);
    const dayNum = d.getDate();
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const isInMonth = m === month && y === year;
    const dow = d.getDay();

    let staffCount = 0, woCount = 0, lvCount = 0;
    if (isInMonth && roster?.assignments) {
      for (const member of activeMembers) {
        const c = roster.assignments[member.id]?.[String(dayNum)];
        if (c && shiftMap[c] && shiftMap[c].isWorkingShift) staffCount++;
        else if (c === 'WO') woCount++;
        else if (c && !(shiftMap[c]?.isWorkingShift)) lvCount++;
      }
    }

    const ocCount = isInMonth ? getOnCallMembers(onCallData || {}, dayNum).length : 0;

    weekDays.push({
      dayNum, dayName: DAY_NAMES_SHORT[dow], isToday: dayNum === today && isInMonth,
      isWeekend: dow === 0 || dow === 6, isInMonth,
      staffCount, woCount, lvCount, ocCount,
    });
  }

  // Monthly roster coverage: how many days have been rostered
  let rosteredDays = 0;
  if (roster?.assignments) {
    for (let day = 1; day <= totalDays; day++) {
      let anyAssigned = false;
      for (const member of activeMembers) {
        if (roster.assignments[member.id]?.[String(day)]) { anyAssigned = true; break; }
      }
      if (anyAssigned) rosteredDays++;
    }
  }

  return {
    year, month, today, dayName, dayOfWeek, totalDays,
    totalMembers: activeMembers.length,
    totalShifts: shifts.filter((s) => s.isWorkingShift).length,
    workingCount, onLeaveCount, weekOffCount, pendingSwaps,
    todayShiftCounts, todayMemberShifts, shifts, shiftMap,
    hasRoster: !!roster,
    onCallToday, onCallNames,
    weekDays, rosteredDays,
  };
}

export default function DashboardPage() {
  const { currentProject } = useProject();
  const [dashboardData, setDashboardData] = useState(null);
  const { startSync, stopSync } = useSync();

  // ---- Phase 1: Instant load from localStorage cache ----
  useEffect(() => {
    if (!currentProject) { setDashboardData(null); return; }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const cachedData = buildDashboardData(
      getMembers(currentProject.id),
      getShifts(currentProject.id),
      getRoster(currentProject.id, year, month),
      getSwapRequests(currentProject.id),
      getOnCallAssignments(currentProject.id, year, month),
    );
    setDashboardData(cachedData);

    // ---- Phase 2: Background refresh from backend ----
    startSync();
    Promise.all([
      fetchMembers(currentProject.id),
      fetchShifts(currentProject.id),
      fetchRoster(currentProject.id, year, month),
      fetchSwaps(currentProject.id),
    ]).then(([members, shifts, roster, swaps]) => {
      // On-call is localStorage-only, re-read after other data syncs
      const onCall = getOnCallAssignments(currentProject.id, year, month);
      setDashboardData(buildDashboardData(members, shifts, roster, swaps, onCall));
    }).catch(() => {
      // Keep cached data on error
    }).finally(() => stopSync());
  }, [currentProject]);

  // ---- No Project State ----
  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mb-4">
          <LayoutDashboard size={28} className="text-brand-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">No Project Selected</h2>
        <p className="text-sm text-slate-500 max-w-md">
          Create a project first to start managing your shift roster.
          Go to the Projects page to get started.
        </p>
      </div>
    );
  }

  if (!dashboardData) return null;

  const {
    year, month, today, dayName, totalDays,
    totalMembers, totalShifts, workingCount, onLeaveCount, weekOffCount, pendingSwaps,
    todayShiftCounts, todayMemberShifts, shiftMap, hasRoster,
    onCallToday, onCallNames,
    weekDays, rosteredDays,
  } = dashboardData;

  const coveragePct = totalDays > 0 ? Math.round((rosteredDays / totalDays) * 100) : 0;

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ---- Page Header ---- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            <span className="font-medium text-slate-700">{currentProject.name}</span>
            {' — '}
            <span>{dayName}, {today} {MONTH_NAMES[month - 1]} {year}</span>
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-400">
          <CalendarDays size={12} />
          <span>{MONTH_NAMES[month - 1]} {year} &middot; {rosteredDays}/{totalDays} days rostered</span>
        </div>
      </div>

      {/* ---- Quick Stats Grid ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Users} label="Active Members" value={totalMembers} color="bg-teal-500" />
        <StatCard icon={Briefcase} label="Working Today" value={workingCount} color="bg-emerald-500" />
        <StatCard icon={CalendarOff} label="On Leave" value={onLeaveCount} color="bg-amber-500" />
        <StatCard icon={Shield} label="Week Off" value={weekOffCount} color="bg-slate-400" />
        <StatCard icon={PhoneCall} label="On-Call" value={onCallToday.length} color="bg-violet-500" />
        <StatCard icon={ArrowLeftRight} label="Pending Swaps" value={pendingSwaps} color="bg-rose-400" />
      </div>

      {/* ---- On-Call Banner (if anyone is on-call today) ---- */}
      {onCallToday.length > 0 && (
        <div className="card border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PhoneCall size={14} className="text-violet-600" />
              <span className="text-xs font-bold text-violet-700 uppercase tracking-wide">On-Call Today</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {onCallNames.map((name, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-violet-200 shadow-sm">
                <span className="w-5 h-5 rounded-full bg-violet-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                  {name.charAt(0).toUpperCase()}
                </span>
                <span className="text-xs font-semibold text-violet-800">{name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ---- This Week Overview + Monthly Coverage ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* This Week's Staffing */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <CalendarDays size={14} className="text-brand-500" />
            This Week's Staffing
          </h2>
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((wd, i) => (
              <div
                key={i}
                className={`rounded-lg p-2.5 text-center border transition-all
                  ${wd.isToday ? 'border-brand-300 bg-brand-50 ring-1 ring-brand-200' : 'border-slate-100 bg-slate-50/50'}
                  ${wd.isWeekend && !wd.isToday ? 'bg-rose-50/50 border-rose-100' : ''}
                  ${!wd.isInMonth ? 'opacity-30' : ''}
                `}
              >
                <p className={`text-[10px] font-bold uppercase ${wd.isToday ? 'text-brand-600' : wd.isWeekend ? 'text-rose-500' : 'text-slate-500'}`}>
                  {wd.dayName}
                </p>
                <p className={`text-sm font-bold mt-0.5 ${wd.isToday ? 'text-brand-700' : 'text-slate-700'}`}>
                  {wd.dayNum}
                </p>
                {wd.isInMonth && (
                  <div className="mt-1.5 space-y-0.5">
                    <div className="flex items-center justify-center gap-1">
                      <UserCheck size={9} className="text-emerald-500" />
                      <span className="text-[9px] font-bold text-emerald-600">{wd.staffCount}</span>
                    </div>
                    {wd.ocCount > 0 && (
                      <div className="flex items-center justify-center gap-1">
                        <PhoneCall size={8} className="text-violet-500" />
                        <span className="text-[8px] font-bold text-violet-600">{wd.ocCount}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Coverage */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-brand-500" />
            Monthly Coverage
          </h2>
          <div className="flex flex-col items-center justify-center py-3">
            {/* Circular progress indicator */}
            <div className="relative w-24 h-24">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="#e2e8f0" strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke={coveragePct >= 80 ? '#10b981' : coveragePct >= 50 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="3" strokeDasharray={`${coveragePct}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-slate-800">{coveragePct}%</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3 text-center">
              <span className="font-semibold text-slate-700">{rosteredDays}</span> of {totalDays} days rostered
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{MONTH_NAMES[month - 1]} {year}</p>
          </div>
          <div className="border-t border-slate-100 pt-3 mt-2 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Working Shifts</span>
              <span className="font-bold text-slate-700">{totalShifts}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Team Size</span>
              <span className="font-bold text-slate-700">{totalMembers}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ---- Today's Shift Breakdown ---- */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Clock size={14} className="text-brand-500" />
            Today's Shift Breakdown
          </h2>

          {hasRoster && Object.keys(todayShiftCounts).length > 0 ? (
            <div className="space-y-2.5">
              {Object.entries(todayShiftCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([code, count]) => {
                  const shift = shiftMap[code];
                  const pct = totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0;

                  return (
                    <div key={code} className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: shift ? shift.color : '#94a3b8' }}
                      >
                        {code}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium text-slate-700">
                            {shift ? shift.name : code}
                          </span>
                          <span className="text-xs font-bold text-slate-600">{count}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: shift ? shift.color : '#94a3b8',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">
              {hasRoster ? 'No assignments for today' : 'No roster generated yet for this month'}
            </p>
          )}
        </div>

        {/* ---- Member Availability Today ---- */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Users size={14} className="text-brand-500" />
            Member Availability Today
          </h2>

          {todayMemberShifts.length > 0 ? (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {todayMemberShifts.map(({ member, shiftCode, shift }) => {
                const memberOC = onCallToday.includes(member.id);
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0
                        ${shift && shift.isWorkingShift ? 'bg-brand-500' : 'bg-slate-400'}`}
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-slate-700 truncate">{member.name}</span>
                      {memberOC && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[7px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200 flex-shrink-0">
                          <PhoneCall size={7} /> OC
                        </span>
                      )}
                    </div>
                    {shiftCode ? (
                      <div
                        className="px-2 py-0.5 rounded text-[9px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: shift ? shift.color : '#94a3b8' }}
                      >
                        {shiftCode}
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-300">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">
              No active members in this project
            </p>
          )}
        </div>
      </div>

      {/* ---- Quick Actions ---- */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <LayoutDashboard size={14} className="text-brand-500" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <QuickAction to="/roster" icon={Calendar} label="View / Edit Roster" />
          <QuickAction to="/members" icon={Users} label="Manage Team Members" />
          <QuickAction to="/shifts" icon={Clock} label="Configure Shifts" />
          <QuickAction to="/swaps" icon={ArrowLeftRight} label="Swap Requests" badge={pendingSwaps} />
        </div>
      </div>
    </div>
  );
}
