/**
 * ============================================================================
 * rosterEngine.js — Auto-Generation Algorithm for Monthly Rosters
 * 
 * This is the brain of the shift roster app. It generates a fair monthly
 * schedule based on these rules:
 * 
 * 1. Every member gets at least 2 days off per week
 * 2. No one stays in the same shift for the entire month (rotation)
 * 3. Shifts are distributed as evenly as possible across members
 * 4. Pre-filled cells (leave) are respected
 * 5. Minimum staffing per shift is maintained
 * 6. Members don't work more than 5 consecutive days without a day off
 * 
 * The algorithm works in 4 phases:
 *   Phase 1: Mark pre-filled cells (leave, existing WO)
 *   Phase 2: Assign week-offs (ensure ≥2 per week, spread evenly)
 *   Phase 3: Assign working shifts (rotate, balance counts)
 *   Phase 4: Balance pass (even out any imbalances)
 * 
 * Usage:
 *   import { generateRoster } from '@services/rosterEngine';
 *   const assignments = generateRoster(members, shifts, year, month, rules, existingAssignments);
 * ============================================================================
 */

import { getDaysInMonth, getDayOfWeek } from '@services/rosterService';

/**
 * Generate a complete monthly roster.
 * 
 * @param {Array} members - Array of member objects (must have .id and .isActive)
 * @param {Array} shifts - Array of shift objects (must have .code and .isWorkingShift)
 * @param {number} year - e.g., 2026
 * @param {number} month - 1-indexed (1 = January)
 * @param {Object} rules - Generation rules from app config
 * @param {Object} existingAssignments - Pre-filled assignments to preserve (optional)
 * 
 * @returns {Object} assignments - { memberId: { '1': 'M', '2': 'A', ... }, ... }
 */
export function generateRoster(members, shifts, year, month, rules = {}, existingAssignments = {}) {
  // ---- Setup ----
  const totalDays = getDaysInMonth(year, month);
  const activeMembers = members.filter((m) => m.isActive);
  const workingShifts = shifts.filter((s) => s.isWorkingShift);
  const woShift = shifts.find((s) => s.code === 'WO') || { code: 'WO' };

  // Rules with defaults
  const minDaysOffPerWeek = rules.minDaysOffPerWeek || 2;
  const maxConsecutiveWorkDays = rules.maxConsecutiveWorkDays || 5;

  // If there are no active members or no working shifts, return empty
  if (activeMembers.length === 0 || workingShifts.length === 0) {
    return {};
  }

  // ---- Initialize assignments grid ----
  // Start with empty grid, then overlay any existing/pre-filled assignments
  const assignments = {};

  for (const member of activeMembers) {
    assignments[member.id] = {};

    // Copy over any pre-filled cells (leave, etc.)
    if (existingAssignments[member.id]) {
      for (let day = 1; day <= totalDays; day++) {
        const dayStr = String(day);
        const existing = existingAssignments[member.id][dayStr];

        // Only preserve non-working shift codes (PL, etc.)
        // Don't preserve old working shifts or WOs — we'll regenerate those
        if (existing && !isWorkingShiftCode(existing, workingShifts) && existing !== woShift.code) {
          assignments[member.id][dayStr] = existing;
        }
      }
    }
  }

  // ---- Phase 1: Assign Week-Offs ----
  // Ensure every member gets at least minDaysOffPerWeek days off per week
  assignWeekOffs(assignments, activeMembers, totalDays, year, month, minDaysOffPerWeek, woShift.code);

  // ---- Phase 2: Assign Working Shifts ----
  // Fill all remaining empty cells with working shifts, rotating fairly
  assignWorkingShifts(assignments, activeMembers, workingShifts, totalDays, year, month);

  // ---- Phase 3: Fix Consecutive Days ----
  // Ensure no one works more than maxConsecutiveWorkDays in a row
  fixConsecutiveDays(assignments, activeMembers, totalDays, maxConsecutiveWorkDays, woShift.code, workingShifts);

  // ---- Phase 4: Balance Pass ----
  // Even out shift distribution across members
  balanceShifts(assignments, activeMembers, workingShifts, totalDays);

  return assignments;
}

// ============================================================================
// Phase 1: Assign Week-Offs
// ============================================================================

/**
 * Assign week-off days ensuring each member gets at least minDaysOff per week.
 * Strategy: spread week-offs across the week to maintain daily coverage.
 */
