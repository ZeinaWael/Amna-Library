import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '../components/LanguageToggle';
import { ThemeToggle } from '../components/ThemeToggle';
import { SearchBox } from '../components/SearchBox';
import { AmbientOrbs } from '../components/AmbientOrbs';
import { ParticleCanvas } from '../components/ParticleCanvas';
import { InstitutionalHeader } from '../components/InstitutionalHeader';

export function PublicLayout() {
  const { t } = useTranslation();
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link ${isActive ? 'nav-link-active' : ''}`;

  return (
    <div className="relative flex min-h-screen flex-col surface">
      <ParticleCanvas />
      <AmbientOrbs />

      <InstitutionalHeader />

      <header className="navbar-maroon sticky top-0 z-30">
        <div className="navbar-inner mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2" aria-label={t('common.appName')}>
            <span className="brand-mark font-display text-2xl font-bold">
              {t('common.appName')}
            </span>
            <span className="hidden text-[11px] text-white/70 md:inline">
              · {t('common.schoolNameShort')}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/" end className={navClass}>
              {t('nav.home')}
            </NavLink>
            <NavLink to="/browse" className={navClass}>
              {t('nav.browse')}
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <SearchBox />
            <ThemeToggle />
            <LanguageToggle />
            <Link
              to="/admin/login"
              className="btn-ghost"
              aria-label={t('nav.adminLogin')}
              title={t('nav.adminLogin')}
            >
              <span className="icon text-base">admin_panel_settings</span>
              <span className="hidden lg:inline">{t('nav.adminLogin')}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="page-fade relative z-10 flex-1">
        <Outlet />
      </main>

      <footer className="relative z-10 mt-12 border-t border-soft">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center">
          <p className="font-display text-2xl gradient-text">{t('common.appName')}</p>
          <p className="mt-1 text-sm text-soft">{t('common.schoolName')}</p>
          <p className="mt-1 text-sm text-soft">{t('common.ministry')}</p>
          <p className="mt-5 text-xs text-soft">
            © 2026 {t('common.appName')} — {t('common.schoolName')}
          </p>
        </div>
      </footer>
    </div>
  );
}
