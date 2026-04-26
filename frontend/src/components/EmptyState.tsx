import { useTranslation } from 'react-i18next';

export function EmptyState({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
      {message ?? t('common.empty')}
    </div>
  );
}
