import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Eye, EyeOff, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GoogleMark: React.FC = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
    <path fill="#FBBC05" d="M5.84 14.09A6.98 6.98 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.06H2.18A10.96 10.96 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l2.85-2.22.81-.63Z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z" />
  </svg>
);

const LoadingIndicator: React.FC = () => (
  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path className="opacity-80" d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const AuthModal: React.FC = () => {
  const {
    isAuthOpen,
    setIsAuthOpen,
    authMode,
    setAuthMode,
    loginWithGoogle,
    loginWithFacebook,
    loginWithEmail,
    signupWithEmail,
    isAuthLoading,
    authError,
    setAuthError,
  } = useStore();

  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const isSignUp = authMode === 'signup';

  useEffect(() => {
    if (isAuthOpen) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setShouldRender(true);
      const enterTimer = window.setTimeout(() => setIsAnimating(true), 20);
      const focusTimer = window.setTimeout(() => drawerRef.current?.focus(), 30);
      return () => {
        window.clearTimeout(enterTimer);
        window.clearTimeout(focusTimer);
      };
    }

    setIsAnimating(false);
    const exitTimer = window.setTimeout(() => setShouldRender(false), 420);
    const modeTimer = window.setTimeout(() => setAuthMode('signin'), 420);
    previousFocusRef.current?.focus();
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(modeTimer);
    };
  }, [isAuthOpen, setAuthMode]);

  useEffect(() => {
    if (!isAuthOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAuthOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAuthOpen, setIsAuthOpen]);

  useEffect(() => {
    setFormError(null);
    setAuthError(null);
  }, [authMode, isAuthOpen, setAuthError]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
    setFormError(null);
  };

  const switchMode = () => {
    setAuthMode(isSignUp ? 'signin' : 'signup');
  };

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isAuthLoading) return;

    const name = form.name.trim();
    const email = form.email.trim();
    if (isSignUp && !name) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (form.password.length < 6) {
      setFormError('Please enter a password with at least six characters.');
      return;
    }
    if (isSignUp && form.password !== form.confirmPassword) {
      setFormError('Your passwords do not match.');
      return;
    }

    setFormError(null);
    if (isSignUp) {
      await signupWithEmail(name, email, form.password);
    } else {
      await loginWithEmail(email, form.password);
    }
  };

  const handleProviderSignIn = async (provider: 'google' | 'facebook') => {
    if (isAuthLoading) return;
    setFormError(null);
    if (provider === 'google') {
      await loginWithGoogle();
    } else {
      await loginWithFacebook();
    }
  };

  if (!shouldRender) return null;

  const visibleError = formError || authError;
  const inputClassName = 'h-11 w-full border-b border-[#D9D1C5] bg-transparent px-0 text-sm text-[#25211D] outline-none transition-colors placeholder:text-[#A79D91] focus:border-[#776958]';
  const socialButtonClassName = 'flex h-11 w-full items-center justify-center gap-3 border border-[#D8D0C4] bg-[#FFFEFC] px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#29241F] transition-colors hover:border-[#AA9B88] hover:bg-[#F6F1E9] disabled:cursor-not-allowed disabled:opacity-55';

  return (
    <div className="fixed inset-0 z-[70]" aria-hidden={!isAuthOpen}>
      <button
        type="button"
        onClick={() => setIsAuthOpen(false)}
        className={`absolute inset-0 h-full w-full cursor-default bg-[#171310]/28 backdrop-blur-[4px] transition-opacity duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        aria-label="Close authentication panel"
      />

      <aside
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-drawer-title"
        className={`absolute right-2.5 top-1/2 flex max-h-[calc(100dvh-1.25rem)] w-[calc(100%-1.25rem)] -translate-y-1/2 flex-col overflow-hidden rounded-[24px] border border-[#E2DBD0] bg-[#FAF8F4] text-[#25211D] shadow-[-16px_20px_52px_rgba(31,25,19,0.2),0_2px_10px_rgba(255,255,255,0.65)_inset] outline-none transition-[transform,opacity] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[transform,opacity] sm:right-5 sm:max-h-[calc(100dvh-2.5rem)] sm:w-[420px] sm:rounded-[28px] ${isAnimating ? 'translate-x-0 scale-100 opacity-100' : 'translate-x-[110%] scale-[0.985] opacity-0'}`}
      >
        <header className="flex shrink-0 items-start justify-between border-b border-[#E7E0D6] px-5 py-5 sm:px-7 sm:py-5.5">
          <div className="pr-5">
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.28em] text-[#938574]">Private client access</p>
            <h2 id="auth-drawer-title" className="font-serif text-[25px] font-normal tracking-[0.035em] text-[#25211D]">
              WELCOME TO SAELYXE
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[#786F64]">
              {isSignUp ? 'Create your account for a more considered experience.' : 'Sign in to continue your SAELYXE experience.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAuthOpen(false)}
            className="-mr-2 -mt-1 flex h-9 w-9 items-center justify-center text-[#6F665C] transition-colors hover:bg-[#EFE9E0] hover:text-[#25211D] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#776958]"
            aria-label="Close authentication panel"
          >
            <X className="h-5 w-5 stroke-[1.4]" />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-7 sm:py-6.5">
          <form onSubmit={handleEmailSubmit} className="space-y-5" noValidate>
            {isSignUp && (
              <label className="block">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#63594E]">Full name</span>
                <input
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={event => updateField('name', event.target.value)}
                  className={inputClassName}
                  placeholder="Your full name"
                  disabled={isAuthLoading}
                  required
                />
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#63594E]">Email address</span>
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={event => updateField('email', event.target.value)}
                className={inputClassName}
                placeholder="you@example.com"
                disabled={isAuthLoading}
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#63594E]">Password</span>
              <span className="relative block">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  value={form.password}
                  onChange={event => updateField('password', event.target.value)}
                  className={`${inputClassName} pr-10`}
                  placeholder={isSignUp ? 'At least 6 characters' : 'Enter your password'}
                  disabled={isAuthLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(visible => !visible)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-[#82786C] transition-colors hover:text-[#25211D]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>

            {isSignUp && (
              <label className="block">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#63594E]">Confirm password</span>
                <span className="relative block">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={event => updateField('confirmPassword', event.target.value)}
                    className={`${inputClassName} pr-10`}
                    placeholder="Repeat your password"
                    disabled={isAuthLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(visible => !visible)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-[#82786C] transition-colors hover:text-[#25211D]"
                    aria-label={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>
            )}

            {visibleError && (
              <p role="alert" className="flex items-start gap-2 border-l border-[#A98264] bg-[#F4EDE5] px-3 py-2.5 text-xs leading-relaxed text-[#634835]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{visibleError}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={isAuthLoading}
              className="flex h-12 w-full items-center justify-center gap-2 bg-[#28231E] px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FEFCF8] transition-colors hover:bg-[#4A4035] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAuthLoading && <LoadingIndicator />}
              {isAuthLoading ? 'Please wait' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-[#DED6CB]" />
            <span className="text-[9px] font-medium uppercase tracking-[0.19em] text-[#8C8174]">Or continue with</span>
            <span className="h-px flex-1 bg-[#DED6CB]" />
          </div>

          <div className="space-y-3">
            <button type="button" onClick={() => handleProviderSignIn('google')} disabled={isAuthLoading} className={socialButtonClassName}>
              {isAuthLoading ? <LoadingIndicator /> : <GoogleMark />}
              <span>Continue with Google</span>
            </button>
            <button type="button" onClick={() => handleProviderSignIn('facebook')} disabled={isAuthLoading} className={socialButtonClassName}>
              {isAuthLoading ? <LoadingIndicator /> : <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1877F2] font-sans text-[13px] font-bold leading-none text-white">f</span>}
              <span>Continue with Facebook</span>
            </button>
          </div>

          <p className="mt-5 text-center text-xs leading-relaxed text-[#7B7166]">
            {isSignUp ? 'Already have an account?' : 'New to SAELYXE?'}{' '}
            <button
              type="button"
              onClick={switchMode}
              disabled={isAuthLoading}
              className="font-semibold uppercase tracking-[0.14em] text-[#3C342C] underline decoration-[#B7AA9A] underline-offset-4 transition-colors hover:text-[#8B755E] disabled:cursor-not-allowed"
            >
              {isSignUp ? 'Sign in' : 'Create account'}
            </button>
          </p>

          <p className="mx-auto mt-5 max-w-xs text-center text-[10px] leading-relaxed text-[#9A9085]">
            By continuing, you agree to SAELYXE&apos;s terms and privacy policy.
          </p>
        </div>
      </aside>
    </div>
  );
};