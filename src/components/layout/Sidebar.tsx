"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentType } from "react";
import {
  LayoutDashboard,
  Car,
  Users,
  Package,
  Shield,
  CalendarDays,
  FileText,
  Settings,
  UserCog,
  LogOut,
  Banknote,
  MessageCircle,
  Clock3,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { logoutAction } from "@/app/actions/auth";
import { SessionUser } from "@/types";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/vehicles", icon: Car, label: "Vehicles" },
  { href: "/companies", icon: Package, label: "Companies" },
  { href: "/suppliers", icon: Package, label: "Suppliers" },
  { href: "/customers", icon: Users, label: "Customers" },
  { href: "/guarantors", icon: Shield, label: "Guarantors" },
  { href: "/rentals", icon: CalendarDays, label: "Rentals" },
  { href: "/refundable-deposits", icon: Banknote, label: "Refundable Deposits" },
  { href: "/calendar", icon: CalendarDays, label: "Calendar" },
  { href: "/agreements", icon: FileText, label: "Agreements" },
  { href: "/dashboard/whatsapp", icon: MessageCircle, label: "WhatsApp" },
  { href: "/dashboard/attendance", icon: Clock3, label: "Attendance" },
];

// Admin-only nav (Users management + company settings)
const adminItems = [
  { href: "/users", icon: UserCog, label: "Users" },
  { href: "/settings", icon: Settings, label: "Company" },
];

// Employee nav items (non-admin only gets activity log)
// We reuse /users which shows only their own activity for non-admins

interface SidebarProps {
  user: SessionUser;
}

type NavItem = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = isActivePath(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "sidebar-link group justify-center px-2 md:justify-start md:px-3",
        active && "bg-gradient-to-r from-red-600/20 to-transparent border-l-4 border-red-500 text-white"
      )}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      <span className="hidden truncate md:inline">{item.label}</span>
    </Link>
  );
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-[72px] flex-col bg-card/95 backdrop-blur-md sm:w-[84px] md:w-[228px] lg:w-[256px]">
      <SidebarInner user={user} pathname={pathname} />
    </aside>
  );
}

function SidebarInner({
  user,
  pathname,
}: {
  user: SessionUser;
  pathname: string;
}) {
  const userName = user?.full_name || "Guest";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <>
      <div className="px-3 py-5 md:px-4">
        <div className="min-w-0 text-center md:text-left">
          <p className="text-base font-bold leading-tight text-foreground">MRC</p>
          <p className="mt-0.5 hidden text-xs text-muted-foreground md:block">Fleet Management</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onNavigate={() => {}} />
          ))}
        </div>

        {user.role === "admin" ? (
          <>
            <div className="mt-4 mb-1 px-1 md:px-3">
              <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground md:text-left">Admin</p>
            </div>
            <div className="space-y-0.5">
              {adminItems.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} onNavigate={() => {}} />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 mb-1 px-1 md:px-3">
              <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground md:text-left">My Account</p>
            </div>
            <div className="space-y-0.5">
              <NavLink
                item={{ href: "/users", icon: UserCog, label: "Activity Log" }}
                pathname={pathname}
                onNavigate={() => {}}
              />
            </div>
          </>
        )}
      </nav>

      <div className="px-3 py-4">
        <div className="mb-2 flex items-center justify-center gap-3 rounded-xl bg-background/80 px-2 py-2 md:justify-start md:px-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            {userInitial}
          </div>
          <div className="hidden min-w-0 flex-1 md:block">
            <p className="truncate text-sm font-medium text-foreground">{userName}</p>
            <p className="text-[11px] capitalize text-muted-foreground">{user.role || "employee"}</p>
          </div>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className={cn(
              "sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-300 dark:hover:bg-red-500/10 dark:hover:text-red-200",
              "justify-center px-2 md:justify-start md:px-3"
            )}
            title="Sign out"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">Sign out</span>
          </button>
        </form>

        <div className="mt-3">
          <ThemeToggle compact={true} className="md:hidden" />
          <ThemeToggle className="hidden md:block" />
        </div>
      </div>
    </>
  );
}
