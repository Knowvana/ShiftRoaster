/**
 * ============================================================================
 * exportExcel.js — Export Roster to Excel (.xlsx)
 * 
 * Uses xlsx-js-style (SheetJS fork with styling support) to generate a
 * downloadable Excel file of the monthly roster. The exported file includes:
 * - Sheet 1: Roster grid (members × days, with shift codes and colors)
 * - Color-coded cells matching shift definitions
 * - Daily availability summary row at the bottom
 * - Member shift count summary column on the right
 * - Sheet 2: Shift legend with color codes
 * 
 * Usage:
 *   import { exportRosterToExcel } from '@utils/exportExcel';
 *   exportRosterToExcel(projectName, members, shifts, assignments, year, month);
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

/** Convert hex color (#RRGGBB) to ARGB string (FFRRGGBB) */
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

/** Make a styled cell */
function makeCell(value, type, style) {
  return { v: value, t: type, s: style };
}

/**
 * Export the monthly roster as an Excel file.
 */
export function exportRosterToExcel(projectName, members, shifts, assignments, year, month) {
  const totalDays = getDaysInMonth(year, month);
  const monthName = MONTH_NAMES[month - 1];
  const maxCol = totalDays + 1; // last column index (Total Working)

  // Build shift code → shift object map
  const shiftMap = {};
  for (const shift of shifts) {
    shiftMap[shift.code] = shift;
  }

  // ---- Build data as 2D array, then convert with aoa_to_sheet ----
  const wsData = [];

  // Row 0: Title
  wsData.push([`${projectName} — ${monthName} ${year} Roster`]);

  // Row 1: Empty spacer
  wsData.push([]);

  // Row 2: Header — Day names
  const dayNameRow = ['Member'];
  for (let day = 1; day <= totalDays; day++) {
    const dow = getDayOfWeek(year, month, day);
    dayNameRow.push(getDayName(dow));
  }
  dayNameRow.push('Total Working');
  wsData.push(dayNameRow);

  // Row 3: Header — Day numbers
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
      if (code && shiftMap[code] && shiftMap[code].isWorkingShift) workingDays++;
    }
    row.push(workingDays);
    wsData.push(row);
  }

  // Summary row: Daily availability
  const summaryRow = ['Availability'];
  for (let day = 1; day <= totalDays; day++) {
    const dayStr = String(day);
    let workingCount = 0;
    for (const member of members) {
      const code = assignments[member.id]?.[dayStr] || '';
      if (code && shiftMap[code] && shiftMap[code].isWorkingShift) workingCount++;
    }
    summaryRow.push(workingCount);
  }
  summaryRow.push('');
  wsData.push(summaryRow);

  // ---- Create worksheet from data ----
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // ---- Apply styles to every cell ----
  // Title row (row 0)
  const titleRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
  ws[titleRef].s = {
    font: { bold: true, sz: 14, color: { rgb: '1F2937' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  // Header style: dark background, white text
  const headerStyle = {
    font: { bold: true, sz: 9, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '475569' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: THIN_BORDER,
  };

  const subHeaderStyle = {
    font: { bold: true, sz: 9, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '64748B' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: THIN_BORDER,
  };

  // Apply header styles (row 2 = day names, row 3 = day numbers)
  for (let col = 0; col <= maxCol; col++) {
    const ref2 = XLSX.utils.encode_cell({ r: 2, c: col });
    const ref3 = XLSX.utils.encode_cell({ r: 3, c: col });
    if (ws[ref2]) ws[ref2].s = headerStyle;
    if (ws[ref3]) ws[ref3].s = subHeaderStyle;
  }

  // Member name style
  const nameStyle = {
    font: { bold: true, sz: 10, color: { rgb: '1F2937' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'F1F5F9' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: THIN_BORDER,
  };

  // Total working column style
  const totalStyle = {
    font: { bold: true, sz: 10, color: { rgb: '1F2937' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'ECFDF5' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: THIN_BORDER,
  };

  // Availability row style
  const availStyle = {
    font: { bold: true, sz: 10, color: { rgb: '1F2937' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'FEF3C7' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: THIN_BORDER,
  };

  // Data rows start at row index 4
  const dataStartRow = 4;
  const dataEndRow = dataStartRow + members.length - 1;
  const summaryRowIdx = dataEndRow + 1;

  for (let row = dataStartRow; row <= summaryRowIdx; row++) {
    const isSummary = (row === summaryRowIdx);

    // Col 0: Member name or "Availability"
    const nameRef = XLSX.utils.encode_cell({ r: row, c: 0 });
    if (ws[nameRef]) ws[nameRef].s = nameStyle;

    // Cols 1..totalDays: shift codes
    for (let col = 1; col <= totalDays; col++) {
      const ref = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[ref]) continue;

      if (isSummary) {
        ws[ref].s = availStyle;
      } else {
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
    }

    // Last col: Total Working or empty
    const totalRef = XLSX.utils.encode_cell({ r: row, c: maxCol });
    if (ws[totalRef]) {
      ws[totalRef].s = isSummary ? nameStyle : totalStyle;
    }
  }

  // Set column widths
  const colWidths = [{ wch: 20 }];
  for (let day = 1; day <= totalDays; day++) colWidths.push({ wch: 5 });
  colWidths.push({ wch: 14 });
  ws['!cols'] = colWidths;

  // ---- Create workbook ----
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${year}`);

  // ---- Legend sheet ----
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

  // Style legend title
  legendWs['A1'].s = {
    font: { bold: true, sz: 14, color: { rgb: '1F2937' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  // Style legend headers (row 2)
  for (let col = 0; col < 5; col++) {
    const ref = XLSX.utils.encode_cell({ r: 2, c: col });
    if (legendWs[ref]) legendWs[ref].s = headerStyle;
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

  legendWs['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 14 }, { wch: 8 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, legendWs, 'Legend');

  // ---- Generate and download the file ----
  const safeName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${safeName}_Roster_${monthName}_${year}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
