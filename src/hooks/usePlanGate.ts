import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

/**
 * Returns the ISO timestamp for the first millisecond of the current calendar month (local time).
 */
function startOfMonthISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export function usePlanGate() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');

  // Live limits from pricing_plans table (admin-editable).
  // null = unlimited; undefined = still loading (fall back to safe defaults).
  const [maxJobs, setMaxJobs] = useState<number | null | undefined>(undefined);
  const [maxCustomers, setMaxCustomers] = useState<number | null | undefined>(undefined);
  // Admin-controlled feature flags for the current user's plan.
  const [whatsappUnlocked, setWhatsappUnlocked] = useState<boolean | undefined>(undefined);

  const isFree = !profile || profile.plan === 'free';
  const isPro = profile?.plan === 'pro';
  const isTeam = profile?.plan === 'team';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('pricing_plans')
        .select('max_jobs, max_customers')
        .eq('plan_key', 'free')
        .maybeSingle();
      if (cancelled) return;
      // Fallback to historical defaults if the row is missing
      setMaxJobs(data ? data.max_jobs : 5);
      setMaxCustomers(data ? data.max_customers : 3);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Read whatsapp_share flag for the current user's plan from plan_feature_flags.
  useEffect(() => {
    if (!profile?.plan) return;
    let cancelled = false;
    (async () => {
      const { data: feature } = await supabase
        .from('features').select('id').eq('slug', 'whatsapp_share').maybeSingle();
      const { data: plan } = await supabase
        .from('plans').select('id').eq('slug', profile.plan).maybeSingle();
      if (!feature || !plan) {
        if (!cancelled) setWhatsappUnlocked(false);
        return;
      }
      const { data: flag } = await supabase
        .from('plan_feature_flags')
        .select('is_unlocked')
        .eq('plan_id', plan.id)
        .eq('feature_id', feature.id)
        .maybeSingle();
      if (!cancelled) setWhatsappUnlocked(flag?.is_unlocked ?? false);
    })();
    return () => { cancelled = true; };
  }, [profile?.plan]);

  const checkJobLimit = async (userId: string): Promise<boolean> => {
    if (!isFree) return true;
    const limit = maxJobs === undefined ? 5 : maxJobs;
    if (limit === null) return true; // unlimited
    const { count } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonthISO());
    if ((count ?? 0) >= limit) {
      setUpgradeReason(
        t('plan.jobLimitReached', {
          limit,
          defaultValue: `Anda telah mencapai had ${limit} kerja baru bulan ini pada pelan Free. Had akan reset pada bulan hadapan.`,
        })
      );
      setUpgradeOpen(true);
      return false;
    }
    return true;
  };

  const checkCustomerLimit = async (userId: string): Promise<boolean> => {
    if (!isFree) return true;
    const limit = maxCustomers === undefined ? 3 : maxCustomers;
    if (limit === null) return true; // unlimited
    const { count } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonthISO());
    if ((count ?? 0) >= limit) {
      setUpgradeReason(
        t('plan.customerLimitReached', {
          limit,
          defaultValue: `Anda telah mencapai had ${limit} pelanggan baru bulan ini pada pelan Free. Had akan reset pada bulan hadapan.`,
        })
      );
      setUpgradeOpen(true);
      return false;
    }
    return true;
  };

  const checkWhatsAppShare = (): boolean => {
    if (!isFree) return true;
    setUpgradeReason('WhatsApp share hanya tersedia untuk pengguna Pro.');
    setUpgradeOpen(true);
    return false;
  };

  const checkTeamFeature = (featureName = 'Work Order'): boolean => {
    if (isTeam) return true;
    toast.info(`${featureName} akan datang. Pelan Team masih dalam pembangunan.`);
    return false;
  };

  const canShowLogo = !isFree;

  return {
    isFree,
    isPro,
    isTeam,
    upgradeOpen,
    setUpgradeOpen,
    upgradeReason,
    checkJobLimit,
    checkCustomerLimit,
    checkWhatsAppShare,
    checkTeamFeature,
    canShowLogo,
    maxJobs,
    maxCustomers,
  };
}
