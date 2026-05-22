/**
 * ============================================================================
 * exportExcel.js — Export Roster to Excel (.xlsx)
 * 
 * Uses xlsx-js-style (SheetJS fork with styling support) to generate a
 * downloadable Excel file of the monthly roster. The exported file includes:
 * - Sheet 1: Roster grid (members × days, with shift codes and colors)
 *   - Color-coded cells matching shift definitions
 *   - Member summary columns: WO, Lv, WD, OC
 *   - On-Call row with member names
 *   - Resource Summary row with total and per-shift breakdown
 * - Sheet 2: Shift legend with color codes
 * 
 * Usage:
 *   import { exportRosterToExcel } from '@utils/exportExcel';
 *   exportRosterToExcel(projectName, members, shifts, assignments, year, month, onCallAssignments);
 * ============================================================================
 */

import XLSX from 'xlsx-js-style';
import { getDaysInMonth, getDayOfWeek, getDayName } from '@services/rosterService';

// ---- Month Names ----
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ---- Style helpers ----

/** Convert hex color (#RRGGBB) to 6-char RGB string */
function hexToARGB(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? (m[1] + m[2] + m[3]).toUpperCase() : 'FFFFFF';
}

/** Calculate luminance to decide dark or light text */
function textColorForBg(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substr(0, 2), 16);
  const g = parseInt(clean.substr(2, 2), 16);
  const b = parseInt(clean.substr(4, 2), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.5 ? '000000' : 'FFFFFF';
}

/** Thin border on all sides */
const THIN_BORDER = {
  top: { style: 'thin', color: { rgb: 'CCCCCC' } },
  bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
  left: { style: 'thin', color: { rgb: 'CCCCCC' } },
  right: { style: 'thin', color: { rgb: 'CCCCCC' } },
};

