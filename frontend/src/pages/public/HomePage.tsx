import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBooks, useFeatured, useLatestReviews } from '../../api/hooks';
import { BookCard } from '../../components/BookCard';
import { ErrorState } from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import { StarRating } from '../../components/StarRating';

export default function HomePage() {
  const { t } = useTranslation();
  const featured = useFeatured(6);
  const recent = useBooks({ page: 1, pageSize: 8, sort: 'newest' });
  const reviews = useLatestReviews(6);

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-10">
      <section
        className="relative overflow-hidden rounded-2xl p-10 text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #8b1a3a 0%, #a52342 55%, #6e1330 100%)' }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -end-16 h-72 w-72 rounded-full blur-3xl"
          style={{ background: 'rgba(255,255,255,0.10)' }}
        />
        <h1 className="relative text-3xl font-bold sm:text-5xl">{t('home.heroTitle')}</h1>
        <p className="relative mt-3 max-w-xl text-white/90">{t('home.heroSubtitle')}</p>
        <Link
          to="/browse"
          className="relative mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold shadow transition hover:-translate-y-0.5 hover:shadow-xl"
          style={{ color: '#8b1a3a' }}
        >
          {t('home.browseAll')} →
        </Link>
      </section>

      <Section title={t('home.featured')}>
        {featured.isLoading ? (
          <SkeletonGrid count={4} />
        ) : featured.error ? (
          <ErrorState onRetry={() => void featured.refetch()} />
        ) : (
          <Grid>{featured.data?.map((b) => <BookCard key={b.id} book={b} />)}</Grid>
        )}
      </Section>

      <Section title={t('home.recent')}>
        {recent.isLoading ? (
          <SkeletonGrid count={4} />
        ) : recent.error ? (
          <ErrorState onRetry={() => void recent.refetch()} />
        ) : (
          <Grid>{recent.data?.items.map((b) => <BookCard key={b.id} book={b} />)}</Grid>
        )}
      </Section>

      <Section title={t('home.latestReviews')}>
        {reviews.isLoading ? (
          <SkeletonGrid count={3} cols={3} />
        ) : reviews.error ? (
          <ErrorState onRetry={() => void reviews.refetch()} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reviews.data?.map((r, i) => (
              <div key={i} className="card">
                <div className="mb-2 flex items-center gap-3">
                  {r.coverUrl ? (
                    <img src={r.coverUrl} alt={r.bookTitle} className="h-12 w-9 rounded object-cover" />
                  ) : (
                    <div className="h-12 w-9 rounded bg-slate-100 dark:bg-slate-800" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{r.bookTitle}</p>
                    <StarRating value={r.rating} />
                  </div>
                </div>
                <p className="line-clamp-3 text-sm text-slate-600 dark:text-slate-400">{r.content}</p>
                <p className="mt-2 text-xs text-slate-500">— {r.maskedReviewerName}</p>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}

function SkeletonGrid({ count, cols = 4 }: { count: number; cols?: 3 | 4 }) {
  return (
    <div className={`grid grid-cols-2 gap-4 ${cols === 3 ? 'md:grid-cols-3' : 'sm:grid-cols-3 lg:grid-cols-4'}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-64" />
      ))}
    </div>
  );
}
