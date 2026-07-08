import { Skeleton } from "@/components/shared/Skeleton";

export default function DashboardShellLoading() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Sidebar skeleton */}
      <aside className="fixed left-0 top-0 h-full w-[72px] sm:w-[84px] md:w-[228px] lg:w-[256px] border-r border-border bg-card z-50 animate-pulse">
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-full rounded-lg" />
          <div className="space-y-2 mt-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </aside>

      {/* Main content skeleton */}
      <main className="min-h-screen pl-[72px] sm:pl-[84px] md:pl-[228px] lg:pl-[256px]">
        <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8 space-y-6">
          <div className="page-header animate-pulse">
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="section-card">
            <div className="p-5 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
