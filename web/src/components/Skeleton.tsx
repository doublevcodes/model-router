export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-switchboard-border/50 rounded ${className}`} />;
}

export function RunListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-switchboard-card border border-switchboard-border rounded-xl p-5"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-20 ml-4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ResultsSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="bg-switchboard-card border border-switchboard-border rounded-xl p-6 space-y-4">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-12 w-20" />
        </div>
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-switchboard-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-switchboard-border overflow-hidden">
        <div className="bg-switchboard-card p-3">
          <Skeleton className="h-5 w-full" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 border-t border-switchboard-border">
            <Skeleton className="h-5 w-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-switchboard-card rounded-xl border border-switchboard-border p-6"
          >
            <Skeleton className="h-[250px] w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
