import React, { createContext, useContext, useState, useEffect } from 'react';
import { StaffRole, UserProfile, Staff } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface SignupResult {
  success: boolean;
  needsEmailConfirmation?: boolean;
  message?: string;
  email?: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  staff: Staff | null;
  role: StaffRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  loginWithMagicLink: (email: string) => Promise<boolean>;
  signup: (email: string, password?: string, fullName?: string, businessName?: string) => Promise<SignupResult>;
  resetPassword: (email: string) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<boolean>;
  verifyRecoveryOtp: (email: string, token: string) => Promise<boolean>;
  verifySignupOtp: (email: string, token: string) => Promise<boolean>;
  clearPasswordRecoveryState: () => void;
  resendConfirmationEmail: (email: string) => Promise<boolean>;
  staffPinLogin: (pin: string, branchId?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  switchRolePreview: (role: StaffRole) => void;
  hasPermission: (allowedRoles: StaffRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('cafeos_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && !parsed.email?.includes('roastbrew.com')) {
          return parsed;
        }
      } catch {}
    }
    return null;
  });

  const [staff, setStaff] = useState<Staff | null>(() => {
    const saved = localStorage.getItem('cafeos_staff');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && !parsed.email?.includes('roastbrew.com')) {
          return parsed;
        }
      } catch {}
    }
    return null;
  });

  const [role, setRole] = useState<StaffRole>(() => {
    const savedRole = localStorage.getItem('cafeos_role') as StaffRole;
    return savedRole || 'OWNER';
  });

  const [isLoading, setIsLoading] = useState(false);

  // Recovery mode state (true when user arrived via password reset email or reset-password URL)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const path = window.location.pathname || '';
    return (
      hash.includes('type=recovery') ||
      search.includes('type=recovery') ||
      path.includes('reset-password') ||
      path.includes('update-password')
    );
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('cafeos_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('cafeos_user');
    }
  }, [user]);

  useEffect(() => {
    if (staff) {
      localStorage.setItem('cafeos_staff', JSON.stringify(staff));
    } else {
      localStorage.removeItem('cafeos_staff');
    }
  }, [staff]);

  useEffect(() => {
    localStorage.setItem('cafeos_role', role);
  }, [role]);

  // Check Supabase session and recovery flags if configured
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Check URL parameters for recovery mode and handle PKCE code exchange
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const path = window.location.pathname || '';
      const params = new URLSearchParams(search);
      const code = params.get('code');

      if (
        hash.includes('type=recovery') ||
        search.includes('type=recovery') ||
        params.get('type') === 'recovery' ||
        path.includes('reset-password') ||
        path.includes('update-password')
      ) {
        setIsPasswordRecovery(true);
      }

      if (code) {
        supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
          if (!error && data?.session) {
            if (
              path.includes('reset-password') ||
              params.get('type') === 'recovery' ||
              hash.includes('type=recovery')
            ) {
              setIsPasswordRecovery(true);
            }
          }
        }).catch(() => {});
      }
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token') && !window.location.hash.includes('type=recovery')) {
          window.history.replaceState({}, '', window.location.pathname || '/');
          window.dispatchEvent(new Event('popstate'));
        }

        let isSuperAdmin = false;
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('is_superadmin')
            .eq('id', session.user.id)
            .maybeSingle();
          if (prof?.is_superadmin) {
            isSuperAdmin = true;
          }
        } catch {}

        const profile: UserProfile = {
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Owner',
          is_superadmin: isSuperAdmin,
          created_at: session.user.created_at,
          updated_at: session.user.created_at,
        };
        setUser(profile);

        try {
          const { data: st } = await supabase
            .from('staff')
            .select('*')
            .or(`user_id.eq.${session.user.id},email.eq.${session.user.email}`)
            .limit(1)
            .maybeSingle();
          if (st) {
            setStaff(st);
            setRole(st.role as StaffRole);
          } else if (isSuperAdmin) {
            setRole('SUPER_ADMIN');
          } else {
            setRole('OWNER');
          }
        } catch {
          if (isSuperAdmin) setRole('SUPER_ADMIN');
        }
      } else {
        setUser(null);
        setStaff(null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }

      if (session?.user) {
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token') && !window.location.hash.includes('type=recovery')) {
          window.history.replaceState({}, '', window.location.pathname || '/');
          window.dispatchEvent(new Event('popstate'));
        }

        let isSuperAdmin = false;
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('is_superadmin')
            .eq('id', session.user.id)
            .maybeSingle();
          if (prof?.is_superadmin) {
            isSuperAdmin = true;
          }
        } catch {}

        const profile: UserProfile = {
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Owner',
          is_superadmin: isSuperAdmin,
          created_at: session.user.created_at,
          updated_at: session.user.created_at,
        };
        setUser(profile);

        try {
          const { data: st } = await supabase
            .from('staff')
            .select('*')
            .or(`user_id.eq.${session.user.id},email.eq.${session.user.email}`)
            .limit(1)
            .maybeSingle();
          if (st) {
            setStaff(st);
            setRole(st.role as StaffRole);
          } else if (isSuperAdmin) {
            setRole('SUPER_ADMIN');
          } else {
            setRole('OWNER');
          }
        } catch {}
      } else {
        setUser(null);
        setStaff(null);
        setRole('OWNER');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password = ''): Promise<boolean> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        if (data.user) {
          let isSuperAdmin = false;
          try {
            const { data: prof } = await supabase
              .from('profiles')
              .select('is_superadmin')
              .eq('id', data.user.id)
              .maybeSingle();
            if (prof?.is_superadmin) {
              isSuperAdmin = true;
            }
          } catch {}

          const loggedInUser: UserProfile = {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            full_name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
            is_superadmin: isSuperAdmin,
            created_at: data.user.created_at,
            updated_at: data.user.created_at,
          };
          setUser(loggedInUser);

          // Query staff table to retrieve tenant and role
          try {
            const { data: staffData } = await supabase
              .from('staff')
              .select('*')
              .or(`user_id.eq.${data.user.id},email.eq.${cleanEmail}`)
              .limit(1)
              .maybeSingle();

            if (staffData) {
              setStaff(staffData);
              setRole(staffData.role);
            } else if (isSuperAdmin) {
              setRole('SUPER_ADMIN');
            } else {
              setRole('OWNER');
            }
          } catch {
            setRole(isSuperAdmin ? 'SUPER_ADMIN' : 'OWNER');
          }

          return true;
        }
        return false;
      }

      throw new Error('Supabase is not configured for authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithMagicLink = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured for Magic Link emails.');
      }
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            app_name: 'CafeOS',
          },
        },
      });
      if (error) {
        if (error.status === 429 || (error as any).code === 'over_email_send_rate_limit') {
          throw new Error('Email rate limit reached on Supabase default mailer (max 3/hr on free tier). Please sign in with password or try again shortly.');
        }
        throw error;
      }
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    email: string,
    password = '',
    fullName = 'Business Owner',
    businessName = 'My New Cafe'
  ): Promise<SignupResult> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim() || 'Business Owner';
    const cleanBiz = businessName.trim() || `${cleanName}'s Cafe`;

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanName,
              business_name: cleanBiz,
              app_name: 'CafeOS',
            },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) {
          if (error.status === 429 || (error as any).code === 'over_email_send_rate_limit') {
            throw new Error('Email rate limit reached on Supabase default mailer (max 3/hr on free tier). Please wait a few minutes, or configure custom SMTP in Supabase Dashboard for unlimited delivery.');
          }
          throw error;
        }

        // 1. Existing user handling:
        // In Supabase GoTrue, when an email already exists in auth.users, signUp returns
        // data.user with empty identities: [] to prevent email enumeration, and does NOT send an email.
        // We dispatch a 1-click magic login link immediately so a secure link definitely arrives in their inbox!
        if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
          console.log('User already registered in Supabase. Sending 1-click magic link to their inbox.');
          try {
            await supabase.auth.signInWithOtp({
              email: cleanEmail,
              options: {
                emailRedirectTo: window.location.origin,
                data: {
                  app_name: 'CafeOS',
                },
              },
            });
          } catch (otpErr) {
            console.warn('Could not dispatch magic link to existing user:', otpErr);
          }

          return {
            success: true,
            needsEmailConfirmation: true,
            message: `This email is already registered with CafeOS. A secure 1-click login link has been sent to ${cleanEmail}. Please check your inbox!`,
            email: cleanEmail,
          };
        }

        // 2. New user registration:
        if (data.user) {
          // If session is already created immediately (e.g. if email confirmation was disabled in Supabase dashboard)
          if (data.session) {
            const loggedInUser: UserProfile = {
              id: data.user.id,
              email: data.user.email || cleanEmail,
              full_name: cleanName,
              created_at: data.user.created_at,
              updated_at: data.user.created_at,
            };
            setUser(loggedInUser);
            setRole('OWNER');

            return {
              success: true,
              needsEmailConfirmation: false,
              message: 'Account created! Welcome to your restaurant workspace.',
              email: cleanEmail,
            };
          }

          // Email confirmation link was dispatched by Supabase to the user's inbox
          return {
            success: true,
            needsEmailConfirmation: true,
            message: `Verification link sent by CafeOS to ${cleanEmail}. Please check your inbox and click the confirmation link to activate your cafe workspace.`,
            email: cleanEmail,
          };
        }
      }

      // Offline / Local fallback
      setUser({
        id: 'user-' + Date.now(),
        email: cleanEmail,
        full_name: cleanName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setRole('OWNER');
      return { success: true, needsEmailConfirmation: false, email: cleanEmail };
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          if (error.status === 429 || (error as any).code === 'over_email_send_rate_limit') {
            throw new Error('Email rate limit reached on Supabase default mailer (max 3/hr on free tier). Please wait a short while before requesting another password reset.');
          }
          throw error;
        }
      }
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (newPassword: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) throw error;
      }
      setIsPasswordRecovery(false);
      if (typeof window !== 'undefined' && window.history.replaceState) {
        window.history.replaceState({}, '', '/');
      }
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyRecoveryOtp = async (email: string, token: string): Promise<boolean> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: 'recovery',
        });
        if (error) throw error;
        if (data?.user) {
          setIsPasswordRecovery(true);
          return true;
        }
      }
      setIsPasswordRecovery(true);
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const verifySignupOtp = async (email: string, token: string): Promise<boolean> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();
    try {
      if (isSupabaseConfigured) {
        let res = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: 'signup',
        });
        if (res.error) {
          res = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: cleanToken,
            type: 'email',
          });
        }
        if (res.error) throw res.error;
        if (res.data?.user) {
          const profile: UserProfile = {
            id: res.data.user.id,
            email: res.data.user.email || cleanEmail,
            full_name: res.data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
            created_at: res.data.user.created_at,
            updated_at: res.data.user.created_at,
          };
          setUser(profile);
          setRole('OWNER');

          try {
            const { data: st } = await supabase
              .from('staff')
              .select('*')
              .or(`user_id.eq.${res.data.user.id},email.eq.${cleanEmail}`)
              .limit(1)
              .maybeSingle();
            if (st) {
              setStaff(st);
            }
          } catch {}

          if (typeof window !== 'undefined' && window.history.replaceState) {
            window.history.replaceState({}, '', '/');
            window.dispatchEvent(new Event('popstate'));
          }
          return true;
        }
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const clearPasswordRecoveryState = () => {
    setIsPasswordRecovery(false);
    if (typeof window !== 'undefined' && window.history.replaceState) {
      window.history.replaceState({}, '', '/login');
    }
  };

  const resendConfirmationEmail = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: cleanEmail,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) {
          console.warn('Signup resend note, attempting 1-click magic link fallback:', error.message);
          const { error: otpErr } = await supabase.auth.signInWithOtp({
            email: cleanEmail,
            options: {
              emailRedirectTo: window.location.origin,
              data: { app_name: 'CafeOS' },
            },
          });
          if (otpErr) throw error;
        }
      }
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const staffPinLogin = async (pin: string, branchId?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        let targetBizId = localStorage.getItem('cafeos_active_biz_id');
        if (!targetBizId) {
          const bizListStr = localStorage.getItem('cafeos_businesses');
          if (bizListStr) {
            try {
              const parsed = JSON.parse(bizListStr);
              if (Array.isArray(parsed) && parsed[0]?.id) {
                targetBizId = parsed[0].id;
              }
            } catch {}
          }
        }

        if (!targetBizId) {
          console.error('No active business found for staff PIN authentication');
          return false;
        }

        const { data, error } = await supabase.rpc('staff_pin_login', {
          p_business_id: targetBizId,
          p_pin: pin.trim(),
        });

        if (error) {
          console.error('staff_pin_login RPC error:', error);
          return false;
        }

        if (data) {
          const staffRec: Staff = data;
          setStaff(staffRec);
          setRole(staffRec.role);
          setUser({
            id: staffRec.user_id || `staff-${staffRec.id}`,
            email: staffRec.email,
            full_name: staffRec.full_name,
            phone: staffRec.phone,
            is_superadmin: false,
            created_at: staffRec.created_at,
            updated_at: staffRec.updated_at,
          });
          return true;
        }
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setStaff(null);
    setRole('OWNER');
    localStorage.removeItem('cafeos_user');
    localStorage.removeItem('cafeos_staff');
    localStorage.removeItem('cafeos_role');
    localStorage.removeItem('cafeos_businesses');
    localStorage.removeItem('cafeos_branches');
    localStorage.removeItem('cafeos_active_biz_id');
    localStorage.removeItem('cafeos_active_branch_id');
    localStorage.removeItem('cafeos_tables');
    localStorage.removeItem('cafeos_orders');
    localStorage.removeItem('cafeos_categories');
    localStorage.removeItem('cafeos_menu_items');
    localStorage.removeItem('cafeos_customers');
    localStorage.removeItem('cafeos_coupons');
    localStorage.removeItem('cafeos_inventory');
    localStorage.removeItem('cafeos_campaigns');
  };

  const switchRolePreview = (newRole: StaffRole) => {
    // Strictly prevent non-superadmins from escalating themselves to SUPER_ADMIN
    if (newRole === 'SUPER_ADMIN' && !user?.is_superadmin) {
      console.warn('Unauthorized attempt to switch to SUPER_ADMIN role blocked.');
      return;
    }

    // Only genuine superadmins or owners can switch preview roles
    if (!user?.is_superadmin && staff?.role !== 'OWNER' && role !== 'OWNER') {
      console.warn('Role preview is restricted to owners and administrators.');
      return;
    }

    setRole(newRole);
  };

  const hasPermission = (allowedRoles: StaffRole[]): boolean => {
    if (role === 'SUPER_ADMIN') return true;
    return allowedRoles.includes(role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        staff,
        role,
        isAuthenticated: Boolean(user) && !isPasswordRecovery,
        isLoading,
        isPasswordRecovery,
        login,
        loginWithMagicLink,
        signup,
        resetPassword,
        updatePassword,
        verifyRecoveryOtp,
        verifySignupOtp,
        clearPasswordRecoveryState,
        resendConfirmationEmail,
        staffPinLogin,
        logout,
        switchRolePreview,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
