import { ReactNode, useMemo, useState } from 'react';
import { Plus, Search, RotateCcw, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export type ListColumn<T> = {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  className?: string;
  sortValue?: (row: T) => string | number;
  render: (row: T) => ReactNode;
};

export type ListFilter<T> = {
  label: string;
  options: { value: string; label: string }[];
  match: (row: T, value: string) => boolean;
  placeholder?: string;
};

type Props<T> = {
  breadcrumb?: string;
  title: string;
  description?: string;
  newLabel?: string;
  onNew?: () => void;
  headerExtra?: ReactNode;

  rows: T[];
  loading?: boolean;
  emptyMessage?: string;
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;

  columns: ListColumn<T>[];
  rowActions?: (row: T) => ReactNode;

  /** Free-text search across these values */
  searchValues?: (row: T) => (string | null | undefined)[];
  /** Enables the date-range filter */
  getDate?: (row: T) => string | Date | null | undefined;
  filters?: ListFilter<T>[];

  /** Enables the Amount column total in the footer (follows filtered rows) */
  getAmount?: (row: T) => number;
  amountHeader?: string;
  currency?: string;

  selectable?: boolean;
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
};

const PAGE_SIZES = [10, 30, 50, 100];

export default function DataListPage<T>({
  breadcrumb, title, description, newLabel = 'New', onNew, headerExtra,
  rows, loading, emptyMessage = 'No records found.', getRowId, onRowClick,
  columns, rowActions, searchValues, getDate, filters = [],
  getAmount, amountHeader = 'Amount', currency = 'RM',
  selectable, bulkActions,
}: Props<T>) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [q, setQ] = useState('');
  const [filterVals, setFilterVals] = useState<Record<number, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [selected, setSelected] = useState<string[]>([]);

  const reset = () => {
    setStart(''); setEnd(''); setQ(''); setFilterVals({}); setPage(1);
  };

  const filtered = useMemo(() => {
    let out = rows;
    if (getDate && (start || end)) {
      out = out.filter(r => {
        const d = getDate(r);
        if (!d) return false;
        const t = new Date(d).setHours(12, 0, 0, 0);
        if (start && t < new Date(start).setHours(0, 0, 0, 0)) return false;
        if (end && t > new Date(end).setHours(23, 59, 59, 999)) return false;
        return true;
      });
    }
    if (q.trim() && searchValues) {
      const needle = q.trim().toLowerCase();
      out = out.filter(r => searchValues(r).some(v => (v || '').toLowerCase().includes(needle)));
    }
    filters.forEach((f, i) => {
      const v = filterVals[i];
      if (v && v !== '__all') out = out.filter(r => f.match(r, v));
    });
    return out;
  }, [rows, start, end, q, filterVals, filters, getDate, searchValues]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find(c => c.key === sort.key);
    if (!col?.sortValue) return filtered;
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a), bv = col.sortValue!(b);
      const r = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.dir === 'asc' ? r : -r;
    });
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, totalPages);
  const pageRows = sorted.slice((current - 1) * pageSize, current * pageSize);

  const total = getAmount ? sorted.reduce((s, r) => s + (getAmount(r) || 0), 0) : 0;
  const money = (n: number) => n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const selectedRows = rows.filter(r => selected.includes(getRowId(r)));
  const allOnPage = pageRows.length > 0 && pageRows.every(r => selected.includes(getRowId(r)));

  const toggleSort = (key: string) => {
    setSort(prev => prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  };

  const colCount = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);
  const foundAmountIdx = columns.findIndex(c => c.key === 'amount' || c.key === 'total');
  const amountIdx = foundAmountIdx >= 0 ? foundAmountIdx : columns.length - 1;
  const trailingCols = (columns.length - 1 - amountIdx) + (rowActions ? 1 : 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="flex flex-wrap items-baseline gap-2">
            {breadcrumb && <span className="text-sm text-muted-foreground">{breadcrumb} /</span>}
            <h1 className="text-xl md:text-2xl font-bold text-foreground">{title}</h1>
            {description && <span className="text-sm text-muted-foreground">{description}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {headerExtra}
          {onNew && (
            <Button onClick={onNew} className="gap-1">
              <Plus className="h-4 w-4" /> {newLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          {getDate && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Date Range</p>
              <div className="flex items-center gap-2">
                <Input type="date" value={start} onChange={e => { setStart(e.target.value); setPage(1); }} className="text-sm w-[150px]" />
                <span className="text-muted-foreground">→</span>
                <Input type="date" value={end} onChange={e => { setEnd(e.target.value); setPage(1); }} className="text-sm w-[150px]" />
              </div>
            </div>
          )}
          {searchValues && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Search</p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} className="pl-8 text-sm w-[200px]" placeholder="Search..." />
              </div>
            </div>
          )}
          {filters.map((f, i) => (
            <div key={f.label} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{f.label}</p>
              <Select value={filterVals[i] || '__all'} onValueChange={v => { setFilterVals(p => ({ ...p, [i]: v })); setPage(1); }}>
                <SelectTrigger className="w-[170px] text-sm"><SelectValue placeholder={f.placeholder || 'All'} /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="__all">All</SelectItem>
                  {f.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
          <Button variant="outline" size="icon" onClick={reset} aria-label="Reset filters">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 justify-between border-t border-border pt-3">
          <div className="flex items-center gap-2">
            {selectable && selected.length > 0 && bulkActions?.(selectedRows, () => setSelected([]))}
            {selectable && selected.length > 0 && (
              <span className="text-xs text-muted-foreground">{selected.length} selected</span>
            )}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm text-muted-foreground">
              {sorted.length === 0 ? '0 items' : `${(current - 1) * pageSize + 1}-${Math.min(current * pageSize, sorted.length)} of ${sorted.length} items`}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={current <= 1} onClick={() => setPage(current - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2 min-w-8 text-center">{current}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={current >= totalPages} onClick={() => setPage(current + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[110px] h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {PAGE_SIZES.map(s => <SelectItem key={s} value={String(s)}>{s} / page</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/40">
                {selectable && (
                  <th className="w-10 px-3 py-2.5">
                    <Checkbox
                      checked={allOnPage}
                      onCheckedChange={c => {
                        const ids = pageRows.map(getRowId);
                        setSelected(prev => c ? Array.from(new Set([...prev, ...ids])) : prev.filter(i => !ids.includes(i)));
                      }}
                    />
                  </th>
                )}
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={`px-3 py-2.5 font-semibold text-foreground whitespace-nowrap ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.sortValue ? 'cursor-pointer select-none' : ''} ${col.className || ''}`}
                    onClick={() => col.sortValue && toggleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.sortValue && <ChevronsUpDown className={`h-3 w-3 ${sort?.key === col.key ? 'text-primary' : 'text-muted-foreground'}`} />}
                    </span>
                  </th>
                ))}
                {rowActions && <th className="px-3 py-2.5 text-right font-semibold text-foreground">Action</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={colCount} className="px-3 py-10 text-center text-muted-foreground">Loading...</td></tr>
              )}
              {!loading && pageRows.length === 0 && (
                <tr><td colSpan={colCount} className="px-3 py-10 text-center text-muted-foreground">{emptyMessage}</td></tr>
              )}
              {!loading && pageRows.map(row => {
                const id = getRowId(row);
                return (
                  <tr
                    key={id}
                    className={`border-b border-border hover:bg-muted/40 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.includes(id)}
                          onCheckedChange={c => setSelected(prev => c ? [...prev, id] : prev.filter(i => i !== id))}
                        />
                      </td>
                    )}
                    {columns.map(col => (
                      <td
                        key={col.key}
                        className={`px-3 py-2.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                    {rowActions && (
                      <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                        {rowActions(row)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {getAmount && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                  <td colSpan={(selectable ? 1 : 0) + Math.max(1, amountIdx)} className="px-3 py-3 text-right text-muted-foreground">
                    Total {amountHeader} ({sorted.length} {sorted.length === 1 ? 'item' : 'items'})
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    {currency} {money(total)}
                  </td>
                  {trailingCols > 0 && <td colSpan={trailingCols} />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
