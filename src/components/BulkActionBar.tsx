import { Trash2, X, CheckSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface Props {
  count: number;
  total: number;
  onSelectAll: () => void;
  onClear: () => void;
  onDelete: () => void;
  onExit: () => void;
  deleting?: boolean;
  label?: string;
}

export default function BulkActionBar({ count, total, onSelectAll, onClear, onDelete, onExit, deleting, label = 'item' }: Props) {
  const { t } = useTranslation();
  return (
    <div className="sticky top-14 z-30 -mx-4 md:-mx-6 px-4 md:px-6 py-2 bg-primary text-primary-foreground flex items-center gap-2 shadow-md">
      <button onClick={onExit} className="p-1 hover:bg-primary-foreground/10 rounded">
        <X className="h-4 w-4" />
      </button>
      <span className="text-sm font-medium flex-1">
        {t('bulk.selected', { count, label })}
      </span>
      <button
        onClick={count === total ? onClear : onSelectAll}
        className="text-xs flex items-center gap-1 px-2 py-1 hover:bg-primary-foreground/10 rounded"
      >
        <CheckSquare className="h-3.5 w-3.5" />
        {count === total ? t('bulk.deselectAll') : t('bulk.selectAll')}
      </button>
      <Button
        onClick={onDelete}
        disabled={count === 0 || deleting}
        size="sm"
        variant="destructive"
        className="h-8 rounded-md gap-1"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {t('bulk.delete')}
      </Button>
    </div>
  );
}
