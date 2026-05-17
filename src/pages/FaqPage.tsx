import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, Search, ArrowLeft, HelpCircle, Image, Video } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Faq {
  id: string;
  question_ms: string;
  question_en: string;
  answer_ms: string;
  answer_en: string;
  category: string;
  sort_order: number;
  image_url?: string | null;
  video_url?: string | null;
  video_type?: 'upload' | 'youtube' | 'vimeo' | null;
}

function getYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

function FaqMedia({ faq }: { faq: Faq }) {
  const [imgError, setImgError] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const hasImage = faq.image_url && !imgError;
  const hasVideo = faq.video_url;

  if (!hasImage && !hasVideo) return null;

  return (
    <div className="mt-4 space-y-3">
      {/* Image */}
      {hasImage && (
        <div>
          <button
            onClick={() => setLightbox(true)}
            className="block w-full"
            title="Klik untuk besarkan"
          >
            <img
              src={faq.image_url!}
              alt="FAQ media"
              onError={() => setImgError(true)}
              className="w-full max-h-80 object-contain rounded-lg border border-border bg-muted cursor-zoom-in hover:opacity-90 transition-opacity"
            />
          </button>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Image className="h-3 w-3" />
            Klik gambar untuk besarkan
          </p>
        </div>
      )}

      {/* Video */}
      {hasVideo && (() => {
        const type = faq.video_type || 'upload';

        if (type === 'youtube') {
          const ytId = getYoutubeId(faq.video_url!);
          if (!ytId) return null;
          return (
            <div className="aspect-video w-full rounded-lg overflow-hidden border border-border">
              <iframe
                src={`https://www.youtube.com/embed/${ytId}`}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          );
        }

        if (type === 'vimeo') {
          const vimeoId = getVimeoId(faq.video_url!);
          if (!vimeoId) return null;
          return (
            <div className="aspect-video w-full rounded-lg overflow-hidden border border-border">
              <iframe
                src={`https://player.vimeo.com/video/${vimeoId}`}
                title="Vimeo video"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          );
        }

        // Direct upload
        return (
          <div>
            <video
              src={faq.video_url!}
              controls
              className="w-full max-h-80 rounded-lg border border-border bg-black"
            />
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Video className="h-3 w-3" />
              Video panduan
            </p>
          </div>
        );
      })()}

      {/* Lightbox */}
      {lightbox && hasImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <img
            src={faq.image_url!}
            alt="FAQ media fullscreen"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 text-white text-2xl font-bold bg-black/50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/80"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  const { i18n } = useTranslation();
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
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {isMs ? 'Kembali' : 'Back'}
      </button>

      <div className="flex items-center gap-2 mb-2">
        <HelpCircle className="h-6 w-6 text-primary" />
        <h1 className="text-xl md:text-2xl font-semibold">
          {isMs ? 'Soalan Lazim (FAQ)' : 'Frequently Asked Questions'}
        </h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        {isMs
          ? 'Cari jawapan pantas tentang penggunaan WorkTrace.'
          : 'Quick answers about using WorkTrace.'}
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
            className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
              category === c
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/50'
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
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {cat}
              </h2>
              <div className="space-y-2">
                {items.map(f => {
                  const open = openId === f.id;
                  const hasMedia = f.image_url || f.video_url;

                  return (
                    <div key={f.id} className="border border-border rounded-lg bg-card">
                      <button
                        onClick={() => setOpenId(open ? null : f.id)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-foreground">
                            {isMs ? f.question_ms : f.question_en}
                          </span>
                          {hasMedia && (
                            <span className="shrink-0 flex items-center gap-1">
                              {f.image_url && (
                                <Image className="h-3 w-3 text-muted-foreground" />
                              )}
                              {f.video_url && (
                                <Video className="h-3 w-3 text-muted-foreground" />
                              )}
                            </span>
                          )}
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${
                            open ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {open && (
                        <div className="px-4 pb-4 pt-0 border-t border-border">
                          <div className="pt-3 text-sm text-muted-foreground whitespace-pre-line">
                            {isMs ? f.answer_ms : f.answer_en}
                          </div>
                          <FaqMedia faq={f} />
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