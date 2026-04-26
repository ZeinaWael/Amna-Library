import { useTranslation } from 'react-i18next';

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const next = i18n.language === 'ar' ? 'en' : 'ar';
  return (
    <button
      className="btn-ghost"
      onClick={() => void i18n.changeLanguage(next)}
      aria-label="Toggle language"
    >
      <span className="icon text-base">translate</span>
      <span className="hidden sm:inline">
        {next === 'ar' ? t('common.arabic') : t('common.english')}
      </span>
    </button>
  );
}
