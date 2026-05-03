import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const { profile, updateProfile } = useAuth();
  const { isTeam, upgradeOpen, setUpgradeOpen, upgradeReason, checkTeamFeature } = usePlanGate();
  const [activeKey, setActiveKey] = useState<TemplateKey>("quotation");
  const [draft, setDraft] = useState<TemplateEditable>({ greeting: "", intro: "", closing: "" });
  const [saving, setSaving] = useState(false);

  const templates: TemplatesState = (profile as any)?.whatsapp_templates || {};
  const meta = TEMPLATE_MAP[activeKey];
  const isWorkOrderLocked = activeKey === "work_order" && !isTeam;

  useEffect(() => {
    setDraft(getTemplate(templates, activeKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, profile]);

  const previewVars = useMemo(
    () => ({
      customer_name: t('settingsExtra.previewCustomer'),
      company_name: profile?.company_name || 'WorkTrace',
      job_number: t('settingsExtra.previewJob'),
    }),
    [profile?.company_name, t],
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
    if (isWorkOrderLocked) {
      checkTeamFeature(t('settingsExtra.lockedFeature'));
      return;
    }
    setSaving(true);
    const next: TemplatesState = { ...templates, [activeKey]: { ...draft } };
    await updateProfile({ whatsapp_templates: next as any });
    setSaving(false);
    toast.success(t('settingsExtra.tplSaved', { label: meta.label }));
  };

  const handleReset = () => {
    if (isWorkOrderLocked) {
      checkTeamFeature(t('settingsExtra.lockedFeature'));
      return;
    }
    setDraft({ ...meta.defaults });
    toast.info(t('settingsExtra.tplReset'));
  };

  const handleSelectTemplate = (key: TemplateKey) => {
    if (key === "work_order" && !isTeam) {
      checkTeamFeature(t('settingsExtra.lockedFeature'));
      return;
    }
    setActiveKey(key);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t('settingsExtra.waTplDescription')}
      </p>

      {/* Template selector */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">{t('settingsExtra.selectTemplate')}</label>
        <select
          value={activeKey}
          onChange={(e) => handleSelectTemplate(e.target.value as TemplateKey)}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {TEMPLATES.map((tpl) => (
            <option key={tpl.key} value={tpl.key}>
              {tpl.label}{tpl.key === "work_order" && !isTeam ? " 🔒 (Team)" : ""}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
      </div>

      <div className="rounded-lg bg-muted/40 border border-border p-3">
        <p className="text-xs font-semibold text-foreground mb-1.5">{t('settingsExtra.placeholdersAvailable')}</p>
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

      {isWorkOrderLocked && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 flex items-start gap-2">
          <Lock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-800 dark:text-amber-200">
            {t('settingsExtra.woLockedTitle')} <b>Work Order</b> — {t('settingsExtra.woLockedBody')}
          </div>
        </div>
      )}

      <div className={isWorkOrderLocked ? "opacity-60 pointer-events-none select-none" : ""}>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">{t('settingsExtra.greeting')}</label>
          <Textarea
            value={draft.greeting}
            onChange={(e) => setDraft({ ...draft, greeting: e.target.value })}
            rows={2}
            placeholder="cth: Assalamualaikum {customer_name},"
            disabled={isWorkOrderLocked}
          />
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-foreground mb-1.5 block">{t('settingsExtra.intro')}</label>
          <Textarea
            value={draft.intro}
            onChange={(e) => setDraft({ ...draft, intro: e.target.value })}
            rows={4}
            disabled={isWorkOrderLocked}
          />
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
            {t('settingsExtra.lockedDetails')}
          </label>
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
            <pre className="whitespace-pre-wrap text-xs font-mono text-muted-foreground">
              {meta.detailsPreview}
            </pre>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {t('settingsExtra.lockedDetailsHelp')}
          </p>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-foreground mb-1.5 block">{t('settingsExtra.closing')}</label>
          <Textarea
            value={draft.closing}
            onChange={(e) => setDraft({ ...draft, closing: e.target.value })}
            rows={4}
            disabled={isWorkOrderLocked}
          />
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-foreground mb-1.5 block">{t('settingsExtra.messagePreview')}</label>
          <div className="rounded-lg border border-border bg-[#E7FFD9]/30 p-3">
            <pre className="whitespace-pre-wrap text-[13px] text-foreground font-sans leading-relaxed">
              {previewMessage}
            </pre>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={handleSave}
          disabled={saving || isWorkOrderLocked}
          className="rounded-lg gap-1.5"
        >
          {isWorkOrderLocked && <Lock className="h-3.5 w-3.5" />}
          {saving ? t('settingsExtra.uploading') : t('settingsExtra.saveTpl', { label: meta.label })}
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isWorkOrderLocked}
          className="rounded-lg gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" /> {t('settingsExtra.resetTpl')}
        </Button>
      </div>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
      />
    </div>
  );
}
