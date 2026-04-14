interface SkeletonProps {
  className?: string;
}

export function SkeletonLine({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-200 ${className}`}
    />
  );
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`card p-4 animate-pulse ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-200 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-200 rounded w-1/2" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 bg-slate-200 rounded" />
        <div className="h-3 bg-slate-200 rounded w-4/5" />
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="card p-4 animate-pulse space-y-3">
      <div className="h-3 bg-slate-200 rounded w-2/3" />
      <div className="h-7 bg-slate-200 rounded w-1/2" />
      <div className="h-3 bg-slate-200 rounded w-1/3" />
    </div>
  );
}

export function SkeletonChart({ height = "h-48" }: { height?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200 rounded-lg ${height}`} />
  );
}

export default function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
