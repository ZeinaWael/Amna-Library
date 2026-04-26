import { useTranslation } from 'react-i18next';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useTranslation();
  return (
    <button className="btn-ghost" onClick={toggle} aria-label="Toggle theme">
      <span className="icon text-base">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
      <span className="hidden sm:inline">{theme === 'dark' ? t('common.light') : t('common.dark')}</span>
    </button>
  );
}
