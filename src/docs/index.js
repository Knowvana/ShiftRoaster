/**
 * ============================================================================
 * Documentation Index
 * 
 * Exports all documentation sections in display order.
 * Each doc has: id, title, icon (Lucide icon name), sections[]
 * Each section has: heading, content (supports markdown-like formatting)
 * ============================================================================
 */

import gettingStarted from './getting-started';
import dashboard from './dashboard';
import managingProjects from './managing-projects';
import teamMembers from './team-members';
import shifts from './shifts';
import roster from './roster';
import swapRequests from './swap-requests';
import emailConfig from './email-config';
import googleSheets from './google-sheets';
import faq from './faq';

const allDocs = [
  gettingStarted,
  dashboard,
  managingProjects,
  teamMembers,
  shifts,
  roster,
  swapRequests,
  emailConfig,
  googleSheets,
  faq,
];

export default allDocs;
