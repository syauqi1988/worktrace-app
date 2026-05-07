import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FeatureFlag {
  is_unlocked: boolean;
  limit_value: number | null;
}

/**
 * Reads plan_feature_flags for the current user's plan via RLS policy
 * `plan flags read for my plan (profiles.plan)`. Admin can edit these
 * from admin.worktrace.my and they take effect here.
 *
 * Returns `{ is_unlocked: false, limit_value: null }` while loading or
 * when no row exists, so callers can treat it as a safe default.
 */
export function useFeatureFlag(slug: string): FeatureFlag & { isLoading: boolean } {
  const { profile } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['feature_flag', profile?.plan, slug],
    enabled: !!profile?.plan && !!slug,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<FeatureFlag> => {
      const { data: feature } = await supabase
        .from('features')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (!feature) return { is_unlocked: false, limit_value: null };

      const { data: plan } = await supabase
        .from('plans')
        .select('id')
        .eq('slug', profile!.plan)
        .maybeSingle();
      if (!plan) return { is_unlocked: false, limit_value: null };

      const { data: flag } = await supabase
        .from('plan_feature_flags')
        .select('is_unlocked, limit_value')
        .eq('plan_id', plan.id)
        .eq('feature_id', feature.id)
        .maybeSingle();

      return {
        is_unlocked: flag?.is_unlocked ?? false,
        limit_value: flag?.limit_value ?? null,
      };
    },
  });

  return {
    is_unlocked: data?.is_unlocked ?? false,
    limit_value: data?.limit_value ?? null,
    isLoading,
  };
}
