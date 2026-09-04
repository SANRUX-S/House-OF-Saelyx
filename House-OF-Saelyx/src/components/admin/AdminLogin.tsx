import React, { useState } from 'react';
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
  onLogin: (username: string, pass: string) => Promise<{ success: boolean; error?: string }>;
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
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password key.');
      return;
    }

    setErrorMsg('');
    setIsLoggingIn(true);

    try {
      const res = await onLogin(username.trim(), password);
      if (!res.success) {
        setErrorMsg(res.error || 'Authentication denied. Invalid credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error.');
    } finally {
      setIsLoggingIn(false);
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
            Please sign in to access your atelier dashboard
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label-custom">Email or Operator Username</label>
            <input
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. saelyx_super or saelyx_admin"
              className="form-input-custom"
            />
          </div>

          <div>
            <label className="form-label-custom">Cryptographic Password Key</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input-custom !pr-10"
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

            <span className="text-stone-400">Restricted Access</span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3 bg-[#051C12] hover:bg-[#072F1F] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 mt-2 cursor-pointer"
          >
            <span>{isLoggingIn ? 'Verifying Key...' : 'Sign In to Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick-Access Test Operators for convenience */}
        <div className="mt-6 pt-5 border-t border-stone-100">
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider text-center mb-2.5">
            Quick Operator Credential Fill
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('saelyx_super', 'SaelyxVIP#2026!')}
              className="p-2 rounded-xl bg-stone-50 hover:bg-stone-100 text-left border border-stone-200 transition-colors"
            >
              <div className="text-[11px] font-bold text-stone-900">Super Admin</div>
              <div className="text-[10px] text-stone-500 font-mono">saelyx_super</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('saelyx_admin', 'SaelyxAtelier#2026')}
              className="p-2 rounded-xl bg-stone-50 hover:bg-stone-100 text-left border border-stone-200 transition-colors"
            >
              <div className="text-[11px] font-bold text-stone-900">Atelier Admin</div>
              <div className="text-[10px] text-stone-500 font-mono">saelyx_admin</div>
            </button>
          </div>
        </div>

        {/* Return to Public Store */}
        <div className="text-center mt-6">
          <button
            onClick={onReturnToStore}
            className="text-xs text-stone-500 hover:text-stone-800 font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Return to Public Boutique</span>
          </button>
        </div>
      </div>
    </div>
  );
};
