/**
 * ============================================================================
 * LoginPage.jsx — Admin Login Page
 * 
 * A clean, centered login form for admin users.
 * Uses static credentials checked against SHA-256 hashes.
 * Redirects to the dashboard on successful login.
 * 
 * Default credentials (change after first login):
 *   Username: admin
 *   Password: admin123
 * ============================================================================
 */

import React, { useState } from 'react';
import { Shield, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@hooks/useAuth';
import { useToast } from '@hooks/useToast';
import appConfig from '@config/app.json';

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();

  // ---- Form State ----
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handle form submission.
   * Validates inputs, attempts login, shows toast on result.
   */
  const handleSubmit = (event) => {
    event.preventDefault();

    // Basic validation
    if (!username.trim() || !password.trim()) {
      showToast('Please enter both username and password', 'error');
      return;
    }

    setIsSubmitting(true);

    // Small delay to simulate authentication (feels more natural)
    setTimeout(() => {
      const result = login(username.trim(), password);

      if (result.success) {
        showToast('Welcome back!', 'success');
      } else {
        showToast(result.message, 'error');
      }

      setIsSubmitting(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50/30 to-slate-100 flex items-center justify-center px-4">

      {/* Login Card */}
      <div className="w-full max-w-md animate-slide-up">
        <div className="bg-white rounded-2xl shadow-card-lg border border-slate-200 overflow-hidden">

          {/* ---- Header Section ---- */}
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-8 py-8 text-center">
            {/* App Icon */}
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Shield size={32} className="text-white" />
            </div>
            {/* App Name */}
            <h1 className="text-2xl font-bold text-white">{appConfig.appName}</h1>
            <p className="text-teal-200 text-sm mt-1">Admin Sign In</p>
          </div>

          {/* ---- Login Form ---- */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">

            {/* Username field */}
            <div>
              <label htmlFor="username" className="field-label">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="input-field"
                autoComplete="username"
                autoFocus
              />
            </div>

            {/* Password field with show/hide toggle */}
            <div>
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pr-10"
                  autoComplete="current-password"
                />
                {/* Toggle password visibility */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                         bg-brand-600 text-white font-medium text-sm
                         hover:bg-brand-700 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* ---- Footer Hint ---- */}
          <div className="px-8 pb-6">
            <p className="text-xs text-slate-400 text-center">
              Default credentials: admin / admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
