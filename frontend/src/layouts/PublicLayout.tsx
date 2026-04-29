import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '../components/LanguageToggle';
import { ThemeToggle } from '../components/ThemeToggle';
import { SearchBox } from '../components/SearchBox';
import { AmbientOrbs } from '../components/AmbientOrbs';
import { ParticleCanvas } from '../components/ParticleCanvas';
import { InstitutionalHeader } from '../components/InstitutionalHeader';
import { BRAND_LOGO_URL } from '../components/BrandLogos';

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
          <Link
            to="/"
            className="group flex items-center gap-3"
            aria-label={t('common.appName')}
          >
            <img
              src={BRAND_LOGO_URL}
              alt=""
              aria-hidden="true"
              className="logo-img logo-fade h-12 w-12 shrink-0 rounded-lg bg-white/85 object-contain p-1 shadow-md sm:h-14 sm:w-14"
            />
            <span className="flex flex-col leading-tight">
              <span className="brand-mark font-display text-2xl font-bold transition-transform duration-300 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 sm:text-[1.7rem]">
                {t('common.appName')}
              </span>
              <span className="hidden text-[11px] text-soft sm:inline">
                {t('common.schoolNameShort')}
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/" end className={navClass}>
              <span className="icon me-1 text-[16px] align-middle">home</span>
              {t('nav.home')}
            </NavLink>
            <NavLink to="/browse" className={navClass}>
              <span className="icon me-1 text-[16px] align-middle">menu_book</span>
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
          <p className="mt-3">
            <a
              href="https://www.linkedin.com/in/zeina-wael-0a539634b"
              target="_blank"
              rel="noopener noreferrer"
              className="linkedin-credit text-xs"
              aria-label={t('footer.creditAria')}
            >
              <span className="icon">link</span>
              {t('footer.credit')}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
