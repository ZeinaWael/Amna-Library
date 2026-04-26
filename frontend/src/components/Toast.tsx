import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';
type Toast = { id: number; type: ToastType; message: string };
type Ctx = { toast: (t: { type?: ToastType; message: string }) => void };

const ToastCtx = createContext<Ctx | null>(null);

const ICONS: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'error',
  info: 'info',
};

const STYLES: Record<ToastType, string> = {
  success: 'border-emerald-400/40',
  error: 'border-rose-400/40',
  info: '',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const toast = useCallback<Ctx['toast']>(({ type = 'info', message }) => {
    const id = Date.now() + Math.random();
    setItems((cur) => [...cur, { id, type, message }]);
    setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 end-6 z-[60] flex flex-col gap-3">
        {items.map((it) => (
          <div
            key={it.id}
            role="status"
            className={`toast-item pointer-events-auto card flex items-start gap-3 px-4 py-3 ${STYLES[it.type]}`}
            style={{ minWidth: 260, maxWidth: 360 }}
          >
            <span className="icon mt-0.5 text-base text-accent">{ICONS[it.type]}</span>
            <span className="text-sm leading-snug">{it.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const c = useContext(ToastCtx);
  if (!c) throw new Error('ToastProvider missing');
  return c;
}
