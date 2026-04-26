import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSearchBooks } from '../../api/hooks';
import { BookCard } from '../../components/BookCard';
import { Pagination } from '../../components/Pagination';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';

export default function SearchPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const [page, setPage] = useState(1);
  const list = useSearchBooks(q, page, 12);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">
        {t('common.search')}: <span className="text-brand-600">"{q}"</span>
      </h1>
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
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}
