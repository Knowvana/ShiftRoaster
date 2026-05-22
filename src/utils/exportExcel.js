/**
 * ============================================================================
 * exportExcel.js — Export Roster to Excel (.xlsx)
 * 
 * Uses the SheetJS (xlsx) library to generate a downloadable Excel file
 * of the monthly roster. The exported file includes:
 * - Sheet 1: Roster grid (members × days, with shift codes)
 * - Color-coded cells matching shift definitions
 * - Daily availability summary row at the bottom
 * - Member shift count summary column on the right
 * 
 * Usage:
 *   import { exportRosterToExcel } from '@utils/exportExcel';
 *   exportRosterToExcel(projectName, members, shifts, assignments, year, month);
 * ============================================================================
 */

import * as XLSX from 'xlsx';
import { getDaysInMonth, getDayOfWeek, getDayName } from '@services/rosterService';

// ---- Month Names ----
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Export the monthly roster as an Excel file.
 * 
 * @param {string} projectName - Name of the project (used in filename)
 * @param {Array} members - Active member objects
 * @param {Array} shifts - All shift objects
 * @param {Object} assignments - The roster assignments { memberId: { '1': 'M', ... } }
 * @param {number} year - e.g., 2026
 * @param {number} month - 1-indexed (1 = January)
 */
export function exportRosterToExcel(projectName, members, shifts, assignments, year, month) {
  const totalDays = getDaysInMonth(year, month);
  const monthName = MONTH_NAMES[month - 1];

  // Build shift code → shift object map
  const shiftMap = {};
  for (const shift of shifts) {
    shiftMap[shift.code] = shift;
  }

  // ---- Build the worksheet data as a 2D array ----
  const wsData = [];

  // Row 1: Title
  wsData.push([`${projectName} — ${monthName} ${year} Roster`]);

  // Row 2: Empty spacer
  wsData.push([]);

  // Row 3: Header — Day names
  const dayNameRow = ['Member'];
  for (let day = 1; day <= totalDays; day++) {
    const dow = getDayOfWeek(year, month, day);
    dayNameRow.push(getDayName(dow));
  }
  dayNameRow.push('Total Working');
  wsData.push(dayNameRow);

  // Row 4: Header — Day numbers
  const dayNumRow = [''];
  for (let day = 1; day <= totalDays; day++) {
    dayNumRow.push(day);
  }
  dayNumRow.push('');
  wsData.push(dayNumRow);

  // Data rows: One per member
  for (const member of members) {
    const row = [member.name];
    let workingDays = 0;

    for (let day = 1; day <= totalDays; day++) {
      const code = assignments[member.id]?.[String(day)] || '';
      row.push(code);

      // Count working days
      if (code && shiftMap[code] && shiftMap[code].isWorkingShift) {
        workingDays++;
      }
    }

    row.push(workingDays);
    wsData.push(row);
  }

  // Summary row: Daily availability (working member count per day)
  const summaryRow = ['Availability'];
  for (let day = 1; day <= totalDays; day++) {
    const dayStr = String(day);
    let workingCount = 0;

    for (const member of members) {
      const code = assignments[member.id]?.[dayStr] || '';
      if (code && shiftMap[code] && shiftMap[code].isWorkingShift) {
        workingCount++;
      }
    }

    summaryRow.push(workingCount);
  }
  summaryRow.push('');
  wsData.push(summaryRow);

  // ---- Create the workbook and worksheet ----
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  const colWidths = [{ wch: 20 }]; // Member name column
  for (let day = 1; day <= totalDays; day++) {
    colWidths.push({ wch: 4 }); // Day columns (narrow)
  }
  colWidths.push({ wch: 14 }); // Summary column
  ws['!cols'] = colWidths;

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${year}`);

  // ---- Add a Legend sheet ----
  const legendData = [
    ['Shift Legend'],
    [],
    ['Code', 'Name', 'Type', 'Start', 'End'],
  ];

  for (const shift of shifts) {
    legendData.push([
      shift.code,
      shift.name,
      shift.isWorkingShift ? 'Working' : 'Non-Working',
      shift.startTime || '—',
      shift.endTime || '—',
    ]);
  }

  const legendWs = XLSX.utils.aoa_to_sheet(legendData);
  legendWs['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 14 }, { wch: 8 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, legendWs, 'Legend');

  // ---- Generate and download the file ----
  const safeName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${safeName}_Roster_${monthName}_${year}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
