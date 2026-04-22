import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PricingFeature {
  label: string;
  included: boolean;
}

export interface PricingPlan {
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
  features: PricingFeature[];
  is_active: boolean;
  is_featured: boolean;
  badge_text: string | null;
  badge_color: string | null;
  sort_order: number;
}

export function usePricingPlans() {
  const query = useQuery({
    queryKey: ['pricing_plans'],
    queryFn: async (): Promise<PricingPlan[]> => {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        ...row,
        features: Array.isArray(row.features) ? row.features : [],
      })) as PricingPlan[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const getPlan = (planKey: string) =>
    query.data?.find(p => p.plan_key === planKey);

  return { ...query, plans: query.data ?? [], getPlan };
}
