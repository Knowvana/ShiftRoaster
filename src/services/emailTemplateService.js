/**
 * ============================================================================
 * emailTemplateService.js — Global Email Templates with Dynamic Variables
 * 
 * Manages HTML email templates with support for dynamic variables.
 * Templates are global and can be customized with variables like:
 * - {{shiftName}}, {{shiftTime}}, {{date}}, {{teamMembers}}, {{projectName}}
 * ============================================================================
 */

import { apiGet, apiPost, isBackendConfigured } from './apiClient';

const STORAGE_KEY = 'email_templates';

/**
 * Default email templates with HTML and dynamic variables
 */
export const DEFAULT_TEMPLATES = {
  shiftStart: {
    name: 'Shift Start Notification',
    subject: 'Shift Starting: {{shiftName}} - {{date}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 24px;">{{shiftName}} Shift Starting</h2>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">{{projectName}}</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 16px 0; color: #334155;">Hello,</p>
          <p style="margin: 0 0 16px 0; color: #475569; line-height: 1.6;">
            Your <strong>{{shiftName}}</strong> shift is starting on <strong>{{date}}</strong>.
          </p>
          <div style="background: white; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #14b8a6;">
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Shift Details</p>
            <p style="margin: 0 0 4px 0; color: #1e293b; font-weight: bold;">{{shiftName}}</p>
            <p style="margin: 0 0 4px 0; color: #475569; font-size: 14px;">{{shiftTime}}</p>
            <p style="margin: 0; color: #64748b; font-size: 14px;">{{date}}</p>
          </div>
          <div style="background: white; padding: 16px; border-radius: 6px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Team Members</p>
            <p style="margin: 0; color: #475569; line-height: 1.8;">{{teamMembers}}</p>
          </div>
          <p style="margin: 16px 0 0 0; color: #64748b; font-size: 12px;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 12px 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #64748b;">
          Shift Roster • {{projectName}}
        </div>
      </div>
    `,
  },
  shiftEnd: {
    name: 'Shift End Notification',
    subject: 'Shift Ending: {{shiftName}} - {{date}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 24px;">{{shiftName}} Shift Ending</h2>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">{{projectName}}</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 16px 0; color: #334155;">Hello,</p>
          <p style="margin: 0 0 16px 0; color: #475569; line-height: 1.6;">
            Your <strong>{{shiftName}}</strong> shift is ending on <strong>{{date}}</strong>.
          </p>
          <div style="background: white; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #8b5cf6;">
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Shift Details</p>
            <p style="margin: 0 0 4px 0; color: #1e293b; font-weight: bold;">{{shiftName}}</p>
            <p style="margin: 0 0 4px 0; color: #475569; font-size: 14px;">{{shiftTime}}</p>
            <p style="margin: 0; color: #64748b; font-size: 14px;">{{date}}</p>
          </div>
          <p style="margin: 16px 0 0 0; color: #64748b; font-size: 12px;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 12px 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #64748b;">
          Shift Roster • {{projectName}}
        </div>
      </div>
    `,
  },
  dailySummary: {
    name: 'Daily Consolidated Summary',
    subject: 'Daily Shift Summary - {{date}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 24px;">Daily Shift Summary</h2>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">{{date}}</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 16px 0; color: #334155;">Hello,</p>
          <p style="margin: 0 0 16px 0; color: #475569; line-height: 1.6;">
            Here's a summary of today's shifts for <strong>{{projectName}}</strong>.
          </p>
          <div style="background: white; padding: 16px; border-radius: 6px; margin: 16px 0;">
            <p style="margin: 0 0 12px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Today's Shifts</p>
            {{shiftsummary}}
          </div>
          <p style="margin: 16px 0 0 0; color: #64748b; font-size: 12px;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 12px 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #64748b;">
          Shift Roster • {{projectName}}
        </div>
      </div>
    `,
  },
  swapNotification: {
    name: 'Swap Request Notification',
    subject: 'Shift Swap Request - {{date}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 24px;">Shift Swap Request</h2>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">{{projectName}}</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 16px 0; color: #334155;">Hello,</p>
          <p style="margin: 0 0 16px 0; color: #475569; line-height: 1.6;">
            A shift swap has been requested for <strong>{{date}}</strong>.
          </p>
          <div style="background: white; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Swap Details</p>
            <p style="margin: 0 0 4px 0; color: #1e293b; font-weight: bold;">{{shiftName}}</p>
            <p style="margin: 0; color: #475569; font-size: 14px;">{{date}}</p>
          </div>
          <p style="margin: 16px 0 0 0; color: #64748b; font-size: 12px;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 12px 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #64748b;">
          Shift Roster • {{projectName}}
        </div>
      </div>
    `,
  },
};

/**
 * Get all email templates from localStorage
 */
export function getEmailTemplates() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : DEFAULT_TEMPLATES;
}

/**
 * Save email templates to localStorage
 */
export function saveEmailTemplates(templates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

/**
 * Get a specific email template by type
 */
export function getEmailTemplate(templateType) {
  const templates = getEmailTemplates();
  return templates[templateType] || null;
}

/**
 * Update a specific email template
 */
export function updateEmailTemplate(templateType, template) {
  const templates = getEmailTemplates();
  templates[templateType] = template;
  saveEmailTemplates(templates);
}

/**
 * Replace dynamic variables in template with actual values
 * Variables: {{shiftName}}, {{shiftTime}}, {{date}}, {{teamMembers}}, {{projectName}}, etc.
 */
export function renderTemplate(template, variables) {
  let rendered = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(placeholder, 'g'), value || '');
  }
  
  return rendered;
}

/**
 * Fetch templates from backend
 */
export async function fetchEmailTemplates() {
  if (!isBackendConfigured()) {
    return getEmailTemplates();
  }

  try {
    const res = await apiGet('getEmailTemplates');
    const templates = res.data || DEFAULT_TEMPLATES;
    if (Object.keys(templates).length > 0) {
      saveEmailTemplates(templates);
      return templates;
    }
    return getEmailTemplates();
  } catch {
    return getEmailTemplates();
  }
}

/**
 * Sync templates to backend
 */
export async function syncEmailTemplates(templates) {
  saveEmailTemplates(templates);
  
  if (!isBackendConfigured()) return;

  try {
    await apiPost('syncEmailTemplates', { templates });
  } catch (err) {
    console.error('Failed to sync email templates:', err);
  }
}
