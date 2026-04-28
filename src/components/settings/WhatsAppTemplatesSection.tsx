import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { RotateCcw, Lock } from "lucide-react";
import { usePlanGate } from "@/hooks/usePlanGate";
import UpgradeModal from "@/components/UpgradeModal";
import {
  TEMPLATES,
  TEMPLATE_MAP,
  TEMPLATE_PLACEHOLDERS,
  TemplateKey,
  TemplateEditable,
  TemplatesState,
  getTemplate,
} from "@/lib/whatsappTemplates";

function fillPreview(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_m, k) => vars[k] ?? `{${k}}`);
}

export default function WhatsAppTemplatesSection() {
  const { profile, updateProfile } = useAuth();
  const [activeKey, setActiveKey] = useState<TemplateKey>("quotation");
  const [draft, setDraft] = useState<TemplateEditable>({ greeting: "", intro: "", closing: "" });
  const [saving, setSaving] = useState(false);

  const templates: TemplatesState = (profile as any)?.whatsapp_templates || {};
  const meta = TEMPLATE_MAP[activeKey];

  useEffect(() => {
    setDraft(getTemplate(templates, activeKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, profile]);

  const previewVars = useMemo(
    () => ({
      customer_name: "Encik Ali",
      company_name: profile?.company_name || "Syarikat Anda",
      job_number: "JOB-0001",
    }),
    [profile?.company_name],
  );

  const previewMessage = useMemo(() => {
    const parts = [
      fillPreview(draft.greeting, previewVars),
      "",
      fillPreview(draft.intro, previewVars),
    ];
    if (meta.detailsPreview) {
      parts.push("", meta.detailsPreview);
    }
    parts.push("", fillPreview(draft.closing, previewVars));
    return parts.join("\n");
  }, [draft, meta, previewVars]);

  const handleSave = async () => {
    setSaving(true);
    const next: TemplatesState = { ...templates, [activeKey]: { ...draft } };
    await updateProfile({ whatsapp_templates: next as any });
    setSaving(false);
    toast.success(`Templet ${meta.label} disimpan!`);
  };

  const handleReset = () => {
    setDraft({ ...meta.defaults });
    toast.info("Templet dikembalikan ke asal. Tekan Simpan untuk sahkan.");
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Sesuaikan ucapan & ayat penutup untuk setiap mesej WhatsApp anda. Bahagian butiran (nombor
        dokumen, jumlah, pautan) dikunci supaya mesej anda sentiasa tepat.
      </p>

      {/* Template selector — dropdown style matching native selects in this page */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Pilih Templet</label>
        <select
          value={activeKey}
          onChange={(e) => setActiveKey(e.target.value as TemplateKey)}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {TEMPLATES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
      </div>

      {/* Placeholders helper */}
      <div className="rounded-lg bg-muted/40 border border-border p-3">
        <p className="text-xs font-semibold text-foreground mb-1.5">Placeholder yang boleh digunakan:</p>
        <div className="flex flex-wrap gap-1.5">
          {meta.placeholders.map((p) => (
            <code
              key={p}
              className="text-[11px] bg-background border border-border rounded px-1.5 py-0.5 font-mono text-foreground"
              title={TEMPLATE_PLACEHOLDERS[p] || p}
            >
              {`{${p}}`}
            </code>
          ))}
        </div>
      </div>

      {/* Editable fields */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Ucapan Pembukaan</label>
        <Textarea
          value={draft.greeting}
          onChange={(e) => setDraft({ ...draft, greeting: e.target.value })}
          rows={2}
          placeholder="cth: Assalamualaikum {customer_name},"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Ayat Pengenalan</label>
        <Textarea
          value={draft.intro}
          onChange={(e) => setDraft({ ...draft, intro: e.target.value })}
          rows={4}
        />
      </div>

      {/* Locked details preview */}
      <div>
        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
          Butiran Dokumen (dikunci automatik)
        </label>
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
          <pre className="whitespace-pre-wrap text-xs font-mono text-muted-foreground">
            {meta.detailsPreview}
          </pre>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Bahagian ini dijana automatik dari data dokumen sebenar dan tidak boleh diubah.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Ayat Penutup</label>
        <Textarea
          value={draft.closing}
          onChange={(e) => setDraft({ ...draft, closing: e.target.value })}
          rows={4}
        />
      </div>

      {/* Live preview */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Pratonton Mesej</label>
        <div className="rounded-lg border border-border bg-[#E7FFD9]/30 p-3">
          <pre className="whitespace-pre-wrap text-[13px] text-foreground font-sans leading-relaxed">
            {previewMessage}
          </pre>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleSave} disabled={saving} className="rounded-lg">
          {saving ? "Menyimpan..." : `Simpan Templet ${meta.label}`}
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          className="rounded-lg gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Kembalikan ke Asal
        </Button>
      </div>
    </div>
  );
}
