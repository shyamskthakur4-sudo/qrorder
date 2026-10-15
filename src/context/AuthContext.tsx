import React, { createContext, useContext, useState, useEffect } from 'react';
import { StaffRole, UserProfile, Staff } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { INITIAL_STAFF } from '../lib/mockData';

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
    return (localStorage.getItem('cafeos_role') as StaffRole) || 'OWNER';
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
        const profile: UserProfile = {
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Owner',
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
          }
        } catch {}
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
        const profile: UserProfile = {
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Owner',
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
          const loggedInUser: UserProfile = {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            full_name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
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
            } else {
              setRole('OWNER');
            }
          } catch {
            setRole('OWNER');
          }

          return true;
        }
      }

      // Local / Offline / Demo authentication
      const matchedStaff = INITIAL_STAFF.find((s) => s.email.toLowerCase() === cleanEmail);
      if (matchedStaff) {
        setStaff(matchedStaff);
        setRole(matchedStaff.role);
        setUser({
          id: matchedStaff.user_id || 'usr-demo',
          email: matchedStaff.email,
          full_name: matchedStaff.full_name,
          phone: matchedStaff.phone,
          is_superadmin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else if (cleanEmail === 'admin@cafeos.app') {
        setRole('SUPER_ADMIN');
        setUser({
          id: 'super-admin-01',
          email: 'admin@cafeos.app',
          full_name: 'Platform Super Admin',
          is_superadmin: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        // Fallback generic owner login
        setRole('OWNER');
        setUser({
          id: 'user-' + Date.now(),
          email: cleanEmail,
          full_name: cleanEmail.split('@')[0],
          is_superadmin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      return true;
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
      if (error) throw error;
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
        if (error) throw error;

        // Check if email confirmation is required
        const needsConfirmation = !data.session && data.user && !data.user.email_confirmed_at;

        if (data.user) {
          const newUser: UserProfile = {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            full_name: cleanName,
            created_at: data.user.created_at,
            updated_at: data.user.created_at,
          };

          if (!needsConfirmation) {
            setUser(newUser);
            setRole('OWNER');
            return {
              success: true,
              needsEmailConfirmation: false,
              message: 'Account created! Welcome to CafeOS.',
              email: cleanEmail,
            };
          } else {
            return {
              success: true,
              needsEmailConfirmation: true,
              message: `Verification email sent by CafeOS to ${cleanEmail}. Please check your inbox and verify your email.`,
              email: cleanEmail,
            };
          }
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
        if (error) throw error;
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
        if (error) throw error;
      }
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const staffPinLogin = async (pin: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const matched = INITIAL_STAFF.find((s) => s.pin_code === pin && s.is_active);
      if (matched) {
        setStaff(matched);
        setRole(matched.role);
        setUser({
          id: matched.user_id || 'usr-pin',
          email: matched.email,
          full_name: matched.full_name,
          phone: matched.phone,
          is_superadmin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        return true;
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
  };

  const switchRolePreview = (newRole: StaffRole) => {
    setRole(newRole);
    if (newRole === 'SUPER_ADMIN') {
      setUser((prev) => ({
        id: prev?.id || 'super-admin-01',
        email: 'admin@cafeos.app',
        full_name: 'Platform Super Admin',
        is_superadmin: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    } else {
      const match = INITIAL_STAFF.find((s) => s.role === newRole);
      if (match) {
        setStaff(match);
        setUser({
          id: match.user_id || 'usr-' + newRole.toLowerCase(),
          email: match.email,
          full_name: match.full_name,
          phone: match.phone,
          is_superadmin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
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
