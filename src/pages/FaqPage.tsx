import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, Search, ArrowLeft, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Faq {
  id: string;
  question_ms: string;
  question_en: string;
  answer_ms: string;
  answer_en: string;
  category: string;
  sort_order: number;
}

export default function FaqPage() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('all');

  const isMs = i18n.language?.startsWith('ms');

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('faqs')
        .select('*')
        .eq('is_published', true)
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true });
      setFaqs(data || []);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(faqs.map(f => f.category));
    return ['all', ...Array.from(set)];
  }, [faqs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return faqs.filter(f => {
      if (category !== 'all' && f.category !== category) return false;
      if (!q) return true;
      const text = `${f.question_ms} ${f.question_en} ${f.answer_ms} ${f.answer_en}`.toLowerCase();
      return text.includes(q);
    });
  }, [faqs, search, category]);

  const grouped = useMemo(() => {
    const map: Record<string, Faq[]> = {};
    filtered.forEach(f => {
      (map[f.category] ||= []).push(f);
    });
    return map;
  }, [filtered]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 md:py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {isMs ? 'Kembali' : 'Back'}
      </button>

      <div className="flex items-center gap-2 mb-2">
        <HelpCircle className="h-6 w-6 text-primary" />
        <h1 className="text-xl md:text-2xl font-semibold">{isMs ? 'Soalan Lazim (FAQ)' : 'Frequently Asked Questions'}</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        {isMs ? 'Cari jawapan pantas tentang penggunaan WorkTrace.' : 'Quick answers about using WorkTrace.'}
      </p>

      <div className="relative mb-3">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={isMs ? 'Cari soalan...' : 'Search questions...'}
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap ${
              category === c ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
            }`}
          >
            {c === 'all' ? (isMs ? 'Semua' : 'All') : c}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{isMs ? 'Memuatkan...' : 'Loading...'}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          {isMs ? 'Tiada soalan ditemui.' : 'No FAQs found.'}
        </p>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([cat, items]) => (
            <section key={cat}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{cat}</h2>
              <div className="space-y-2">
                {items.map(f => {
                  const open = openId === f.id;
                  return (
                    <div key={f.id} className="border border-border rounded-lg bg-card">
                      <button
                        onClick={() => setOpenId(open ? null : f.id)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {isMs ? f.question_ms : f.question_en}
                        </span>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
                      </button>
                      {open && (
                        <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground whitespace-pre-line border-t border-border">
                          <div className="pt-3">{isMs ? f.answer_ms : f.answer_en}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
