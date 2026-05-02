import { useTranslation } from 'react-i18next';

interface WelcomeModalProps {
  isOpen: boolean;
  onStart: () => void;
  onSkip: () => void;
}

export default function WelcomeModal({ isOpen, onStart, onSkip }: WelcomeModalProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl max-w-[440px] w-full p-8 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="text-5xl mb-4">👋</div>
        <h2 className="text-lg font-medium text-[#0F172A] mb-3">{t('tutorialUi.welcomeTitle')}</h2>
        <p className="text-sm text-[#64748B] leading-relaxed mb-4">{t('tutorialUi.welcomeBody')}</p>
        <p className="text-sm text-[#64748B] mb-1">{t('tutorialUi.welcomeBody2')}</p>
        <ul className="text-[13px] text-[#64748B] text-left space-y-1.5 mb-6 mx-auto max-w-[280px]">
          <li className="flex items-center gap-2"><span className="text-green-500">✓</span> {t('tutorialUi.feat1')}</li>
          <li className="flex items-center gap-2"><span className="text-green-500">✓</span> {t('tutorialUi.feat2')}</li>
          <li className="flex items-center gap-2"><span className="text-green-500">✓</span> {t('tutorialUi.feat3')}</li>
          <li className="flex items-center gap-2"><span className="text-green-500">✓</span> {t('tutorialUi.feat4')}</li>
        </ul>
        <button
          onClick={onStart}
          className="w-full h-11 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium transition-colors mb-2"
        >
          {t('tutorialUi.start')}
        </button>
        <button
          onClick={onSkip}
          className="w-full h-11 rounded-lg text-[#64748B] text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          {t('tutorialUi.skipAll')}
        </button>
        <p className="text-[11px] text-[#94A3B8] italic mt-4">{t('tutorialUi.tip')}</p>
      </div>
    </div>
  );
}
