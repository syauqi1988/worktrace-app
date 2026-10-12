import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useL } from '@/i18n/dual';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Autosave for every "add new" form (routes ending in /new).
 * Typed values are saved locally; when the user opens the same "new" form again
 * they are asked to restore the unsaved draft or start fresh. Drafts are cleared
 * when the form saves successfully (success toast while on the form).
 */
type Snap = { v: (string | boolean)[]; at: number };
const SEL = 'main input:not([type=file]):not([type=hidden]):not([type=button]):not([type=submit]), main textarea';
const isNewRoute = (p: string) => /\/new\/?$/.test(p);
const fields = () => Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(SEL));
const read = (el: HTMLInputElement | HTMLTextAreaElement) =>
  el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value;

function write(el: HTMLInputElement | HTMLTextAreaElement, val: string | boolean) {
  if (typeof val === 'boolean') {
    if ((el as HTMLInputElement).checked !== val) (el as HTMLInputElement).click();
    return;
  }
  if (el.value === val) return;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, val);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

// Clear the draft of the current "new" form whenever a success toast fires (= saved).
let currentKey: string | null = null;
const origSuccess = toast.success;
(toast as any).success = (...args: any[]) => {
  if (currentKey) { try { localStorage.removeItem(currentKey); } catch {} currentKey = null; }
  return (origSuccess as any)(...args);
};

export default function FormDraftGuard() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const l = useL();
  const [pending, setPending] = useState<Snap | null>(null);
  const keyRef = useRef<string | null>(null);
  const armed = useRef(false);

  useEffect(() => {
    setPending(null);
    armed.current = false;
    if (!user || !isNewRoute(pathname)) { keyRef.current = currentKey = null; return; }
    const key = `wt_draft:${user.id}:${pathname}`;
    keyRef.current = currentKey = key;

    let saved: Snap | null = null;
    try { saved = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
    const hasData = saved && saved.v.some(v => typeof v === 'string' && v.trim());

    // Wait until the form has rendered before asking / recording.
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      if (fields().length > 0 || tries > 40) {
        clearInterval(iv);
        if (hasData) setPending(saved); else armed.current = true;
      }
    }, 150);

    const onInput = () => {
      if (!armed.current || keyRef.current !== key) return;
      try { localStorage.setItem(key, JSON.stringify({ v: fields().map(read), at: Date.now() })); } catch {}
    };
    document.addEventListener('input', onInput, true);
    document.addEventListener('change', onInput, true);
    return () => {
      clearInterval(iv);
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('change', onInput, true);
    };
  }, [pathname, user]);

  const restore = () => {
    const snap = pending;
    setPending(null);
    if (!snap) return;
    // Several passes so fields that appear after earlier values are set also get filled.
    let pass = 0;
    const run = () => {
      fields().forEach((el, i) => { if (i < snap.v.length) write(el, snap.v[i]); });
      if (++pass < 4) setTimeout(run, 250); else armed.current = true;
    };
    setTimeout(run, 50);
  };

  const fresh = () => {
    if (keyRef.current) try { localStorage.removeItem(keyRef.current); } catch {}
    setPending(null);
    armed.current = true;
  };

  const when = pending ? new Date(pending.at).toLocaleString() : '';

  return (
    <AlertDialog open={!!pending}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{l('Unsaved draft found', 'Draf belum disimpan dijumpai')}</AlertDialogTitle>
          <AlertDialogDescription>
            {l(
              `You have an unsaved form from ${when}. Continue where you left off, or start a new one?`,
              `Anda ada borang belum disimpan dari ${when}. Sambung semula, atau mula yang baharu?`,
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={fresh}>{l('Start new', 'Mula baharu')}</AlertDialogCancel>
          <AlertDialogAction onClick={restore}>{l('Restore', 'Pulihkan')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
