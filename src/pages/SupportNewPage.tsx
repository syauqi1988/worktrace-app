import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Paperclip, X } from "lucide-react";

const CATEGORY_KEYS = [
  { value: "bug", defaultPriority: "high" },
  { value: "billing", defaultPriority: "high" },
  { value: "feature", defaultPriority: "low" },
  { value: "account", defaultPriority: "normal" },
  { value: "general", defaultPriority: "low" },
];

const PRIORITY_KEYS = ["low", "normal", "high", "urgent"] as const;

export default function SupportNewPage() {
  const { t } = useTranslation();
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
    const c = CATEGORY_KEYS.find((c) => c.value === cat);
    if (c) setPriority(c.defaultPriority);
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const valid = newFiles.filter((f) => f.size <= 5 * 1024 * 1024);
    if (valid.length < newFiles.length) toast.error(t("supportNew.fileTooBig"));
    setFiles((prev) => [...prev, ...valid].slice(0, 3));
  };

  const handleSubmit = async () => {
    if (!category || !subject.trim() || description.length < 20 || !user) {
      toast.error(t("supportNew.fillAll"));
      return;
    }
    setSubmitting(true);
    try {
      const { data: ticketNumber, error: rpcError } = await supabase.rpc("generate_ticket_number");
      if (rpcError) throw rpcError;

      const attachmentUrls: string[] = [];
      for (const file of files) {
        const path = `${user.id}/${ticketNumber}/${file.name}`;
        const { error: uploadErr } = await supabase.storage.from("ticket-attachments").upload(path, file);
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from("ticket-attachments").getPublicUrl(path);
          attachmentUrls.push(publicUrl);
        }
      }

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

      if (emailError) console.error("Email notification failed:", emailError);

      toast.success(t("supportNew.ticketCreated", { number: ticketNumber }), { duration: 6000 });
      navigate(`/support/${ticket.id}?new=true`);
    } catch (err) {
      console.error(err);
      toast.error(t("supportNew.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">{t("supportNew.title")}</h1>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-5">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">{t("supportNew.categoryLabel")}</label>
          <div className="space-y-2">
            {CATEGORY_KEYS.map((c) => (
              <button
                key={c.value}
                onClick={() => handleCategoryChange(c.value)}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                  category === c.value
                    ? "border-primary bg-primary/5 text-foreground font-medium"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {t(`supportNew.category.${c.value}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">{t("supportNew.priorityLabel")}</label>
          <div className="grid grid-cols-2 gap-2">
            {PRIORITY_KEYS.map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                  priority === p
                    ? "border-primary bg-primary/5 font-medium"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                <span className="block">{t(`supportNew.priority.${p}`)}</span>
                <span className="text-xs text-muted-foreground">{t(`supportNew.priority.${p}Desc`)}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">{t("supportNew.subjectLabel")}</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value.slice(0, 100))}
            placeholder={t("supportNew.subjectPlaceholder")}
            className="h-11 rounded-lg"
          />
          <p className="text-xs text-muted-foreground mt-1">{subject.length}/100</p>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">{t("supportNew.descriptionLabel")}</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("supportNew.descriptionPlaceholder")}
            rows={6}
          />
          <p
            className={`text-xs mt-1 ${description.length < 20 && description.length > 0 ? "text-destructive" : "text-muted-foreground"}`}
          >
            {t("supportNew.minChars", { count: description.length })}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">{t("supportNew.attachmentsLabel")}</label>
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
                <span className="text-sm text-primary hover:underline">{t("supportNew.addFile")}</span>
                <input type="file" accept="image/*,.pdf,.txt" onChange={handleFileAdd} className="hidden" />
              </label>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-muted p-3 space-y-1">
          <p className="text-xs text-muted-foreground">{t("supportNew.autoInfo")}</p>
          <p className="text-xs text-foreground">{t("supportNew.name")} {profile?.company_name || "—"}</p>
          <p className="text-xs text-foreground">{t("supportNew.emailLabel")} {user?.email}</p>
          <p className="text-xs text-foreground">{t("supportNew.planLabel")} {profile?.plan || "free"}</p>
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="w-full rounded-lg h-11">
          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {t("supportNew.submit")}
        </Button>
      </div>
    </div>
  );
}
