import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useL } from "@/i18n/dual";
import { fullKB, searchKB, setExtraKB, extraKB } from "@/lib/aiHelpKnowledge";
import { supabase } from "@/integrations/supabase/client";

// Small free model running fully on the device (WebGPU). No cloud, no tokens.
const MODEL = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
type Msg = { role: "user" | "assistant"; content: string };
let enginePromise: Promise<any> | null = null;

export function AiHelpChat({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const { t, i18n } = useTranslation();
  const L = useL();
  const ms = !i18n.language?.startsWith("en");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [mode, setMode] = useState<"ai" | "basic" | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Learn from published FAQs so new answers added by the team are known automatically.
  useEffect(() => {
    if (!open || extraKB().length) return;
    supabase.from("faqs").select("question_en,question_ms,answer_en,answer_ms").eq("is_published", true).limit(60)
      .then(({ data }) => data && setExtraKB(data.map((f: any) => ms ? `${f.question_ms} ${f.answer_ms}` : `${f.question_en} ${f.answer_en}`)));
  }, [open, ms]);

  const loadEngine = async () => {
    if (!(navigator as any).gpu) { setMode("basic"); return null; }
    try {
      if (!enginePromise) {
        const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
        enginePromise = CreateMLCEngine(MODEL, {
          initProgressCallback: (p: any) => setProgress(`${Math.round((p.progress || 0) * 100)}%`),
        });
      }
      const e = await enginePromise;
      setMode("ai"); setProgress("");
      return e;
    } catch {
      enginePromise = null; setMode("basic"); setProgress("");
      return null;
    }
  };

  const basicAnswer = (q: string) => {
    const hits = searchKB(q, ms);
    return hits.length ? hits.join("\n\n")
      : L("I couldn't find that. Please send a support ticket from the Support menu.", "Maaf, tiada jawapan. Sila hantar tiket sokongan dari menu Sokongan.");
  };

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setInput(""); setBusy(true);
    const scroll = () => endRef.current?.scrollIntoView({ behavior: "smooth" });
    try {
      const engine = mode === "basic" ? null : await loadEngine();
      if (!engine) {
        setMsgs([...next, { role: "assistant", content: basicAnswer(q) }]);
      } else {
        const system = `You are WorkTrace AI Help, a support assistant for the WorkTrace app (jobs, quotations, invoices, work orders, completion reports for Malaysian contractors). Answer briefly in ${ms ? "Bahasa Melayu" : "English"} using ONLY these facts. If unsure, tell the user to send a support ticket.\n${fullKB(ms)}`;
        const stream = await engine.chat.completions.create({
          messages: [{ role: "system", content: system }, ...next.slice(-6)],
          stream: true, temperature: 0.3, max_tokens: 300,
        });
        let out = "";
        for await (const c of stream) {
          out += c.choices[0]?.delta?.content || "";
          setMsgs([...next, { role: "assistant", content: out }]); scroll();
        }
      }
    } catch {
      setMsgs([...next, { role: "assistant", content: basicAnswer(q) }]);
    } finally { setBusy(false); scroll(); }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg h-[85vh] flex flex-col p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />{t("settingsExtra.aiHelpTitle")}</DialogTitle>
            <p className="text-xs text-muted-foreground">
              {mode === "basic"
                ? L("Quick-answer mode (this device can't run the AI).", "Mod jawapan pantas (peranti ini tidak dapat menjalankan AI).")
                : L("Runs on your device — free and private. First use downloads the AI once (~300MB).", "Berjalan di peranti anda — percuma dan peribadi. Kali pertama memuat turun AI sekali (~300MB).")}
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {msgs.length === 0 && (
              <p className="text-sm text-muted-foreground">{L("Ask e.g. \"How do I create a milestone invoice?\"", "Tanya cth. \"Bagaimana buat invois berperingkat?\"")}</p>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`text-sm whitespace-pre-wrap rounded-lg px-3 py-2 max-w-[85%] ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                {m.content || (progress ? `${L("Loading AI", "Memuatkan AI")} ${progress}` : <Loader2 className="h-4 w-4 animate-spin" />)}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={L("Type your question…", "Taip soalan anda…")} disabled={busy} />
            <Button type="submit" size="icon" disabled={busy || !input.trim()}><Send className="h-4 w-4" /></Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

const OPEN_EVT = "wt-ai-open", VIS_EVT = "wt-ai-visibility", HIDE_KEY = "wt_ai_fab_hidden";
export const openAiHelp = () => window.dispatchEvent(new Event(OPEN_EVT));
export const isAiFabHidden = () => localStorage.getItem(HIDE_KEY) === "1";
export const setAiFabHidden = (h: boolean) => { localStorage.setItem(HIDE_KEY, h ? "1" : "0"); window.dispatchEvent(new Event(VIS_EVT)); };

/** Floating AI Help button (bottom-right) shown on all app pages; can be hidden/unhidden. */
export function FloatingAiHelp() {
  const L = useL();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(isAiFabHidden());
  useEffect(() => {
    const o = () => setOpen(true), v = () => setHidden(isAiFabHidden());
    window.addEventListener(OPEN_EVT, o); window.addEventListener(VIS_EVT, v);
    return () => { window.removeEventListener(OPEN_EVT, o); window.removeEventListener(VIS_EVT, v); };
  }, []);
  return (
    <>
      {!hidden && (
        <div className="fixed right-4 bottom-20 md:bottom-6 z-40 group">
          <button onClick={() => setOpen(true)} aria-label={L("Open AI Help", "Buka AI Bantuan")}
            className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform">
            <Sparkles className="h-6 w-6" />
          </button>
          <button onClick={() => setAiFabHidden(true)} aria-label={L("Hide AI Help icon", "Sembunyi ikon AI Bantuan")}
            title={L("Hide (show again from the Help menu)", "Sembunyi (papar semula dari menu Bantuan)")}
            className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-card border border-border text-muted-foreground flex items-center justify-center shadow">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <AiHelpChat open={open} setOpen={setOpen} />
    </>
  );
}

export default function AiHelpButton() {
  const { t } = useTranslation();
  const L = useL();
  const [hidden, setHidden] = useState(isAiFabHidden());
  useEffect(() => { const v = () => setHidden(isAiFabHidden()); window.addEventListener(VIS_EVT, v); return () => window.removeEventListener(VIS_EVT, v); }, []);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-bold text-foreground">{t("settingsExtra.aiHelpTitle")}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{t("settingsExtra.aiHelpBody")}</p>
      <Button type="button" onClick={openAiHelp} className="w-full h-11 gap-2">
        <Sparkles className="h-4 w-4" /> {t("settingsExtra.openAiHelp")}
      </Button>
      <Button type="button" variant="outline" onClick={() => setAiFabHidden(!hidden)} className="w-full">
        {hidden ? L("Show floating AI icon", "Papar ikon AI terapung") : L("Hide floating AI icon", "Sembunyi ikon AI terapung")}
      </Button>
    </div>
  );
}
