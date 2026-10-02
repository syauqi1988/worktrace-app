import { ReactNode, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export type FormSection = {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
};

type Props = {
  breadcrumb?: string;
  title: string;
  sections: FormSection[];
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  autosaveLabel?: string;
  footerExtra?: ReactNode;
  onBack?: () => void;
};

export function Field({
  label, required, hint, children, className,
}: { label: string; required?: boolean; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className || ''}`}>
      <Label className="text-sm">
        {required && <span className="text-destructive mr-0.5">*</span>}
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function DataFormPage({
  breadcrumb, title, sections, onSave, saving, saveLabel = 'Save',
  autosaveLabel, footerExtra, onBack,
}: Props) {
  const navigate = useNavigate();
  const [active, setActive] = useState(sections[0]?.id);
  const refs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-140px 0px -60% 0px', threshold: 0 },
    );
    Object.values(refs.current).forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, [sections.length]);

  const goto = (id: string) => {
    const el = refs.current[id];
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 130;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <div className="pb-44 md:pb-28">
      {/* Floating top header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border">
        <div className="px-4 md:px-6 pt-3 pb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => (onBack ? onBack() : navigate(-1))}
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              {breadcrumb && <p className="text-xs text-muted-foreground truncate">{breadcrumb}</p>}
              <h1 className="text-lg md:text-2xl font-bold text-foreground truncate">{title}</h1>
            </div>
            {autosaveLabel && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                {autosaveLabel} <RefreshCw className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>
        <div className="px-2 md:px-6 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => goto(s.id)}
                className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  active === s.id
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="p-4 md:p-6 space-y-4">
        {sections.map(s => (
          <section
            key={s.id}
            id={s.id}
            ref={el => { refs.current[s.id] = el; }}
            className="scroll-mt-32 bg-card border border-border rounded-xl p-4 md:p-6"
          >
            <div className="grid md:grid-cols-[260px_1fr] gap-4 md:gap-8">
              <div>
                <h2 className="text-base font-semibold text-foreground">{s.title}</h2>
                {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
              </div>
              <div className="min-w-0">{s.content}</div>
            </div>
          </section>
        ))}
      </div>

      {/* Floating save bar */}
      <div className="fixed bottom-16 md:bottom-0 inset-x-0 z-[45] border-t border-border bg-background/95 backdrop-blur px-4 md:px-6 py-3">
        <div className="flex items-center justify-end gap-3">
          {footerExtra}
          <Button onClick={onSave} disabled={saving} className="min-w-28">
            {saving ? 'Saving...' : saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
