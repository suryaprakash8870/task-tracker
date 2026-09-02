import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { MemberRole } from '../../types';
import {
  X,
  Shield,
  UserPlus,
  LogIn,
  LogOut,
  Mail,
  Lock,
  User as UserIcon,
  Briefcase,
  Layers,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Key
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateCurrentUserProfile,
    isConfigured
  } = useApp();

  const [tab, setTab] = useState<'login' | 'signup' | 'profile'>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<MemberRole>('developer');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [avatar, setAvatar] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);

  if (!isOpen) return null;

  const resetFormState = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await signInWithEmail(email, password);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sign in. Please verify your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please provide your name, email, and a password (min 6 characters).');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await signUpWithEmail(email, password, {
        name,
        role,
        title: title || 'Team Contributor',
        department: department || 'Engineering',
        avatar: avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`
      });
      setSuccessMessage('Account created successfully! You are now signed in.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please check the provided details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google OAuth sign-in failed.';
      setError(msg);
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your account email to receive a password reset link.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await resetPassword(email);
      setSuccessMessage('Password reset instructions sent! Check your email inbox.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset link.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await updateCurrentUserProfile({
        name: name || currentUser.name,
        title: title || currentUser.title,
        department: department || currentUser.department
      });
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      setTab('login');
      resetFormState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sign out.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    >
      <div
        id="auth-modal-card"
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs tracking-tight shadow-xs">
              TT
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Supabase Authentication
              </h3>
              <p className="text-[11px] text-slate-500">Secure workspace access & identity</p>
            </div>
          </div>
          <button
            id="auth-close-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 p-1.5 gap-1">
          <button
            id="auth-tab-login"
            onClick={() => {
              setTab('login');
              setIsResetMode(false);
              resetFormState();
            }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </button>
          <button
            id="auth-tab-signup"
            onClick={() => {
              setTab('signup');
              setIsResetMode(false);
              resetFormState();
            }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === 'signup'
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Create Account
          </button>
          {currentUser && (
            <button
              id="auth-tab-profile"
              onClick={() => {
                setTab('profile');
                setIsResetMode(false);
                setName(currentUser.name);
                setTitle(currentUser.title);
                setDepartment(currentUser.department);
                resetFormState();
              }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === 'profile'
                  ? 'bg-white text-blue-600 shadow-xs border border-slate-200 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              My Profile
            </button>
          )}
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mx-5 mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col gap-2.5 animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed font-medium">{error}</div>
            </div>

            {error.includes('Google') && error.includes('Providers') && (
              <div className="mt-1 p-2.5 bg-white/80 rounded-lg border border-amber-200/70 text-[11px] text-amber-950 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5 text-amber-900">
                  <Key className="w-3.5 h-3.5 text-amber-700" />
                  How to enable Google OAuth in Supabase:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-700">
                  <li>Open your <strong>Supabase Dashboard</strong></li>
                  <li>Navigate to <strong>Authentication → Providers → Google</strong></li>
                  <li>Toggle <strong>Enable Google provider</strong> to ON and save</li>
                </ol>
                <p className="text-slate-500 pt-1">
                  💡 In the meantime, you can register and sign in below using <strong>Email & Password</strong>.
                </p>
              </div>
            )}

            {error.includes('Email') && error.includes('Providers') && (
              <div className="mt-1 p-2.5 bg-white/80 rounded-lg border border-amber-200/70 text-[11px] text-amber-950 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5 text-amber-900">
                  <Key className="w-3.5 h-3.5 text-amber-700" />
                  How to enable Email Signup in Supabase:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-700">
                  <li>Open your <strong>Supabase Dashboard</strong></li>
                  <li>Navigate to <strong>Authentication → Providers → Email</strong></li>
                  <li>Ensure <strong>Enable Email provider</strong> and <strong>Allow new users to sign up</strong> are enabled</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {successMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* Tab 1: SIGN IN */}
        {tab === 'login' && !isResetMode && (
          <div className="p-5 space-y-4">
            {/* Google OAuth Button */}
            <button
              id="auth-google-signin-btn"
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-xl shadow-xs flex items-center justify-center gap-2.5 transition-colors disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-2 text-[11px] font-medium text-slate-400 uppercase tracking-wider absolute">
                Or with email
              </span>
            </div>

            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(true);
                      resetFormState();
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password-input"
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                Sign In to Workspace
              </button>
            </form>
          </div>
        )}

        {/* Tab 1b: FORGOT PASSWORD */}
        {tab === 'login' && isResetMode && (
          <form onSubmit={handlePasswordReset} className="p-5 space-y-4">
            <div className="text-xs text-slate-600 leading-relaxed">
              Enter your email address and Supabase Auth will send a secure password reset link.
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Account Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="reset-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsResetMode(false);
                  resetFormState();
                }}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition-colors"
              >
                Back to Sign In
              </button>
              <button
                id="reset-submit-btn"
                type="submit"
                disabled={loading}
                className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: CREATE ACCOUNT */}
        {tab === 'signup' && (
          <form onSubmit={handleSignUp} className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
            {/* Google Signup Button */}
            <button
              id="signup-google-btn"
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-2 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Sign up with Google</span>
            </button>

            <div className="relative flex items-center justify-center my-1">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-2 text-[11px] font-medium text-slate-400 uppercase tracking-wider absolute">
                Or with email
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="signup-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Work Email *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="signup-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="alex@company.com"
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Password * (min 6 chars)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="signup-password-input"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Team Role
                </label>
                <select
                  id="signup-role-select"
                  value={role}
                  onChange={e => setRole(e.target.value as MemberRole)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="lead">Lead / Architect</option>
                  <option value="manager">Project Manager</option>
                  <option value="developer">Developer / Engineer</option>
                  <option value="designer">Designer</option>
                  <option value="qa">QA Engineer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Senior Frontend"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="e.g. Product Engineering"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <button
              id="signup-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Create Supabase Account
            </button>
          </form>
        )}

        {/* Tab 3: MY PROFILE */}
        {tab === 'profile' && currentUser && (
          <form onSubmit={handleUpdateProfile} className="p-5 space-y-4">
            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <Avatar
                name={currentUser.name}
                avatarUrl={currentUser.avatar}
                size="lg"
                status="online"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-slate-900 text-sm truncate">
                  {currentUser.name}
                </h4>
                <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 capitalize">
                    {currentUser.role}
                  </span>
                  <span className="text-[10px] text-slate-400">•</span>
                  <span className="text-[10px] text-slate-600 truncate">{currentUser.title}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Display Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="profile-name-input"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Job Title
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="profile-title-input"
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Department
                </label>
                <div className="relative">
                  <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="profile-dept-input"
                    type="text"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                id="profile-signout-btn"
                type="button"
                onClick={handleSignOut}
                disabled={loading}
                className="py-2 px-3 text-red-600 hover:bg-red-50 font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>

              <button
                id="profile-save-btn"
                type="submit"
                disabled={loading}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
