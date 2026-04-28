import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Lock, Crown } from 'lucide-react';
import UpgradeModal from '@/components/UpgradeModal';

interface TeamOnlyRouteProps {
  children: React.ReactNode;
  featureName?: string;
}

export default function TeamOnlyRoute({ children, featureName = 'Work Order' }: TeamOnlyRouteProps) {
  const { profile, loading } = useAuth();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return <Navigate to="/login" replace />;

  const isTeam = profile.plan === 'team';
  if (isTeam) return <>{children}</>;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="bg-card rounded-2xl border border-border p-6 md:p-8 text-center space-y-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
          <Crown className="h-3.5 w-3.5" /> Untuk Pelan Team Sahaja
        </div>
        <h1 className="text-xl font-bold text-foreground">{featureName} dikunci</h1>
        <p className="text-sm text-muted-foreground">
          Ciri <strong>{featureName}</strong> hanya tersedia untuk pengguna pelan <strong>Team</strong>.
          Naik taraf untuk akses penuh termasuk pengurusan pasukan, work order, dan banyak lagi.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Button onClick={() => setUpgradeOpen(true)} className="rounded-lg gap-2">
            <Crown className="h-4 w-4" /> Naik Taraf ke Team
          </Button>
        </div>
      </div>
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={`${featureName} hanya tersedia untuk pengguna pelan Team.`}
      />
    </div>
  );
}
