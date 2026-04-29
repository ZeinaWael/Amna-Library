import { useTranslation } from 'react-i18next';
import { useAdminStats } from '../../api/hooks';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { Counter } from '../../components/Counter';

const ICONS = ['menu_book', 'auto_stories', 'pending', 'task_alt', 'download', 'visibility'];

export default function DashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useAdminStats();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }
  if (error || !data) return <ErrorState onRetry={() => void refetch()} />;

  const cards = [
    { label: t('admin.stats.totalBooks'), value: data.totalBooks },
    { label: t('admin.stats.publishedBooks'), value: data.publishedBooks },
    { label: t('admin.stats.pendingReviews'), value: data.pendingReviews },
    { label: t('admin.stats.approvedReviews'), value: data.approvedReviews },
    { label: t('admin.stats.downloads'), value: data.totalDownloads },
    { label: t('admin.stats.views'), value: data.totalViews },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">{t('admin.dashboard')}</h1>
        <p className="mt-1 text-sm text-soft">{t('admin.dashboardSubtitle')}</p>
      </div>

      <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <div key={c.label} className="stat-tile">
            <span className="icon stat-icon">{ICONS[i] ?? 'insights'}</span>
            <p className="text-xs uppercase tracking-wider text-soft">{c.label}</p>
            <p className="mt-2 font-display text-4xl font-bold gradient-text">
              <Counter value={c.value} />
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
