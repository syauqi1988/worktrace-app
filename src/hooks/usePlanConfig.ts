import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlanFeature {
  label: string;
  included: boolean;
}

export interface PlanRow {
  id: string;
  plan_key: string;
  name: string;
  tagline: string | null;
  monthly_price: number;
  yearly_price: number;
  yearly_discount_pct: number;
  currency: string;
  max_jobs: number | null;
  max_customers: number | null;
  features: PlanFeature[];
  is_active: boolean;
  is_featured: boolean;
  badge_text: string | null;
  badge_color: string | null;
  sort_order: number;
}

/**
 * Live plan configuration sourced from the `pricing_plans` table.
 * Replaces hardcoded limits/prices/features so admins can update them in real time.
 */
export function usePlanConfig() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (cancelled) return;
      const normalised = (data ?? []).map((row: any) => ({
        ...row,
        features: Array.isArray(row.features) ? row.features : [],
      })) as PlanRow[];
      setPlans(normalised);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getPlan = useCallback(
    (key: string) => plans.find((p) => p.plan_key === key),
    [plans],
  );

  /** Returns the configured limit, or `null` for unlimited. */
  const getLimit = useCallback(
    (key: string, field: 'max_jobs' | 'max_customers'): number | null => {
      const p = getPlan(key);
      if (!p) return null;
      const v = p[field];
      return v ?? null;
    },
    [getPlan],
  );

  const getPrice = useCallback(
    (key: string, period: 'monthly' | 'yearly'): number => {
      const p = getPlan(key);
      if (!p) return 0;
      return period === 'monthly' ? p.monthly_price : p.yearly_price;
    },
    [getPlan],
  );

  const getFeatures = useCallback(
    (key: string): PlanFeature[] => getPlan(key)?.features ?? [],
    [getPlan],
  );

  return { plans, loading, getPlan, getLimit, getPrice, getFeatures };
}
