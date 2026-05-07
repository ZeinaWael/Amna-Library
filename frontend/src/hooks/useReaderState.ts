import { useCallback, useEffect, useRef, useState } from 'react';
import { loadReaderState, saveReaderState } from '../lib/readerStorage';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;
const DEFAULT_ZOOM = 1.0;

function clampZoom(z: number): number {
  if (!Number.isFinite(z)) return DEFAULT_ZOOM;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
}

type Internal = { page: number; zoom: number; didResume: boolean };

type LoadResult = {
  state: Internal;
  storageSnapshot: { page: number; zoom: number };
};

function loadFor(bookId: string): LoadResult {
  const saved = loadReaderState(bookId);
  if (!saved) {
    return {
      state: { page: 1, zoom: DEFAULT_ZOOM, didResume: false },
      storageSnapshot: { page: 1, zoom: DEFAULT_ZOOM },
    };
  }
  const page = saved.page < 1 ? 1 : saved.page;
  const zoom = clampZoom(saved.zoom);
  return {
    state: { page, zoom, didResume: page > 1 },
    storageSnapshot: { page: saved.page, zoom: saved.zoom },
  };
}

export function useReaderState(
  bookId: string,
  numPages: number | null,
): {
  page: number;
  zoom: number;
  setPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  didResume: boolean;
} {
  const [trackedBookId, setTrackedBookId] = useState<string>(bookId);
  const [state, setState] = useState<Internal>(() => loadFor(bookId).state);

  // Last snapshot known to be in storage for the current bookId. The persist
  // effect compares state against this — equal means no write, which is what
  // keeps a freshly-loaded value from being immediately rewritten with itself.
  const persistedRef = useRef<{
    bookId: string;
    page: number;
    zoom: number;
  } | null>(null);

  // Reset state on bookId change (React's "adjusting state on prop change").
  if (trackedBookId !== bookId) {
    setTrackedBookId(bookId);
    setState(loadFor(bookId).state);
  }

  // In-render clamp once numPages is known. The persist effect picks up the
  // resulting state divergence and writes it through.
  let adjustedPage = state.page;
  if (numPages != null) {
    if (adjustedPage > numPages) adjustedPage = numPages;
    if (adjustedPage < 1) adjustedPage = 1;
  }
  if (adjustedPage !== state.page) {
    setState((s) => ({ ...s, page: adjustedPage }));
  }

  // Sync the storage snapshot when bookId changes (and on first mount).
  // Declared before the persist effect so it runs first in commit order.
  useEffect(() => {
    const snap = loadFor(bookId).storageSnapshot;
    persistedRef.current = { bookId, page: snap.page, zoom: snap.zoom };
  }, [bookId]);

  // Single source of truth for persistence. Writes only when state diverges
  // from the storage snapshot. saveReaderState debounces internally.
  useEffect(() => {
    const last = persistedRef.current;
    if (!last || last.bookId !== bookId) return;
    if (last.page === state.page && last.zoom === state.zoom) return;
    persistedRef.current = { bookId, page: state.page, zoom: state.zoom };
    saveReaderState(bookId, {
      page: state.page,
      zoom: state.zoom,
      updatedAt: Date.now(),
    });
  }, [bookId, state.page, state.zoom]);

  const setPage = useCallback(
    (p: number) => {
      setState((s) => {
        let next = p;
        if (numPages != null && next > numPages) next = numPages;
        if (next < 1) next = 1;
        if (next === s.page) return s;
        return { ...s, page: next };
      });
    },
    [numPages],
  );

  const setZoom = useCallback((z: number) => {
    setState((s) => {
      const next = clampZoom(z);
      if (next === s.zoom) return s;
      return { ...s, zoom: next };
    });
  }, []);

  return {
    page: state.page,
    zoom: state.zoom,
    setPage,
    setZoom,
    didResume: state.didResume,
  };
}
