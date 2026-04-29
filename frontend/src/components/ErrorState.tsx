import { useTranslation } from 'react-i18next';

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="error-card" role="alert">
      <span className="error-icon">
        <span className="icon text-base">error_outline</span>
      </span>
      <div className="flex flex-1 flex-col">
        <p className="text-sm font-semibold">{message ?? t('common.error')}</p>
        {onRetry && (
          <button
            className="self-start rounded-full px-3 py-1 text-xs font-semibold transition hover:-translate-y-0.5"
            style={{
              background: 'color-mix(in srgb, var(--danger) 16%, transparent)',
              color: 'var(--danger)',
              border: '1px solid color-mix(in srgb, var(--danger) 40%, transparent)',
            }}
            onClick={onRetry}
          >
            <span className="icon me-1 text-[14px] align-middle">refresh</span>
            {t('common.retry')}
          </button>
        )}
      </div>
    </div>
  );
}
