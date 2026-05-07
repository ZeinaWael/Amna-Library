import { useTranslation } from 'react-i18next';
import GoToPageInput from './GoToPageInput';

type Props = {
  page: number;
  numPages: number;
  zoom: number;
  zoomMin: number;
  zoomMax: number;
  defaultZoom: number;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (p: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
};

const EPS = 0.0001;

export default function ReaderBottomBar({
  page,
  numPages,
  zoom,
  zoomMin,
  zoomMax,
  defaultZoom,
  onPrev,
  onNext,
  onGoTo,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: Props) {
  const { t } = useTranslation();
  const totalDisplay = numPages > 0 ? numPages : '—';
  const prevDisabled = page <= 1;
  const nextDisabled = numPages > 0 && page >= numPages;
  const zoomOutDisabled = zoom <= zoomMin + EPS;
  const zoomInDisabled = zoom >= zoomMax - EPS;
  const zoomResetDisabled = Math.abs(zoom - defaultZoom) < EPS;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-soft glass pb-[env(safe-area-inset-bottom)]"
      role="toolbar"
      aria-label={t('reader.pageIndicator', { current: page, total: totalDisplay })}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrev}
            disabled={prevDisabled}
            aria-label={t('reader.prevPage')}
            className="btn-ghost h-10 w-10 p-0 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="icon rtl:rotate-180">chevron_left</span>
          </button>
          <span className="whitespace-nowrap text-xs text-soft sm:text-sm">
            {t('reader.pageIndicator', { current: page, total: totalDisplay })}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            aria-label={t('reader.nextPage')}
            className="btn-ghost h-10 w-10 p-0 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="icon rtl:rotate-180">chevron_right</span>
          </button>
        </div>

        <div className="flex items-center">
          {numPages > 0 && <GoToPageInput numPages={numPages} onSubmit={onGoTo} />}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onZoomOut}
            disabled={zoomOutDisabled}
            aria-label={t('reader.zoomOut')}
            className="btn-ghost h-10 w-10 p-0 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="icon">zoom_out</span>
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            disabled={zoomInDisabled}
            aria-label={t('reader.zoomIn')}
            className="btn-ghost h-10 w-10 p-0 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="icon">zoom_in</span>
          </button>
          <button
            type="button"
            onClick={onZoomReset}
            disabled={zoomResetDisabled}
            aria-label={t('reader.zoomReset')}
            className="btn-ghost h-10 w-10 p-0 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="icon">restart_alt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
