/**
 * ============================================================================
 * App.jsx — Root Application Component
 * 
 * Sets up:
 * - React Router for page navigation
 * - Context providers for global state (Auth, Project, Toast)
 * - Main layout wrapper with sidebar and header
 * 
 * Access model:
 *   - Dashboard + Roster: publicly visible (read-only, no login)
 *   - Team Members, Shifts, Swaps: require login (project_admin+)
 *   - Email Config: require project_admin+
 *   - Projects: require site_admin
 * ============================================================================
 */

import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@context/AuthContext';
import { ProjectProvider } from '@context/ProjectContext';
import { ToastProvider } from '@context/ToastContext';
import { SyncProvider } from '@context/SyncContext';
import MainLayout from '@components/layout/MainLayout';
import LoginPage from '@pages/LoginPage';
import DashboardPage from '@pages/DashboardPage';
import RosterPage from '@pages/RosterPage';
import MembersPage from '@pages/MembersPage';
import ShiftsPage from '@pages/ShiftsPage';
import SwapRequestsPage from '@pages/SwapRequestsPage';
import ProjectsPage from '@pages/ProjectsPage';
import EmailConfigPage from '@pages/EmailConfigPage';
import { useAuth } from '@hooks/useAuth';

// ---- Loading Spinner ----
// Shown while auth state is being restored from localStorage/backend
function AuthLoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading...</p>
      </div>
    </div>
  );
}

// ---- Admin Route Wrapper ----
// Only allows access if the user is logged in
function AdminRoute({ children }) {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) return <AuthLoadingScreen />;

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// ---- Login Route Wrapper ----
// Redirects to dashboard if already logged in
function LoginRoute({ children }) {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) return <AuthLoadingScreen />;

  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// ---- Route Configuration ----
// All app routes defined in one place for easy maintenance
function AppRoutes() {
  return (
    <Routes>
      {/* Login page */}
      <Route
        path="/login"
        element={
          <LoginRoute>
            <LoginPage />
          </LoginRoute>
        }
      />

      {/* MainLayout wraps all pages (public + admin) */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Public read-only pages (no login required) */}
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="roster" element={<RosterPage />} />

        {/* Admin pages (login required) */}
        <Route path="members" element={<AdminRoute><MembersPage /></AdminRoute>} />
        <Route path="shifts" element={<AdminRoute><ShiftsPage /></AdminRoute>} />
        <Route path="swaps" element={<AdminRoute><SwapRequestsPage /></AdminRoute>} />
        <Route path="projects" element={<AdminRoute><ProjectsPage /></AdminRoute>} />
        <Route path="email-config" element={<AdminRoute><EmailConfigPage /></AdminRoute>} />
      </Route>

      {/* Catch-all: redirect unknown routes to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

// ---- Main App Component ----
export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <ProjectProvider>
            <SyncProvider>
              <AppRoutes />
            </SyncProvider>
          </ProjectProvider>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  );
}
