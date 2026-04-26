export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800 ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <Skeleton className="h-8 w-1/3" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}
