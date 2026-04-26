import { useState, useCallback } from 'react';

export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(items.map(i => i.id)));
  }, [items]);

  const clear = useCallback(() => {
    setSelected(new Set());
  }, []);

  const exit = useCallback(() => {
    setSelectionMode(false);
    setSelected(new Set());
  }, []);

  const enter = useCallback((id?: string) => {
    setSelectionMode(true);
    if (id) setSelected(new Set([id]));
  }, []);

  return { selectionMode, selected, toggle, selectAll, clear, enter, exit };
}
