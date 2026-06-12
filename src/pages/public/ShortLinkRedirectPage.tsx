import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, XCircle } from 'lucide-react';

export default function ShortLinkRedirectPage() {
  const { code } = useParams<{ code: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) { setError('Invalid link'); return; }
    (async () => {
      const { data } = await supabase
        .from('short_links')
        .select('target_url')
        .eq('code', code)
        .maybeSingle();
      if (!data?.target_url) {
        setError('Link not found or expired');
        return;
      }
      // Allowlist trusted domains to prevent open-redirect phishing.
      const allowedHostSuffixes = [
        'worktrace.my',
        'worktrace.app',
        'worktraceapp.lovable.app',
        'lovable.app',
        'supabase.co',
        'supabase.in',
      ];
      try {
        const u = new URL(data.target_url);
        const sameOrigin = u.origin === window.location.origin;
        const allowed = sameOrigin || allowedHostSuffixes.some(
          (suffix) => u.hostname === suffix || u.hostname.endsWith('.' + suffix)
        );
        if (!allowed) {
          setError('Link leads to an untrusted domain');
          return;
        }
        window.location.replace(u.toString());
      } catch {
        setError('Invalid link');
      }
    })();
  }, [code]);


  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
          <h1 className="text-xl font-bold mb-1">Invalid Link</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
        <p className="text-sm">Redirecting…</p>
      </div>
    </div>
  );
}
