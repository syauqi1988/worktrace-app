import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Account deletion gates
  if (profile) {
    const status = (profile as any).account_status;
    const scheduledAt = (profile as any).deletion_scheduled_at as string | null;
    if (status === 'deleted') {
      return <Navigate to="/account-deleted" replace />;
    }
    if (status === 'pending_deletion' && scheduledAt && new Date(scheduledAt) <= new Date()) {
      // Past grace period — treat as deleted
      return <Navigate to="/account-deleted" replace />;
    }
  }

  // If onboarding not complete and not already on /onboarding
  if (profile && !profile.onboarding_complete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
