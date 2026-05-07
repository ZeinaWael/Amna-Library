import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useBook } from '../../api/hooks';
import { usePdfBlob } from '../../hooks/usePdfBlob';
import { useReaderState } from '../../hooks/useReaderState';
import { useToast } from '../../components/Toast';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import ReaderBottomBar from '../../components/reader/ReaderBottomBar';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;
const ZOOM_DEFAULT = 1.0;
const ZOOM_STEP = 0.1;

export default function ReaderPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const nav = useNavigate();
  const { data: book, isLoading, error, refetch } = useBook(id);

  const [pages, setPages] = useState(0);
  const [focus, setFocus] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const idleTimer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { page, zoom, setPage, setZoom, didResume } = useReaderState(
    id,
    pages > 0 ? pages : null,
  );
  const { toast } = useToast();
  const lastToastedBookIdRef = useRef<string | null>(null);

  // Resolve the PDF as an ArrayBuffer through the Cache API (stale-while-revalidate).
  const pdfState = usePdfBlob(book?.fileUrl ?? null);

  // Stable object reference so react-pdf doesn't re-parse on every render.
  const file = useMemo(
    () => (pdfState.status === 'success' ? { data: pdfState.buffer } : null),
    [pdfState],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setPage(page - 1);
      else if (e.key === 'ArrowRight') setPage(page + 1);
      else if (e.key === 'Escape') nav(`/books/${id}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, nav, page, setPage]);

  // Resumed-from-page toast: fires once per book once numPages is known so the
  // displayed page reflects any clamping. Gated by a per-bookId ref so it does
  // not re-fire on later setPage calls within the same session.
  useEffect(() => {
    if (lastToastedBookIdRef.current === id) return;
    if (pages <= 0) return;
    lastToastedBookIdRef.current = id;
    if (didResume) {
      toast({ message: t('reader.resumed', { page }), duration: 3000 });
    }
  }, [id, didResume, pages, page, t, toast]);

  useEffect(() => {
    if (!focus) {
      setToolbarVisible(true);
      return;
    }
    const reset = () => {
      setToolbarVisible(true);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => setToolbarVisible(false), 2000);
    };
    reset();
    window.addEventListener('mousemove', reset);
    window.addEventListener('keydown', reset);
    return () => {
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('keydown', reset);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [focus]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) await containerRef.current?.requestFullscreen?.();
    else await document.exitFullscreen();
  };

  if (isLoading) return <div className="p-6"><Skeleton className="h-screen" /></div>;
  if (error || !book) return <div className="p-6"><ErrorState onRetry={() => void refetch()} /></div>;
  if (!book.fileUrl) return <div className="p-6"><ErrorState message={t('reader.error')} /></div>;

  const pdfFetchError = pdfState.status === 'error' ? pdfState.message : null;
  const displayError = loadError ?? pdfFetchError;

  return (
    <div ref={containerRef} className={`relative ${focus ? 'min-h-screen bg-slate-950 text-white' : 'min-h-screen bg-slate-100 dark:bg-slate-950'}`}>
      <div className={`sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur transition dark:border-slate-800 dark:bg-slate-950/90 ${focus && !toolbarVisible ? 'opacity-0' : 'opacity-100'}`}>
        <button className="btn-ghost" onClick={() => nav(`/books/${id}`)}>{t('common.back')}</button>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" onClick={toggleFullscreen}>⛶</button>
          <button className="btn-ghost" onClick={() => setFocus((f) => !f)}>{focus ? t('reader.exitFocus') : t('reader.focus')}</button>
        </div>
      </div>
      <div className="flex justify-center p-4 pb-24">
        {displayError ? (
          <div className="w-full max-w-xl">
            <ErrorState
              message={`${t('reader.error')} — ${displayError}`}
              onRetry={() => {
                setLoadError(null);
                void refetch();
              }}
            />
          </div>
        ) : !file ? (
          <div className="p-12 text-center text-slate-500">{t('reader.loading')}</div>
        ) : (
          <Document
            file={file}
            loading={<div className="p-12 text-center text-slate-500">{t('reader.loading')}</div>}
            error={<div />}
            onLoadSuccess={(d) => {
              setPages(d.numPages);
              setLoadError(null);
            }}
            onLoadError={(err) => setLoadError(err?.message ?? 'Unknown error')}
            onSourceError={(err) => setLoadError(err?.message ?? 'Source error')}
          >
            <Page pageNumber={page} scale={zoom} renderTextLayer renderAnnotationLayer />
          </Document>
        )}
      </div>
      <ReaderBottomBar
        page={page}
        numPages={pages}
        zoom={zoom}
        zoomMin={ZOOM_MIN}
        zoomMax={ZOOM_MAX}
        defaultZoom={ZOOM_DEFAULT}
        onPrev={() => setPage(page - 1)}
        onNext={() => setPage(page + 1)}
        onGoTo={(p) => setPage(p)}
        onZoomIn={() => setZoom(+(zoom + ZOOM_STEP).toFixed(2))}
        onZoomOut={() => setZoom(+(zoom - ZOOM_STEP).toFixed(2))}
        onZoomReset={() => setZoom(ZOOM_DEFAULT)}
      />
    </div>
  );
}
