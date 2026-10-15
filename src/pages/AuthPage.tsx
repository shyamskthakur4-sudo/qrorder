import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  Sparkles,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Send,
  RefreshCw,
  Store,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface AuthPageProps {
  initialMode?: 'login' | 'signup' | 'magic-link' | 'staff-pin' | 'forgot' | 'reset-password';
  onSuccess?: () => void;
  onBackToDashboard?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  onSuccess,
  onBackToDashboard,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'magic-link' | 'staff-pin' | 'forgot' | 'reset-password'>(initialMode);
  const {
    login,
    loginWithMagicLink,
    signup,
    resetPassword,
    updatePassword,
    verifyRecoveryOtp,
    clearPasswordRecoveryState,
    resendConfirmationEmail,
    staffPinLogin,
  } = useAuth();
  const { success, error, info } = useToast();

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [pin, setPin] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync initialMode changes
  React.useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  // Email Confirmation Sent state
  const [emailSentData, setEmailSentData] = useState<{
    type: 'signup' | 'magic-link' | 'reset';
    email: string;
  } | null>(null);

  // Resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const ok = await login(email, password);
        if (ok) {
          success('Welcome Back! 🎉', 'Signed in to CafeOS successfully.');
          onSuccess?.();
        }
      } else if (mode === 'signup') {
        if (password.length < 6) {
          error('Password Too Short', 'Please choose a password with at least 6 characters.');
          return;
        }
        if (password !== confirmPassword) {
          error('Passwords Do Not Match', 'Please ensure both password fields match.');
          return;
        }

        const res = await signup(email, password, fullName, businessName);
        if (res.success) {
          if (res.needsEmailConfirmation) {
            setEmailSentData({ type: 'signup', email });
            success('Verification Email Sent by CafeOS! ✉️', res.message || 'Please verify your email to log in.');
          } else {
            success('Account Created! 🚀', 'Welcome to CafeOS! Your restaurant workspace is ready.');
            onSuccess?.();
          }
        }
      } else if (mode === 'magic-link') {
        if (!email.trim()) {
          error('Missing Email', 'Please enter your email address to receive a magic link.');
          return;
        }
        await loginWithMagicLink(email);
        setEmailSentData({ type: 'magic-link', email });
        success('Magic Link Sent by CafeOS! ✉️', `A 1-click login link has been dispatched to ${email}`);
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          error('Missing Email', 'Please enter your email address to receive password reset instructions.');
          return;
        }
        await resetPassword(email);
        setEmailSentData({ type: 'reset', email });
        info('Reset Email Sent by CafeOS! 🔑', `Password reset instructions sent to ${email}`);
      } else if (mode === 'reset-password') {
        if (password.length < 6) {
          error('Password Too Short', 'Please choose a password with at least 6 characters.');
          return;
        }
        if (password !== confirmPassword) {
          error('Passwords Do Not Match', 'Please ensure both password fields match.');
          return;
        }
        const ok = await updatePassword(password);
        if (ok) {
          success('Password Updated! 🎉', 'Your new password is now active. Welcome to CafeOS!');
          clearPasswordRecoveryState();
          onSuccess?.();
        } else {
          error('Update Failed', 'Failed to update your password. Please request a new recovery link.');
        }
      } else if (mode === 'staff-pin') {
        const ok = await staffPinLogin(pin);
        if (ok) {
          success('PIN Verified! 🟢', 'Staff session started.');
          onSuccess?.();
        } else {
          error('Invalid PIN', 'The PIN entered does not match any active staff member.');
        }
      }
    } catch (err: unknown) {
      const errObj = err as Error;
      error('Authentication Error', errObj?.message || 'Failed to authenticate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectOtpReset = async () => {
    if (!emailSentData?.email) {
      error('Missing Email', 'Email address is missing.');
      return;
    }
    const cleanToken = recoveryCode.trim();
    if (!cleanToken) {
      error('Missing Code', 'Please enter the 6-digit verification code from your email.');
      return;
    }
    if (password.length < 6) {
      error('Password Too Short', 'Please choose a password with at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      error('Passwords Do Not Match', 'Please ensure both password fields match.');
      return;
    }

    setIsLoading(true);
    try {
      const verified = await verifyRecoveryOtp(emailSentData.email, cleanToken);
      if (verified) {
        const updated = await updatePassword(password);
        if (updated) {
          success('Password Updated! 🎉', 'Your new password is now set and you are signed in.');
          setEmailSentData(null);
          clearPasswordRecoveryState();
          onSuccess?.();
          return;
        }
      }
      error('Verification Failed', 'Could not verify the reset code. Please check the code or use the link in your email.');
    } catch (err: unknown) {
      const errObj = err as Error;
      error('Reset Error', errObj?.message || 'Invalid or expired code. Please request a new link.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!emailSentData?.email || resendCooldown > 0) return;
    setIsLoading(true);
    try {
      if (emailSentData.type === 'signup') {
        await resendConfirmationEmail(emailSentData.email);
      } else if (emailSentData.type === 'magic-link') {
        await loginWithMagicLink(emailSentData.email);
      } else {
        await resetPassword(emailSentData.email);
      }
      success('Email Resent! ✉️', `Fresh email sent by CafeOS to ${emailSentData.email}`);
      setResendCooldown(45);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      const errObj = err as Error;
      error('Error Resending Email', errObj?.message || 'Could not resend email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top back button */}
      {onBackToDashboard && (
        <div className="absolute top-6 left-6 z-10">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-800 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      )}

      {/* Brand Header */}
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>CafeOS Cloud Platform</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-100 font-['Outfit'] tracking-tight">
          Restaurant Operating System & Smart QR
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-md mx-auto">
          Manage digital table menus, contactless ordering, live kitchen KDS, and WhatsApp marketing.
        </p>
      </div>

      {/* Auth Card Container */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-950/80 backdrop-blur-xl relative z-10">
        {/* Email Sent Confirmation State Screen */}
        {emailSentData ? (
          <div className="text-center py-4 space-y-4 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/10">
              <Mail className="w-8 h-8 animate-bounce" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-100 font-['Outfit']">
                Check Your Email from CafeOS
              </h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                We have sent an email directly by <strong className="text-amber-400">CafeOS</strong> to:
              </p>
              <div className="mt-2 py-1 px-3 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-mono text-xs font-semibold inline-block break-all">
                {emailSentData.email}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {emailSentData.type === 'signup' && 'Click the verification link in the email to activate your cafe account.'}
                {emailSentData.type === 'magic-link' && 'Click the 1-click login button in the email to sign in immediately.'}
                {emailSentData.type === 'reset' && 'Click the reset link in the email, OR enter the 6-digit verification code below.'}
              </p>
            </div>

            {/* Direct 6-Digit OTP Code entry for instant password reset */}
            {emailSentData.type === 'reset' && (
              <div className="text-left bg-slate-950/90 border border-amber-500/30 rounded-2xl p-4 space-y-3 mt-3 shadow-inner">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <KeyRound className="w-4 h-4 shrink-0" />
                  <span>Enter 6-Digit Code from Email</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Supabase recovery emails also include a 6-digit OTP code. Enter it here to choose your new password right away:
                </p>

                <div className="space-y-3">
                  <Input
                    label="6-Digit Reset Code"
                    placeholder="123456"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    maxLength={10}
                    className="font-mono text-center tracking-widest text-base font-bold text-amber-400"
                  />

                  <div className="relative">
                    <Input
                      label="New Password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="•••••••• (min 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      leftIcon={<Lock className="w-4 h-4" />}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-8 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <Input
                    label="Confirm New Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                  />

                  <Button
                    type="button"
                    variant="primary"
                    className="w-full text-xs font-bold py-2.5 shadow-md shadow-amber-500/20"
                    isLoading={isLoading}
                    onClick={handleDirectOtpReset}
                    leftIcon={<ShieldCheck className="w-4 h-4" />}
                  >
                    Verify Code & Set New Password
                  </Button>
                </div>
              </div>
            )}

            <div className="pt-2 space-y-2">
              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={handleResendEmail}
                isLoading={isLoading}
                disabled={resendCooldown > 0}
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? 'animate-spin' : ''}`} />}
              >
                {resendCooldown > 0
                  ? `Resend Email in ${resendCooldown}s`
                  : 'Resend Email by CafeOS'}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setEmailSentData(null);
                  setMode('login');
                }}
                className="w-full text-xs text-slate-400 hover:text-slate-200 py-2 cursor-pointer font-medium"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Mode Selector Tabs / Recovery Badge */}
            {mode !== 'reset-password' && mode !== 'forgot' ? (
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-2xl border border-slate-800/80 mb-6 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`py-2 px-2 rounded-xl transition-all cursor-pointer text-center ${
                    mode === 'login'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`py-2 px-2 rounded-xl transition-all cursor-pointer text-center ${
                    mode === 'signup'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => setMode('magic-link')}
                  className={`py-2 px-2 rounded-xl transition-all cursor-pointer text-center ${
                    mode === 'magic-link'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Magic Link
                </button>
              </div>
            ) : mode === 'reset-password' ? (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-6">
                <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Password Recovery Mode Active</span>
              </div>
            ) : (
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs mb-6">
                <div className="flex items-center gap-2 text-slate-300">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Password Reset</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            )}

            {/* Active Mode Form Header */}
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-100 font-['Outfit']">
                {mode === 'login' && 'Sign In to Your Restaurant'}
                {mode === 'signup' && 'Register New Restaurant Account'}
                {mode === 'magic-link' && 'Passwordless Email Sign In'}
                {mode === 'staff-pin' && 'Staff Terminal Fast PIN Access'}
                {mode === 'forgot' && 'Reset Your CafeOS Password'}
                {mode === 'reset-password' && 'Create Your New Password'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {mode === 'login' && 'Enter your email & password to access your dashboard.'}
                {mode === 'signup' && 'Get started in 60 seconds. An email will be sent by CafeOS to confirm.'}
                {mode === 'magic-link' && 'We will send a 1-click login link directly from CafeOS to your email.'}
                {mode === 'staff-pin' && 'Enter your 4-digit staff PIN for terminal access.'}
                {mode === 'forgot' && 'Enter your registered email to receive reset instructions and OTP.'}
                {mode === 'reset-password' && 'Choose a secure new password for your CafeOS owner account.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Registration: Full Name & Cafe Name */}
              {mode === 'signup' && (
                <>
                  <Input
                    label="Full Name / Owner Name"
                    placeholder="e.g. Shyam Raghuwanshi"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    leftIcon={<User className="w-4 h-4" />}
                    required
                  />

                  <Input
                    label="Cafe / Restaurant Name"
                    placeholder="e.g. Urban Brew Coffee House"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    leftIcon={<Store className="w-4 h-4 text-amber-400" />}
                    required
                  />
                </>
              )}

              {/* Email Address (for login, signup, magic-link, forgot) */}
              {mode !== 'staff-pin' && mode !== 'reset-password' && (
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="owner@yourcafe.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                  required
                />
              )}

              {/* Password for Login, Signup & Reset-Password */}
              {(mode === 'login' || mode === 'signup' || mode === 'reset-password') && (
                <div>
                  <div className="relative">
                    <Input
                      label={mode === 'reset-password' ? 'New Password' : 'Password'}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="•••••••• (min 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      leftIcon={<Lock className="w-4 h-4" />}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-8 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password for Signup & Reset-Password */}
              {(mode === 'signup' || mode === 'reset-password') && (
                <Input
                  label={mode === 'reset-password' ? 'Confirm New Password' : 'Confirm Password'}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                />
              )}

              {/* Staff PIN Mode */}
              {mode === 'staff-pin' && (
                <div>
                  <Input
                    label="4-Digit Staff PIN"
                    type="password"
                    maxLength={4}
                    placeholder="1 2 3 4"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    leftIcon={<KeyRound className="w-4 h-4" />}
                    className="text-center tracking-widest text-lg font-mono"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-2 text-center">
                    Enter the 4-digit PIN configured in your CafeOS Staff Settings.
                  </p>
                </div>
              )}

              {/* Forgot password link */}
              {mode === 'login' && (
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setMode('magic-link')}
                    className="text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    Login with Magic Link instead
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-amber-400 hover:text-amber-300 font-medium transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                className="w-full text-xs font-bold py-2.5 shadow-lg shadow-amber-500/20"
                isLoading={isLoading}
                rightIcon={mode === 'reset-password' ? <CheckCircle2 className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              >
                {mode === 'login' && 'Sign In with Email'}
                {mode === 'signup' && 'Register with Email'}
                {mode === 'magic-link' && 'Send Email by CafeOS'}
                {mode === 'forgot' && 'Send Password Reset Link'}
                {mode === 'reset-password' && 'Save New Password & Continue'}
                {mode === 'staff-pin' && 'Verify PIN & Enter'}
              </Button>

              {/* Disclaimer */}
              {(mode === 'signup' || mode === 'magic-link' || mode === 'forgot') && (
                <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
                  <Send className="w-3 h-3 text-amber-400" />
                  <span>Email will be sent by <strong>CafeOS</strong></span>
                </p>
              )}
            </form>

            {/* Bottom Footer Switchers */}
            <div className="mt-5 text-center text-xs text-slate-400 space-y-2">
              {mode === 'login' ? (
                <>
                  <p>
                    Don't have a CafeOS account yet?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer"
                    >
                      Register here
                    </button>
                  </p>
                  <p>
                    Staff terminal on duty?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('staff-pin')}
                      className="text-slate-300 hover:text-white underline cursor-pointer"
                    >
                      Fast PIN Access
                    </button>
                  </p>
                </>
              ) : mode === 'reset-password' ? (
                <p>
                  Cancel password reset?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      clearPasswordRecoveryState();
                      setMode('login');
                    }}
                    className="text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer copyright */}
      <div className="mt-8 text-center text-[11px] text-slate-500 space-y-1 relative z-10">
        <p>© {new Date().getFullYear()} CafeOS Technologies • Cloud Multi-Tenant POS Platform</p>
        <p>Enterprise Grade Security &bull; End-to-End Encrypted Auth</p>
      </div>
    </div>
  );
};
