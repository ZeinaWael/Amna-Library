import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBooksByIds } from '../../api/hooks';
import { useUserPrefs } from '../../hooks/useUserPrefs';
import { BookCard } from '../../components/BookCard';
import { ErrorState } from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import { Seo } from '../../components/seo/Seo';

export default function ShelfPage() {
  const { t } = useTranslation();
  const { shelf } = useUserPrefs();
  const { data, isLoading, error, refetch } = useBooksByIds(shelf);

  if (shelf.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Seo title={t('seo.shelf.title')} description={t('shelf.empty.title')} noindex />
        <h1 className="font-display text-3xl font-semibold gradient-text">
          {t('shelf.title')}
        </h1>
        <p className="mt-4 text-base text-soft">{t('shelf.empty.title')}</p>
        <Link to="/browse" className="btn-primary mt-6 inline-flex">
          <span className="icon text-base">menu_book</span>
          {t('shelf.empty.cta')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <Seo title={t('seo.shelf.title')} description={t('shelf.empty.title')} noindex />
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold gradient-text">
          {t('shelf.title')}
        </h1>
        <span className="chip">{shelf.length}</span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: Math.min(shelf.length, 8) }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : error ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data?.map((b) => <BookCard key={b.id} book={b} />)}
        </div>
      )}
    </div>
  );
}
