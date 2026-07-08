import { Skeleton } from "@/components/shared/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-fade-in p-1 md:p-0">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1A0A0A] via-[#EF4444] to-[#B91C1C] p-6 animate-pulse">
        <div className="space-y-2">
          <Skeleton className="h-3 w-32 bg-white/20" />
          <Skeleton className="h-7 w-64 bg-white/20" />
          <Skeleton className="h-4 w-48 bg-white/20" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="kpi-card animate-pulse">
            <Skeleton className="h-8 w-8 rounded-lg mb-2" />
            <Skeleton className="h-7 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Status summary row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="section-card animate-pulse">
            <div className="section-card-header">
              <Skeleton className="h-5 w-28" />
            </div>
            <div className="grid grid-cols-3 gap-4 px-6 py-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-start gap-2.5">
                  <Skeleton className="h-2.5 w-2.5 rounded-full mt-1.5" />
                  <div>
                    <Skeleton className="h-7 w-8 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Top 10 lists */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="section-card animate-pulse">
            <div className="section-card-header">
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 px-5 py-3">
                  <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-4 w-8 mb-1 ml-auto" />
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Schedule */}
      <div className="section-card animate-pulse">
        <div className="section-card-header">
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="p-5 space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      {/* Calendar placeholder */}
      <div className="section-card animate-pulse">
        <div className="p-5">
          <Skeleton className="h-5 w-28 mb-4" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="section-card animate-pulse">
        <div className="section-card-header">
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
