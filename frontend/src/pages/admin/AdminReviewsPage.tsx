import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAdminReviews } from '../../api/hooks';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Pagination } from '../../components/Pagination';
import { StarRating } from '../../components/StarRating';

type Tab = 'Pending' | 'Approved' | 'Rejected' | 'all';

export default function AdminReviewsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('Pending');
  const [page, setPage] = useState(1);
  const list = useAdminReviews(tab === 'all' ? undefined : tab, page, 20);
  const qc = useQueryClient();

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    void qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
  };

  const approve = async (id: string) => { await api.patch(`/admin/reviews/${id}/approve`); invalidate(); };
  const reject = async (id: string) => { await api.patch(`/admin/reviews/${id}/reject`); invalidate(); };
  const remove = async (id: string) => {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    await api.delete(`/admin/reviews/${id}`);
    invalidate();
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'Pending', label: t('admin.tabs.pending') },
    { key: 'Approved', label: t('admin.tabs.approved') },
    { key: 'Rejected', label: t('admin.tabs.rejected') },
    { key: 'all', label: t('admin.tabs.all') },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t('admin.reviews')}</h1>
      <div className="flex gap-2">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            className={tab === tb.key ? 'btn-primary' : 'btn-ghost'}
            onClick={() => { setTab(tb.key); setPage(1); }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {list.isLoading ? <Skeleton className="h-48" /> : list.error ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : !list.data || list.data.items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {list.data.items.map((r) => (
            <div key={r.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{r.bookTitle}</p>
                  <p className="text-xs text-slate-500">{r.reviewerName} ({r.reviewerEmail})</p>
                </div>
                <div className="flex items-center gap-2">
                  <StarRating value={r.rating} />
                  <span className="chip">{r.status}</span>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{r.content}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-primary" disabled={r.status === 'Approved'} onClick={() => approve(r.id)}>{t('admin.actions.approve')}</button>
                <button className="btn-ghost" disabled={r.status === 'Rejected'} onClick={() => reject(r.id)}>{t('admin.actions.reject')}</button>
                <button className="btn-ghost text-red-600" onClick={() => remove(r.id)}>{t('common.delete')}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {list.data && (
        <Pagination page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} onChange={setPage} />
      )}
    </div>
  );
}
