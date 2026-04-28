import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const DEFAULT_WO_TERMS = `1. Kerja akan dilaksanakan mengikut spesifikasi yang telah dipersetujui.
2. Sebarang perubahan skop kerja memerlukan kelulusan bertulis.
3. Pembayaran hendaklah dibuat dalam masa 14 hari dari tarikh invois.
4. Syarikat tidak bertanggungjawab atas kerosakan yang sedia ada sebelum kerja bermula.
5. Gambar sebelum dan selepas kerja diambil sebagai rekod rasmi.`;

export default function WorkOrderTermsSection() {
  const { profile, updateProfile } = useAuth();
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
      toast.success("Terma Work Order disimpan!");
    } catch {
      toast.error("Gagal menyimpan terma");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setText(DEFAULT_WO_TERMS);
    toast.info("Terma dipulihkan ke lalai. Tekan Simpan untuk mengesahkan.");
  };

  return (
    <div className="space-y-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder={DEFAULT_WO_TERMS}
      />
      <p className="text-xs text-muted-foreground">
        Terma ini dipaparkan secara automatik dalam setiap Work Order baharu. Anda boleh edit per-dokumen ketika
        membuat Work Order.
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="rounded-lg">
          {saving ? "Menyimpan..." : "Simpan Terma Work Order"}
        </Button>
        <button
          type="button"
          onClick={handleReset}
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Pulihkan Lalai
        </button>
      </div>
    </div>
  );
}
