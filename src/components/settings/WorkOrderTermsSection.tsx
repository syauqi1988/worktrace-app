import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const DEFAULT_WO_TERMS = `1. Work will be carried out according to the agreed specifications.
2. Any changes to the scope of work require written approval.
3. Payment must be made within 14 days from the invoice date.
4. The company is not responsible for existing damage before work begins.
5. Before and after photos are taken as official records.`;

export default function WorkOrderTermsSection() {
  const { profile, updateProfile } = useAuth();
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const current = (profile as any)?.wo_terms;
    setText(current ?? DEFAULT_WO_TERMS);
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ wo_terms: text || null } as any);
      toast.success(t('settingsExtra.woTermsSaved'));
    } catch {
      toast.error(t('settingsExtra.woTermsFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setText(DEFAULT_WO_TERMS);
    toast.info(t('settingsExtra.woTermsRestored'));
  };

  return (
    <div className="space-y-3">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} placeholder={DEFAULT_WO_TERMS} />
      <p className="text-xs text-muted-foreground">{t('settingsExtra.woTermsHelper')}</p>
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="rounded-lg">
          {saving ? t('completionReport.saving') : t('settingsExtra.saveWoTerms')}
        </Button>
        <button type="button" onClick={handleReset} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
          {t('settingsExtra.restoreDefault')}
        </button>
      </div>
    </div>
  );
}
