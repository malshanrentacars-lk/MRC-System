import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";

function ShellSkeleton() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <aside className="fixed left-0 top-0 h-full w-[72px] sm:w-[84px] md:w-[228px] lg:w-[256px] border-r border-border bg-card z-50 animate-pulse" />
      <main className="min-h-screen pl-[72px] sm:pl-[84px] md:pl-[228px] lg:pl-[256px]">
        <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8 space-y-6 animate-pulse">
          <div className="h-8 w-48 rounded-md bg-gray-200 dark:bg-gray-700" />
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="h-4 w-full rounded-md bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-3/4 rounded-md bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-1/2 rounded-md bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </main>
    </div>
  );
}

async function SessionShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return <DashboardShell user={session}>{children}</DashboardShell>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <SessionShell>{children}</SessionShell>
    </Suspense>
  );
}