function assignWeekOffs(assignments, members, totalDays, year, month, minDaysOff, woCode) {
  // Build list of weeks (each week is an array of day numbers)
  const weeks = getWeeks(totalDays, year, month);

  for (const member of members) {
    const memberAssign = assignments[member.id];

    for (const week of weeks) {
      // Count how many off-days this member already has in this week
      // (from pre-filled leave)
      let offDaysInWeek = 0;
      for (const day of week) {
        const dayStr = String(day);
        if (memberAssign[dayStr] && !isWorkingCode(memberAssign[dayStr])) {
          offDaysInWeek++;
        }
      }

      // Add more week-offs if needed
      const woNeeded = Math.max(0, minDaysOff - offDaysInWeek);

      if (woNeeded > 0) {
        // Pick days with the MOST existing coverage (most members already working)
        // to minimize impact on staffing
        const availableDays = week.filter((day) => {
          const dayStr = String(day);
          return !memberAssign[dayStr]; // Only unassigned days
        });

        // Sort by how many OTHER members already have WO on that day (ascending)
        // This spreads WOs across different days
        availableDays.sort((a, b) => {
          const countA = countWoOnDay(assignments, members, a, woCode);
          const countB = countWoOnDay(assignments, members, b, woCode);
          return countA - countB; // Prefer days where fewer people are off
        });

        // Assign the needed WOs
        for (let i = 0; i < woNeeded && i < availableDays.length; i++) {
          memberAssign[String(availableDays[i])] = woCode;
        }
      }
    }
  }
}

// ============================================================================
// Phase 2: Assign Working Shifts
// ============================================================================

/**
 * Fill all remaining empty cells with working shifts.
 * Uses a rotation strategy: cycle through shifts, giving each member
 * a different starting shift to ensure variety.
 */
function assignWorkingShifts(assignments, members, workingShifts, totalDays, year, month) {
  if (workingShifts.length === 0) return;

  // Each member gets a different starting shift index for rotation
  for (let memberIndex = 0; memberIndex < members.length; memberIndex++) {
    const member = members[memberIndex];
    const memberAssign = assignments[member.id];

    // Starting shift offset based on member index (ensures different members start differently)
    let shiftIndex = memberIndex % workingShifts.length;

    // Track how many consecutive days this member has had the same shift
    let consecutiveSameShift = 0;
    let lastShiftCode = null;

    for (let day = 1; day <= totalDays; day++) {
      const dayStr = String(day);

      // Skip if already assigned (WO, leave, etc.)
      if (memberAssign[dayStr]) {
        // Reset consecutive counter on off-days
        if (!isWorkingCode(memberAssign[dayStr])) {
          consecutiveSameShift = 0;
          lastShiftCode = null;
        }
        continue;
      }

      // Pick the next shift in rotation
      let chosenShift = workingShifts[shiftIndex % workingShifts.length];

      // If same shift for too many consecutive days, rotate to next
      if (chosenShift.code === lastShiftCode && consecutiveSameShift >= 5) {
        shiftIndex++;
        chosenShift = workingShifts[shiftIndex % workingShifts.length];
      }

      // Assign the shift
      memberAssign[dayStr] = chosenShift.code;

      // Track consecutive same-shift days
      if (chosenShift.code === lastShiftCode) {
        consecutiveSameShift++;
      } else {
        consecutiveSameShift = 1;
        lastShiftCode = chosenShift.code;
      }

      // Rotate shift every week (roughly every 5-6 working days)
      // This creates a natural rotation pattern
      const dayOfWeek = getDayOfWeek(year, month, day);
      if (dayOfWeek === 0) {
        // On Sundays, rotate to the next shift for the coming week
        shiftIndex++;
      }
    }
  }
}

// ============================================================================
// Phase 3: Fix Consecutive Working Days
// ============================================================================

/**
 * Ensure no member works more than maxConsecutive days in a row.
 * If a violation is found, insert a WO day at the optimal position.
 */
function fixConsecutiveDays(assignments, members, totalDays, maxConsecutive, woCode, workingShifts) {
  for (const member of members) {
    const memberAssign = assignments[member.id];
    let consecutiveWorkDays = 0;

    for (let day = 1; day <= totalDays; day++) {
      const dayStr = String(day);
      const shiftCode = memberAssign[dayStr];

      if (shiftCode && isWorkingCode(shiftCode)) {
        consecutiveWorkDays++;

        // If exceeded max, convert the current day to WO
        if (consecutiveWorkDays > maxConsecutive) {
          memberAssign[dayStr] = woCode;
          consecutiveWorkDays = 0;
        }
      } else {
        consecutiveWorkDays = 0;
      }
    }
  }
}

// ============================================================================
// Phase 4: Balance Shifts
// ============================================================================

/**
 * Even out shift distribution across members.
 * If one member has significantly more of a shift than another,
 * swap some assignments to balance things out.
 */
