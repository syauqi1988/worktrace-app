import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { tx } from '@/lib/tx';

const AI_CHAT_URL = ""; // Set when AI agent is ready

export default function AiHelpButton() {
  const handleClick = () => {
    if (AI_CHAT_URL) {
      window.open(AI_CHAT_URL, "_blank");
    } else {
      toast.info(
        "🤖 AI Bantuan akan datang tidak lama lagi! Gunakan tiket sokongan untuk pertanyaan sekarang.",
        { duration: 5000 },
      );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-bold text-foreground">AI Bantuan WorkTrace</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        {tx('Tanya apa sahaja tentang cara menggunakan WorkTrace. Kami akan bantu anda 24/7.')}
      </p>
      <div className="relative">
        <button
          type="button"
          onClick={handleClick}
          className="w-full h-11 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition"
          style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)" }}
        >
          <Sparkles className="h-4 w-4" />
          Buka AI Bantuan
        </button>
        {!AI_CHAT_URL && (
          <span className="absolute -top-2 -right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
            {tx('Akan Datang')}
          </span>
        )}
      </div>
    </div>
  );
}
