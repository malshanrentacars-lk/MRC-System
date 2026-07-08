export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-700 ${className}`}
    />
  );
}

export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="section-card">
      <div className="px-5 py-4 border-b border-gray-100 flex gap-3 items-center">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i}><Skeleton className="h-4 w-20" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c}>
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DetailSkeleton({ sidePanel = false }: { sidePanel?: boolean }) {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      <div className={`grid ${sidePanel ? "grid-cols-12 gap-6" : "grid-cols-1 md:grid-cols-2 gap-4"}`}>
        <div className={sidePanel ? "col-span-8" : ""}>
          <div className="section-card">
            <div className="section-card-header">
              <Skeleton className="h-5 w-28" />
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-16 mb-2" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {sidePanel && (
          <div className="col-span-4 space-y-4">
            <div className="section-card">
              <div className="section-card-header">
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="p-5 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full rounded-md" />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function FormSkeleton({ fields = 8 }: { fields?: number }) {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <Skeleton className="h-7 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>
      <div className="section-card">
        <div className="section-card-header">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
