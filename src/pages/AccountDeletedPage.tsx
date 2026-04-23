import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function AccountDeletedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-card border border-border rounded-2xl shadow-sm max-w-md w-full p-8 text-center space-y-4">
        <div className="text-5xl">🗑️</div>
        <h1 className="text-2xl font-bold text-foreground">Akaun Ini Telah Dipadam</h1>
        <p className="text-sm text-muted-foreground">
          Akaun yang berkaitan dengan emel ini telah dipadam dan tidak boleh dipulihkan lagi.
        </p>
        <p className="text-sm text-muted-foreground">
          Jika ini adalah kesilapan, hubungi:{' '}
          <a href="mailto:customerservice@worktrace.my" className="underline text-foreground">
            customerservice@worktrace.my
          </a>
        </p>
        <Button onClick={() => navigate('/login')} className="w-full rounded-lg">
          Daftar Akaun Baru
        </Button>
      </div>
    </div>
  );
}
