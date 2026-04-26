import { useTranslation } from 'react-i18next';

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
};

export function Pagination({ page, pageSize, total, onChange }: Props) {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      <button className="btn-ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        {t('common.previous')}
      </button>
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {t('common.page')} {page} {t('common.of')} {pages}
      </span>
      <button className="btn-ghost" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        {t('common.next')}
      </button>
    </div>
  );
}
