import { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-border p-8 flex flex-col items-center justify-center text-center bg-card">
      <Icon className="h-12 w-12 text-muted-foreground/40 mb-4" />
      <p className="text-base font-medium text-foreground mb-2">{title}</p>
      <p className="text-sm text-muted-foreground mb-6">{description}</p>
      {actionLabel && actionHref && (
        <Button onClick={() => navigate(actionHref)} variant="outline" className="rounded-lg gap-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
