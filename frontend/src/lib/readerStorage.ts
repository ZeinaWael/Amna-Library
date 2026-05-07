export type ReaderState = {
  page: number;
  zoom: number;
  updatedAt: number;
};

const STATE_PREFIX = 'reader:state:';
const LRU_KEY = 'reader:cache:lru';
const CACHE_NAME = 'book-pdfs-v1';
const CACHE_CAP = 5;
const SAVE_DEBOUNCE_MS = 400;

const stateKey = (bookId: string) => `${STATE_PREFIX}${bookId}`;

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // quota exceeded, disabled storage, etc. — swallow
  }
}

function safeParse<T>(raw: string | null): T | null {
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readLru(): string[] {
  const parsed = safeParse<unknown>(safeGetItem(LRU_KEY));
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((x): x is string => typeof x === 'string');
}

function writeLru(urls: string[]): void {
  safeSetItem(LRU_KEY, JSON.stringify(urls));
}

function bumpLru(url: string): void {
  const lru = readLru().filter((u) => u !== url);
  lru.unshift(url);
  writeLru(lru);
}

export function loadReaderState(bookId: string): ReaderState | null {
  const parsed = safeParse<Partial<ReaderState>>(safeGetItem(stateKey(bookId)));
  if (
    parsed &&
    typeof parsed.page === 'number' &&
    typeof parsed.zoom === 'number' &&
    typeof parsed.updatedAt === 'number'
  ) {
    return { page: parsed.page, zoom: parsed.zoom, updatedAt: parsed.updatedAt };
  }
  return null;
}

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingState = new Map<string, ReaderState>();

export function saveReaderState(bookId: string, state: ReaderState): void {
  pendingState.set(bookId, state);
  const existing = saveTimers.get(bookId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    const latest = pendingState.get(bookId);
    saveTimers.delete(bookId);
    pendingState.delete(bookId);
    if (latest) {
      safeSetItem(stateKey(bookId), JSON.stringify(latest));
    }
  }, SAVE_DEBOUNCE_MS);
  saveTimers.set(bookId, timer);
}

async function openCache(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

export async function getCachedPdf(url: string): Promise<ArrayBuffer | null> {
  const cache = await openCache();
  if (!cache) return null;
  try {
    const res = await cache.match(url);
    if (!res) return null;
    const buf = await res.arrayBuffer();
    bumpLru(url);
    return buf;
  } catch {
    return null;
  }
}

export async function cachePdf(url: string, response: Response): Promise<void> {
  const cache = await openCache();
  if (!cache) return;
  try {
    await cache.put(url, response.clone());
    bumpLru(url);
    await evictLruIfNeeded();
  } catch {
    // ignore — caching is best-effort
  }
}

export async function evictLruIfNeeded(): Promise<void> {
  try {
    const lru = readLru();
    if (lru.length <= CACHE_CAP) return;
    const keep = lru.slice(0, CACHE_CAP);
    const drop = lru.slice(CACHE_CAP);
    writeLru(keep);
    const cache = await openCache();
    if (!cache) return;
    await Promise.all(
      drop.map(async (u) => {
        try {
          await cache.delete(u);
        } catch {
          // ignore individual delete failures
        }
      }),
    );
  } catch {
    // ignore
  }
}

export function listResumableBooks(): Array<{
  bookId: string;
  page: number;
  updatedAt: number;
}> {
  const out: Array<{ bookId: string; page: number; updatedAt: number }> = [];
  let length: number;
  try {
    length = localStorage.length;
  } catch {
    return out;
  }
  for (let i = 0; i < length; i++) {
    let key: string | null;
    try {
      key = localStorage.key(i);
    } catch {
      continue;
    }
    if (!key || !key.startsWith(STATE_PREFIX)) continue;
    const bookId = key.slice(STATE_PREFIX.length);
    if (!bookId) continue;
    const parsed = safeParse<Partial<ReaderState>>(safeGetItem(key));
    if (
      !parsed ||
      typeof parsed.page !== 'number' ||
      typeof parsed.updatedAt !== 'number'
    ) {
      continue;
    }
    out.push({ bookId, page: parsed.page, updatedAt: parsed.updatedAt });
  }
  out.sort((a, b) => b.updatedAt - a.updatedAt);
  return out;
}
