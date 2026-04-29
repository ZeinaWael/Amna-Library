import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBooks, useGenres, type BookListFilters } from '../../api/hooks';
import { BookCard } from '../../components/BookCard';
import { Pagination } from '../../components/Pagination';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';

export default function BrowsePage() {
  const { t } = useTranslation();
  const genres = useGenres();
  const [filters, setFilters] = useState<BookListFilters>({ page: 1, pageSize: 12, sort: 'newest' });
  const list = useBooks(filters);

  const setF = (patch: Partial<BookListFilters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold gradient-text">{t('browse.title')}</h1>
        <span className="chip">
          <span className="icon me-1 text-[14px]">filter_alt</span>
          {t('browse.filter')}
        </span>
      </div>

      <div className="filter-card">
        <Field label={t('browse.genre')} icon="category">
          <select
            className="input"
            value={filters.genre ?? ''}
            onChange={(e) => setF({ genre: e.target.value || undefined })}
          >
            <option value="">{t('browse.any')}</option>
            {genres.data?.map((g) => (
              <option key={g.id} value={g.slug}>{g.name}</option>
            ))}
          </select>
        </Field>
        <Field label={t('browse.language')} icon="translate">
          <select
            className="input"
            value={filters.language ?? ''}
            onChange={(e) => setF({ language: e.target.value || undefined })}
          >
            <option value="">{t('browse.any')}</option>
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
        </Field>
        <Field label={t('browse.year')} icon="event">
          <input
            type="number"
            inputMode="numeric"
            className="input"
            placeholder={t('browse.any')}
            min={1000}
            max={new Date().getFullYear()}
            step={1}
            value={filters.year ?? ''}
            onChange={(e) => {
              const raw = e.target.value;
              if (!raw) return setF({ year: undefined });
              const n = parseInt(raw, 10);
              if (Number.isNaN(n) || n < 1000) return;
              setF({ year: n });
            }}
            onKeyDown={(e) => {
              if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') e.preventDefault();
            }}
          />
        </Field>
        <Field label={t('browse.sort')} icon="sort">
          <select
            className="input"
            value={filters.sort ?? 'newest'}
            onChange={(e) => setF({ sort: e.target.value as BookListFilters['sort'] })}
          >
            <option value="newest">{t('browse.newest')}</option>
            <option value="top-rated">{t('browse.topRated')}</option>
            <option value="most-downloaded">{t('browse.mostDownloaded')}</option>
          </select>
        </Field>
      </div>

      {list.isLoading ? (
        <Grid>
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </Grid>
      ) : list.error ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : !list.data || list.data.items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <Grid>{list.data.items.map((b) => <BookCard key={b.id} book={b} />)}</Grid>
          <Pagination
            page={list.data.page}
            pageSize={list.data.pageSize}
            total={list.data.total}
            onChange={(p) => setFilters((f) => ({ ...f, page: p }))}
          />
        </>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  icon,
}: {
  label: string;
  children: React.ReactNode;
  icon?: string;
}) {
  return (
    <label className="filter-field">
      <span className="label inline-flex items-center gap-1.5">
        {icon && <span className="icon text-[14px] text-accent">{icon}</span>}
        {label}
      </span>
      {children}
    </label>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}
