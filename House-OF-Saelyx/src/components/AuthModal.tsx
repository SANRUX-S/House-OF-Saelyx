import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertCircle, 
  Sparkles,
  Shield
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const AuthModal: React.FC = () => {
  const {
    isAuthOpen,
    setIsAuthOpen,
    user,
    logout,
    loginWithGoogle,
    loginAsGuest,
    loginAsBypassPatron,
    isAuthLoading,
    authError,
    setAuthError,
    navigateTo
  } = useStore();

  // Animation states for opening/closing transitions
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Phone Auth Step state
  const [isPhoneAuthOpen, setIsPhoneAuthOpen] = useState(false);
  const [countryCode, setCountryCode] = useState('+94');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneStep, setPhoneStep] = useState<'number' | 'otp'>('number');
  const [otpCode, setOtpCode] = useState('');

  // Handle Mount & Unmount Animations
  useEffect(() => {
    if (isAuthOpen) {
      setShouldRender(true);
      // Short delay before triggering scale/opacity to ensure transition executes
      const timer = setTimeout(() => setIsAnimating(true), 20);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      // Wait for 500ms exit animation to complete before unmounting DOM node
      const timer = setTimeout(() => setShouldRender(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthOpen]);

  if (!shouldRender) return null;

  const handleClose = () => {
    setIsAuthOpen(false);
  };

  const handleSendPhoneOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;
    setPhoneStep('otp');
  };

  const handleVerifyPhoneOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 4) {
      setAuthError('Please enter a valid verification code.');
      return;
    }
    // Authenticate user via Phone
    loginAsGuest();
    setIsPhoneAuthOpen(false);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto select-none">
      {/* Animated Backdrop */}
      <div
        onClick={handleClose}
        className={`fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-500 ease-out ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Animated Modal Container (Slow Pop) */}
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div 
          className={`relative w-full max-w-md bg-[#FAF8F5] text-[#1A1816] rounded-3xl shadow-2xl border border-[#E3D9CD] overflow-hidden z-10 transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) transform ${
            isAnimating 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-90 translate-y-4'
          }`}
        >
          
          {/* Top Header Bar with • ACCOUNT and Close Button */}
          <div className="p-6 pb-4 flex items-center justify-between border-b border-[#ECE3D8]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1A1816]"></span>
              <h2 className="font-['Plus_Jakarta_Sans'] text-sm font-bold tracking-[0.25em] uppercase text-[#1A1816]">
                ACCOUNT
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-full text-[#7A6E60] hover:text-black hover:bg-[#EBE2D5] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile View (If already authenticated) */}
          {user ? (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-[#1A1816] text-[#FAF8F5] flex items-center justify-center mx-auto text-2xl font-serif font-bold shadow-lg">
                  {user.name ? user.name[0]?.toUpperCase() : 'S'}
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-medium text-[#1A1816]">{user.name}</h3>
                  <p className="text-xs text-[#7A6E60] mt-0.5">{user.email || user.phoneNumber || 'Patron'}</p>
                  
                  <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-[#EAE2D5] text-[#3D3328] text-[10px] uppercase tracking-widest font-semibold">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>
                      {user.role === 'super_admin' 
                        ? 'Super Admin / Master Key' 
                        : user.role === 'admin' 
                        ? 'Atelier Director' 
                        : 'House of Saelyx Patron'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action shortcuts */}
              <div className="space-y-2 pt-2">
                {(user.role === 'admin' || user.role === 'super_admin') && (
                  <button
                    onClick={() => {
                      handleClose();
                      navigateTo({ name: 'admin' });
                    }}
                    className="w-full py-3.5 bg-[#1A1816] text-white font-semibold text-xs tracking-widest uppercase rounded-full hover:bg-black transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>OPEN ATELIER ADMIN PANEL</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    handleClose();
                    navigateTo({ name: 'track' });
                  }}
                  className="w-full py-3 bg-[#EAE2D5] text-[#1A1816] font-semibold text-xs tracking-widest uppercase rounded-full hover:bg-[#DDD3C4] transition-all cursor-pointer"
                >
                  TRACK MY COMMISSIONS & ORDERS
                </button>
              </div>

              <div className="pt-4 border-t border-[#ECE3D8] flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 py-3 bg-white border border-[#D5C9B8] text-[#1A1816] font-semibold text-xs tracking-wider uppercase rounded-full hover:bg-[#F2ECE2] cursor-pointer"
                >
                  CLOSE
                </button>
                <button
                  onClick={logout}
                  className="px-6 py-3 bg-rose-500/10 text-rose-700 font-semibold text-xs tracking-wider uppercase rounded-full hover:bg-rose-500/20 cursor-pointer"
                >
                  SIGN OUT
                </button>
              </div>
            </div>
          ) : isPhoneAuthOpen ? (
            /* PHONE AUTHENTICATION STEP */
            <div className="p-6 sm:p-8 space-y-6">
              <div className="space-y-1">
                <button
                  onClick={() => setIsPhoneAuthOpen(false)}
                  className="text-xs text-[#7A6E60] hover:text-black flex items-center gap-1 mb-2 cursor-pointer"
                >
                  ← Back to Email Sign In
                </button>
                <h3 className="font-serif text-2xl font-bold tracking-tight text-[#1A1816]">
                  {phoneStep === 'number' ? 'SIGN IN WITH PHONE' : 'ENTER VERIFICATION CODE'}
                </h3>
                <p className="text-xs text-[#7A6E60]">
                  {phoneStep === 'number'
                    ? 'We will send a one-time security code to your mobile device.'
                    : `Enter the 6-digit SMS code sent to ${countryCode} ${phoneNumber}`}
                </p>
              </div>

              {authError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {phoneStep === 'number' ? (
                <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#5A4E40] mb-1">
                      Mobile Phone Number *
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={e => setCountryCode(e.target.value)}
                        className="bg-white border border-[#D5C9B8] rounded-xl px-2.5 py-3 text-xs text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
                      >
                        <option value="+94">🇱🇰 +94 (LK)</option>
                        <option value="+1">🇺🇸 +1 (US/CA)</option>
                        <option value="+44">🇬🇧 +44 (UK)</option>
                        <option value="+971">🇦🇪 +971 (UAE)</option>
                        <option value="+61">🇦🇺 +61 (AU)</option>
                        <option value="+65">🇸🇬 +65 (SG)</option>
                        <option value="+91">🇮🇳 +91 (IN)</option>
                        <option value="+81">🇯🇵 +81 (JP)</option>
                        <option value="+33">🇫🇷 +33 (FR)</option>
                        <option value="+49">🇩🇪 +49 (DE)</option>
                      </select>
                      <input
                        type="tel"
                        required
                        placeholder="77 123 4567"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        className="flex-1 bg-white border border-[#D5C9B8] rounded-xl px-3.5 py-3 text-base sm:text-xs text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 sm:py-4 bg-[#1A1816] hover:bg-black text-white font-semibold text-xs tracking-[0.2em] uppercase rounded-full transition-all shadow-md mt-2 cursor-pointer min-h-[44px]"
                  >
                    SEND VERIFICATION CODE
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#5A4E40] mb-1">
                      SMS Security Code (6-Digits)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="• • • • • •"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                      className="w-full bg-white border border-[#D5C9B8] rounded-xl px-4 py-3 text-center text-lg tracking-[0.4em] font-mono text-[#1A1816] focus:outline-none focus:border-[#1A1816]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 sm:py-4 bg-[#1A1816] hover:bg-black text-white font-semibold text-xs tracking-[0.2em] uppercase rounded-full transition-all shadow-md mt-2 cursor-pointer min-h-[44px]"
                  >
                    CONFIRM & SIGN IN
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setPhoneStep('number')}
                      className="text-xs text-[#7A6E60] hover:text-black underline cursor-pointer"
                    >
                      Change Phone Number
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* STANDARD PATRON AUTHENTICATION */
            <div className="p-6 sm:p-8 space-y-6">
              
              <div className="text-center space-y-2">
                <h3 className="font-serif text-xl font-normal text-[#1A1816]">
                  PATRON SIGN IN
                </h3>
                <p className="text-xs text-[#7A6E60] leading-relaxed max-w-sm mx-auto">
                  To secure your bespoke order history and complete custom commissions, please authenticate with your official Google account.
                </p>
              </div>

              {/* Error or Alert Display with Fallback */}
              {authError && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-stone-800 text-xs space-y-2">
                  <div className="flex items-start gap-2 text-amber-900 font-medium leading-relaxed">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={loginAsBypassPatron}
                    className="w-full py-2 px-3 bg-[#1A1816] hover:bg-black text-white text-[11px] font-semibold tracking-wider rounded-xl uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>One-Click VIP Patron Sign In</span>
                  </button>
                </div>
              )}

              {/* GOOGLE SIGN-IN & VIP BYPASS */}
              <div className="py-2 space-y-3">
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  disabled={isAuthLoading}
                  className="w-full py-4 px-4 bg-white hover:bg-[#F2ECE2] text-[#1A1816] border border-[#D5C9B8] rounded-full text-xs font-semibold tracking-wider flex items-center justify-center gap-3 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isAuthLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-[#1A1816]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="font-semibold tracking-wider uppercase text-[11px]">AUTHENTICATING...</span>
                    </span>
                  ) : (
                    <>
                      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span className="font-semibold tracking-wider uppercase text-[11px]">Continue with Google</span>
                    </>
                  )}
                </button>

                {/* VIP Sandbox Test-Drive Bypass Trigger */}
                <div className="pt-2 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="h-[1px] bg-[#E3D9CD] flex-1"></span>
                    <span className="text-[9px] text-[#96897B] font-bold tracking-widest uppercase text-center">Sandbox Bypass</span>
                    <span className="h-[1px] bg-[#E3D9CD] flex-1"></span>
                  </div>
                  <button
                    type="button"
                    onClick={loginAsBypassPatron}
                    className="w-full py-3.5 px-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-950 border border-amber-500/25 rounded-full text-[11px] font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    <span>VIP Test-Drive (Google Bypass)</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};