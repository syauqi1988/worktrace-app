import { useTranslation } from 'react-i18next';

export default function PlaceholderPage({ title }: { title: string }) {
  const { t } = useTranslation();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="text-muted-foreground text-sm mt-1">{t('placeholder.comingSoon')}</p>
    </div>
  );
}
