export type Locale = 'en' | 'ar';
export type Theme = 'light' | 'dark' | 'system';

export const PREF_KEYS = {
  shelf: 'user:shelf',
  locale: 'user:locale',
  theme: 'user:theme',
  dismissed: 'user:dismissed',
} as const;

const LEGACY_KEYS = {
  theme: 'theme',
  locale: 'lang',
} as const;

type Listener = () => void;
const listeners = new Set<Listener>();

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // quota exceeded, private mode, etc. — swallow so callers don't crash
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
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

function notify(): void {
  for (const l of listeners) {
    try {
      l();
    } catch {
      // a misbehaving listener must not break the others
    }
  }
}

let migrated = false;
function migrateLegacyKeys(): void {
  if (migrated) return;
  migrated = true;

  if (safeGet(PREF_KEYS.theme) == null) {
    const old = safeGet(LEGACY_KEYS.theme);
    if (old === 'light' || old === 'dark' || old === 'system') {
      safeSet(PREF_KEYS.theme, old);
    }
  }
  safeRemove(LEGACY_KEYS.theme);

  // Locale: keep the legacy `lang` key in place because
  // i18next-browser-languagedetector still reads from it.
  if (safeGet(PREF_KEYS.locale) == null) {
    const old = safeGet(LEGACY_KEYS.locale);
    if (old === 'en' || old === 'ar') {
      safeSet(PREF_KEYS.locale, old);
    }
  }
}

if (typeof window !== 'undefined') {
  migrateLegacyKeys();
  window.addEventListener('storage', (e) => {
    if (e.key == null) {
      // localStorage cleared entirely — refresh everyone
      notify();
      return;
    }
    if (
      e.key === PREF_KEYS.shelf ||
      e.key === PREF_KEYS.locale ||
      e.key === PREF_KEYS.theme ||
      e.key === PREF_KEYS.dismissed
    ) {
      notify();
    }
  });
}

// ───────────────── shelf ─────────────────
export function getShelf(): string[] {
  const parsed = safeParse<unknown>(safeGet(PREF_KEYS.shelf));
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((x): x is string => typeof x === 'string' && x.length > 0);
}

function writeShelf(ids: string[]): void {
  safeSet(PREF_KEYS.shelf, JSON.stringify(ids));
  notify();
}

export function addToShelf(bookId: string): void {
  if (!bookId) return;
  const cur = getShelf();
  if (cur.includes(bookId)) return;
  writeShelf([bookId, ...cur]);
}

export function removeFromShelf(bookId: string): void {
  if (!bookId) return;
  const cur = getShelf();
  const next = cur.filter((x) => x !== bookId);
  if (next.length === cur.length) return;
  writeShelf(next);
}

export function isInShelf(bookId: string): boolean {
  if (!bookId) return false;
  return getShelf().includes(bookId);
}

// ───────────────── locale ─────────────────
export function getLocale(): Locale {
  const v = safeGet(PREF_KEYS.locale);
  if (v === 'en' || v === 'ar') return v;
  return 'en';
}

export function setLocale(locale: Locale): void {
  if (locale !== 'en' && locale !== 'ar') return;
  safeSet(PREF_KEYS.locale, locale);
  // Mirror to the legacy `lang` key so i18next-browser-languagedetector
  // sees the same value on next page load.
  safeSet(LEGACY_KEYS.locale, locale);
  notify();
}

// ───────────────── theme ─────────────────
export function getTheme(): Theme {
  const v = safeGet(PREF_KEYS.theme);
  if (v === 'light' || v === 'dark' || v === 'system') return v;
  return 'system';
}

export function setTheme(theme: Theme): void {
  if (theme !== 'light' && theme !== 'dark' && theme !== 'system') return;
  safeSet(PREF_KEYS.theme, theme);
  notify();
}

// ───────────────── dismissed ─────────────────
type Dismissed = { continueReading: string[] };

function readDismissed(): Dismissed {
  const parsed = safeParse<Partial<Dismissed>>(safeGet(PREF_KEYS.dismissed));
  if (!parsed) return { continueReading: [] };
  const cr = Array.isArray(parsed.continueReading)
    ? parsed.continueReading.filter((x): x is string => typeof x === 'string' && x.length > 0)
    : [];
  return { continueReading: cr };
}

function writeDismissed(d: Dismissed): void {
  safeSet(PREF_KEYS.dismissed, JSON.stringify(d));
  notify();
}

export function dismissContinueReading(bookId: string): void {
  if (!bookId) return;
  const cur = readDismissed();
  if (cur.continueReading.includes(bookId)) return;
  writeDismissed({ ...cur, continueReading: [...cur.continueReading, bookId] });
}

export function getDismissedContinueReading(): string[] {
  return readDismissed().continueReading;
}

// ───────────────── subscribe ─────────────────
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
