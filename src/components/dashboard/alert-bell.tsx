"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, ExternalLink } from "lucide-react";
import type { DocumentAlert } from "@/lib/documents";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/dashboard/status-badge";

export function AlertBell({ alerts }: { alerts: DocumentAlert[] }) {
  const [open, setOpen] = useState(false);
  const unreadCount = alerts.filter((alert) => !alert.isRead).length;
  const recentAlerts = alerts.slice(0, 5);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-ink shadow-soft ring-1 ring-[#e5e5ea] transition-all duration-300 ease-apple hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/10"
        aria-label="Open alerts"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-accent-red px-1.5 text-[10px] font-semibold text-white ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-20 cursor-default"
            aria-label="Close alerts dropdown"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-30 mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-[#e5e5ea] bg-white shadow-float"
          >
            <div className="border-b border-[#f2f2f7] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold tracking-tight text-ink">Alerts</p>
                  <p className="mt-0.5 text-sm text-ink-secondary">
                    {unreadCount} unread alert{unreadCount === 1 ? "" : "s"}
                  </p>
                </div>
                <Link
                  href="/dashboard/reminders"
                  className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
                  onClick={() => setOpen(false)}
                >
                  View all
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </div>

            {recentAlerts.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink-secondary">
                No active alerts.
              </div>
            ) : (
              <ul className="max-h-96 divide-y divide-[#f2f2f7] overflow-y-auto">
                {recentAlerts.map((alert) => (
                  <li key={`${alert.id}:${alert.alertKey}`} className="p-4 transition-colors hover:bg-surface-subtle">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {alert.employeeName}
                        </p>
                        <p className="mt-1 truncate text-xs text-ink-secondary">
                          {alert.documentType} · {formatDate(alert.expiresAt)}
                        </p>
                      </div>
                      <StatusBadge status={alert.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
