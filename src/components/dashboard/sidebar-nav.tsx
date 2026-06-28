"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", label: "Home", exact: true },
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/reminders", label: "Alerts" },
  { href: "/dashboard/documents", label: "Documents" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function SidebarNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        mobile ? "flex gap-2" : "flex-1 space-y-1.5 p-4"
      )}
    >
      {navItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "font-medium transition-all duration-300 ease-apple",
              mobile
                ? "whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm"
                : "block rounded-2xl px-4 py-3 text-sm",
              isActive
                ? "bg-ink text-white shadow-soft"
                : "text-ink-secondary hover:bg-[#f2f2f7] hover:text-ink"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
