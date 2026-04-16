import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import PlanCards from '@/components/PlanCards';
import { useBillPlz } from '@/hooks/useBillPlz';
import logo from '@/assets/logo.png';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [sstRegistered, setSstRegistered] = useState(false);
  const [sstNumber, setSstNumber] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  const { initiatePayment, isLoading } = useBillPlz();

  // Fallback: process referral if not yet saved
  useEffect(() => {
    const processReferral = async () => {
      const savedRef = localStorage.getItem('worktrace_ref');
      if (!savedRef || !user || profile?.referred_by) return;
      try {
        const { data: referrer } = await supabase
          .from('profiles').select('id').eq('referral_code', savedRef).maybeSingle();
        if (referrer && referrer.id !== user.id) {
          const { error: updateErr } = await supabase
            .from('profiles')
            .update({ referred_by: savedRef } as any)
            .eq('id', user.id);
          if (!updateErr) {
            const { error: insertErr } = await supabase.from('referrals').insert({
              referrer_id: referrer.id, referred_id: user.id,
              referral_code: savedRef, status: 'pending',
            } as any);
            if (!insertErr) {
              console.log('Referral recorded in onboarding:', savedRef);
              localStorage.removeItem('worktrace_ref');
            }
          }
        } else {
          localStorage.removeItem('worktrace_ref');
        }
      } catch (err) {
        console.error('Onboarding referral error:', err);
      }
    };
    processReferral();
  }, [user, profile]);

  const handleStep1Next = async () => {
    await updateProfile({ company_name: companyName || null, phone: phone || null, address: address || null });
    setStep(2);
  };

  const handleStep2Next = async () => {
    await updateProfile({ sst_registered: sstRegistered });
    setStep(3);
  };

  const handlePlanSelect = async (planId: string, billingPeriod: string) => {
    if (planId === 'free') {
      await supabase.rpc('set_onboarding_plan', { p_plan: 'free', p_billing_period: 'monthly' });
      await refreshProfile();
      navigate('/dashboard', { replace: true });
    } else {
      await supabase.rpc('set_onboarding_plan', { p_plan: 'free', p_billing_period: 'monthly' });
      await refreshProfile();
      initiatePayment(planId as 'pro', billingPeriod as 'monthly' | 'yearly');
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-center py-6 border-b border-border">
        <img src={logo} alt="WorkTrace" className="h-10 logo-dark" />
      </div>

      <div className="flex items-center justify-center gap-2 py-6 px-4">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-2 w-16 sm:w-24 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-border'}`} />
          </div>
        ))}
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pb-8">
        <div className="w-full max-w-lg">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Cerita sikit pasal syarikat anda</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Nama Syarikat *</label>
                  <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Contoh: Ali Aircond Services" className="h-11 rounded-lg" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">No. Telefon</label>
                  <Input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0123456789" className="h-11 rounded-lg" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Alamat</label>
                  <textarea
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Alamat syarikat (pilihan)"
                    className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button onClick={handleStep1Next} className="w-full h-11 rounded-lg" disabled={!companyName.trim()}>Seterusnya</Button>
                <button onClick={() => setStep(2)} className="text-sm text-muted-foreground hover:text-foreground">Langkau buat masa ni</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Siapkan profil anda</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Logo Syarikat (pilihan)</label>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="h-16 w-16 object-contain rounded-lg border border-border" />
                    ) : (
                      <div className="h-16 w-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-xs">Logo</div>
                    )}
                    <label className="cursor-pointer">
                      <span className="text-sm text-primary hover:underline">Muat naik logo</span>
                      <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                    </label>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium text-foreground">SST Berdaftar?</span>
                  <Switch checked={sstRegistered} onCheckedChange={setSstRegistered} />
                </div>
                {sstRegistered && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">No. SST</label>
                    <Input value={sstNumber} onChange={e => setSstNumber(e.target.value)} placeholder="No. pendaftaran SST" className="h-11 rounded-lg" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <Button onClick={handleStep2Next} className="w-full h-11 rounded-lg">Seterusnya</Button>
                <button onClick={() => setStep(3)} className="text-sm text-muted-foreground hover:text-foreground">Langkau buat masa ni</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Pilih pelan yang sesuai</h2>
              </div>
              <PlanCards onSelect={handlePlanSelect} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
