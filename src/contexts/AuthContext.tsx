import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  email: string;
}

interface Profile {
  id: string;
  company_name: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  plan: string;
  tin_number: string | null;
  msic_code: string | null;
  sst_registered: boolean;
  lhdn_enabled: boolean;
  onboarding_complete: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithOtp: (email: string) => Promise<{ error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ error?: string; isNewUser?: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Mock auth for now — will be replaced with Supabase
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('worktrace_user');
    const storedProfile = localStorage.getItem('worktrace_profile');
    if (stored) {
      setUser(JSON.parse(stored));
      if (storedProfile) setProfile(JSON.parse(storedProfile));
    }
    setLoading(false);
  }, []);

  const signInWithOtp = async (email: string): Promise<{ error?: string }> => {
    // Mock: always succeed
    return {};
  };

  const verifyOtp = async (email: string, token: string): Promise<{ error?: string; isNewUser?: boolean }> => {
    if (token === '000000') {
      return { error: 'Kod tidak sah atau telah tamat tempoh' };
    }
    const id = crypto.randomUUID();
    const newUser = { id, email };
    setUser(newUser);
    localStorage.setItem('worktrace_user', JSON.stringify(newUser));

    const existingProfile = localStorage.getItem('worktrace_profile');
    if (existingProfile) {
      const p = JSON.parse(existingProfile);
      setProfile(p);
      return { isNewUser: !p.onboarding_complete };
    }

    const newProfile: Profile = {
      id,
      company_name: null,
      phone: null,
      address: null,
      logo_url: null,
      plan: 'free',
      tin_number: null,
      msic_code: null,
      sst_registered: false,
      lhdn_enabled: false,
      onboarding_complete: false,
    };
    setProfile(newProfile);
    localStorage.setItem('worktrace_profile', JSON.stringify(newProfile));
    return { isNewUser: true };
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem('worktrace_user');
    localStorage.removeItem('worktrace_profile');
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!profile) return;
    const updated = { ...profile, ...data };
    setProfile(updated);
    localStorage.setItem('worktrace_profile', JSON.stringify(updated));
  };

  const refreshProfile = async () => {
    const stored = localStorage.getItem('worktrace_profile');
    if (stored) setProfile(JSON.parse(stored));
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithOtp, verifyOtp, signOut, updateProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
