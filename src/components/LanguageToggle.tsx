import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const current = i18n.language?.startsWith('en') ? 'en' : 'ms';

  const setLang = (lng: 'ms' | 'en') => {
    if (lng === current) return;
    i18n.changeLanguage(lng);
  };

  const segBase =
    'h-6 px-2 text-[11px] font-semibold rounded-md transition-colors flex items-center justify-center';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="group"
          aria-label={t('header.language')}
          className="h-8 inline-flex items-center gap-0.5 p-0.5 rounded-full border border-border bg-transparent mr-2"
        >
          <button
            type="button"
            onClick={() => setLang('ms')}
            className={`${segBase} ${
              current === 'ms'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-pressed={current === 'ms'}
          >
            BM
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`${segBase} ${
              current === 'en'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-pressed={current === 'en'}
          >
            EN
          </button>
        </div>
      </TooltipTrigger>
      <TooltipContent>{t('header.language')}</TooltipContent>
    </Tooltip>
  );
}
