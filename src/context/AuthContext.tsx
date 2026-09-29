import React, { createContext, useContext, useState, useEffect } from 'react';
import { StaffRole, UserProfile, Staff } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { INITIAL_STAFF } from '../lib/mockData';

interface AuthContextType {
  user: UserProfile | null;
  staff: Staff | null;
  role: StaffRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  signup: (email: string, password?: string, fullName?: string, businessName?: string) => Promise<boolean>;
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
      try { return JSON.parse(saved); } catch {}
    }
    // Default demo user is the Owner
    return {
      id: 'user-owner-1',
      email: 'owner@roastbrew.com',
      full_name: 'Vikram Mehta',
      phone: '+91 98765 43210',
      is_superadmin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  const [staff, setStaff] = useState<Staff | null>(() => {
    const saved = localStorage.getItem('cafeos_staff');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_STAFF[0]; // Owner
  });

  const [role, setRole] = useState<StaffRole>(() => {
    return (localStorage.getItem('cafeos_role') as StaffRole) || 'OWNER';
  });

  const [isLoading, setIsLoading] = useState(false);

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

  // Check Supabase session if configured
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || 'Owner',
          created_at: session.user.created_at,
          updated_at: session.user.created_at,
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || 'Owner',
          created_at: session.user.created_at,
          updated_at: session.user.created_at,
        });
      } else {
        // If logged out from Supabase
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password = ''): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email || email,
            full_name: data.user.user_metadata?.full_name || 'Owner',
            created_at: data.user.created_at,
            updated_at: data.user.created_at,
          });
          setRole('OWNER');
          return true;
        }
      }

      // Local / Offline / Demo authentication
      const matchedStaff = INITIAL_STAFF.find((s) => s.email.toLowerCase() === email.toLowerCase());
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
      } else if (email === 'admin@cafeos.app') {
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
          email,
          full_name: email.split('@')[0],
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

  const signup = async (
    email: string,
    password = '',
    fullName = 'Business Owner',
    _businessName = 'My New Cafe'
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email || email,
            full_name: fullName,
            created_at: data.user.created_at,
            updated_at: data.user.created_at,
          });
        }
      } else {
        setUser({
          id: 'user-' + Date.now(),
          email,
          full_name: fullName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      setRole('OWNER');
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
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        signup,
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
