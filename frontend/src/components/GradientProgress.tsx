export function GradientProgress({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-xs text-soft">
          <span>{label}</span>
          <span className="font-semibold text-accent">{Math.round(v)}%</span>
        </div>
      )}
      <div className="gradient-progress" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
