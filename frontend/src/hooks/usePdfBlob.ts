import { useEffect, useState } from 'react';
import { cachePdf, getCachedPdf } from '../lib/readerStorage';

export type PdfBlobState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; buffer: ArrayBuffer }
  | { status: 'error'; message: string };

export function usePdfBlob(url: string | null | undefined): PdfBlobState {
  const [trackedUrl, setTrackedUrl] = useState<string | null | undefined>(url);
  const [state, setState] = useState<PdfBlobState>(() =>
    url ? { status: 'loading' } : { status: 'idle' },
  );

  // Reset state when url changes (in-render adjustment).
  if (trackedUrl !== url) {
    setTrackedUrl(url);
    setState(url ? { status: 'loading' } : { status: 'idle' });
  }

  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    void (async () => {
      const cached = await getCachedPdf(url);
      if (cancelled) return;

      if (cached) {
        setState({ status: 'success', buffer: cached });
        // Stale-while-revalidate: refresh the cache for next time. Do NOT
        // swap the rendered buffer mid-session.
        void (async () => {
          try {
            const res = await fetch(url);
            if (res.ok) await cachePdf(url, res);
          } catch {
            // Network refresh failed; the cached copy we already served stands.
          }
        })();
        return;
      }

      try {
        const res = await fetch(url);
        if (cancelled) return;
        if (!res.ok) {
          setState({ status: 'error', message: `HTTP ${res.status}` });
          return;
        }
        // cachePdf clones internally, so the original body remains readable.
        await cachePdf(url, res);
        const buffer = await res.arrayBuffer();
        if (cancelled) return;
        setState({ status: 'success', buffer });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Network error';
        setState({ status: 'error', message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
