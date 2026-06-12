import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useBillPlz() {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const initiatePayment = async (
    plan: 'pro' | 'team',
    billing_period: 'monthly' | 'yearly' = 'monthly'
  ) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('billplz-create-bill', {
        body: {
          plan,
          billing_period,
          user_email: user.email,
          user_name: profile?.company_name || user.email,
          user_id: user.id,
          redirect_base_url: window.location.origin,
        },
      });

      if (error) throw error;

      // Redirect to BillPlz payment page
      window.location.href = data.payment_url;
    } catch (error: any) {
      toast.error('Gagal memulakan pembayaran. Sila cuba lagi.');
      console.error('BillPlz error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { initiatePayment, isLoading };
}
