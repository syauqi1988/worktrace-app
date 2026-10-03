import { useState } from 'react';
import { ChevronDown, FileText, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useTx } from '@/i18n/dual';

type Group = { title: string; items: string[] };

const GROUPS: Group[] = [
  { title: 'Financial Reports', items: ['Balance Sheet', 'Profit & Loss', 'Cash Flow Statement', 'Financial Summary'] },
  { title: 'Aging Reports', items: ['Aged Receivables Summary', 'Aged Receivables Detail', 'Aged Payables Summary', 'Aged Payables Detail'] },
  { title: 'Sales Reports', items: ['Invoice Summary', 'Sales Credit Note Summary', 'Sales Payment Summary', 'Quotations by Customer', 'Sales Orders By Customer', 'Delivery Orders By Customer', 'Sales Summary By Customer', 'Sales By Tag'] },
  { title: 'Purchase Reports', items: ['Bill Summary', 'Purchase Credit Note Summary', 'Purchase Payment Summary', 'Purchase Orders by Supplier', 'Purchase Summary by Supplier'] },
  { title: 'Payment Reports', items: ['Official Receipt Summary', 'Payment Voucher Summary', 'Cash Sales Summary', 'Cash Purchase Summary'] },
  { title: 'Product Reports', items: ['Product Sales Summary', 'Product Sales Detail', 'Product Bundle Sales Summary', 'Product Purchase Summary', 'Product Purchase Detail', 'Item Sales Collection'] },
  { title: 'Inventory Reports', items: ['Inventory Summary', 'Inventory Detail', 'Inventory Summary by Location', 'Profit Summary', 'Profit Detail'] },
  { title: 'Fixed Asset Reports', items: ['Fixed Asset List', 'Depreciation Schedule', 'Disposal Schedule'] },
  { title: 'Ledger Reports', items: ['General Ledger', 'Debtor Ledger', 'Creditor Ledger'] },
  { title: 'SST Reports', items: ['SST-02', 'SST Sales Detail', 'SST Purchase Detail', 'SST Payment Collection', 'SST Deemed Payments', 'SST Recovered Payments', 'SST by Products'] },
  { title: 'Accounting Reports', items: ['Journal Entry Detail', 'Double Entry Detail', 'Trial Balance', 'Bank Reconciliation', 'Reconciled Transactions', 'Transaction List', 'Exchange Gain/Loss Summary', 'Unrealised Exchange Detail', 'Exchange Rates', 'Audit Trail', 'Chart of Accounts'] },
];

const FAV_KEY = 'report_favourites';

export default function ReportsPage() {
  const tx = useTx();
  const [closed, setClosed] = useState<string[]>([]);
  const [favs, setFavs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; }
  });

  const toggleFav = (name: string) => {
    const next = favs.includes(name) ? favs.filter(f => f !== name) : [...favs, name];
    setFavs(next);
    localStorage.setItem(FAV_KEY, JSON.stringify(next));
  };

  const groups: Group[] = favs.length ? [{ title: 'Favourites', items: favs }, ...GROUPS] : GROUPS;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">{tx('Reports')}</p>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">{tx('All Reports')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{tx('Empower your business decisions with financial reports.')}</p>
      </div>

      {groups.map(g => {
        const isOpen = !closed.includes(g.title);
        return (
          <section key={g.title} className="border border-border rounded-xl overflow-hidden bg-card">
            <button
              onClick={() => setClosed(p => (isOpen ? [...p, g.title] : p.filter(x => x !== g.title)))}
              className="w-full flex items-center gap-2 px-4 py-3 bg-muted/50 text-sm font-medium text-foreground"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
              {tx(g.title)} ({g.items.length})
            </button>
            {isOpen && (
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {g.items.map(name => (
                  <div
                    key={name}
                    role="button"
                    tabIndex={0}
                    onClick={() => toast.info(`${name} — coming soon`)}
                    className="flex items-center gap-3 border border-border rounded-lg px-3 py-3 min-h-[56px] cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <span className="flex-1 text-sm font-medium text-primary leading-snug">{name}</span>
                    <button
                      aria-label="Favourite"
                      onClick={e => { e.stopPropagation(); toggleFav(name); }}
                      className="p-1 text-muted-foreground hover:text-primary"
                    >
                      <Star className={`h-4 w-4 ${favs.includes(name) ? 'fill-primary text-primary' : ''}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
