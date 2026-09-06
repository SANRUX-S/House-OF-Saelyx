import React, { useState } from 'react';
import { sendAdminPasswordReset } from '../../lib/firebase';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  ExternalLink,
  AlertCircle
} from 'lucide-react';

export interface AdminLoginProps {
  onLogin: (username: string, pass: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  onReturnToStore: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLogin,
  onReturnToStore
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Enter your admin email and password.');
      return;
    }

    setErrorMsg('');
    setResetMsg('');
    setIsLoggingIn(true);

    try {
      const res = await onLogin(username.trim(), password, rememberMe);
      if (!res.success) {
        setErrorMsg(res.error || 'Authentication denied. Invalid credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePasswordReset = async () => {
    const email = username.trim();
    if (!email) {
      setErrorMsg('Enter your admin email first.');
      return;
    }
    setErrorMsg('');
    setResetMsg('');
    setIsSendingReset(true);
    try {
      const result = await sendAdminPasswordReset(email);
      if (result.success) {
        setResetMsg('Password reset email sent. Check your inbox.');
      } else {
        setErrorMsg(result.error || 'Unable to send password reset email.');
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleQuickFill = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setErrorMsg('');
  };

  return (
    <div className="login-screen-container">
      {/* Modern Glowing Background Shapes */}
      <div className="login-bg-shape login-bg-shape-1" />
      <div className="login-bg-shape login-bg-shape-2" />

      {/* Main Centered Login Card */}
      <div className="login-card-custom">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#051C12] text-[#B4F105] flex items-center justify-center font-extrabold text-base mx-auto mb-3 shadow-md border border-[#1A3E30]">
            <span>SÆ</span>
          </div>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
            SAELYXE ADMIN
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Sign in to manage SAELYXE
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {resetMsg && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
            {resetMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="form-label-custom">Admin Email</label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin@your-domain.com"
              className="form-input-custom"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="form-label-custom">Password</label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input-custom pr-10!"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Options Row */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-stone-600 font-medium">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="rounded text-[#051C12] focus:ring-0"
              />
              <span>Remember Me</span>
            </label>

            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={isSendingReset}
              className="text-stone-500 hover:text-stone-900 underline underline-offset-2 disabled:opacity-50"
            >
              {isSendingReset ? 'Sending...' : 'Forgot password?'}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3 bg-[#051C12] hover:bg-[#072F1F] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 mt-2 cursor-pointer"
          >
            <span>{isLoggingIn ? 'Signing in...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-stone-100 text-center">
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2.5">
            Secure admin access
          </div>
          <div className="text-[10px] text-stone-500">
            Only verified SAELYXE administrator accounts can access this dashboard.
          </div>
        </div>

        {/* Return to Public Store */}
        <div className="text-center mt-6">
          <button
            onClick={onReturnToStore}
            className="text-xs text-stone-500 hover:text-stone-800 font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Return to Store</span>
          </button>
        </div>
      </div>
    </div>
  );
};
