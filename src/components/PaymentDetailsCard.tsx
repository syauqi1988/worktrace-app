import { Landmark } from 'lucide-react';

export interface PaymentDetails {
  bank_name?: string;
  account_number?: string;
  account_holder?: string;
  payment_types?: string[];
  note?: string;
}

export function hasPaymentDetails(p?: PaymentDetails | null): boolean {
  if (!p) return false;
  return Boolean(
    (p.bank_name && p.bank_name.trim()) ||
    (p.account_number && p.account_number.trim()) ||
    (p.account_holder && p.account_holder.trim()) ||
    (Array.isArray(p.payment_types) && p.payment_types.length > 0) ||
    (p.note && p.note.trim())
  );
}

export default function PaymentDetailsCard({ details }: { details: PaymentDetails }) {
  if (!hasPaymentDetails(details)) return null;
  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Landmark className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Maklumat Pembayaran</h3>
      </div>
      <div className="space-y-1 text-sm">
        {details.bank_name && (
          <div className="flex">
            <span className="text-muted-foreground w-28 shrink-0">Bank</span>
            <span className="font-medium text-foreground">{details.bank_name}</span>
          </div>
        )}
        {details.account_number && (
          <div className="flex">
            <span className="text-muted-foreground w-28 shrink-0">No. Akaun</span>
            <span className="font-medium text-foreground">{details.account_number}</span>
          </div>
        )}
        {details.account_holder && (
          <div className="flex">
            <span className="text-muted-foreground w-28 shrink-0">Nama</span>
            <span className="font-medium text-foreground">{details.account_holder}</span>
          </div>
        )}
        {Array.isArray(details.payment_types) && details.payment_types.length > 0 && (
          <div className="flex">
            <span className="text-muted-foreground w-28 shrink-0">Jenis</span>
            <span className="font-medium text-foreground">{details.payment_types.join(' / ')}</span>
          </div>
        )}
        {details.note && (
          <div className="flex">
            <span className="text-muted-foreground w-28 shrink-0">Nota</span>
            <span className="text-foreground">{details.note}</span>
          </div>
        )}
      </div>
    </div>
  );
}
