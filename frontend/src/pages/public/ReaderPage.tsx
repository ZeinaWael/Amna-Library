import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useBook } from '../../api/hooks';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

export default function ReaderPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const nav = useNavigate();
  const { data: book, isLoading, error, refetch } = useBook(id);

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [focus, setFocus] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const idleTimer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Stable object reference so react-pdf doesn't re-fetch on every render.
  const file = useMemo(
    () => (book?.fileUrl ? { url: book.fileUrl, withCredentials: false } : null),
    [book?.fileUrl],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setPage((p) => Math.max(1, p - 1));
      else if (e.key === 'ArrowRight') setPage((p) => (pages ? Math.min(pages, p + 1) : p + 1));
      else if (e.key === 'Escape') nav(`/books/${id}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, nav, pages]);

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
  if (!file) return <div className="p-6"><ErrorState message={t('reader.error')} /></div>;

  return (
    <div ref={containerRef} className={`relative ${focus ? 'min-h-screen bg-slate-950 text-white' : 'min-h-screen bg-slate-100 dark:bg-slate-950'}`}>
      <div className={`sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur transition dark:border-slate-800 dark:bg-slate-950/90 ${focus && !toolbarVisible ? 'opacity-0' : 'opacity-100'}`}>
        <button className="btn-ghost" onClick={() => nav(`/books/${id}`)}>{t('common.back')}</button>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
          <span className="text-sm">{t('reader.page')} {page} / {pages || '—'}</span>
          <button className="btn-ghost" onClick={() => setPage((p) => (pages ? Math.min(pages, p + 1) : p + 1))}>›</button>
          <button className="btn-ghost" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))} aria-label={t('reader.zoomOut')}>−</button>
          <span className="text-xs text-slate-500">{Math.round(zoom * 100)}%</span>
          <button className="btn-ghost" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)))} aria-label={t('reader.zoomIn')}>+</button>
          <button className="btn-ghost" onClick={toggleFullscreen}>⛶</button>
          <button className="btn-ghost" onClick={() => setFocus((f) => !f)}>{focus ? t('reader.exitFocus') : t('reader.focus')}</button>
        </div>
      </div>
      <div className="flex justify-center p-4">
        {loadError ? (
          <div className="w-full max-w-xl">
            <ErrorState
              message={`${t('reader.error')} — ${loadError}`}
              onRetry={() => {
                setLoadError(null);
                void refetch();
              }}
            />
          </div>
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
    </div>
  );
}
