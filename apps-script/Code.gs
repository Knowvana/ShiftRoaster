/**
 * ============================================================================
 * Code.gs — Google Apps Script Backend for Shift Roster
 *
 * This script runs on Google's servers and acts as a REST API.
 * It reads/writes data to Google Sheets tabs (one spreadsheet = one database).
 *
 * DEPLOYMENT:
 *   1. Create a Google Sheet
 *   2. Open Extensions → Apps Script
 *   3. Paste this code into Code.gs
 *   4. Deploy → New deployment → Web app
 *      - Execute as: Me
 *      - Who has access: Anyone
 *   5. Copy the deployment URL → set in your React app's config
 *
 * DATA SHEETS (tabs):
 *   _projects          — project list (id, name, description, createdAt)
 *   _admins            — admin accounts (username, passwordHash, displayName, role, projectIds)
 *   _config            — app-level config (key, value)
 *   _members_{projId}  — team members for a project (includes isOnCallEligible)
 *   _shifts_{projId}   — shift definitions for a project
 *   _swaps_{projId}    — swap requests for a project
 *   _roster_{projId}_{YYYY}_{MM} — raw roster JSON data
 *   _oncallconfig_{projId} — on-call config (enabled, resourcesPerDay, rotationPeriodDays)
 *   _oncall_{projId}_{YYYY}_{MM} — on-call assignments (day → [memberIds])
 *   _emailconfig_{projId} — email notification config
 *   {Month YYYY}_{projId} — formatted roster sheet (human-readable)
 *
 * API FORMAT:
 *   GET  ?action=getProjects
 *   POST { action: 'saveMembers', projectId: '...', data: [...] }
 *   All responses: { success: true/false, data: ..., error: '...' }
 * ============================================================================
 */

// ---- App-level secret (optional, change this to your own value) ----
var APP_TOKEN = 'shiftRoster2026';

// ---- Month names for formatted sheets ----
var MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ============================================================================
// REQUEST HANDLERS — doGet (GET) and doPost (POST)
// ============================================================================

/**
 * Handle GET requests.
 * All read operations use GET with query params.
 */
