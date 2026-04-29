import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/auth';
import { useAdminStats } from '../api/hooks';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageToggle } from '../components/LanguageToggle';
import { AmbientOrbs } from '../components/AmbientOrbs';
import { BrandLogos } from '../components/BrandLogos';

const ITEMS = [
  { to: '/admin', icon: 'space_dashboard', key: 'admin.dashboard' as const, end: true },
  { to: '/admin/books', icon: 'menu_book', key: 'admin.books' as const },
  { to: '/admin/authors', icon: 'person', key: 'admin.authors' as const },
  { to: '/admin/genres', icon: 'category', key: 'admin.genres' as const },
  { to: '/admin/reviews', icon: 'reviews', key: 'admin.reviews' as const, badge: 'pending' as const },
];

export function AdminLayout() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const { data: stats } = useAdminStats();

  return (
    <div className="relative flex min-h-screen surface">
      <AmbientOrbs />

      <aside
        className="relative z-10 hidden w-64 shrink-0 p-5 md:flex md:flex-col"
        style={{ background: 'var(--card-bg)', borderInlineEnd: '1px solid var(--border)' }}
      >
        <Link to="/admin" className="mb-8 flex items-center gap-3">
          <BrandLogos size="sm" count={1} />
          <div className="leading-tight">
            <p className="font-display text-lg gradient-text">{t('common.appName')}</p>
            <p className="text-[10px] uppercase tracking-wider text-soft">{t('admin.title')}</p>
          </div>
        </Link>

        <nav className="space-y-1">
          {ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'text-white shadow-md'
                    : 'text-soft hover:text-accent hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))' }
                  : undefined
              }
            >
              <span className="icon text-base">{item.icon}</span>
              <span className="flex-1">{t(item.key)}</span>
              {item.badge === 'pending' && stats?.pendingReviews ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold text-white">
                  {stats.pendingReviews}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-soft pt-4 text-[11px] text-soft">
          {t('common.schoolNameShort')}
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="glass flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="icon text-base text-soft">person</span>
            <span className="text-sm text-soft">{user?.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
            <button
              className="btn-ghost"
              onClick={() => {
                logout();
                nav('/');
              }}
            >
              <span className="icon text-base">logout</span>
              <span className="hidden sm:inline">{t('common.logout')}</span>
            </button>
          </div>
        </header>

        <main className="page-fade flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