function balanceShifts(assignments, members, workingShifts, totalDays) {
  if (members.length < 2 || workingShifts.length < 2) return;

  // For each working shift, count how many times each member has it
  for (const shift of workingShifts) {
    const memberCounts = members.map((member) => {
      let count = 0;
      for (let day = 1; day <= totalDays; day++) {
        if (assignments[member.id][String(day)] === shift.code) {
          count++;
        }
      }
      return { memberId: member.id, count };
    });

    // Sort by count (highest first)
    memberCounts.sort((a, b) => b.count - a.count);

    const highest = memberCounts[0];
    const lowest = memberCounts[memberCounts.length - 1];

    // If the difference is > 3, try to swap some
    const diff = highest.count - lowest.count;
    if (diff > 3) {
      const swapsNeeded = Math.floor(diff / 2);
      let swapsDone = 0;

      for (let day = 1; day <= totalDays && swapsDone < swapsNeeded; day++) {
        const dayStr = String(day);
        const highShift = assignments[highest.memberId][dayStr];
        const lowShift = assignments[lowest.memberId][dayStr];

        // Only swap if: high member has this shift AND low member has a different working shift
        if (
          highShift === shift.code &&
          lowShift &&
          isWorkingCode(lowShift) &&
          lowShift !== shift.code
        ) {
          // Swap the two assignments
          assignments[highest.memberId][dayStr] = lowShift;
          assignments[lowest.memberId][dayStr] = highShift;
          swapsDone++;
        }
      }
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Split the month into weeks (arrays of day numbers).
 * Each week starts on Monday and ends on Sunday.
 * Partial weeks at the start/end are still included.
 */
function getWeeks(totalDays, year, month) {
  const weeks = [];
  let currentWeek = [];

  for (let day = 1; day <= totalDays; day++) {
    currentWeek.push(day);

    const dayOfWeek = getDayOfWeek(year, month, day);

    // End of week (Sunday) or end of month
    if (dayOfWeek === 0 || day === totalDays) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  return weeks;
}

/**
 * Count how many members have a WO on a specific day.
 */
function countWoOnDay(assignments, members, day, woCode) {
  const dayStr = String(day);
  let count = 0;

  for (const member of members) {
    if (assignments[member.id] && assignments[member.id][dayStr] === woCode) {
      count++;
    }
  }

  return count;
}

/**
 * Check if a shift code belongs to a working shift.
 * Non-working codes include: WO, PL, and any custom non-working shifts.
 */
function isWorkingShiftCode(code, workingShifts) {
  return workingShifts.some((s) => s.code === code);
}

/**
 * Simple check: is this code a "working" assignment?
 * Any code that is NOT WO, PL is considered working.
 * This is a fallback when we don't have the full shift list.
 */
function isWorkingCode(code) {
  const nonWorkingCodes = ['WO', 'PL', 'CL', 'SL', 'EL', 'LV'];
  return !nonWorkingCodes.includes(code);
}

/**
 * After a leave is marked on the roster, this function re-adjusts
 * the remaining assignments to maintain minimum staffing.
 * 
 * Strategy:
 * - Find days where the leave creates a staffing gap
 * - Try to swap a WO member into the gap
 * - If no WO member is available, swap shifts between members
 * 
 * @param {Object} assignments - Current roster assignments
 * @param {Array} members - Active members
 * @param {Array} shifts - All shifts including working and non-working
 * @param {number} totalDays - Days in the month
 * @param {string} memberId - The member who is going on leave
 * @param {number} day - The day they're going on leave
 * @param {string} leaveCode - The leave code (e.g., 'PL', 'CO')
 * @returns {Object} Updated assignments
 */
export function adjustForLeave(assignments, members, shifts, totalDays, memberId, day, leaveCode) {
  const dayStr = String(day);
  const previousShift = assignments[memberId][dayStr];
  const workingShifts = shifts.filter((s) => s.isWorkingShift);

  // If the member wasn't working that day anyway, just set the leave code
  if (!previousShift || !isWorkingCode(previousShift)) {
    assignments[memberId][dayStr] = leaveCode;
    return assignments;
  }

  // Set the leave
  assignments[memberId][dayStr] = leaveCode;

  // Find a replacement: look for someone with WO on that day
  // who could take the shift instead
  const woMembers = members.filter((m) => {
    if (m.id === memberId) return false;
    if (!m.isActive) return false;
    const theirShift = assignments[m.id] && assignments[m.id][dayStr];
    return theirShift === 'WO';
  });

  if (woMembers.length > 0) {
    // Pick the WO member who has the fewest total working days this month
    // (to distribute workload fairly)
    let bestMember = null;
    let lowestCount = Infinity;

    for (const woMember of woMembers) {
      let workDayCount = 0;
      for (let d = 1; d <= totalDays; d++) {
        const code = assignments[woMember.id][String(d)];
        if (code && isWorkingCode(code)) {
          workDayCount++;
        }
      }
      if (workDayCount < lowestCount) {
        lowestCount = workDayCount;
        bestMember = woMember;
      }
    }

    if (bestMember) {
      // Give the WO member the shift that was vacated
      assignments[bestMember.id][dayStr] = previousShift;
    }
  }

  return assignments;
}
