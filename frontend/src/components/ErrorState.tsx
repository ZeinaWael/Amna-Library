import { useTranslation } from 'react-i18next';

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-center text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
      <p>{message ?? t('common.error')}</p>
      {onRetry && (
        <button className="btn-ghost mt-3" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}
