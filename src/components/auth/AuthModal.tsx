import React, { useState } from 'react';
import { Mail, Lock, User, KeyRound, Sparkles, ShieldCheck } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'magic-link' | 'staff-pin' | 'forgot';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'magic-link' | 'staff-pin' | 'forgot'>(initialMode);
  const { login, loginWithMagicLink, signup, resetPassword, staffPinLogin } = useAuth();
  const { success, error, info } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const ok = await login(email, password);
        if (ok) {
          success('Welcome Back!', 'Logged into CafeOS successfully.');
          onClose();
        }
      } else if (mode === 'signup') {
        const res = await signup(email, password, fullName, businessName);
        if (res.success) {
          if (res.needsEmailConfirmation) {
            info('Verification Email Sent by CafeOS! ✉️', res.message || 'Please check your email to activate your account.');
          } else {
            success('Account Created! 🚀', 'Welcome to CafeOS. Your business account is active.');
          }
          onClose();
        }
      } else if (mode === 'magic-link') {
        await loginWithMagicLink(email);
        info('Magic Link Sent by CafeOS! ✉️', `Login link dispatched to ${email}`);
        onClose();
      } else if (mode === 'staff-pin') {
        const ok = await staffPinLogin(pin);
        if (ok) {
          success('PIN Verified!', 'Staff member logged in.');
          onClose();
        } else {
          error('Invalid PIN', 'The PIN entered does not match any active staff.');
        }
      } else if (mode === 'forgot') {
        await resetPassword(email);
        info('Reset Email Sent by CafeOS! 🔑', `Password reset instructions sent to ${email}`);
        setMode('login');
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      error('Authentication Error', errorObj?.message || 'Failed to authenticate');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            C
          </div>
          <span>
            {mode === 'login' && 'Owner / Manager Login'}
            {mode === 'signup' && 'Register New CafeOS Account'}
            {mode === 'staff-pin' && 'Staff Quick PIN Access'}
            {mode === 'forgot' && 'Reset Password'}
          </span>
        </div>
      }
      description={
        mode === 'staff-pin'
          ? 'Enter your 4-digit staff PIN for terminal access'
          : 'Access your restaurant management console'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <>
            <Input
              label="Full Name"
              placeholder="e.g. Shyam Raghuwanshi"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
              required
            />
            <Input
              label="Business / Cafe Name"
              placeholder="e.g. Royal Cafe & Restro"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              leftIcon={<Sparkles className="w-4 h-4 text-amber-400" />}
              required
            />
          </>
        )}

        {mode !== 'staff-pin' && (
          <Input
            label="Email Address"
            type="email"
            placeholder="owner@mycafe.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />
        )}

        {(mode === 'login' || mode === 'signup') && (
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />
        )}

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
            <p className="text-[11px] text-slate-400 mt-2">
              Enter your 4-digit staff PIN code configured in Staff Settings.
            </p>
          </div>
        )}

        {mode === 'login' && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              Forgot password?
            </button>
          </div>
        )}

        <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
          {mode === 'login' && 'Sign In to Dashboard'}
          {mode === 'signup' && 'Create Restaurant Account'}
          {mode === 'staff-pin' && 'Verify PIN & Enter'}
          {mode === 'forgot' && 'Send Reset Link'}
        </Button>

        {/* Footer Mode Switchers */}
        <div className="pt-2 text-center text-xs text-slate-400 space-y-1">
          {mode === 'login' ? (
            <>
              <p>
                Don't have a CafeOS account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-amber-400 hover:underline font-semibold cursor-pointer"
                >
                  Create one now
                </button>
              </p>
              <p>
                Staff on shift?{' '}
                <button
                  type="button"
                  onClick={() => setMode('staff-pin')}
                  className="text-slate-300 hover:text-white underline cursor-pointer"
                >
                  Fast PIN Login
                </button>
              </p>
            </>
          ) : (
            <p>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-amber-400 hover:underline font-semibold cursor-pointer"
              >
                Back to Sign In
              </button>
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
};
