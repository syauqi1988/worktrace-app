import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ownTerms, termsField } from "@/lib/termsI18n";

export const DEFAULT_WO_TERMS = `1. Kerja akan dilaksanakan mengikut spesifikasi yang telah dipersetujui.
2. Sebarang perubahan skop kerja memerlukan kelulusan bertulis.
3. Pembayaran hendaklah dibuat dalam masa 14 hari dari tarikh invois.
4. Syarikat tidak bertanggungjawab atas kerosakan yang sedia ada sebelum kerja bermula.
5. Gambar sebelum dan selepas kerja diambil sebagai rekod rasmi.`;

export const DEFAULT_WO_TERMS_EN = `1. Work will be carried out according to the agreed specifications.
2. Any change in scope of work requires written approval.
3. Payment shall be made within 14 days from the invoice date.
4. The company is not responsible for any damage existing before work begins.
5. Before and after photos are taken as official records.`;

export default function WorkOrderTermsSection() {
  const { profile, updateProfile } = useAuth();
  const { t, i18n } = useTranslation();
  const def = i18n.language?.startsWith('en') ? DEFAULT_WO_TERMS_EN : DEFAULT_WO_TERMS;
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setText(ownTerms(profile, 'wo_terms') ?? def);
  }, [profile, def]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ [termsField('wo_terms')]: text || null } as any);
      toast.success(t('settingsExtra.woTermsSaved'));
    } catch {
      toast.error(t('settingsExtra.woTermsFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setText(def);
    toast.info(t('settingsExtra.woTermsRestored'));
  };

  return (
    <div className="space-y-3">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} placeholder={def} />
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
