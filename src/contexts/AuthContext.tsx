import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  company_name: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  plan: string;
  billing_period: string;
  subscription_status: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  billplz_bill_id: string | null;
  tin_number: string | null;
  msic_code: string | null;
  ssm_number_new: string | null;
  ssm_number_old: string | null;
  sst_registered: boolean;
  lhdn_enabled: boolean;
  onboarding_complete: boolean;
  quotation_terms: string | null;
  invoice_terms: string | null;
  payment_methods: any[];
  referral_code: string | null;
  referred_by: string | null;
  referral_count: number;
  free_months_earned: number;
  free_months_used: number;
  tutorial_completed: boolean;
  tutorial_seen_count: number;
  subscription_cancelled: boolean;
  cancel_requested_at: string | null;
  cancel_reason: string | null;
  last_support_visit: string | null;
  doc_number_settings?: any;
  account_status?: string | null;
  deletion_requested_at?: string | null;
  deletion_scheduled_at?: string | null;
  deletion_reason?: string | null;
  deletion_cancelled_at?: string | null;
  whatsapp_templates?: any;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithOtp: (email: string, captchaToken?: string) => Promise<{ error?: string }>;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) {
      const p = data as any;
      setProfile({
        ...p,
        payment_methods: Array.isArray(p.payment_methods) ? p.payment_methods : [],
        referral_count: p.referral_count || 0,
        free_months_earned: p.free_months_earned || 0,
        free_months_used: p.free_months_used || 0,
      });
    }
  }, []);

  // Capture referral code from URL on any page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('worktrace_ref', ref);
      console.log('Referral code captured:', ref);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => { fetchProfile(session.user.id); }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signInWithOtp = async (email: string, captchaToken?: string): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, captchaToken },
    });
    if (error) return { error: error.message };
    return {};
  };

  const verifyOtp = async (email: string, token: string): Promise<{ error?: string; isNewUser?: boolean }> => {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) return { error: error.message };

    const userId = data.user?.id;
    if (!userId) return { error: 'Ralat pengesahan' };

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileData) {
      const p = profileData as any;
      setProfile({
        ...p,
        payment_methods: Array.isArray(p.payment_methods) ? p.payment_methods : [],
        referral_count: p.referral_count || 0,
        free_months_earned: p.free_months_earned || 0,
        free_months_used: p.free_months_used || 0,
      });

      const isNew = !profileData.onboarding_complete;
      
      // Process referral if user hasn't been referred yet
      const savedRef = localStorage.getItem('worktrace_ref');
      if (savedRef && !profileData.referred_by) {
        try {
          const { data: referrer } = await supabase
            .from('profiles').select('id').eq('referral_code', savedRef).maybeSingle();
          if (referrer && referrer.id !== userId) {
            const { error: updateErr } = await supabase
              .from('profiles')
              .update({ referred_by: savedRef } as any)
              .eq('id', userId);
            if (updateErr) {
              console.error('Referral profile update failed:', updateErr);
            } else {
              // Only insert referral record if profile update succeeded
              const { error: insertErr } = await supabase.from('referrals').insert({
                referrer_id: referrer.id, referred_id: userId,
                referral_code: savedRef, status: 'pending',
              } as any);
              if (insertErr) {
                console.error('Referral insert failed:', insertErr);
              } else {
                console.log('Referral recorded successfully:', savedRef);
                localStorage.removeItem('worktrace_ref');
              }
            }
          } else {
            // Invalid or self-referral code, clear it
            localStorage.removeItem('worktrace_ref');
          }
        } catch (err) {
          console.error('Referral processing error:', err);
        }
      } else if (savedRef && profileData.referred_by) {
        // Already referred, clear localStorage
        localStorage.removeItem('worktrace_ref');
      }
      
      return { isNewUser: isNew };
    }

    return { isNewUser: true };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update(data as any)
      .eq('id', user.id);
    if (!error) {
      setProfile(prev => prev ? { ...prev, ...data } : null);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithOtp, verifyOtp, signOut, updateProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
