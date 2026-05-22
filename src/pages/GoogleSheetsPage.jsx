/**
 * ============================================================================
 * GoogleSheetsPage.jsx — Google Sheets Integration Page
 * 
 * Allows users to:
 * - Connect their Google account for Sheets access
 * - Export the current month's roster to a new Google Spreadsheet
 * - Update an existing spreadsheet with latest roster data
 * - Open previously synced spreadsheets
 * - Disconnect Google account
 * 
 * Requires a valid Google OAuth Client ID in app.json → googleSheetsClientId.
 * See docs/google-sheets-setup.md for setup instructions.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Sheet, LogIn, LogOut, Upload, ExternalLink,
  RefreshCw, AlertCircle, CheckCircle2, Info,
} from 'lucide-react';
import { useProject } from '@hooks/useProject';
import { useToast } from '@hooks/useToast';
import { getMembers } from '@services/memberService';
import { getShifts } from '@services/shiftService';
import { getRoster, getDaysInMonth } from '@services/rosterService';
import {
  initGoogleSheets, isAuthenticated, signIn, signOut,
  getUserEmail, createRosterSpreadsheet, updateRosterSpreadsheet,
  getSavedLink, saveLink,
} from '@services/googleSheetsService';
import appConfig from '@config/app.json';

// ---- Month Names ----
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function GoogleSheetsPage() {
  const { currentProject } = useProject();
  const { showToast } = useToast();

  // ---- State ----
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [existingLink, setExistingLink] = useState(null);

  // ---- Google Client ID ----
  const clientId = appConfig.googleSheetsClientId || '';

  // ---- Initialize Google API on mount ----
  useEffect(() => {
    if (!clientId) {
      setInitError('Google OAuth Client ID not configured. Add "googleSheetsClientId" to src/config/app.json');
      return;
    }

    initGoogleSheets(clientId)
      .then(async () => {
        setIsInitialized(true);
        if (isAuthenticated()) {
          setIsConnected(true);
          const email = await getUserEmail();
          setUserEmail(email);
        }
      })
      .catch((err) => {
        setInitError(err.message);
      });
  }, [clientId]);

  // ---- Check for existing spreadsheet link when project/month changes ----
  useEffect(() => {
    if (currentProject) {
      const link = getSavedLink(currentProject.id, selectedYear, selectedMonth);
      setExistingLink(link);
    } else {
      setExistingLink(null);
    }
  }, [currentProject, selectedYear, selectedMonth]);

  // ---- Connect to Google ----
  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await signIn();
      setIsConnected(true);
      const email = await getUserEmail();
      setUserEmail(email);
      showToast('Connected to Google Sheets!', 'success');
    } catch (err) {
      showToast('Failed to connect: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Disconnect from Google ----
  const handleDisconnect = () => {
    signOut();
    setIsConnected(false);
    setUserEmail(null);
    showToast('Disconnected from Google', 'info');
  };

  // ---- Create New Spreadsheet ----
  const handleCreate = async () => {
    if (!currentProject) { showToast('Select a project first', 'error'); return; }

    const members = getMembers(currentProject.id).filter((m) => m.isActive);
    const shifts = getShifts(currentProject.id);
    const roster = getRoster(currentProject.id, selectedYear, selectedMonth);

    if (!roster || !roster.assignments || Object.keys(roster.assignments).length === 0) {
      showToast('No roster data for this month. Generate and save a roster first.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const title = `${currentProject.name} — ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} Roster`;
      const result = await createRosterSpreadsheet(
        title, members, shifts, roster.assignments, selectedYear, selectedMonth
      );
      saveLink(currentProject.id, selectedYear, selectedMonth, result.spreadsheetId, result.spreadsheetUrl);
      setExistingLink({ spreadsheetId: result.spreadsheetId, spreadsheetUrl: result.spreadsheetUrl });
      showToast('Spreadsheet created! Opening in new tab...', 'success');
      window.open(result.spreadsheetUrl, '_blank');
    } catch (err) {
      const detail = err?.result?.error?.message || err?.body || err?.message || 'Unknown error';
      console.error('[GoogleSheets] Create failed:', err);
      showToast('Failed to create spreadsheet: ' + detail, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Update Existing Spreadsheet ----
  const handleUpdate = async () => {
    if (!existingLink) return;

    const members = getMembers(currentProject.id).filter((m) => m.isActive);
    const shifts = getShifts(currentProject.id);
    const roster = getRoster(currentProject.id, selectedYear, selectedMonth);

    if (!roster || !roster.assignments || Object.keys(roster.assignments).length === 0) {
      showToast('No roster data to sync', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await updateRosterSpreadsheet(
        existingLink.spreadsheetId, members, shifts, roster.assignments, selectedYear, selectedMonth
      );
      showToast('Spreadsheet updated with latest roster!', 'success');
    } catch (err) {
      showToast('Failed to update: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- No Project ----
  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mb-4">
          <Sheet size={28} className="text-brand-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">No Project Selected</h2>
        <p className="text-sm text-slate-500">Select a project to use Google Sheets sync.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ---- Page Header ---- */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Google Sheets</h1>
        <p className="text-sm text-slate-500 mt-1">
          Sync your roster to Google Sheets for
          <span className="font-medium text-slate-700"> {currentProject.name}</span>
        </p>
      </div>

      {/* ---- Setup Error ---- */}
      {initError && (
        <div className="card p-5 border-amber-200 bg-amber-50/50">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-800">Setup Required</h3>
              <p className="text-xs text-amber-700 mt-1">{initError}</p>
              <div className="mt-3 text-xs text-amber-700 space-y-1">
                <p className="font-medium">Quick Setup Steps:</p>
                <ol className="list-decimal ml-4 space-y-0.5">
                  <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
                  <li>Create a project and enable the Google Sheets API</li>
                  <li>Create OAuth 2.0 credentials (Web application)</li>
                  <li>Add your app origin to Authorized JavaScript origins</li>
                  <li>Copy the Client ID to <code className="bg-amber-100 px-1 rounded">app.json → googleSheetsClientId</code></li>
                </ol>
                <p className="mt-2">See <code className="bg-amber-100 px-1 rounded">docs/google-sheets-setup.md</code> for detailed instructions.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- Connection Status Card ---- */}
      {isInitialized && (
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Connected to Google</p>
                    {userEmail && <p className="text-xs text-slate-500">{userEmail}</p>}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <Sheet size={20} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Not Connected</p>
                    <p className="text-xs text-slate-500">Sign in to sync roster to Google Sheets</p>
                  </div>
                </>
              )}
            </div>

            {isConnected ? (
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                           text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <LogOut size={14} />
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                           bg-brand-600 text-white hover:bg-brand-700 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <LogIn size={14} />
                )}
                Connect Google Account
              </button>
            )}
          </div>
        </div>
      )}

      {/* ---- Sync Controls (only when connected) ---- */}
      {isConnected && (
        <>
          {/* Month Selector */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Info size={14} className="text-brand-500" />
              Select Month to Sync
            </h3>
            <div className="flex items-center gap-3">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="select-field max-w-[180px]"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx} value={idx + 1}>{name}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="select-field max-w-[100px]"
              >
                {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sync Actions */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear} — Sync Actions
            </h3>

            {existingLink ? (
              <div className="space-y-3">
                {/* Existing spreadsheet info */}
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  <p className="text-xs text-emerald-800 flex-1">
                    A spreadsheet already exists for this month.
                  </p>
                  <a
                    href={existingLink.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
                  >
                    <ExternalLink size={12} />
                    Open
                  </a>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUpdate}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                               bg-brand-600 text-white hover:bg-brand-700 transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    Update Spreadsheet
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                               text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload size={14} />
                    Create New
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  No spreadsheet exists yet for this month. Create one to sync your roster data.
                </p>
                <button
                  onClick={handleCreate}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                             bg-brand-600 text-white hover:bg-brand-700 transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  Create Spreadsheet
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ---- How It Works Info ---- */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Info size={14} className="text-brand-500" />
          How It Works
        </h3>
        <div className="text-xs text-slate-500 space-y-2">
          <p><span className="font-medium text-slate-700">1. Connect</span> — Sign in with your Google account to grant Sheets access.</p>
          <p><span className="font-medium text-slate-700">2. Select Month</span> — Pick the roster month you want to export.</p>
          <p><span className="font-medium text-slate-700">3. Create/Update</span> — Create a new spreadsheet or update an existing one.</p>
          <p><span className="font-medium text-slate-700">4. Share</span> — The spreadsheet is created in your Google Drive. Share it with your team.</p>
          <p className="mt-2 text-slate-400">
            The spreadsheet includes color-coded shift cells, day headers, availability summary, and a legend sheet.
          </p>
        </div>
      </div>
    </div>
  );
}
