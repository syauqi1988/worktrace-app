import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  userId: string;
  logoUrl: string | null;
  onChange: (url: string | null) => void;
}

export default function CompanyLogoUpload({ userId, logoUrl, onChange }: Props) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!logoUrl) { setPreview(null); return; }
    let cancelled = false;
    let objectUrl: string | null = null;
    const cacheBusted = `${logoUrl}${logoUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
    const img = new Image();
    img.onload = () => { if (!cancelled) setPreview(cacheBusted); };
    img.onerror = async () => {
      try {
        const res = await fetch(cacheBusted);
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setPreview(objectUrl);
      } catch { if (!cancelled) setPreview(null); }
    };
    img.src = cacheBusted;
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [logoUrl]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error(t('settingsExtra.logoTooBig')); return; }
    setUploading(true);
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${userId}/logo.${ext}`;
    const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { toast.error(t('settingsExtra.logoUploadFailed')); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(path);
    onChange(publicUrl);
    setUploading(false);
    toast.success(t('settingsExtra.logoUploaded'));
  };

  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">{t('settingsExtra.logoLabel')}</label>
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border overflow-hidden bg-muted/40 flex items-center justify-center">
          {preview ? (
            <img src={preview} alt={t('settingsExtra.logoLabel')} className="w-full h-full object-contain p-2" />
          ) : (
            <div className="text-center text-muted-foreground">
              <ImageIcon className="mx-auto mb-1 h-6 w-6" />
              <p className="text-[10px]">{t('settingsExtra.noLogo')}</p>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label className="cursor-pointer block">
            <span className="text-sm text-primary hover:underline font-medium">
              {uploading ? t('settingsExtra.uploading') : t('settingsExtra.changeLogo')}
            </span>
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
          {logoUrl && (
            <button type="button" onClick={() => onChange(null)} className="text-sm text-destructive hover:underline block">
              {t('settingsExtra.deleteLogo')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
