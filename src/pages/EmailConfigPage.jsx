/**
 * ============================================================================
 * EmailConfigPage.jsx — Email Notification Configuration (Admin-Only)
 * 
 * Configurable settings for all email notifications:
 * - Shift Start Email (to resources + supervisors)
 * - Shift End Email (to resources + supervisors)
 * - Daily Consolidated Email (end-of-day summary)
 * - Swap Notification Email (on swap approval)
 * - Additional recipient emails
 * - Test email sending
 * 
 * Only accessible by logged-in admins.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Mail, Bell, Clock, Send, Plus, X, Check,
  ToggleLeft, ToggleRight, Trash2, AlertCircle,
  ArrowLeftRight, Calendar, Sun, Moon,
} from 'lucide-react';
import { useProject } from '@hooks/useProject';
import { useToast } from '@hooks/useToast';
import { usePermissions } from '@hooks/usePermissions';
import { SkeletonCard, SkeletonLine } from '@components/common/SkeletonLoader';
import {
  getEmailConfig,
  fetchEmailConfig,
  syncEmailConfig,
  sendTestEmail,
  DEFAULT_EMAIL_CONFIG,
} from '@services/emailConfigService';
import { getManagers } from '@services/memberService';
import { isBackendConfigured } from '@services/apiClient';

// ---- Toggle Switch Component ----
function ToggleSwitch({ enabled, onChange, label, description }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`flex-shrink-0 w-10 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5
          ${enabled ? 'bg-brand-500' : 'bg-slate-300'}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200
          ${enabled ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}

// ---- Email Type Configuration Card (Compact Grid) ----
function EmailTypeCard({ icon: Icon, title, description, color, config, onChange, children }) {
  return (
    <div className={`rounded-lg border-2 transition-all ${config.enabled ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white'}`}>
      {/* Header */}
      <div className="p-3 flex items-start gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-bold text-slate-800 truncate">{title}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...config, enabled: !config.enabled })}
          className={`flex-shrink-0 w-8 h-5 rounded-full transition-colors duration-200 flex items-center px-0.5
            ${config.enabled ? 'bg-brand-500' : 'bg-slate-300'}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200
            ${config.enabled ? 'translate-x-3' : 'translate-x-0'}`}
          />
        </button>
      </div>

      {/* Settings (only shown when enabled) */}
      {config.enabled && (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-100 pt-2">
          <div className="space-y-1.5 text-[11px]">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Main Email Config Page ----
export default function EmailConfigPage() {
  const { currentProject } = useProject();
  const { showToast } = useToast();

  const [config, setConfig] = useState(DEFAULT_EMAIL_CONFIG);
  const [supervisorCount, setSupervisorCount] = useState(0);
  const [newRecipient, setNewRecipient] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testEmailType, setTestEmailType] = useState('shiftStart');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ---- Load config when project changes ----
  useEffect(() => {
    if (currentProject) {
      setIsLoading(true);
      fetchEmailConfig(currentProject.id).then((c) => {
        setConfig(c);
        setHasChanges(false);
        const mgrs = getManagers(currentProject.id);
        setSupervisorCount(mgrs.filter((m) => m.isActive).length);
        setIsLoading(false);
      });
    }
  }, [currentProject]);

  // ---- Update helpers ----
  const updateConfig = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // ---- Save ----
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await syncEmailConfig(currentProject.id, config);
      setHasChanges(false);
      showToast('Email settings saved!', 'success');
    } catch (err) {
      showToast('Failed to save: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Add additional recipient ----
  const handleAddRecipient = () => {
    const email = newRecipient.trim();
    if (!email || !email.includes('@')) {
      showToast('Enter a valid email address', 'error');
      return;
    }
    if (config.additionalRecipients.includes(email)) {
      showToast('Email already in the list', 'error');
      return;
    }
    updateConfig('additionalRecipients', [...config.additionalRecipients, email]);
    setNewRecipient('');
  };

  // ---- Remove additional recipient ----
  const handleRemoveRecipient = (email) => {
    updateConfig(
      'additionalRecipients',
      config.additionalRecipients.filter((e) => e !== email)
    );
  };

  // ---- Send test email ----
  const handleSendTest = async () => {
    if (!testEmailAddress.trim()) {
      showToast('Enter a recipient email for the test', 'error');
      return;
    }
    setIsSendingTest(true);
    try {
      await sendTestEmail(currentProject.id, testEmailType, testEmailAddress.trim());
      showToast(`Test email sent to ${testEmailAddress}!`, 'success');
    } catch (err) {
      showToast('Failed: ' + err.message, 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  // ---- No Project State ----
  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mb-4">
          <Mail size={28} className="text-brand-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">No Project Selected</h2>
        <p className="text-sm text-slate-500">Select or create a project to configure email notifications.</p>
      </div>
    );
  }

  // ---- Loading State (skeleton) ----
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <SkeletonLine width="w-1/3" height="h-6" />
          <SkeletonLine width="w-2/3" height="h-4" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const backendReady = isBackendConfigured();

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ---- Page Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Email Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure shift email notifications for{' '}
            <span className="font-medium text-slate-700">{currentProject.name}</span>
            {supervisorCount > 0 && (
              <span className="text-slate-400"> ({supervisorCount} active supervisor{supervisorCount !== 1 ? 's' : ''})</span>
            )}
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                     bg-brand-600 text-white hover:bg-brand-700 transition-colors self-start
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Check size={16} />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* ---- Backend Warning ---- */}
      {!backendReady && (
        <div className="card p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Backend Not Connected</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Email notifications require the Google Apps Script backend. Settings are saved locally
                but emails won't be sent until the backend is configured.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---- Email Type Cards (Compact Grid) ---- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">

        {/* Shift Start Email */}
        <EmailTypeCard
          icon={Sun}
          title="Shift Start Email"
          description="Sent before each shift begins with team details"
          color="bg-amber-500"
          config={config.shiftStartEmail}
          onChange={(v) => updateConfig('shiftStartEmail', v)}
        >
          <div>
            <label className="field-label text-xs">Minutes before shift</label>
            <input
              type="number"
              min={0}
              max={120}
              value={config.shiftStartEmail.minutesBefore}
              onChange={(e) => updateConfig('shiftStartEmail', {
                ...config.shiftStartEmail,
                minutesBefore: parseInt(e.target.value) || 0,
              })}
              className="input-field w-24 text-sm"
            />
          </div>
          <ToggleSwitch
            enabled={config.shiftStartEmail.sendToResources}
            onChange={(v) => updateConfig('shiftStartEmail', { ...config.shiftStartEmail, sendToResources: v })}
            label="Send to shift resources"
            description="Team members assigned to the shift"
          />
          <ToggleSwitch
            enabled={config.shiftStartEmail.sendToSupervisors}
            onChange={(v) => updateConfig('shiftStartEmail', { ...config.shiftStartEmail, sendToSupervisors: v })}
            label="Send to supervisors"
            description="All active supervisors for this project"
          />
        </EmailTypeCard>

        {/* Shift End Email */}
        <EmailTypeCard
          icon={Moon}
          title="Shift End Email"
          description="Sent when each shift ends with summary"
          color="bg-indigo-500"
          config={config.shiftEndEmail}
          onChange={(v) => updateConfig('shiftEndEmail', v)}
        >
          <ToggleSwitch
            enabled={config.shiftEndEmail.sendToResources}
            onChange={(v) => updateConfig('shiftEndEmail', { ...config.shiftEndEmail, sendToResources: v })}
            label="Send to shift resources"
            description="Team members assigned to the shift"
          />
          <ToggleSwitch
            enabled={config.shiftEndEmail.sendToSupervisors}
            onChange={(v) => updateConfig('shiftEndEmail', { ...config.shiftEndEmail, sendToSupervisors: v })}
            label="Send to supervisors"
            description="All active supervisors for this project"
          />
        </EmailTypeCard>

        {/* Daily Consolidated Email */}
        <EmailTypeCard
          icon={Calendar}
          title="Daily Consolidated Email"
          description="End-of-day summary with all shift details and attendance"
          color="bg-teal-500"
          config={config.dailyConsolidatedEmail}
          onChange={(v) => updateConfig('dailyConsolidatedEmail', v)}
        >
          <div>
            <label className="field-label text-xs">Send time (24h format)</label>
            <input
              type="time"
              value={config.dailyConsolidatedEmail.sendTime}
              onChange={(e) => updateConfig('dailyConsolidatedEmail', {
                ...config.dailyConsolidatedEmail,
                sendTime: e.target.value,
              })}
              className="input-field w-32 text-sm"
            />
          </div>
          <ToggleSwitch
            enabled={config.dailyConsolidatedEmail.sendToSupervisors}
            onChange={(v) => updateConfig('dailyConsolidatedEmail', { ...config.dailyConsolidatedEmail, sendToSupervisors: v })}
            label="Send to supervisors"
            description="All active supervisors"
          />
          <ToggleSwitch
            enabled={config.dailyConsolidatedEmail.sendToResources}
            onChange={(v) => updateConfig('dailyConsolidatedEmail', { ...config.dailyConsolidatedEmail, sendToResources: v })}
            label="Send to all resources"
            description="Every active team member"
          />
        </EmailTypeCard>

        {/* Swap Notification Email */}
        <EmailTypeCard
          icon={ArrowLeftRight}
          title="Swap Notification Email"
          description="Sent when a shift swap is approved"
          color="bg-rose-500"
          config={config.swapNotificationEmail}
          onChange={(v) => updateConfig('swapNotificationEmail', v)}
        >
          <ToggleSwitch
            enabled={config.swapNotificationEmail.sendToResources}
            onChange={(v) => updateConfig('swapNotificationEmail', { ...config.swapNotificationEmail, sendToResources: v })}
            label="Send to swapped resources"
            description="Both members involved in the swap"
          />
          <ToggleSwitch
            enabled={config.swapNotificationEmail.sendToSupervisors}
            onChange={(v) => updateConfig('swapNotificationEmail', { ...config.swapNotificationEmail, sendToSupervisors: v })}
            label="Send to supervisors"
            description="All active supervisors"
          />
        </EmailTypeCard>
      </div>

      {/* ---- Additional Recipients ---- */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">Additional Recipients</h3>
        </div>
        <p className="text-xs text-slate-400">
          Extra email addresses that receive ALL enabled notifications (in addition to resources and supervisors).
        </p>

        {/* Existing recipients */}
        {config.additionalRecipients.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {config.additionalRecipients.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium"
              >
                <Mail size={11} />
                {email}
                <button
                  onClick={() => handleRemoveRecipient(email)}
                  className="text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add new recipient */}
        <div className="flex gap-2">
          <input
            type="email"
            value={newRecipient}
            onChange={(e) => setNewRecipient(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddRecipient()}
            placeholder="manager@company.com"
            className="input-field flex-1 text-sm"
          />
          <button
            onClick={handleAddRecipient}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium
                       bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      {/* ---- Sender Name ---- */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">Sender Settings</h3>
        </div>
        <div>
          <label className="field-label text-xs">Sender Name (appears in "From" field)</label>
          <input
            type="text"
            value={config.senderName}
            onChange={(e) => updateConfig('senderName', e.target.value)}
            placeholder="Shift Roster"
            className="input-field w-64 text-sm"
          />
        </div>
      </div>

      {/* ---- Test Email ---- */}
      {backendReady && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Send size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">Send Test Email</h3>
          </div>
          <p className="text-xs text-slate-400">
            Send a sample notification email to verify everything is working.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={testEmailType}
              onChange={(e) => setTestEmailType(e.target.value)}
              className="input-field text-sm w-48"
            >
              <option value="shiftStart">Shift Start</option>
              <option value="shiftEnd">Shift End</option>
              <option value="dailyConsolidated">Daily Consolidated</option>
              <option value="swapNotification">Swap Notification</option>
            </select>
            <input
              type="email"
              value={testEmailAddress}
              onChange={(e) => setTestEmailAddress(e.target.value)}
              placeholder="your-email@example.com"
              className="input-field flex-1 text-sm"
            />
            <button
              onClick={handleSendTest}
              disabled={isSendingTest || !testEmailAddress.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                         bg-brand-600 text-white hover:bg-brand-700 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={14} />
              {isSendingTest ? 'Sending...' : 'Send Test'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
