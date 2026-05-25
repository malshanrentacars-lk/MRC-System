"use client";

import SidebarClient from "@/components/layout/SidebarClient";
import type { SessionUser } from "@/types";

interface DashboardShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

export default function DashboardShell({ user, children }: DashboardShellProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background" suppressHydrationWarning>
      <SidebarClient user={user} />

      <main className="min-h-screen pl-[72px] sm:pl-[84px] md:pl-[228px] lg:pl-[256px]">
        <div className="min-h-screen px-4 pb-6 pt-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}