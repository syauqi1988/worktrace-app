import { ReactNode } from 'react';
import { ChevronDown, ArrowLeftRight, Copy, Printer, Share2, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useL } from '@/i18n/dual';

export type DocAction = { label: string; onClick: () => void; icon?: ReactNode; danger?: boolean; hidden?: boolean };

type Props = {
  transfers?: DocAction[];
  actions?: DocAction[];
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  duplicating?: boolean;
  onPrint?: () => void;
  onShare?: () => void;
  shareDisabled?: boolean;
  sharing?: boolean;
};

/** Header action bar for document/detail pages: Actions dropdown, Duplicate, Print/PDF, QuickShare. */
export default function DocActionsBar({
  transfers = [], actions = [], onEdit, onDelete, onDuplicate, duplicating, onPrint, onShare, shareDisabled, sharing,
}: Props) {
  const l = useL();
  const tr = transfers.filter(t => !t.hidden);
  const acts = actions.filter(a => !a.hidden);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
            <ChevronDown className="h-4 w-4" /> {l('Actions', 'Tindakan')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 bg-popover z-50">
          {tr.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2"><ArrowLeftRight className="h-4 w-4" /> {l('Transfer to...', 'Pindah ke...')}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-popover z-50">
                {tr.map(t => <DropdownMenuItem key={t.label} onClick={t.onClick}>{t.label}</DropdownMenuItem>)}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          {onEdit && <DropdownMenuItem className="gap-2" onClick={onEdit}><Edit className="h-4 w-4" /> {l('Edit', 'Edit')}</DropdownMenuItem>}
          {acts.map(a => (
            <DropdownMenuItem key={a.label} className={`gap-2 ${a.danger ? 'text-destructive focus:text-destructive' : ''}`} onClick={a.onClick}>
              {a.icon} {a.label}
            </DropdownMenuItem>
          ))}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" /> {l('Delete', 'Padam')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {onDuplicate && (
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={onDuplicate} disabled={duplicating}>
          {duplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} {l('Duplicate', 'Salin')}
        </Button>
      )}
      {onPrint && (
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={onPrint}>
          <Printer className="h-4 w-4" /> {l('Print / PDF', 'Cetak / PDF')}
        </Button>
      )}
      {onShare && (
        <Button size="sm" className="gap-1.5 shrink-0" onClick={onShare} disabled={shareDisabled || sharing}>
          {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />} {l('QuickShare', 'Kongsi Pantas')}
        </Button>
      )}
    </>
  );
}
