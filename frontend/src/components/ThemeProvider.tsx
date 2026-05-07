import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useUserPrefs } from '../hooks/useUserPrefs';
import type { Theme as RawTheme } from '../lib/userPrefs';

type Effective = 'light' | 'dark';

type Ctx = {
  theme: Effective;
  rawTheme: RawTheme;
  setTheme: (t: RawTheme) => void;
  toggle: () => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

function readSystemDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme: rawTheme, setTheme } = useUserPrefs();
  const [systemDark, setSystemDark] = useState(readSystemDark);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const effective: Effective =
    rawTheme === 'system' ? (systemDark ? 'dark' : 'light') : rawTheme;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', effective === 'dark');
  }, [effective]);

  const toggle = () => setTheme(effective === 'dark' ? 'light' : 'dark');

  return (
    <ThemeCtx.Provider value={{ theme: effective, rawTheme, setTheme, toggle }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
