import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Paperclip, X } from "lucide-react";

const CATEGORIES = [
  { value: "bug", label: "🐛 Bug / Ralat Teknikal", defaultPriority: "high" },
  { value: "billing", label: "💳 Bil & Pembayaran", defaultPriority: "high" },
  { value: "feature", label: "💡 Cadangan Ciri Baru", defaultPriority: "low" },
  { value: "account", label: "👤 Masalah Akaun", defaultPriority: "normal" },
  { value: "general", label: "❓ Soalan Am", defaultPriority: "low" },
];

const PRIORITIES = [
  { value: "low", label: "🟢 Rendah", desc: "Soalan am / cadangan" },
  { value: "normal", label: "🔵 Normal", desc: "Isu biasa" },
  { value: "high", label: "🟡 Tinggi", desc: "Mengganggu kerja harian" },
  { value: "urgent", label: "🔴 Urgent", desc: "Tidak boleh guna langsung" },
];

export default function SupportNewPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("normal");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    const c = CATEGORIES.find((c) => c.value === cat);
    if (c) setPriority(c.defaultPriority);
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const valid = newFiles.filter((f) => f.size <= 5 * 1024 * 1024);
    if (valid.length < newFiles.length) toast.error("Fail melebihi 5MB dibuang");
    setFiles((prev) => [...prev, ...valid].slice(0, 3));
  };

  const handleSubmit = async () => {
    if (!category || !subject.trim() || description.length < 20 || !user) {
      toast.error("Sila lengkapkan semua medan wajib");
      return;
    }
    setSubmitting(true);
    try {
      // Generate ticket number
      const { data: ticketNumber, error: rpcError } = await supabase.rpc("generate_ticket_number");
      if (rpcError) throw rpcError;

      // Upload attachments
      const attachmentUrls: string[] = [];
      for (const file of files) {
        const path = `${user.id}/${ticketNumber}/${file.name}`;
        const { error: uploadErr } = await supabase.storage.from("ticket-attachments").upload(path, file);
        if (!uploadErr) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("ticket-attachments").getPublicUrl(path);
          attachmentUrls.push(publicUrl);
        }
      }

      // Insert ticket
      const { data: ticket, error: insertErr } = await supabase
        .from("support_tickets")
        .insert({
          ticket_number: ticketNumber,
          user_id: user.id,
          user_email: user.email || "",
          user_name: profile?.company_name || null,
          user_plan: profile?.plan || "free",
          category,
          priority,
          subject: subject.trim(),
          description: description.trim(),
          attachments: attachmentUrls,
          status: "open",
        } as any)
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      // Send email notifications via Edge Function
      const { error: emailError } = await supabase.functions.invoke("send-ticket-email", {
        body: {
          ticket_number: ticketNumber,
          ticket_id: ticket.id,
          user_email: user.email,
          user_name: profile?.company_name || user.email,
          user_plan: profile?.plan || "free",
          category,
          priority,
          subject: subject.trim(),
          description: description.trim(),
        },
      });

      if (emailError) {
        console.error("Email notification failed:", emailError);
      }

      toast.success(
        `Tiket ${ticketNumber} berjaya dihantar! Semak emel anda untuk pengesahan. Kami akan balas dalam 24 jam.`,
        { duration: 6000 }
      );
      navigate(`/support/${ticket.id}?new=true`);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghantar tiket. Sila cuba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/support")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Buat Tiket Baru</h1>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-5">
        {/* Category */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Kategori Isu *</label>
          <div className="space-y-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => handleCategoryChange(c.value)}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                  category === c.value
                    ? "border-primary bg-primary/5 text-foreground font-medium"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Keutamaan</label>
          <div className="grid grid-cols-2 gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                  priority === p.value
                    ? "border-primary bg-primary/5 font-medium"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                <span className="block">{p.label}</span>
                <span className="text-xs text-muted-foreground">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Subjek *</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value.slice(0, 100))}
            placeholder="Ringkasan masalah anda..."
            className="h-11 rounded-lg"
          />
          <p className="text-xs text-muted-foreground mt-1">{subject.length}/100</p>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Penerangan *</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Terangkan masalah anda dengan terperinci. Sertakan:&#10;• Apa yang anda cuba lakukan&#10;• Apa yang berlaku&#10;• Bila ia berlaku"
            rows={6}
          />
          <p
            className={`text-xs mt-1 ${description.length < 20 && description.length > 0 ? "text-destructive" : "text-muted-foreground"}`}
          >
            Min 20 aksara ({description.length}/20)
          </p>
        </div>

        {/* Attachments */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Lampiran (Pilihan)</label>
          <div className="space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-foreground bg-muted rounded-lg px-3 py-2">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate flex-1">{f.name}</span>
                <button onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
            {files.length < 3 && (
              <label className="cursor-pointer">
                <span className="text-sm text-primary hover:underline">+ Tambah fail (maks 3, 5MB setiap satu)</span>
                <input type="file" accept="image/*,.pdf,.txt" onChange={handleFileAdd} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Auto-filled info */}
        <div className="rounded-lg bg-muted p-3 space-y-1">
          <p className="text-xs text-muted-foreground">Maklumat auto:</p>
          <p className="text-xs text-foreground">Nama: {profile?.company_name || "—"}</p>
          <p className="text-xs text-foreground">Emel: {user?.email}</p>
          <p className="text-xs text-foreground">Pelan: {profile?.plan || "free"}</p>
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="w-full rounded-lg h-11">
          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Hantar Tiket
        </Button>
      </div>
    </div>
  );
}
