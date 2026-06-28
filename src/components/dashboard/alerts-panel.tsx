import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { DocumentAlert } from "@/lib/documents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";

const urgencyStyles: Record<
  DocumentAlert["status"],
  { dot: string; bg: string; border: string }
> = {
  EXPIRED: { dot: "bg-accent-red", bg: "bg-red-50/70", border: "border-red-100" },
  URGENT: { dot: "bg-accent-orange", bg: "bg-orange-50/70", border: "border-orange-100" },
  EXPIRING_SOON: { dot: "bg-accent-amber", bg: "bg-amber-50/70", border: "border-amber-100" },
  VALID: { dot: "bg-accent-green", bg: "bg-emerald-50/70", border: "border-emerald-100" },
};

export function AlertsPanel({
  alerts,
  compact = false,
  title = "Expiry alerts",
  description = "Documents needing attention, sorted by urgency",
}: {
  alerts: DocumentAlert[];
  compact?: boolean;
  title?: string;
  description?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-1 text-sm text-ink-secondary">{description}</p>
        </div>
        {!compact && (
          <ButtonLink href="/dashboard/reminders" variant="outline" size="sm">
            View all
          </ButtonLink>
        )}
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#d2d2d7] bg-surface-subtle px-6 py-12 text-center">
            <p className="text-sm font-medium text-ink">All clear</p>
            <p className="mt-1 text-sm text-ink-secondary">
              No urgent or expiring documents right now.
            </p>
            <div className="mt-5">
              <ButtonLink href="/dashboard/documents" size="sm" variant="secondary">
                Add document
              </ButtonLink>
            </div>
          </div>
        ) : (
          <ul className={cnList(compact)}>
            {alerts.slice(0, compact ? 5 : undefined).map((alert) => {
              const style = urgencyStyles[alert.status];
              return (
                <li
                  key={alert.id}
                  className={`flex gap-4 rounded-2xl border p-4 transition-all duration-300 ease-apple hover:shadow-soft sm:p-5 ${style.bg} ${style.border}`}
                >
                  <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ink">{alert.documentType}</p>
                      <StatusBadge status={alert.status} />
                    </div>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-tertiary">
                      {alert.employeeName} · {alert.companyName} · #{alert.referenceId}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                      {alert.message}
                    </p>
                    <p className="mt-2 text-xs font-medium text-ink-tertiary">
                      Expires {formatDate(alert.expiresAt)} · {alert.remainingDays} day
                      {alert.remainingDays === 1 ? "" : "s"} remaining
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {compact && alerts.length > 5 && (
          <Link
            href="/dashboard/reminders"
            className="mt-4 block text-center text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
          >
            +{alerts.length - 5} more alerts
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function cnList(compact: boolean) {
  return compact ? "space-y-3 max-h-96 overflow-y-auto pr-1" : "space-y-3";
}
