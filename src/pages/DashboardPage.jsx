/**
 * ============================================================================
 * DashboardPage.jsx — Main Dashboard
 * 
 * Shows a live overview of the current project's roster status:
 * - Quick stats (total members, working today, on-leave, pending swaps)
 * - Today's shift breakdown (color-coded bars)
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
  Calendar, Briefcase, ChevronRight,
} from 'lucide-react';
import { useProject } from '@hooks/useProject';
import PageLoader from '@components/common/PageLoader';
import { getMembers, fetchMembers } from '@services/memberService';
import { getShifts, fetchShifts } from '@services/shiftService';
import { getRoster, fetchRoster, getDayOfWeek, getDayName } from '@services/rosterService';
import { getSwapRequests, fetchSwaps } from '@services/swapService';

// ---- Month Names ----
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ---- Stat Card Component ----
// A small card showing a single metric with icon
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
      </div>
    </div>
  );
}

// ---- Quick Action Link ----
function QuickAction({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all group"
    >
      <Icon size={16} className="text-brand-500" />
      <span className="text-sm font-medium text-slate-700 group-hover:text-brand-600 flex-1">{label}</span>
      <ChevronRight size={14} className="text-slate-400" />
    </Link>
  );
}

// ---- Build dashboard data from raw arrays ----
function buildDashboardData(allMembers, shifts, roster, swaps) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.getDate();
  const dayOfWeek = getDayOfWeek(year, month, today);
  const dayName = getDayName(dayOfWeek);

  const activeMembers = allMembers.filter((m) => m.isActive && (m.memberType || 'resource') === 'resource');
  const pendingSwaps = swaps.filter((s) => s.status === 'pending').length;

  const shiftMap = {};
  for (const shift of shifts) shiftMap[shift.code] = shift;

  const todayStr = String(today);
  const todayShiftCounts = {};
  const todayMemberShifts = [];
  let workingCount = 0;
  let onLeaveCount = 0;

  for (const member of activeMembers) {
    const code = roster?.assignments?.[member.id]?.[todayStr] || null;
    const shift = code ? shiftMap[code] : null;
    todayMemberShifts.push({ member, shiftCode: code, shift });
    if (code) {
      todayShiftCounts[code] = (todayShiftCounts[code] || 0) + 1;
      if (shift && shift.isWorkingShift) workingCount++;
      else if (code === 'PL' || code === 'CO' || code === 'CL' || code === 'SL' || code === 'EL' || code === 'LV') onLeaveCount++;
    }
  }

  return {
    year, month, today, dayName, dayOfWeek,
    totalMembers: activeMembers.length,
    totalShifts: shifts.length,
    workingCount, onLeaveCount, pendingSwaps,
    todayShiftCounts, todayMemberShifts, shifts, shiftMap,
    hasRoster: !!roster,
  };
}

export default function DashboardPage() {
  const { currentProject } = useProject();
  const [dashboardData, setDashboardData] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

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
    );
    setDashboardData(cachedData);

    // ---- Phase 2: Background refresh from backend ----
    setIsSyncing(true);
    Promise.all([
      fetchMembers(currentProject.id),
      fetchShifts(currentProject.id),
      fetchRoster(currentProject.id, year, month),
      fetchSwaps(currentProject.id),
    ]).then(([members, shifts, roster, swaps]) => {
      setDashboardData(buildDashboardData(members, shifts, roster, swaps));
    }).catch(() => {
      // Keep cached data on error
    }).finally(() => setIsSyncing(false));
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
    year, month, today, dayName,
    totalMembers, workingCount, onLeaveCount, pendingSwaps,
    todayShiftCounts, todayMemberShifts, shiftMap, hasRoster,
  } = dashboardData;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ---- Background sync indicator (non-blocking) ---- */}
      {isSyncing && <PageLoader message="Syncing..." />}

      {/* ---- Page Header ---- */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          <span className="font-medium text-slate-700">{currentProject.name}</span>
          {' — '}
          <span>{dayName}, {today} {MONTH_NAMES[month - 1]} {year}</span>
        </p>
      </div>

      {/* ---- Quick Stats Grid ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Active Members"
          value={totalMembers}
          color="bg-teal-500"
        />
        <StatCard
          icon={Briefcase}
          label="Working Today"
          value={workingCount}
          color="bg-emerald-500"
        />
        <StatCard
          icon={CalendarOff}
          label="On Leave Today"
          value={onLeaveCount}
          color="bg-amber-500"
        />
        <StatCard
          icon={ArrowLeftRight}
          label="Pending Swaps"
          value={pendingSwaps}
          color="bg-rose-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ---- Today's Shift Breakdown ---- */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Clock size={14} className="text-brand-500" />
            Today's Shift Breakdown
          </h2>

          {hasRoster && Object.keys(todayShiftCounts).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(todayShiftCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([code, count]) => {
                  const shift = shiftMap[code];
                  const pct = totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0;

                  return (
                    <div key={code} className="flex items-center gap-3">
                      {/* Shift badge */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: shift ? shift.color : '#94a3b8' }}
                      >
                        {code}
                      </div>

                      {/* Name and count */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium text-slate-700">
                            {shift ? shift.name : code}
                          </span>
                          <span className="text-xs font-bold text-slate-600">{count}</span>
                        </div>
                        {/* Progress bar */}
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
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
              {todayMemberShifts.map(({ member, shiftCode, shift }) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Avatar */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0
                      ${shift && shift.isWorkingShift ? 'bg-brand-500' : 'bg-slate-400'}`}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-slate-700 truncate">{member.name}</span>
                  </div>

                  {/* Shift badge */}
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
              ))}
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
          <QuickAction to="/swaps" icon={ArrowLeftRight} label="Swap Requests" />
        </div>
      </div>
    </div>
  );
}
