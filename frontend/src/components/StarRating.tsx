type Props = { value: number; size?: 'sm' | 'md'; onChange?: (v: number) => void };

export function StarRating({ value, size = 'sm', onChange }: Props) {
  const filled = Math.round(value);
  const cls = size === 'md' ? 'text-xl' : 'text-base';
  return (
    <span className={`inline-flex ${cls}`} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          type="button"
          key={i}
          disabled={!onChange}
          onClick={() => onChange?.(i)}
          className={`px-0.5 ${i <= filled ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700'} ${onChange ? 'cursor-pointer' : 'cursor-default'}`}
        >
          ★
        </button>
      ))}
    </span>
  );
}
