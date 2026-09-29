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
  initialMode?: 'login' | 'signup' | 'staff-pin' | 'forgot';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'staff-pin' | 'forgot'>(initialMode);
  const { login, signup, staffPinLogin } = useAuth();
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
        const ok = await signup(email, password, fullName, businessName);
        if (ok) {
          success('Account Created!', 'Welcome to CafeOS. Your business account is active.');
          onClose();
        }
      } else if (mode === 'staff-pin') {
        const ok = await staffPinLogin(pin);
        if (ok) {
          success('PIN Verified!', 'Staff member logged in.');
          onClose();
        } else {
          error('Invalid PIN', 'The PIN entered does not match any active staff.');
        }
      } else if (mode === 'forgot') {
        info('Reset Email Sent', `Password reset instructions sent to ${email}`);
        setMode('login');
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      error('Authentication Error', errorObj?.message || 'Failed to authenticate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setIsLoading(true);
    try {
      await login(demoEmail, 'password123');
      success('Logged In as Demo User', `Signed in as ${demoEmail}`);
      onClose();
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
              placeholder="e.g. Vikram Mehta"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
              required
            />
            <Input
              label="Business / Cafe Name"
              placeholder="e.g. Roast & Brew Artisan Cafe"
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
            placeholder="owner@roastbrew.com"
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
              Tip: Use demo PINs: <code className="text-amber-300">1234</code> (Owner),{' '}
              <code className="text-amber-300">4321</code> (Manager),{' '}
              <code className="text-amber-300">5555</code> (Kitchen),{' '}
              <code className="text-amber-300">9999</code> (Cashier)
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

        {/* Quick Demo Login Preset Buttons */}
        <div className="pt-4 border-t border-slate-800">
          <p className="text-xs text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Quick One-Click Demo Logins:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('owner@roastbrew.com')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left transition-all"
            >
              <strong className="block text-amber-300">Cafe Owner</strong>
              <span className="text-[10px] text-slate-400">Full Access</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('chef@roastbrew.com')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left transition-all"
            >
              <strong className="block text-emerald-300">Kitchen Chef</strong>
              <span className="text-[10px] text-slate-400">KDS Interface</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('cashier@roastbrew.com')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left transition-all"
            >
              <strong className="block text-sky-300">Cashier POS</strong>
              <span className="text-[10px] text-slate-400">Billing & Orders</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin@cafeos.app')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-purple-500/30 text-left transition-all"
            >
              <strong className="block text-purple-300">Super Admin</strong>
              <span className="text-[10px] text-slate-400">Platform SaaS</span>
            </button>
          </div>
        </div>

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
