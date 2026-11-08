"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, LogOut, MessageCircle, Shield, User, type LucideIcon } from "lucide-react";
import Brand from "./Brand";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra path prefixes that should light this item up. */
  also?: string[];
}

export default function AppNav({
  displayName,
  isAdmin,
  signOutAction,
}: {
  displayName: string;
  isAdmin: boolean;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/app/scenarios", label: "Scenarios", icon: BookOpen, also: ["/app/practice"] },
    { href: "/app/free-talk", label: "Free Talk", icon: MessageCircle },
    { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, also: ["/app/sessions"] },
    { href: "/app/profile", label: displayName, icon: User },
  ];
  if (isAdmin) items.push({ href: "/admin", label: "Admin", icon: Shield });

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/90 backdrop-blur-md" aria-label="Main">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Brand href="/" hideTextOnMobile />

        <div className="flex items-center gap-1">
          {items.map(({ href, label, icon: Icon, also }) => {
            const active = [href, ...(also ?? [])].some((p) => pathname.startsWith(p));
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors md:px-3 ${
                  active
                    ? "bg-secondary font-semibold text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                <span className="hidden max-w-32 truncate md:inline">{label}</span>
              </Link>
            );
          })}

          <form action={signOutAction}>
            <button
              type="submit"
              aria-label="Sign out"
              className="ml-1 flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm md:px-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut size={16} aria-hidden="true" />
              <span className="hidden md:inline">Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
