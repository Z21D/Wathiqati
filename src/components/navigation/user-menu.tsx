"use client";

import Link from "next/link";
import { useState } from "react";
import { logoutAction } from "@/lib/actions/auth";

export function UserMenu({
  userName,
  userEmail,
}: {
  userName?: string | null;
  userEmail?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const label = userName || userEmail || "Account";
  const initial = label.charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 shadow-soft ring-1 ring-[#e5e5ea] transition-all duration-300 ease-apple hover:shadow-card"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
          {initial}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium text-ink">{label}</span>
          {userEmail && (
            <span className="block max-w-48 truncate text-xs text-ink-tertiary">
              {userEmail}
            </span>
          )}
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-20 cursor-default"
            aria-label="Close profile menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-30 mt-3 w-64 overflow-hidden rounded-3xl border border-[#e5e5ea] bg-white p-2 shadow-float">
            <MenuLink href="/home">Home</MenuLink>
            <MenuLink href="/dashboard">Dashboard</MenuLink>
            <MenuLink href="/dashboard/reminders">Alerts</MenuLink>
            <MenuLink href="/dashboard/settings">Notification Preferences</MenuLink>
            <MenuLink href="/dashboard/settings">Settings</MenuLink>
            <form action={logoutAction}>
              <button
                type="submit"
                className="block w-full rounded-2xl px-4 py-3 text-left text-sm font-medium text-accent-red transition-colors hover:bg-red-50"
              >
                Sign Out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl px-4 py-3 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink"
    >
      {children}
    </Link>
  );
}
