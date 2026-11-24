import { useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  MailCheck,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  mapFirebaseAuthError,
  validateRegisterForm,
  validateSignInForm,
  type RegisterFormErrors,
  type SignInFormErrors,
} from '../utils/authValidation';
import type { ThemeMode } from '../utils/theme';

export type AuthModeTab = 'signin' | 'register';

interface AuthLandingPageProps {
  isFirebaseConfigured: boolean;
  authLoading: boolean;
  externalAuthError: string | null;
  pendingVerificationUser: User | null;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onSignInWithEmail: (email: string, password: string) => Promise<void>;
  onRegisterWithEmail: (
    fullName: string,
    email: string,
    password: string,
  ) => Promise<{ verificationSent: boolean }>;
  onSignInWithGoogle: () => Promise<void>;
  onResendVerification: () => Promise<void>;
  onRefreshVerification: () => Promise<boolean>;
  onSignOut: () => Promise<void>;
  onContinueInDemoMode: () => void;
}

export function AuthLandingPage({
  isFirebaseConfigured,
  authLoading,
  externalAuthError,
  pendingVerificationUser,
  theme,
  onToggleTheme,
  onSignInWithEmail,
  onRegisterWithEmail,
  onSignInWithGoogle,
  onResendVerification,
  onRefreshVerification,
  onSignOut,
  onContinueInDemoMode,
}: AuthLandingPageProps) {
  const [mode, setMode] = useState<AuthModeTab>('signin');
  const [submitting, setSubmitting] = useState(false);
  const [showSignInPass, setShowSignInPass] = useState(false);
  const [showRegisterPass, setShowRegisterPass] = useState(false);

  // Sign In form fields
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInErrors, setSignInErrors] = useState<SignInFormErrors>({});

  // Register form fields
  const [fullName, setFullName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerErrors, setRegisterErrors] = useState<RegisterFormErrors>({});

  // Feedback / error banner state
  const [formError, setFormError] = useState<string | null>(null);
  const [providerDisabledHint, setProviderDisabledHint] = useState(false);
  const [verificationNote, setVerificationNote] = useState<string | null>(null);

  const isDark = theme === 'dark';
  const themeToggleLabel = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  const isBusy = submitting || authLoading;
  const activeError = formError || externalAuthError;

  const switchMode = (nextMode: AuthModeTab) => {
    setMode(nextMode);
    setFormError(null);
    setProviderDisabledHint(false);
    setSignInErrors({});
    setRegisterErrors({});
  };

  const handleSignInSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setProviderDisabledHint(false);

    const validation = validateSignInForm(signInEmail, signInPassword);
    setSignInErrors(validation.errors);
    if (!validation.valid) return;

    if (!isFirebaseConfigured) {
      setFormError(
        'Firebase configuration is unavailable in this preview. Use "Explore in Demo Mode" below to test the portal.',
      );
      return;
    }

    setSubmitting(true);
    try {
      await onSignInWithEmail(signInEmail, signInPassword);
    } catch (err) {
      const mapped = mapFirebaseAuthError(err);
      setFormError(mapped.message);
      setProviderDisabledHint(mapped.isProviderDisabled);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setProviderDisabledHint(false);
    setVerificationNote(null);

    const validation = validateRegisterForm({
      fullName,
      email: registerEmail,
      password: registerPassword,
      confirmPassword,
    });
    setRegisterErrors(validation.errors);
    if (!validation.valid) return;

    if (!isFirebaseConfigured) {
      setFormError(
        'Firebase configuration is unavailable in this preview. Use "Explore in Demo Mode" below to test registrations.',
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await onRegisterWithEmail(fullName, registerEmail, registerPassword);
      setVerificationNote(
        res.verificationSent
          ? `Account created! A verification link has been sent to ${registerEmail.trim()}.`
          : 'Account created! Please verify your email address before accessing live registrations.',
      );
    } catch (err) {
      const mapped = mapFirebaseAuthError(err);
      setFormError(mapped.message);
      setProviderDisabledHint(mapped.isProviderDisabled);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendClick = async () => {
    setFormError(null);
    setVerificationNote(null);
    setSubmitting(true);
    try {
      await onResendVerification();
      setVerificationNote(
        `Verification link re-sent to ${pendingVerificationUser?.email ?? 'your email'}. Check your inbox and spam folder.`,
      );
    } catch (err) {
      const mapped = mapFirebaseAuthError(err);
      setFormError(mapped.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefreshClick = async () => {
    setFormError(null);
    setVerificationNote(null);
    setSubmitting(true);
    try {
      const verified = await onRefreshVerification();
      if (!verified) {
        setFormError(
          'Your email is still marked unverified. Open the link in your inbox, then click Refresh Status again.',
        );
      }
    } catch (err) {
      const mapped = mapFirebaseAuthError(err);
      setFormError(mapped.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* Minimal Top Bar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
            CampusConnect
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={themeToggleLabel}
              aria-pressed={isDark}
              title={themeToggleLabel}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={onContinueInDemoMode}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-950 rounded-lg transition-colors whitespace-nowrap"
            >
              <span>Explore Demo</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Institutional Summary */}
          <section className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                Engineering Student Activity &amp; Event Portal
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
                Sign in to discover, register, and manage campus events.
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                Access technical hackathons, hands-on engineering workshops, alumni seminars, and
                campus club activities from one verified student and organizer portal.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3.5 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <CalendarCheck className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Live Seat Counts &amp; Instant Registration Passes
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Prevent duplicate student IDs or emails and receive a unique{' '}
                    <span className="font-mono">CC-2026-XXXXXX</span> confirmation number.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <Users className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Dedicated Student &amp; Organizer Workspaces
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Students track passes in My Registrations; organizers publish events, adjust
                    deadlines, and inspect participant rosters.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <ShieldCheck className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Firebase Authentication &amp; Sample Demo Mode
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Sign in with a college account for cloud Firestore persistence, or launch Demo
                    Mode with 12 preloaded engineering events.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Right Auth Card */}
          <section className="lg:col-span-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              {pendingVerificationUser ? (
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <MailCheck className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        Verify Your College Email
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        Signed in as{' '}
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {pendingVerificationUser.email}
                        </span>
                        . Firestore security rules require email verification before accessing live
                        registrations.
                      </p>
                    </div>
                  </div>

                  {verificationNote && (
                    <div className="flex items-start gap-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/70 text-emerald-800 dark:text-emerald-300 rounded-xl p-3.5 text-xs">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{verificationNote}</span>
                    </div>
                  )}

                  {activeError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/70 text-red-800 dark:text-red-300 rounded-xl p-3.5 text-xs"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{activeError}</span>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={handleRefreshClick}
                      disabled={isBusy}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" aria-hidden="true" />
                      <span>I&apos;ve Verified — Refresh Status</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResendClick}
                      disabled={isBusy}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors"
                    >
                      <span>Resend Verification Email</span>
                    </button>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={onContinueInDemoMode}
                      className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                    >
                      Explore in Demo Mode Instead
                    </button>
                    <button
                      type="button"
                      onClick={() => void onSignOut()}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    >
                      <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Mode Switch Tabs */}
                  <div
                    role="tablist"
                    aria-label="Account authentication mode"
                    className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'signin'}
                      onClick={() => switchMode('signin')}
                      className={`py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
                        mode === 'signin'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'register'}
                      onClick={() => switchMode('register')}
                      className={`py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
                        mode === 'register'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Register (New User)
                    </button>
                  </div>

                  {activeError && (
                    <div
                      role="alert"
                      className="space-y-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/70 text-red-800 dark:text-red-300 rounded-xl p-3.5 text-xs"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{activeError}</span>
                      </div>
                      {providerDisabledHint && (
                        <div className="pl-6 text-[11px] text-red-700 dark:text-red-300/90 space-y-1">
                          <p className="font-semibold">How to enable Email/Password in Firebase:</p>
                          <ol className="list-decimal list-inside space-y-0.5">
                            <li>Open Firebase Console → Authentication → Sign-in method.</li>
                            <li>Click Add new provider → Email/Password and enable it.</li>
                            <li>Or sign in immediately with Google or Demo Mode below.</li>
                          </ol>
                        </div>
                      )}
                    </div>
                  )}

                  {mode === 'signin' ? (
                    <form onSubmit={handleSignInSubmit} noValidate className="space-y-4">
                      <div>
                        <label
                          htmlFor="auth-signin-email"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                        >
                          College Email
                        </label>
                        <input
                          id="auth-signin-email"
                          type="email"
                          autoComplete="email"
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          placeholder="student@college.edu"
                          aria-invalid={Boolean(signInErrors.email)}
                          className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-700 dark:focus:outline-blue-400"
                        />
                        {signInErrors.email && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {signInErrors.email}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="auth-signin-password"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                        >
                          Password
                        </label>
                        <div className="relative">
                          <input
                            id="auth-signin-password"
                            type={showSignInPass ? 'text' : 'password'}
                            autoComplete="current-password"
                            value={signInPassword}
                            onChange={(e) => setSignInPassword(e.target.value)}
                            placeholder="Enter your password"
                            aria-invalid={Boolean(signInErrors.password)}
                            className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-700 dark:focus:outline-blue-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignInPass((prev) => !prev)}
                            aria-label={showSignInPass ? 'Hide password' : 'Show password'}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                          >
                            {showSignInPass ? (
                              <EyeOff className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <Eye className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                        {signInErrors.password && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {signInErrors.password}
                          </p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isBusy}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors"
                      >
                        <Lock className="w-4 h-4" aria-hidden="true" />
                        <span>{isBusy ? 'Signing In...' : 'Sign In to CampusConnect'}</span>
                      </button>

                      <p className="text-xs text-center text-slate-600 dark:text-slate-400">
                        New student or organizer?{' '}
                        <button
                          type="button"
                          onClick={() => switchMode('register')}
                          className="font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                        >
                          Register a new account
                        </button>
                      </p>
                    </form>
                  ) : (
                    <form onSubmit={handleRegisterSubmit} noValidate className="space-y-3.5">
                      <div>
                        <label
                          htmlFor="auth-register-name"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                        >
                          Full Name
                        </label>
                        <input
                          id="auth-register-name"
                          type="text"
                          autoComplete="name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Aarav Sharma"
                          aria-invalid={Boolean(registerErrors.fullName)}
                          className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-700 dark:focus:outline-blue-400"
                        />
                        {registerErrors.fullName && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {registerErrors.fullName}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="auth-register-email"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                        >
                          College Email
                        </label>
                        <input
                          id="auth-register-email"
                          type="email"
                          autoComplete="email"
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          placeholder="student@college.edu"
                          aria-invalid={Boolean(registerErrors.email)}
                          className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-700 dark:focus:outline-blue-400"
                        />
                        {registerErrors.email && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {registerErrors.email}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="auth-register-password"
                            className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                          >
                            Password
                          </label>
                          <div className="relative">
                            <input
                              id="auth-register-password"
                              type={showRegisterPass ? 'text' : 'password'}
                              autoComplete="new-password"
                              value={registerPassword}
                              onChange={(e) => setRegisterPassword(e.target.value)}
                              placeholder="Min. 6 characters"
                              aria-invalid={Boolean(registerErrors.password)}
                              className="w-full px-3.5 py-2.5 pr-9 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-700 dark:focus:outline-blue-400"
                            />
                            <button
                              type="button"
                              onClick={() => setShowRegisterPass((prev) => !prev)}
                              aria-label={showRegisterPass ? 'Hide password' : 'Show password'}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                            >
                              {showRegisterPass ? (
                                <EyeOff className="w-4 h-4" aria-hidden="true" />
                              ) : (
                                <Eye className="w-4 h-4" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                          {registerErrors.password && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              {registerErrors.password}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="auth-register-confirm"
                            className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                          >
                            Confirm Password
                          </label>
                          <input
                            id="auth-register-confirm"
                            type={showRegisterPass ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                            aria-invalid={Boolean(registerErrors.confirmPassword)}
                            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-700 dark:focus:outline-blue-400"
                          />
                          {registerErrors.confirmPassword && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              {registerErrors.confirmPassword}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isBusy}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors"
                      >
                        <UserPlus className="w-4 h-4" aria-hidden="true" />
                        <span>{isBusy ? 'Creating Account...' : 'Create New Account'}</span>
                      </button>

                      <p className="text-xs text-center text-slate-600 dark:text-slate-400">
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => switchMode('signin')}
                          className="font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                        >
                          Sign In here
                        </button>
                      </p>
                    </form>
                  )}

                  {/* Divider */}
                  <div className="relative flex items-center py-1">
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                    <span className="px-3 text-xs text-slate-500 dark:text-slate-400">
                      Or continue with
                    </span>
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                  </div>

                  {/* Google + Demo Actions */}
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => void onSignInWithGoogle()}
                      disabled={isBusy || !isFirebaseConfigured}
                      className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 disabled:opacity-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                        />
                      </svg>
                      <span>{authLoading ? 'Connecting...' : 'Continue with Google'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={onContinueInDemoMode}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <span>Continue in Demo Mode (12 Sample Events)</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
                    Demo Mode runs locally in your browser. Live Firestore persistence requires a
                    verified Firebase account.
                  </p>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