// ---- Reusable styles ----
const STYLES = {
  header: {
    font: { bold: true, sz: 9, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '475569' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: THIN_BORDER,
  },
  subHeader: {
    font: { bold: true, sz: 9, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '64748B' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: THIN_BORDER,
  },
  memberName: {
    font: { bold: true, sz: 10, color: { rgb: '1F2937' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'F1F5F9' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: THIN_BORDER,
  },
  totalWorking: {
    font: { bold: true, sz: 10, color: { rgb: '1F2937' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'ECFDF5' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: THIN_BORDER,
  },
  onCallLabel: {
    font: { bold: true, sz: 9, color: { rgb: '6D28D9' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'EDE9FE' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: THIN_BORDER,
  },
  onCallCell: {
    font: { bold: true, sz: 8, color: { rgb: '6D28D9' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'EDE9FE' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: THIN_BORDER,
  },
  onCallEmpty: {
    font: { sz: 8, color: { rgb: 'C4B5FD' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'F5F3FF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: THIN_BORDER,
  },
  summaryLabel: {
    font: { bold: true, sz: 9, color: { rgb: '065F46' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'D1FAE5' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: THIN_BORDER,
  },
  summaryCell: {
    font: { bold: true, sz: 8, color: { rgb: '065F46' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'D1FAE5' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: THIN_BORDER,
  },
  summaryEmpty: {
    font: { sz: 8, color: { rgb: 'A7F3D0' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'ECFDF5' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: THIN_BORDER,
  },
  memberSummaryHeader: {
    font: { bold: true, sz: 7, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '475569' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: THIN_BORDER,
  },
  memberSummaryVal: {
    font: { bold: true, sz: 9, color: { rgb: '1F2937' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: THIN_BORDER,
  },
};

/**
 * Export the monthly roster as an Excel file.
 * 
 * @param {string} projectName
 * @param {Array} members - Active resource members
 * @param {Array} shifts - All shift definitions
 * @param {Object} assignments - { memberId: { '1': 'M', ... } }
 * @param {number} year
 * @param {number} month - 1-indexed
 * @param {Object} [onCallAssignments] - { '1': [memberId, ...], ... }
 */
export function exportRosterToExcel(projectName, members, shifts, assignments, year, month, onCallAssignments = {}) {
  const totalDays = getDaysInMonth(year, month);
  const monthName = MONTH_NAMES[month - 1];

  // Build shift code → shift object map
  const shiftMap = {};
  for (const shift of shifts) {
    shiftMap[shift.code] = shift;
  }

  // Working shift codes for counting
  const workingShifts = shifts.filter((s) => s.isWorkingShift);
  const nonWorkingCodes = new Set(['WO']);
  const leaveCodes = new Set();
  for (const s of shifts) {
    if (!s.isWorkingShift && s.code !== 'WO') leaveCodes.add(s.code);
  }

  // Summary column count: WO, Lv, WD, OC = 4 extra columns after days
  const summaryColStart = totalDays + 1; // first summary col index
  const maxCol = summaryColStart + 3;    // last column index (OC)

  // ---- Build data as 2D array ----
  const wsData = [];

  // Row 0: Title
  const titleRow = [`${projectName} — ${monthName} ${year} Roster`];
  for (let i = 1; i <= maxCol; i++) titleRow.push('');
  wsData.push(titleRow);

  // Row 1: Empty spacer
  wsData.push([]);

  // Row 2: Header — Day names + summary headers
  const dayNameRow = ['Member'];
  for (let day = 1; day <= totalDays; day++) {
    const dow = getDayOfWeek(year, month, day);
    dayNameRow.push(getDayName(dow));
  }
  dayNameRow.push('WO', 'Lv', 'WD', 'OC');
  wsData.push(dayNameRow);

  // Row 3: Header — Day numbers
  const dayNumRow = ['Dates →'];
  for (let day = 1; day <= totalDays; day++) {
    dayNumRow.push(day);
  }
  dayNumRow.push('', '', '', '');
  wsData.push(dayNumRow);

  // Data rows: One per member with summary counts
  for (const member of members) {
    const row = [member.name];
    let woCount = 0;
    let lvCount = 0;
    let wdCount = 0;
    let ocCount = 0;

    for (let day = 1; day <= totalDays; day++) {
      const code = assignments[member.id]?.[String(day)] || '';
      row.push(code);

      if (code === 'WO') woCount++;
      else if (leaveCodes.has(code)) lvCount++;
      if (code && shiftMap[code] && shiftMap[code].isWorkingShift) wdCount++;

      // On-call count for this member
      const ocIds = onCallAssignments[String(day)] || [];
      if (Array.isArray(ocIds) && ocIds.includes(member.id)) ocCount++;
    }

    row.push(woCount, lvCount, wdCount, ocCount);
    wsData.push(row);
  }

  // On-Call row
  const onCallRow = ['ON-CALL'];
  for (let day = 1; day <= totalDays; day++) {
    const ocIds = onCallAssignments[String(day)] || [];
    if (Array.isArray(ocIds) && ocIds.length > 0) {
      const names = ocIds.map((id) => {
        const m = members.find((mem) => mem.id === id);
        if (!m) return '?';
        const parts = m.name.split(' ');
        return parts[0].length <= 8 ? parts[0] : (parts[0][0] + (parts[1] ? parts[1][0] : ''));
      });
      onCallRow.push(`${ocIds.length}\n${names.join('\n')}`);
    } else {
      onCallRow.push('—');
    }
  }
  onCallRow.push('', '', '', '');
  wsData.push(onCallRow);

  // Resource Summary row with per-shift breakdown
  const summaryRow = ['RESOURCE SUMMARY'];
  for (let day = 1; day <= totalDays; day++) {
    const dayStr = String(day);
    const counts = {};
    let totalWorking = 0;

    for (const member of members) {
      const code = assignments[member.id]?.[dayStr] || '';
      if (code) {
        counts[code] = (counts[code] || 0) + 1;
        if (shiftMap[code] && shiftMap[code].isWorkingShift) totalWorking++;
      }
    }

    // Build breakdown string: "3 (M:1 A:1 N:1)"
    const parts = [];
    for (const ws of workingShifts) {
      if (counts[ws.code]) parts.push(`${ws.code}:${counts[ws.code]}`);
    }
    const breakdown = parts.length > 0 ? `${totalWorking}\n(${parts.join(' ')})` : '0';
    summaryRow.push(breakdown);
  }
  summaryRow.push('', '', '', '');
  wsData.push(summaryRow);

  // ---- Create worksheet from data ----
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // ---- Apply styles ----

  // Title row (row 0)
  const titleRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (ws[titleRef]) {
    ws[titleRef].s = {
      font: { bold: true, sz: 14, color: { rgb: '1F2937' } },
      alignment: { horizontal: 'left', vertical: 'center' },
    };
  }

  // Header rows (row 2 = day names, row 3 = day numbers)
  for (let col = 0; col <= maxCol; col++) {
    const ref2 = XLSX.utils.encode_cell({ r: 2, c: col });
    const ref3 = XLSX.utils.encode_cell({ r: 3, c: col });
    if (ws[ref2]) ws[ref2].s = STYLES.header;
    if (ws[ref3]) ws[ref3].s = STYLES.subHeader;
  }

  // Data rows start at row index 4
  const dataStartRow = 4;
  const dataEndRow = dataStartRow + members.length - 1;
  const onCallRowIdx = dataEndRow + 1;
  const summaryRowIdx = onCallRowIdx + 1;

  // Style member rows
  for (let row = dataStartRow; row <= dataEndRow; row++) {
    // Col 0: Member name
    const nameRef = XLSX.utils.encode_cell({ r: row, c: 0 });
    if (ws[nameRef]) ws[nameRef].s = STYLES.memberName;

    // Shift code cells
    for (let col = 1; col <= totalDays; col++) {
      const ref = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[ref]) continue;

      const code = ws[ref].v;
      const shift = shiftMap[code];

      if (shift && shift.color) {
        const bgRGB = hexToARGB(shift.color);
        const txtRGB = textColorForBg(shift.color);
        ws[ref].s = {
          font: { bold: true, sz: 10, color: { rgb: txtRGB } },
          fill: { patternType: 'solid', fgColor: { rgb: bgRGB } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: THIN_BORDER,
        };
      } else {
        ws[ref].s = {
          font: { sz: 10, color: { rgb: '94A3B8' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: THIN_BORDER,
        };
      }
    }

    // Summary columns (WO, Lv, WD, OC)
    for (let col = summaryColStart; col <= maxCol; col++) {
      const ref = XLSX.utils.encode_cell({ r: row, c: col });
      if (ws[ref]) ws[ref].s = STYLES.memberSummaryVal;
    }
  }

  // Style On-Call row
  const ocNameRef = XLSX.utils.encode_cell({ r: onCallRowIdx, c: 0 });
  if (ws[ocNameRef]) ws[ocNameRef].s = STYLES.onCallLabel;

  for (let col = 1; col <= totalDays; col++) {
    const ref = XLSX.utils.encode_cell({ r: onCallRowIdx, c: col });
    if (!ws[ref]) continue;
    const val = ws[ref].v;
    ws[ref].s = (val && val !== '—') ? STYLES.onCallCell : STYLES.onCallEmpty;
  }
  for (let col = summaryColStart; col <= maxCol; col++) {
    const ref = XLSX.utils.encode_cell({ r: onCallRowIdx, c: col });
    if (ws[ref]) ws[ref].s = STYLES.onCallEmpty;
  }

  // Style Resource Summary row
  const sumNameRef = XLSX.utils.encode_cell({ r: summaryRowIdx, c: 0 });
  if (ws[sumNameRef]) ws[sumNameRef].s = STYLES.summaryLabel;

  for (let col = 1; col <= totalDays; col++) {
    const ref = XLSX.utils.encode_cell({ r: summaryRowIdx, c: col });
    if (!ws[ref]) continue;
    const val = ws[ref].v;
    ws[ref].s = (val && val !== '0') ? STYLES.summaryCell : STYLES.summaryEmpty;
  }
  for (let col = summaryColStart; col <= maxCol; col++) {
    const ref = XLSX.utils.encode_cell({ r: summaryRowIdx, c: col });
    if (ws[ref]) ws[ref].s = STYLES.summaryEmpty;
  }

  // Set column widths
  const colWidths = [{ wch: 22 }]; // Member name column
  for (let day = 1; day <= totalDays; day++) colWidths.push({ wch: 6 });
  colWidths.push({ wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }); // WO, Lv, WD, OC
  ws['!cols'] = colWidths;

  // Set row heights for on-call and summary rows (they have wrapped text)
  ws['!rows'] = [];
  ws['!rows'][onCallRowIdx] = { hpt: 40 };
  ws['!rows'][summaryRowIdx] = { hpt: 35 };

  // ---- Create workbook ----
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${year}`);

  // ---- Legend sheet ----
  const legendData = [
    ['Shift Legend'],
    [],
    ['Code', 'Name', 'Type', 'Start', 'End', 'Color'],
  ];
  for (const shift of shifts) {
    legendData.push([
      shift.code,
      shift.name,
      shift.isWorkingShift ? 'Working' : 'Non-Working',
      shift.startTime || '—',
      shift.endTime || '—',
      shift.color || '',
    ]);
  }
  const legendWs = XLSX.utils.aoa_to_sheet(legendData);

  // Style legend title
  if (legendWs['A1']) {
    legendWs['A1'].s = {
      font: { bold: true, sz: 14, color: { rgb: '1F2937' } },
      alignment: { horizontal: 'left', vertical: 'center' },
    };
  }

  // Style legend headers (row 2)
  for (let col = 0; col < 6; col++) {
    const ref = XLSX.utils.encode_cell({ r: 2, c: col });
    if (legendWs[ref]) legendWs[ref].s = STYLES.header;
  }

  // Style legend data rows
  for (let i = 0; i < shifts.length; i++) {
    const shift = shifts[i];
    const row = 3 + i;

    // Code cell — colored
    const codeRef = XLSX.utils.encode_cell({ r: row, c: 0 });
    if (legendWs[codeRef] && shift.color) {
      const bgRGB = hexToARGB(shift.color);
      const txtRGB = textColorForBg(shift.color);
      legendWs[codeRef].s = {
        font: { bold: true, sz: 10, color: { rgb: txtRGB } },
        fill: { patternType: 'solid', fgColor: { rgb: bgRGB } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: THIN_BORDER,
      };
    }

    // Color swatch cell
    const colorRef = XLSX.utils.encode_cell({ r: row, c: 5 });
    if (legendWs[colorRef] && shift.color) {
      legendWs[colorRef].s = {
        fill: { patternType: 'solid', fgColor: { rgb: hexToARGB(shift.color) } },
        border: THIN_BORDER,
      };
    }

    // Other columns
    for (let col = 1; col < 5; col++) {
      const ref = XLSX.utils.encode_cell({ r: row, c: col });
      if (legendWs[ref]) {
        legendWs[ref].s = {
          font: { sz: 10, color: { rgb: '1F2937' } },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: THIN_BORDER,
        };
      }
    }
  }

  legendWs['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, legendWs, 'Legend');

  // ---- Generate and download the file ----
  const safeName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${safeName}_Roster_${monthName}_${year}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