function doGet(e) {
  try {
    var params = e.parameter || {};

    // Optional token check
    if (APP_TOKEN && params.token !== APP_TOKEN) {
      return jsonResponse({ success: false, error: 'Unauthorized' });
    }

    var action = params.action;

    switch (action) {
      // ---- Projects ----
      case 'getProjects':
        return jsonResponse({ success: true, data: getProjects() });

      // ---- Members ----
      case 'getMembers':
        return jsonResponse({ success: true, data: getMembers(params.projectId) });

      // ---- Shifts ----
      case 'getShifts':
        return jsonResponse({ success: true, data: getShifts(params.projectId) });

      // ---- Roster ----
      case 'getRoster':
        return jsonResponse({
          success: true,
          data: getRoster(params.projectId, Number(params.year), Number(params.month))
        });

      // ---- Swaps ----
      case 'getSwaps':
        return jsonResponse({ success: true, data: getSwaps(params.projectId) });

      // ---- Admins ----
      case 'getAdmins':
        return jsonResponse({ success: true, data: getAdmins() });

      // ---- Available roster months ----
      case 'getAvailableMonths':
        return jsonResponse({ success: true, data: getAvailableMonths(params.projectId) });

      // ---- Email Config ----
      case 'getEmailConfig':
        return jsonResponse({ success: true, data: getEmailConfig(params.projectId) });

      // ---- On-Call Config ----
      case 'getOnCallConfig':
        return jsonResponse({ success: true, data: getOnCallConfigData(params.projectId) });

      // ---- On-Call Assignments ----
      case 'getOnCallAssignments':
        return jsonResponse({
          success: true,
          data: getOnCallAssignmentsData(params.projectId, Number(params.year), Number(params.month))
        });

      // ---- Health check ----
      case 'ping':
        return jsonResponse({ success: true, data: 'pong', version: '1.1.0' });

      default:
        return jsonResponse({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

/**
 * Handle POST requests.
 * All write operations use POST with JSON body.
 */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    // Optional token check
    if (APP_TOKEN && body.token !== APP_TOKEN) {
      return jsonResponse({ success: false, error: 'Unauthorized' });
    }

    var action = body.action;

    switch (action) {
      // ---- Projects ----
      case 'saveProjects':
        saveProjects(body.data);
        return jsonResponse({ success: true });

      case 'createProject':
        var proj = createProject(body.data);
        return jsonResponse({ success: true, data: proj });

      case 'updateProject':
        updateProject(body.projectId, body.data);
        return jsonResponse({ success: true });

      case 'deleteProject':
        deleteProject(body.projectId, body.projectName || '');
        return jsonResponse({ success: true });

      // ---- Members ----
      case 'saveMembers':
        saveMembers(body.projectId, body.data);
        return jsonResponse({ success: true });

      // ---- Shifts ----
      case 'saveShifts':
        saveShifts(body.projectId, body.data);
        return jsonResponse({ success: true });

      // ---- Roster ----
      case 'saveRoster':
        saveRoster(body.projectId, Number(body.year), Number(body.month), body.data);
        return jsonResponse({ success: true });

      case 'deleteRoster':
        deleteRoster(body.projectId, Number(body.year), Number(body.month));
        return jsonResponse({ success: true });

      // ---- Formatted roster sheet ----
      case 'createFormattedRoster':
        createFormattedRosterSheet(
          body.projectId, body.projectName,
          Number(body.year), Number(body.month),
          body.members, body.shifts, body.assignments
        );
        return jsonResponse({ success: true });

      // ---- Swaps ----
      case 'saveSwaps':
        saveSwaps(body.projectId, body.data);
        return jsonResponse({ success: true });

      // ---- Admins ----
      case 'saveAdmins':
        saveAdmins(body.data);
        return jsonResponse({ success: true });

      // ---- Login ----
      case 'login':
        var loginResult = verifyLogin(body.username, body.passwordHash);
        return jsonResponse(loginResult);

      // ---- Email Config ----
      case 'saveEmailConfig':
        saveEmailConfig(body.projectId, body.data);
        return jsonResponse({ success: true });

      // ---- Test Email ----
      case 'sendTestEmail':
        var testResult = sendTestEmail(body.projectId, body.emailType, body.recipientEmail);
        return jsonResponse(testResult);

      // ---- On-Call Config ----
      case 'syncOnCallConfig':
        saveOnCallConfigData(body.projectId, body.config);
        return jsonResponse({ success: true });

      // ---- On-Call Assignments ----
      case 'syncOnCallAssignments':
        saveOnCallAssignmentsData(body.projectId, Number(body.year), Number(body.month), body.assignments);
        return jsonResponse({ success: true });

      // ---- Project Admin Credentials Email ----
      case 'sendProjectAdminCredentials':
        var credResult = sendProjectAdminCredentialsEmail(
          body.projectName, body.adminEmail, body.adminDisplayName,
          body.username, body.password, body.siteAdminEmail, body.isReset
        );
        return jsonResponse(credResult);

      default:
        return jsonResponse({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ============================================================================
// JSON RESPONSE HELPER
// ============================================================================

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// SHEET HELPERS — Get or create a sheet tab by name
// ============================================================================

/**
 * Get the active spreadsheet (the one this script is attached to).
 */
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Get a sheet by name. Creates it if it doesn't exist.
 * For data sheets, row 1 is always the header row.
 */
function getOrCreateSheet(name) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

/**
 * Read all data from a sheet as an array of objects.
 * Row 1 = headers, rows 2+ = data.
 * Returns [] if sheet is empty or has only headers.
 */
function readSheetData(sheetName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return []; // No data rows

  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      var val = data[i][j];
      // Google Sheets auto-converts time strings (e.g. "06:00") into Date objects.
      // Detect this and convert back to "HH:MM" string format.
      if (val instanceof Date) {
        var h = val.getHours();
        var m = val.getMinutes();
        val = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
      }
      // Try to parse JSON strings (for nested objects like assignments)
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try { val = JSON.parse(val); } catch(e) { /* keep as string */ }
      }
      row[headers[j]] = val;
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Write an array of objects to a sheet.
 * Clears existing data and writes headers + rows.
 */
function writeSheetData(sheetName, dataArray, headers) {
  var sheet = getOrCreateSheet(sheetName);
  sheet.clear();

  if (!dataArray || dataArray.length === 0) {
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    return;
  }

  // Auto-detect headers from first object if not provided
  if (!headers) {
    headers = Object.keys(dataArray[0]);
  }

  // Build the 2D array
  var rows = [headers];
  for (var i = 0; i < dataArray.length; i++) {
    var row = [];
    for (var j = 0; j < headers.length; j++) {
      var val = dataArray[i][headers[j]];
      // Stringify objects/arrays for storage
      if (val !== null && val !== undefined && typeof val === 'object') {
        val = JSON.stringify(val);
      }
      row.push(val !== undefined && val !== null ? val : '');
    }
    rows.push(row);
  }

  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
}

/**
 * Read a single-value config from a JSON-stored sheet cell.
 * The sheet stores data as one JSON blob in cell A1.
 */
function readJsonSheet(sheetName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return null;

  var val = sheet.getRange('A1').getValue();
  if (!val) return null;

  try {
    return JSON.parse(val);
  } catch(e) {
    return null;
  }
}

/**
 * Write a JSON blob to cell A1 of a sheet.
 */
function writeJsonSheet(sheetName, data) {
  var sheet = getOrCreateSheet(sheetName);
  sheet.clear();
  sheet.getRange('A1').setValue(JSON.stringify(data));
}

// ============================================================================
// PROJECTS
// ============================================================================

function getProjects() {
  return readSheetData('_projects');
}

function saveProjects(projectsArray) {
  writeSheetData('_projects', projectsArray, ['id', 'name', 'description', 'createdAt']);
}

function createProject(projectData) {
  var projects = getProjects();
  var newProj = {
    id: projectData.id || ('proj_' + Utilities.getUuid().substring(0, 8)),
    name: projectData.name,
    description: projectData.description || '',
    createdAt: new Date().toISOString()
  };
  projects.push(newProj);
  saveProjects(projects);
  return newProj;
}

function updateProject(projectId, updates) {
  var projects = getProjects();
  for (var i = 0; i < projects.length; i++) {
    if (projects[i].id === projectId) {
      if (updates.name !== undefined) projects[i].name = updates.name;
      if (updates.description !== undefined) projects[i].description = updates.description;
      break;
    }
  }
  saveProjects(projects);
}

function deleteProject(projectId, projectName) {
  // Remove project from list
  var projects = getProjects().filter(function(p) { return p.id !== projectId; });
  saveProjects(projects);

  // Remove all associated sheets
  var ss = getSpreadsheet();
  var allSheets = ss.getSheets();
  var suffix = projectName ? '- ' + projectName : '';
  for (var i = allSheets.length - 1; i >= 0; i--) {
    var name = allSheets[i].getName();
    var shouldDelete = false;

    // Match sheets containing the projectId (e.g., _shifts_proj_xxx, _members_proj_xxx, _roster_proj_xxx, etc.)
    if (name.indexOf(projectId) > -1 && name !== '_projects' && name !== '_admins') {
      shouldDelete = true;
    }

    // Match formatted roster sheets named with the project name (e.g., "May 2026 - Accessio_Operations")
    if (suffix && name.indexOf(suffix) > -1) {
      shouldDelete = true;
    }

    // Match project-specific Legend sheet (e.g., "Legend - Accessio_Operations")
    if (suffix && name === 'Legend ' + suffix) {
      shouldDelete = true;
    }

    // Also match legacy shared Legend sheet
    if (name === 'Legend') {
      shouldDelete = true;
    }

    if (shouldDelete && ss.getSheets().length > 1) {
      ss.deleteSheet(allSheets[i]);
    }
  }

  // Remove project admin accounts associated with this project
  var admins = getAdmins();
  var filtered = admins.filter(function(a) {
    if (a.role !== 'project_admin') return true; // keep non-project admins
    var pIds = [];
    try { pIds = typeof a.projectIds === 'string' ? JSON.parse(a.projectIds || '[]') : (a.projectIds || []); } catch(e) { pIds = []; }
    return pIds.indexOf(projectId) === -1; // keep if not assigned to this project
  });
  if (filtered.length !== admins.length) {
    saveAdmins(filtered);
  }
}

// ============================================================================
// ADMINS / AUTH
// ============================================================================

function getAdmins() {
  var admins = readSheetData('_admins');
  if (admins.length === 0) {
    // Initialize with default admin
    var defaults = [{
      username: 'admin',
      passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
      displayName: 'Administrator',
      role: 'site_admin',
      projectIds: []
    }];
    saveAdmins(defaults);
    return defaults;
  }
  return admins;
}

function saveAdmins(adminsArray) {
  writeSheetData('_admins', adminsArray, ['username', 'passwordHash', 'displayName', 'role', 'projectIds', 'email']);
}

function verifyLogin(username, passwordHash) {
  var admins = getAdmins();
  for (var i = 0; i < admins.length; i++) {
    if (admins[i].username === username && admins[i].passwordHash === passwordHash) {
      return {
        success: true,
        data: {
          username: admins[i].username,
          displayName: admins[i].displayName,
          role: admins[i].role,
          projectIds: admins[i].projectIds || []
        }
      };
    }
  }
  return { success: false, error: 'Invalid username or password' };
}

// ============================================================================
// MEMBERS
// ============================================================================

function getMembers(projectId) {
  if (!projectId) return [];
  return readSheetData('_members_' + projectId);
}

function saveMembers(projectId, membersArray) {
  if (!projectId) return;
  writeSheetData('_members_' + projectId, membersArray,
    ['id', 'name', 'email', 'phone', 'role', 'memberType', 'isActive', 'isOnCallEligible', 'defaultShiftOnly', 'createdAt']);
}

// ============================================================================
// SHIFTS
// ============================================================================

function getShifts(projectId) {
  if (!projectId) return [];
  return readSheetData('_shifts_' + projectId);
}

function saveShifts(projectId, shiftsArray) {
  if (!projectId) return;
  writeSheetData('_shifts_' + projectId, shiftsArray,
    ['id', 'code', 'name', 'color', 'startTime', 'endTime', 'isWorkingShift', 'isDefault', 'order']);
}

// ============================================================================
// ROSTER DATA (raw JSON — for the app's internal use)
// ============================================================================

function getRoster(projectId, year, month) {
  if (!projectId || !year || !month) return null;
  var sheetName = '_roster_' + projectId + '_' + year + '_' + String(month).padStart(2, '0');
  return readJsonSheet(sheetName);
}

function saveRoster(projectId, year, month, rosterData) {
  if (!projectId || !year || !month) return;
  var sheetName = '_roster_' + projectId + '_' + year + '_' + String(month).padStart(2, '0');
  var data = {
    year: year,
    month: month,
    projectId: projectId,
    generatedAt: rosterData.generatedAt || null,
    assignments: rosterData.assignments || {},
    onCall: rosterData.onCall || {},
    savedAt: new Date().toISOString()
  };
  writeJsonSheet(sheetName, data);
}

function deleteRoster(projectId, year, month) {
  if (!projectId || !year || !month) return;
  var sheetName = '_roster_' + projectId + '_' + year + '_' + String(month).padStart(2, '0');
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (sheet && ss.getSheets().length > 1) {
    ss.deleteSheet(sheet);
  }
}

function getAvailableMonths(projectId) {
  if (!projectId) return [];
  var ss = getSpreadsheet();
  var allSheets = ss.getSheets();
  var prefix = '_roster_' + projectId + '_';
  var months = [];

  for (var i = 0; i < allSheets.length; i++) {
    var name = allSheets[i].getName();
    if (name.indexOf(prefix) === 0) {
      var parts = name.replace(prefix, '').split('_');
      if (parts.length === 2) {
        months.push({ year: Number(parts[0]), month: Number(parts[1]) });
      }
    }
  }

  // Sort newest first
  months.sort(function(a, b) {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  return months;
}

// ============================================================================
// SWAP REQUESTS
// ============================================================================

function getSwaps(projectId) {
  if (!projectId) return [];
  return readSheetData('_swaps_' + projectId);
}

function saveSwaps(projectId, swapsArray) {
  if (!projectId) return;
  writeSheetData('_swaps_' + projectId, swapsArray,
    ['id', 'requesterId', 'targetId', 'date', 'month', 'year',
     'requesterShift', 'targetShift', 'reason', 'status', 'createdAt', 'resolvedAt']);
}

// ============================================================================
// MANAGERS (derived from members with memberType='manager')
// ============================================================================

function getManagersFromMembers(projectId) {
  var members = getMembers(projectId);
  var managers = [];
  for (var i = 0; i < members.length; i++) {
    if (members[i].memberType === 'manager') managers.push(members[i]);
  }
  return managers;
}

// ============================================================================
// EMAIL CONFIG
// ============================================================================

function getEmailConfig(projectId) {
  if (!projectId) return {};
  return readJsonSheet('_emailconfig_' + projectId) || {};
}

function saveEmailConfig(projectId, configData) {
  if (!projectId) return;
  writeJsonSheet('_emailconfig_' + projectId, configData);
}

// ============================================================================
// ON-CALL CONFIG (per project — JSON blob in a sheet)
// ============================================================================

/**
 * Get on-call configuration for a project.
 * Returns: { enabled, resourcesPerDay, rotationPeriodDays }
 */
function getOnCallConfigData(projectId) {
  if (!projectId) return {};
  return readJsonSheet('_oncallconfig_' + projectId) || {};
}

/**
 * Save on-call configuration for a project.
 */
function saveOnCallConfigData(projectId, configData) {
  if (!projectId) return;
  writeJsonSheet('_oncallconfig_' + projectId, configData);
}

// ============================================================================
// ON-CALL ASSIGNMENTS (per project/month — JSON blob in a sheet)
// ============================================================================

/**
 * Get on-call assignments for a specific month.
 * Returns: { '1': [memberId1, memberId2], '2': [...], ... }
 * Each key is a day number, value is array of on-call member IDs.
 */
function getOnCallAssignmentsData(projectId, year, month) {
  if (!projectId || !year || !month) return {};
  var sheetName = '_oncall_' + projectId + '_' + year + '_' + String(month).padStart(2, '0');
  return readJsonSheet(sheetName) || {};
}

/**
 * Save on-call assignments for a specific month.
 */
function saveOnCallAssignmentsData(projectId, year, month, assignments) {
  if (!projectId || !year || !month) return;
  var sheetName = '_oncall_' + projectId + '_' + year + '_' + String(month).padStart(2, '0');
  writeJsonSheet(sheetName, assignments || {});
}

// ============================================================================
// EMAIL SENDING
// ============================================================================

/**
 * Send a test email to a single recipient.
 */
function sendTestEmail(projectId, emailType, recipientEmail) {
  if (!recipientEmail) return { success: false, error: 'No recipient email provided' };

  var projects = getProjects();
  var project = null;
  for (var i = 0; i < projects.length; i++) {
    if (projects[i].id === projectId) { project = projects[i]; break; }
  }
  var projectName = project ? project.name : 'Unknown Project';
  var config = getEmailConfig(projectId);
  var senderName = (config && config.senderName) || 'Shift Roster';

  var subject, body;
  var now = new Date();
  var dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd MMM yyyy');

  switch (emailType) {
    case 'shiftStart':
      subject = '[' + projectName + '] Shift Starting — ' + dateStr;
      body = buildShiftStartHtml(projectName, dateStr, senderName, true);
      break;
    case 'shiftEnd':
      subject = '[' + projectName + '] Shift Ended — ' + dateStr;
      body = buildShiftEndHtml(projectName, dateStr, senderName, true);
      break;
    case 'dailyConsolidated':
      subject = '[' + projectName + '] Daily Shift Summary — ' + dateStr;
      body = buildDailyConsolidatedHtml(projectName, dateStr, senderName, true);
      break;
    case 'swapNotification':
      subject = '[' + projectName + '] Shift Swap Approved — ' + dateStr;
      body = buildSwapNotificationHtml(projectName, dateStr, senderName, true);
      break;
    default:
      return { success: false, error: 'Unknown email type: ' + emailType };
  }

  try {
    MailApp.sendEmail({
      to: recipientEmail,
      subject: subject,
      htmlBody: body,
      name: senderName
    });
    return { success: true, data: 'Test email sent to ' + recipientEmail };
  } catch (err) {
    return { success: false, error: 'Failed to send email: ' + err.message };
  }
}

/**
 * Send daily consolidated email — called by a time-driven trigger.
 * Run this from Apps Script triggers (e.g., daily at 8 PM).
 */
function sendDailyConsolidatedEmails() {
  var projects = getProjects();

  for (var p = 0; p < projects.length; p++) {
    var project = projects[p];
    var config = getEmailConfig(project.id);
    if (!config || !config.dailyConsolidatedEmail || !config.dailyConsolidatedEmail.enabled) continue;

    var senderName = config.senderName || 'Shift Roster';
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var today = now.getDate();
    var dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd MMM yyyy (EEEE)');

    var members = getMembers(project.id);
    var shifts = getShifts(project.id);
    var roster = getRoster(project.id, year, month);
    var managers = getManagersFromMembers(project.id);

    // Build shift map
    var shiftMap = {};
    for (var s = 0; s < shifts.length; s++) shiftMap[shifts[s].code] = shifts[s];

    // Compute today's data — only for shift resources (not managers)
    var todayStr = String(today);
    var shiftGroups = {}; // { shiftCode: [memberNames] }
    var onLeave = [];
    var unassigned = [];

    for (var m = 0; m < members.length; m++) {
      if (!members[m].isActive || members[m].memberType === 'manager') continue;
      var code = (roster && roster.assignments && roster.assignments[members[m].id])
        ? roster.assignments[members[m].id][todayStr] : null;
      if (!code) {
        unassigned.push(members[m].name);
      } else {
        var shift = shiftMap[code];
        if (shift && shift.isWorkingShift) {
          if (!shiftGroups[code]) shiftGroups[code] = [];
          shiftGroups[code].push(members[m].name);
        } else {
          onLeave.push(members[m].name + ' (' + code + ')');
        }
      }
    }

    // Build email body
    var subject = '[' + project.name + '] Daily Shift Summary — ' + dateStr;
    var html = buildEmailHeader(project.name, 'Daily Consolidated Summary', dateStr, senderName);

    // Shift breakdown
    html += '<h3 style="color:#0d9488;margin:16px 0 8px;">Today\'s Shifts</h3>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
    html += '<tr style="background:#ccfbf1;"><th style="padding:8px;border:1px solid #99f6e4;text-align:left;">Shift</th><th style="padding:8px;border:1px solid #99f6e4;text-align:left;">Members</th><th style="padding:8px;border:1px solid #99f6e4;text-align:center;">Count</th></tr>';

    var shiftCodes = Object.keys(shiftGroups);
    for (var sc = 0; sc < shiftCodes.length; sc++) {
      var code = shiftCodes[sc];
      var shift = shiftMap[code];
      var shiftLabel = shift ? shift.name + ' (' + code + ')' : code;
      var timeStr = (shift && shift.startTime && shift.endTime) ? shift.startTime + ' — ' + shift.endTime : '';
      html += '<tr>';
      html += '<td style="padding:8px;border:1px solid #e2e8f0;"><strong style="color:' + (shift ? shift.color : '#333') + ';">' + shiftLabel + '</strong>';
      if (timeStr) html += '<br/><span style="font-size:11px;color:#94a3b8;">' + timeStr + '</span>';
      html += '</td>';
      html += '<td style="padding:8px;border:1px solid #e2e8f0;">' + shiftGroups[code].join(', ') + '</td>';
      html += '<td style="padding:8px;border:1px solid #e2e8f0;text-align:center;font-weight:bold;">' + shiftGroups[code].length + '</td>';
      html += '</tr>';
    }

    if (onLeave.length > 0) {
      html += '<tr><td style="padding:8px;border:1px solid #e2e8f0;color:#f59e0b;"><strong>On Leave</strong></td>';
      html += '<td style="padding:8px;border:1px solid #e2e8f0;">' + onLeave.join(', ') + '</td>';
      html += '<td style="padding:8px;border:1px solid #e2e8f0;text-align:center;font-weight:bold;">' + onLeave.length + '</td></tr>';
    }

    html += '</table>';

    // Summary stats
    var totalWorking = 0;
    for (var sc2 = 0; sc2 < shiftCodes.length; sc2++) totalWorking += shiftGroups[shiftCodes[sc2]].length;

    html += '<div style="margin-top:16px;padding:12px;background:#f0fdfa;border-radius:8px;font-size:13px;">';
    html += '<strong>Summary:</strong> ' + totalWorking + ' working, ' + onLeave.length + ' on leave, ' + unassigned.length + ' unassigned';
    html += '</div>';

    html += buildEmailFooter(senderName);

    // Collect recipients (resources = non-manager active members)
    var resources = members.filter(function(m) { return m.isActive && (m.memberType || 'resource') === 'resource'; });
    var recipients = collectRecipients(config.dailyConsolidatedEmail, resources, managers, config.additionalRecipients);

    if (recipients.length > 0) {
      MailApp.sendEmail({
        to: recipients.join(','),
        subject: subject,
        htmlBody: html,
        name: senderName
      });
    }
  }
}

/**
 * Send shift start emails — called by a time-driven trigger.
 * Checks each project's shifts and sends notification before shift starts.
 */
function sendShiftStartEmails() {
  var projects = getProjects();
  var now = new Date();
  var currentHH = now.getHours();
  var currentMM = now.getMinutes();
  var year = now.getFullYear();
  var month = now.getMonth() + 1;
  var today = now.getDate();
  var dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd MMM yyyy (EEEE)');

  for (var p = 0; p < projects.length; p++) {
    var project = projects[p];
    var config = getEmailConfig(project.id);
    if (!config || !config.shiftStartEmail || !config.shiftStartEmail.enabled) continue;

    var minutesBefore = config.shiftStartEmail.minutesBefore || 30;
    var senderName = config.senderName || 'Shift Roster';
    var members = getMembers(project.id);
    var shifts = getShifts(project.id);
    var roster = getRoster(project.id, year, month);
    var managers = getManagersFromMembers(project.id);
    var todayStr = String(today);

    // Check each shift's start time
    for (var s = 0; s < shifts.length; s++) {
      var shift = shifts[s];
      if (!shift.isWorkingShift || !shift.startTime) continue;

      var parts = shift.startTime.split(':');
      var shiftHH = parseInt(parts[0], 10);
      var shiftMM = parseInt(parts[1], 10);

      // Calculate minutes until shift start
      var nowMinutes = currentHH * 60 + currentMM;
      var shiftMinutes = shiftHH * 60 + shiftMM;
      var diff = shiftMinutes - nowMinutes;

      // Send if within the "minutesBefore" window (± 10 minute tolerance for trigger timing)
      if (diff >= (minutesBefore - 10) && diff <= (minutesBefore + 10)) {
        // Find members on this shift today
        var shiftMembers = [];
        for (var m = 0; m < members.length; m++) {
          if (!members[m].isActive) continue;
          var code = (roster && roster.assignments && roster.assignments[members[m].id])
            ? roster.assignments[members[m].id][todayStr] : null;
          if (code === shift.code) {
            shiftMembers.push(members[m]);
          }
        }

        if (shiftMembers.length === 0) continue;

        var memberNames = shiftMembers.map(function(m) { return m.name; });
        var timeStr = shift.startTime + (shift.endTime ? ' — ' + shift.endTime : '');

        var subject = '[' + project.name + '] ' + shift.name + ' Shift Starting — ' + dateStr;
        var html = buildEmailHeader(project.name, 'Shift Starting Soon', dateStr, senderName);

        html += '<div style="padding:16px;background:#fffbeb;border-radius:8px;border-left:4px solid #f59e0b;margin:12px 0;">';
        html += '<h3 style="margin:0 0 8px;color:#92400e;">' + shift.name + ' (' + shift.code + ')</h3>';
        html += '<p style="margin:0;font-size:14px;color:#78350f;">Time: <strong>' + timeStr + '</strong></p>';
        html += '<p style="margin:4px 0 0;font-size:14px;color:#78350f;">Team (' + shiftMembers.length + '): <strong>' + memberNames.join(', ') + '</strong></p>';
        html += '</div>';

        html += buildEmailFooter(senderName);

        // Collect recipients
        var shiftRecipients = [];
        if (config.shiftStartEmail.sendToResources) {
          for (var sm = 0; sm < shiftMembers.length; sm++) {
            if (shiftMembers[sm].email) shiftRecipients.push(shiftMembers[sm].email);
          }
        }
        if (config.shiftStartEmail.sendToSupervisors) {
          for (var sv = 0; sv < managers.length; sv++) {
            if (managers[sv].isActive && managers[sv].email) shiftRecipients.push(managers[sv].email);
          }
        }
        if (config.additionalRecipients) {
          shiftRecipients = shiftRecipients.concat(config.additionalRecipients);
        }
        shiftRecipients = uniqueEmails(shiftRecipients);

        if (shiftRecipients.length > 0) {
          MailApp.sendEmail({
            to: shiftRecipients.join(','),
            subject: subject,
            htmlBody: html,
            name: senderName
          });
        }
      }
    }
  }
}

/**
 * Send shift end emails — called by a time-driven trigger.
 */
function sendShiftEndEmails() {
  var projects = getProjects();
  var now = new Date();
  var currentHH = now.getHours();
  var currentMM = now.getMinutes();
  var year = now.getFullYear();
  var month = now.getMonth() + 1;
  var today = now.getDate();
  var dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd MMM yyyy (EEEE)');

  for (var p = 0; p < projects.length; p++) {
    var project = projects[p];
    var config = getEmailConfig(project.id);
    if (!config || !config.shiftEndEmail || !config.shiftEndEmail.enabled) continue;

    var senderName = config.senderName || 'Shift Roster';
    var members = getMembers(project.id);
    var shifts = getShifts(project.id);
    var roster = getRoster(project.id, year, month);
    var managers = getManagersFromMembers(project.id);
    var todayStr = String(today);

    for (var s = 0; s < shifts.length; s++) {
      var shift = shifts[s];
      if (!shift.isWorkingShift || !shift.endTime) continue;

      var parts = shift.endTime.split(':');
      var shiftHH = parseInt(parts[0], 10);
      var shiftMM = parseInt(parts[1], 10);

      var nowMinutes = currentHH * 60 + currentMM;
      var endMinutes = shiftHH * 60 + shiftMM;
      var diff = nowMinutes - endMinutes;

      // Send within ±10 min of shift end
      if (diff >= -10 && diff <= 10) {
        var shiftMembers = [];
        for (var m = 0; m < members.length; m++) {
          if (!members[m].isActive) continue;
          var code = (roster && roster.assignments && roster.assignments[members[m].id])
            ? roster.assignments[members[m].id][todayStr] : null;
          if (code === shift.code) shiftMembers.push(members[m]);
        }

        if (shiftMembers.length === 0) continue;

        var memberNames = shiftMembers.map(function(m) { return m.name; });
        var timeStr = (shift.startTime ? shift.startTime + ' — ' : '') + shift.endTime;

        var subject = '[' + project.name + '] ' + shift.name + ' Shift Ended — ' + dateStr;
        var html = buildEmailHeader(project.name, 'Shift Ended', dateStr, senderName);

        html += '<div style="padding:16px;background:#eff6ff;border-radius:8px;border-left:4px solid #6366f1;margin:12px 0;">';
        html += '<h3 style="margin:0 0 8px;color:#3730a3;">' + shift.name + ' (' + shift.code + ') — Completed</h3>';
        html += '<p style="margin:0;font-size:14px;color:#312e81;">Time: <strong>' + timeStr + '</strong></p>';
        html += '<p style="margin:4px 0 0;font-size:14px;color:#312e81;">Team (' + shiftMembers.length + '): <strong>' + memberNames.join(', ') + '</strong></p>';
        html += '</div>';

        html += buildEmailFooter(senderName);

        var endRecipients = [];
        if (config.shiftEndEmail.sendToResources) {
          for (var sm = 0; sm < shiftMembers.length; sm++) {
            if (shiftMembers[sm].email) endRecipients.push(shiftMembers[sm].email);
          }
        }
        if (config.shiftEndEmail.sendToSupervisors) {
          for (var sv = 0; sv < managers.length; sv++) {
            if (managers[sv].isActive && managers[sv].email) endRecipients.push(managers[sv].email);
          }
        }
        if (config.additionalRecipients) {
          endRecipients = endRecipients.concat(config.additionalRecipients);
        }
        endRecipients = uniqueEmails(endRecipients);

        if (endRecipients.length > 0) {
          MailApp.sendEmail({
            to: endRecipients.join(','),
            subject: subject,
            htmlBody: html,
            name: senderName
          });
        }
      }
    }
  }
}

// ============================================================================
// EMAIL HELPERS — HTML templates and recipient collection
// ============================================================================

/** Build common email header */
function buildEmailHeader(projectName, title, dateStr, senderName) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:\'Segoe UI\',Tahoma,Geneva,Verdana,sans-serif;background:#f8fafc;">'
    + '<div style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">'
    + '<div style="background:linear-gradient(135deg,#0d9488,#10b981);padding:24px 28px;">'
    + '<h1 style="margin:0;font-size:20px;color:#ffffff;">' + title + '</h1>'
    + '<p style="margin:4px 0 0;font-size:13px;color:#d1fae5;">' + projectName + ' &mdash; ' + dateStr + '</p>'
    + '</div>'
    + '<div style="padding:24px 28px;">';
}

/** Build common email footer */
function buildEmailFooter(senderName) {
  return '<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">'
    + '<p style="margin:0;">Sent by ' + senderName + ' &mdash; Automated Notification</p>'
    + '<p style="margin:4px 0 0;">This is an automated email. Please do not reply.</p>'
    + '</div></div></div></body></html>';
}

/** Collect unique email recipients based on config flags */
function collectRecipients(emailTypeConfig, resources, managers, additionalRecipients) {
  var emails = [];

  if (emailTypeConfig.sendToResources) {
    for (var m = 0; m < resources.length; m++) {
      if (resources[m].isActive && resources[m].email) emails.push(resources[m].email);
    }
  }

  if (emailTypeConfig.sendToSupervisors) {
    for (var s = 0; s < managers.length; s++) {
      if (managers[s].isActive && managers[s].email) emails.push(managers[s].email);
    }
  }

  if (additionalRecipients && additionalRecipients.length > 0) {
    emails = emails.concat(additionalRecipients);
  }

  return uniqueEmails(emails);
}

/** Remove duplicate emails (case-insensitive) */
function uniqueEmails(emailArray) {
  var seen = {};
  var result = [];
  for (var i = 0; i < emailArray.length; i++) {
    var e = emailArray[i].toLowerCase().trim();
    if (e && !seen[e]) {
      seen[e] = true;
      result.push(e);
    }
  }
  return result;
}

/** Build test shift start email HTML */
function buildShiftStartHtml(projectName, dateStr, senderName, isTest) {
  var html = buildEmailHeader(projectName, (isTest ? '[TEST] ' : '') + 'Shift Starting Soon', dateStr, senderName);
  html += '<div style="padding:16px;background:#fffbeb;border-radius:8px;border-left:4px solid #f59e0b;margin:12px 0;">';
  html += '<h3 style="margin:0 0 8px;color:#92400e;">Morning Shift (M)</h3>';
  html += '<p style="margin:0;font-size:14px;color:#78350f;">Time: <strong>06:00 — 14:00</strong></p>';
  html += '<p style="margin:4px 0 0;font-size:14px;color:#78350f;">Team (3): <strong>Alice Johnson, Bob Smith, Carol Davis</strong></p>';
  html += '</div>';
  if (isTest) html += '<p style="font-size:12px;color:#f59e0b;font-style:italic;">This is a test email. Actual emails will contain real shift and member data.</p>';
  html += buildEmailFooter(senderName);
  return html;
}

/** Build test shift end email HTML */
function buildShiftEndHtml(projectName, dateStr, senderName, isTest) {
  var html = buildEmailHeader(projectName, (isTest ? '[TEST] ' : '') + 'Shift Ended', dateStr, senderName);
  html += '<div style="padding:16px;background:#eff6ff;border-radius:8px;border-left:4px solid #6366f1;margin:12px 0;">';
  html += '<h3 style="margin:0 0 8px;color:#3730a3;">Morning Shift (M) — Completed</h3>';
  html += '<p style="margin:0;font-size:14px;color:#312e81;">Time: <strong>06:00 — 14:00</strong></p>';
  html += '<p style="margin:4px 0 0;font-size:14px;color:#312e81;">Team (3): <strong>Alice Johnson, Bob Smith, Carol Davis</strong></p>';
  html += '</div>';
  if (isTest) html += '<p style="font-size:12px;color:#6366f1;font-style:italic;">This is a test email. Actual emails will contain real shift and member data.</p>';
  html += buildEmailFooter(senderName);
  return html;
}

/** Build test daily consolidated email HTML */
function buildDailyConsolidatedHtml(projectName, dateStr, senderName, isTest) {
  var html = buildEmailHeader(projectName, (isTest ? '[TEST] ' : '') + 'Daily Consolidated Summary', dateStr, senderName);
  html += '<h3 style="color:#0d9488;margin:16px 0 8px;">Today\'s Shifts</h3>';
  html += '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
  html += '<tr style="background:#ccfbf1;"><th style="padding:8px;border:1px solid #99f6e4;text-align:left;">Shift</th><th style="padding:8px;border:1px solid #99f6e4;text-align:left;">Members</th><th style="padding:8px;border:1px solid #99f6e4;text-align:center;">Count</th></tr>';
  html += '<tr><td style="padding:8px;border:1px solid #e2e8f0;"><strong style="color:#f59e0b;">Morning (M)</strong><br/><span style="font-size:11px;color:#94a3b8;">06:00 — 14:00</span></td><td style="padding:8px;border:1px solid #e2e8f0;">Alice, Bob, Carol</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;font-weight:bold;">3</td></tr>';
  html += '<tr><td style="padding:8px;border:1px solid #e2e8f0;"><strong style="color:#3b82f6;">Evening (E)</strong><br/><span style="font-size:11px;color:#94a3b8;">14:00 — 22:00</span></td><td style="padding:8px;border:1px solid #e2e8f0;">Dave, Eve</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;font-weight:bold;">2</td></tr>';
  html += '<tr><td style="padding:8px;border:1px solid #e2e8f0;color:#f59e0b;"><strong>On Leave</strong></td><td style="padding:8px;border:1px solid #e2e8f0;">Frank (WO)</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;font-weight:bold;">1</td></tr>';
  html += '</table>';
  html += '<div style="margin-top:16px;padding:12px;background:#f0fdfa;border-radius:8px;font-size:13px;"><strong>Summary:</strong> 5 working, 1 on leave, 0 unassigned</div>';
  if (isTest) html += '<p style="font-size:12px;color:#0d9488;font-style:italic;">This is a test email. Actual emails will contain real roster data.</p>';
  html += buildEmailFooter(senderName);
  return html;
}

/** Build test swap notification email HTML */
function buildSwapNotificationHtml(projectName, dateStr, senderName, isTest) {
  var html = buildEmailHeader(projectName, (isTest ? '[TEST] ' : '') + 'Shift Swap Approved', dateStr, senderName);
  html += '<div style="padding:16px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e;margin:12px 0;">';
  html += '<h3 style="margin:0 0 8px;color:#166534;">Swap Approved</h3>';
  html += '<p style="margin:0;font-size:14px;color:#14532d;"><strong>Alice Johnson</strong> (Morning → Evening)</p>';
  html += '<p style="margin:4px 0 0;font-size:14px;color:#14532d;"><strong>Bob Smith</strong> (Evening → Morning)</p>';
  html += '<p style="margin:8px 0 0;font-size:13px;color:#166534;">Date: 15 Jan 2026 | Reason: Personal commitment</p>';
  html += '</div>';
  if (isTest) html += '<p style="font-size:12px;color:#22c55e;font-style:italic;">This is a test email. Actual emails will contain real swap data.</p>';
  html += buildEmailFooter(senderName);
  return html;
}

// ============================================================================
// TRIGGER SETUP — Run once to create scheduled triggers
// ============================================================================

/**
 * Set up time-driven triggers for automated emails.
 * Run this function once from the Apps Script editor.
 * 
 * It creates:
 * - Every 30 minutes: check for shift start/end emails
 * - Daily at 8 PM: send daily consolidated email
 */
function setupEmailTriggers() {
  // Remove existing triggers to avoid duplicates
  var existingTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existingTriggers.length; i++) {
    var funcName = existingTriggers[i].getHandlerFunction();
    if (funcName === 'sendShiftStartEmails' || funcName === 'sendShiftEndEmails' || funcName === 'sendDailyConsolidatedEmails') {
      ScriptApp.deleteTrigger(existingTriggers[i]);
    }
  }

  // Shift start/end check: every 30 minutes
  ScriptApp.newTrigger('sendShiftStartEmails')
    .timeBased()
    .everyMinutes(30)
    .create();

  ScriptApp.newTrigger('sendShiftEndEmails')
    .timeBased()
    .everyMinutes(30)
    .create();

  // Daily consolidated: every day at 8 PM (20:00)
  ScriptApp.newTrigger('sendDailyConsolidatedEmails')
    .timeBased()
    .atHour(20)
    .everyDays(1)
    .create();

  Logger.log('Email triggers set up successfully!');
  Logger.log('- Shift start/end check: every 30 minutes');
  Logger.log('- Daily consolidated: daily at 8 PM');
}

// ============================================================================
// FORMATTED ROSTER SHEET (human-readable, color-coded monthly tab)
// ============================================================================

/**
 * Create or update a beautifully formatted roster sheet for a specific month.
 * This is the sheet people actually look at — with colors, headers, and formatting.
 */
function createFormattedRosterSheet(projectId, projectName, year, month, members, shifts, assignments) {
  var ss = getSpreadsheet();
  var sheetName = MONTH_NAMES[month - 1] + ' ' + year;

  // If project-specific, add suffix
  if (projectName) {
    sheetName = sheetName + ' - ' + projectName;
  }

  // Get or create the sheet
  var sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    sheet.clear();
    sheet.clearFormats();
  } else {
    sheet = ss.insertSheet(sheetName);
  }

  var daysInMonth = new Date(year, month, 0).getDate();
  var totalCols = daysInMonth + 2; // Member name + days + Total Working

  // Build shift color map
  var shiftColorMap = {};
  for (var s = 0; s < shifts.length; s++) {
    shiftColorMap[shifts[s].code] = shifts[s].color;
  }

  // ---- Row 1: Day numbers ----
  var headerRow = ['Member'];
  for (var d = 1; d <= daysInMonth; d++) headerRow.push(d);
  headerRow.push('Total');

  // ---- Row 2: Day names ----
  var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var dayNameRow = [''];
  for (var d = 1; d <= daysInMonth; d++) {
    var dow = new Date(year, month - 1, d).getDay();
    dayNameRow.push(dayNames[dow]);
  }
  dayNameRow.push('');

  // ---- Member data rows ----
  var dataRows = [];
  for (var m = 0; m < members.length; m++) {
    var member = members[m];
    var row = [member.name];
    var workingDays = 0;

    for (var d = 1; d <= daysInMonth; d++) {
      var code = '';
      if (assignments[member.id] && assignments[member.id][String(d)]) {
        code = assignments[member.id][String(d)];
      }
      row.push(code);

      // Count working days
      if (code) {
        for (var si = 0; si < shifts.length; si++) {
          if (shifts[si].code === code && shifts[si].isWorkingShift) {
            workingDays++;
            break;
          }
        }
      }
    }
    row.push(workingDays);
    dataRows.push(row);
  }

  // ---- Availability row ----
  var availRow = ['Availability'];
  for (var d = 1; d <= daysInMonth; d++) {
    var count = 0;
    for (var m = 0; m < members.length; m++) {
      var code = '';
      if (assignments[members[m].id] && assignments[members[m].id][String(d)]) {
        code = assignments[members[m].id][String(d)];
      }
      if (code) {
        for (var si = 0; si < shifts.length; si++) {
          if (shifts[si].code === code && shifts[si].isWorkingShift) {
            count++;
            break;
          }
        }
      }
    }
    availRow.push(count);
  }
  availRow.push('');

  // ---- Write all rows ----
  var allRows = [headerRow, dayNameRow].concat(dataRows).concat([availRow]);
  sheet.getRange(1, 1, allRows.length, totalCols).setValues(allRows);

  // ---- FORMATTING ----

  // Header rows (1-2): teal background, bold, centered
  var headerRange = sheet.getRange(1, 1, 2, totalCols);
  headerRange.setBackground('#ccfbf1')
    .setFontWeight('bold')
    .setFontSize(9)
    .setHorizontalAlignment('center')
    .setBorder(true, true, true, true, true, true, '#99f6e4', SpreadsheetApp.BorderStyle.SOLID);

  // Member name column: bold
  if (members.length > 0) {
    sheet.getRange(3, 1, members.length, 1).setFontWeight('bold').setFontSize(9);
  }

  // Color each shift cell
  for (var rowIdx = 0; rowIdx < members.length; rowIdx++) {
    for (var d = 1; d <= daysInMonth; d++) {
      var code = '';
      if (assignments[members[rowIdx].id] && assignments[members[rowIdx].id][String(d)]) {
        code = assignments[members[rowIdx].id][String(d)];
      }

      if (code && shiftColorMap[code]) {
        var cell = sheet.getRange(rowIdx + 3, d + 1); // +3 for 2 header rows + 1-indexed
        cell.setBackground(shiftColorMap[code])
          .setFontColor('#ffffff')
          .setFontWeight('bold')
          .setFontSize(9)
          .setHorizontalAlignment('center');
      }
    }
  }

  // Availability row: light gray background, bold
  var availRange = sheet.getRange(members.length + 3, 1, 1, totalCols);
  availRange.setBackground('#f1f5f9')
    .setFontWeight('bold')
    .setFontSize(9)
    .setHorizontalAlignment('center')
    .setBorder(true, true, true, true, true, true, '#e2e8f0', SpreadsheetApp.BorderStyle.SOLID);

  // Highlight weekends in header
  for (var d = 1; d <= daysInMonth; d++) {
    var dow = new Date(year, month - 1, d).getDay();
    if (dow === 0 || dow === 6) {
      // Weekend columns get a slightly darker header
      sheet.getRange(1, d + 1, 2, 1).setBackground('#99f6e4');
    }
  }

  // Freeze header rows and member name column
  sheet.setFrozenRows(2);
  sheet.setFrozenColumns(1);

  // Auto-resize member name column
  sheet.autoResizeColumn(1);

  // Set data cell columns to fixed width (30px for day columns)
  for (var d = 1; d <= daysInMonth; d++) {
    sheet.setColumnWidth(d + 1, 35);
  }

  // Total column width
  sheet.setColumnWidth(totalCols, 50);

  // ---- Create/update project-specific Legend sheet ----
  createLegendSheet(projectName, shifts);
}

/**
 * Create or update a project-specific Legend sheet with shift definitions.
 * Sheet is named "Legend - ProjectName" (or "Legend" if no project name).
 */
function createLegendSheet(projectName, shifts) {
  var ss = getSpreadsheet();
  var legendName = projectName ? 'Legend - ' + projectName : 'Legend';
  var sheet = ss.getSheetByName(legendName);
  if (sheet) {
    sheet.clear();
    sheet.clearFormats();
  } else {
    sheet = ss.insertSheet(legendName);
  }

  // Header
  var header = ['Code', 'Shift Name', 'Color', 'Start', 'End', 'Working'];
  sheet.getRange(1, 1, 1, header.length).setValues([header])
    .setBackground('#ccfbf1')
    .setFontWeight('bold')
    .setFontSize(10)
    .setHorizontalAlignment('center');

  // Shift rows
  for (var i = 0; i < shifts.length; i++) {
    var s = shifts[i];
    var row = [s.code, s.name, s.color, s.startTime || '-', s.endTime || '-', s.isWorkingShift ? 'Yes' : 'No'];
    var range = sheet.getRange(i + 2, 1, 1, header.length);
    range.setValues([row]).setFontSize(10);

    // Color the code cell
    sheet.getRange(i + 2, 1).setBackground(s.color).setFontColor('#ffffff').setFontWeight('bold');
    sheet.getRange(i + 2, 3).setBackground(s.color).setFontColor('#ffffff');
  }

  sheet.autoResizeColumns(1, header.length);
}

// ============================================================================
// PROJECT ADMIN CREDENTIALS EMAIL
// ============================================================================

/**
 * Send project admin credentials email to the project admin, CC site admin.
 * Features a professional, branded email layout with welcome message,
 * project details, login credentials, and admin support contact.
 */
function sendProjectAdminCredentialsEmail(projectName, adminEmail, adminDisplayName, username, password, siteAdminEmail, isReset) {
  if (!adminEmail) return { success: false, error: 'No admin email provided' };

  var actionLabel = isReset ? 'Password Reset' : 'Welcome to Shift Roster';
  var subject = '[Shift Roster] ' + (isReset ? 'Password Reset' : 'Your Account is Ready') + ' — ' + projectName;
  var year = new Date().getFullYear();
  var displayName = adminDisplayName || 'Admin';
  // Use email as the login username shown in the email
  var loginUsername = adminEmail;

  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head>';
  html += '<body style="font-family:\'Segoe UI\',Arial,Helvetica,sans-serif;background:#f1f5f9;margin:0;padding:0;-webkit-font-smoothing:antialiased;">';
  html += '<div style="max-width:600px;margin:0 auto;padding:24px 16px;">';

  // ── Container card ──
  html += '<div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">';

  // ── Header Banner ──
  html += '<div style="background:linear-gradient(135deg,#0f766e 0%,#0d9488 50%,#14b8a6 100%);padding:36px 40px 32px;text-align:center;">';
  html += '<div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:12px;padding:10px 14px;margin-bottom:16px;">';
  html += '<span style="font-size:28px;line-height:1;">&#128197;</span>';
  html += '</div>';
  html += '<h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0;letter-spacing:-0.5px;">Shift Roster</h1>';
  html += '<p style="color:rgba(255,255,255,0.85);font-size:13px;margin:8px 0 0;font-weight:400;">Smart Shift Management Platform</p>';
  html += '</div>';

  // ── Action Badge ──
  if (isReset) {
    html += '<div style="background:#fef3c7;border-bottom:1px solid #fde68a;padding:12px 40px;text-align:center;">';
    html += '<span style="font-size:13px;font-weight:600;color:#92400e;">&#128274; Password Reset Notification</span>';
    html += '</div>';
  } else {
    html += '<div style="background:#ecfdf5;border-bottom:1px solid #a7f3d0;padding:12px 40px;text-align:center;">';
    html += '<span style="font-size:13px;font-weight:600;color:#065f46;">&#9989; Your Account Has Been Created</span>';
    html += '</div>';
  }

  // ── Body ──
  html += '<div style="padding:32px 40px 24px;">';

  // Welcome greeting
  html += '<p style="font-size:16px;color:#1e293b;margin:0 0 20px;line-height:1.6;">Hi <strong>' + displayName + '</strong>,</p>';

  if (isReset) {
    html += '<p style="font-size:14px;color:#475569;margin:0 0 20px;line-height:1.7;">Your password for the project <strong style="color:#0f766e;">' + projectName + '</strong> has been reset by the site administrator. Your updated login credentials are below.</p>';
  } else {
    html += '<p style="font-size:14px;color:#475569;margin:0 0 20px;line-height:1.7;">Welcome to <strong style="color:#0f766e;">Shift Roster</strong> — a comprehensive shift management platform designed to simplify roster planning, team scheduling, and shift coordination. With Shift Roster, you can create and manage shift schedules, track team availability, handle swap requests, and ensure smooth operations across your workforce.</p>';
    html += '<p style="font-size:14px;color:#475569;margin:0 0 20px;line-height:1.7;">A new project has been created for you and you have been assigned as the <strong>Project Administrator</strong>. As a Project Admin, you can manage team members, configure shifts, generate rosters, and oversee all scheduling activities for your project.</p>';
  }

  // ── Project Details Card ──
  html += '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin:24px 0;">';
  html += '<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin:0 0 12px;font-weight:700;">&#128193; Project Details</h3>';
  html += '<table style="width:100%;border-collapse:collapse;">';
  html += '<tr><td style="padding:8px 0;font-size:13px;color:#64748b;font-weight:600;width:130px;vertical-align:top;">Project Name:</td>';
  html += '<td style="padding:8px 0;font-size:14px;color:#1e293b;font-weight:600;">' + projectName + '</td></tr>';
  if (siteAdminEmail) {
    html += '<tr><td style="padding:8px 0;font-size:13px;color:#64748b;font-weight:600;vertical-align:top;">Created By:</td>';
    html += '<td style="padding:8px 0;font-size:14px;color:#1e293b;">' + siteAdminEmail + '</td></tr>';
  }
  html += '</table>';
  html += '</div>';

  // ── Credentials Card ──
  html += '<div style="background:linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 100%);border:1px solid #86efac;border-radius:12px;padding:20px 24px;margin:24px 0;">';
  html += '<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#166534;margin:0 0 16px;font-weight:700;">&#128272; Your Login Credentials</h3>';
  html += '<table style="width:100%;border-collapse:collapse;">';
  html += '<tr><td style="padding:10px 0;font-size:13px;color:#166534;font-weight:600;width:130px;vertical-align:middle;">Login Username:</td>';
  html += '<td style="padding:10px 0;"><span style="background:#ffffff;border:1px solid #bbf7d0;padding:6px 14px;border-radius:6px;font-size:14px;color:#1e293b;font-weight:500;display:inline-block;">' + loginUsername + '</span></td></tr>';
  html += '<tr><td style="padding:10px 0;font-size:13px;color:#166534;font-weight:600;vertical-align:middle;">Password:</td>';
  html += '<td style="padding:10px 0;"><span style="background:#ffffff;border:1px solid #bbf7d0;padding:6px 14px;border-radius:6px;font-family:\'Courier New\',monospace;font-size:14px;color:#1e293b;font-weight:600;letter-spacing:0.5px;display:inline-block;">' + password + '</span></td></tr>';
  html += '</table>';
  html += '</div>';

  // ── Security Notice ──
  html += '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 20px;margin:20px 0;">';
  html += '<p style="font-size:12px;color:#92400e;margin:0;line-height:1.6;">&#9888;&#65039; <strong>Security Notice:</strong> Please keep these credentials secure and do not share them with anyone. We recommend changing your password after your first login.</p>';
  html += '</div>';

  // ── Access Application Button ──
  html += '<div style="text-align:center;margin:28px 0 20px;">';
  html += '<a href="https://knowvana.github.io/ShiftRoaster/" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);color:#ffffff;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(13,148,136,0.3);">&#128640; Access Shift Roster Application</a>';
  html += '<p style="font-size:11px;color:#94a3b8;margin:10px 0 0;">https://knowvana.github.io/ShiftRoaster/</p>';
  html += '</div>';

  // ── Support Contact ──
  if (siteAdminEmail) {
    html += '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 20px;margin:20px 0;">';
    html += '<p style="font-size:12px;color:#1e40af;margin:0;line-height:1.6;">&#128231; <strong>Need Help?</strong> If you have any questions or encounter any issues, please contact your site administrator at <a href="mailto:' + siteAdminEmail + '" style="color:#2563eb;font-weight:600;text-decoration:none;">' + siteAdminEmail + '</a></p>';
    html += '</div>';
  }

  html += '</div>'; // end body

  // ── Footer ──
  html += '<div style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">';
  html += '<p style="font-size:12px;color:#94a3b8;margin:0 0 4px;">This is an automated message from Shift Roster.</p>';
  html += '<p style="font-size:11px;color:#cbd5e1;margin:0;">&copy; ' + year + ' Shift Roster &mdash; Smart Shift Management Platform</p>';
  html += '</div>';

  html += '</div>'; // end container card
  html += '</div>'; // end outer padding
  html += '</body></html>';

  try {
    var emailOptions = {
      to: adminEmail,
      subject: subject,
      htmlBody: html,
      name: 'Shift Roster'
    };
    // CC site admin if email provided
    if (siteAdminEmail) {
      emailOptions.cc = siteAdminEmail;
    }
    MailApp.sendEmail(emailOptions);
    return { success: true, data: 'Credentials email sent to ' + adminEmail };
  } catch (err) {
    return { success: false, error: 'Failed to send email: ' + err.message };
  }
}

// ============================================================================
// INITIALIZATION — Run once to set up the spreadsheet structure
// ============================================================================

/**
 * Run this function once to initialize the spreadsheet with required sheets.
 * You can run it from the Apps Script editor: Run → initializeSpreadsheet
 */
function initializeSpreadsheet() {
  var ss = getSpreadsheet();

  // Create _projects sheet if missing
  if (!ss.getSheetByName('_projects')) {
    var projSheet = ss.insertSheet('_projects');
    projSheet.getRange(1, 1, 1, 4).setValues([['id', 'name', 'description', 'createdAt']]);
  }

  // Create _admins sheet with default admin
  if (!ss.getSheetByName('_admins')) {
    var adminSheet = ss.insertSheet('_admins');
    adminSheet.getRange(1, 1, 1, 5).setValues([['username', 'passwordHash', 'displayName', 'role', 'projectIds']]);
    // Default: admin / admin123 (SHA-256 hash)
    adminSheet.getRange(2, 1, 1, 5).setValues([[
      'admin',
      '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
      'Administrator',
      'site_admin',
      '[]'
    ]]);
  }

  // Remove the default "Sheet1" if it exists and other sheets exist
  var sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1) {
    ss.deleteSheet(sheet1);
  }

  Logger.log('Spreadsheet initialized successfully!');
}
