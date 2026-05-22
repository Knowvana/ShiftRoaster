/**
 * ============================================================================
 * App.jsx — Root Application Component
 * 
 * Sets up:
 * - React Router for page navigation
 * - Context providers for global state (Auth, Project, Toast)
 * - Main layout wrapper with sidebar and header
 * ============================================================================
 */

import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@context/AuthContext';
import { ProjectProvider } from '@context/ProjectContext';
import { ToastProvider } from '@context/ToastContext';
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

// ---- Protected Route Wrapper ----
// Only allows access if the user is logged in as admin
function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// ---- Public Route Wrapper ----
// Redirects to dashboard if already logged in
function PublicRoute({ children }) {
  const { isLoggedIn } = useAuth();

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
      {/* Public: Login page */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected: All admin pages wrapped in MainLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="roster" element={<RosterPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="shifts" element={<ShiftsPage />} />
        <Route path="swaps" element={<SwapRequestsPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="email-config" element={<EmailConfigPage />} />
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
            <AppRoutes />
          </ProjectProvider>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  );
}
