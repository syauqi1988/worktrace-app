import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function usePlanGate() {
  const { profile } = useAuth();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');

  const isFree = !profile || profile.plan === 'free';

  const checkJobLimit = async (userId: string): Promise<boolean> => {
    if (!isFree) return true;
    const { count } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('status', 'in', '("Completed","Cancelled")');
    if ((count ?? 0) >= 5) {
      setUpgradeReason('Anda telah mencapai had 5 kerja aktif pada pelan Free.');
      setUpgradeOpen(true);
      return false;
    }
    return true;
  };

  const checkCustomerLimit = async (userId: string): Promise<boolean> => {
    if (!isFree) return true;
    const { count } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if ((count ?? 0) >= 3) {
      setUpgradeReason('Anda telah mencapai had 3 pelanggan pada pelan Free.');
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

  const canShowLogo = !isFree;

  return {
    isFree,
    upgradeOpen,
    setUpgradeOpen,
    upgradeReason,
    checkJobLimit,
    checkCustomerLimit,
    checkWhatsAppShare,
    canShowLogo,
  };
}
