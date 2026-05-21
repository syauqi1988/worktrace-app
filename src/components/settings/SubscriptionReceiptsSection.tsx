import { useEffect, useState } from 'react';
import { Download, FileText, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Receipt {
  id: string;
  receipt_number: string;
  plan: string;
  billing_period: string;
  amount: number;
  payment_date: string;
  pdf_path: string | null;
  emailed_at: string | null;
  status: string;
  created_at: string;
}

export default function SubscriptionReceiptsSection() {
  const [items, setItems] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subscription_receipts' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error) setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const download = async (r: Receipt) => {
    if (!r.pdf_path) return;
    setDownloadingId(r.id);
    try {
      const { data, error } = await supabase.storage
        .from('subscription-receipts')
        .createSignedUrl(r.pdf_path, 120);
      if (error || !data?.signedUrl) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (e: any) {
      toast.error('Failed to download receipt');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading receipts…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No official subscription receipts yet. They appear here automatically after each successful payment.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3">
          <div className="flex items-start gap-3 min-w-0">
            <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{r.receipt_number}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(r.payment_date).toLocaleDateString()} · {r.plan} · {r.billing_period} · RM {Number(r.amount).toFixed(2)}
              </p>
              {r.emailed_at && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Mail className="h-3 w-3" /> Emailed
                </p>
              )}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => download(r)} disabled={!r.pdf_path || downloadingId === r.id}>
            {downloadingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="ml-1 hidden sm:inline">Download</span>
          </Button>
        </div>
      ))}
    </div>
  );
}
