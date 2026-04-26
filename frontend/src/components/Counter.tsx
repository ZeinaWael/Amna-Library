import { useEffect, useRef, useState } from 'react';

export function Counter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [n, setN] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    startedAt.current = null;
    function step(ts: number) {
      if (startedAt.current === null) startedAt.current = ts;
      const t = Math.min(1, (ts - startedAt.current) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      setN(Math.floor(ease * value));
      if (t < 1) raf = requestAnimationFrame(step);
      else setN(value);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{n.toLocaleString()}</>;
}
