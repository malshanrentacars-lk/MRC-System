"use client";

import dynamic from "next/dynamic";
import type { SessionUser } from "@/types";

const SidebarNoSSR = dynamic(() => import("./Sidebar"), { ssr: false });

type SidebarClientProps = {
  user: SessionUser;
};

export default function SidebarClient({ user }: SidebarClientProps) {
  return <SidebarNoSSR user={user} />;
}
