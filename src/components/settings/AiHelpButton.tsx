import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const AI_CHAT_URL = "";

export default function AiHelpButton() {
  const { t } = useTranslation();
  const handleClick = () => {
    if (AI_CHAT_URL) {
      window.open(AI_CHAT_URL, "_blank");
    } else {
      toast.info(t('settingsExtra.aiInfoToast'), { duration: 5000 });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-bold text-foreground">{t('settingsExtra.aiHelpTitle')}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{t('settingsExtra.aiHelpBody')}</p>
      <div className="relative">
        <button
          type="button"
          onClick={handleClick}
          className="w-full h-11 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition"
          style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)" }}
        >
          <Sparkles className="h-4 w-4" />
          {t('settingsExtra.openAiHelp')}
        </button>
        {!AI_CHAT_URL && (
          <span className="absolute -top-2 -right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
            {t('settingsExtra.aiComingSoon')}
          </span>
        )}
      </div>
    </div>
  );
}
