"use client";

import SidebarClient from "@/components/layout/SidebarClient";
import type { SessionUser } from "@/types";

interface DashboardShellProps {
  user: SessionUser | null;
  children: React.ReactNode;
}

export default function DashboardShell({ user, children }: DashboardShellProps) {
  const safeUser = user ?? {
    id: "guest",
    username: "guest",
    full_name: "Guest",
    role: "employee",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background" suppressHydrationWarning>
      <SidebarClient user={safeUser} />

      <main className="min-h-screen pl-[72px] sm:pl-[84px] md:pl-[228px] lg:pl-[256px]">
        <div className="min-h-screen px-4 pb-6 pt-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}