"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import type { DocumentAlert } from "@/lib/documents";
import {
  markAlertReadAction,
  markAllAlertsReadAction,
} from "@/lib/actions/alerts";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/dashboard/status-badge";

type StatusFilter = "ALL" | "UNREAD" | "EXPIRED" | "URGENT" | "EXPIRING_SOON";
type SortMode = "urgency" | "expiry" | "employee";

export function AlertsCenter({ alerts }: { alerts: DocumentAlert[] }) {
  const [items, setItems] = useState(alerts);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [sort, setSort] = useState<SortMode>("urgency");
  const [pending, startTransition] = useTransition();

  const filteredAlerts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...items]
      .filter((alert) => {
        if (status === "UNREAD") return !alert.isRead;
        if (status !== "ALL") return alert.status === status;
        return true;
      })
      .filter((alert) => {
        if (!query) return true;
        return [
          alert.employeeName,
          alert.companyName,
          alert.documentType,
          alert.referenceId,
          alert.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        if (sort === "expiry") return a.remainingDays - b.remainingDays;
        if (sort === "employee") {
          return a.employeeName.localeCompare(b.employeeName);
        }
        return urgencyRank(a) - urgencyRank(b);
      });
  }, [items, search, status, sort]);

  const unreadCount = items.filter((alert) => !alert.isRead).length;

  function markRead(alert: DocumentAlert) {
    startTransition(async () => {
      const result = await markAlertReadAction(alert.id, alert.alertKey);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === alert.id && item.alertKey === alert.alertKey
            ? { ...item, isRead: true }
            : item
        )
      );
      toast.success("Alert marked as read");
    });
  }

  function markAllRead() {
    startTransition(async () => {
      const result = await markAllAlertsReadAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
      toast.success("All alerts marked as read");
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[#e5e5ea]/80 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 md:grid-cols-[1.5fr_1fr_1fr]">
            <Input
              label="Search alerts"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employee, company, document, number"
            />
            <SelectField
              label="Filter"
              value={status}
              onChange={(value) => setStatus(value as StatusFilter)}
              options={[
                ["ALL", "All alerts"],
                ["UNREAD", `Unread (${unreadCount})`],
                ["EXPIRED", "Expired"],
                ["URGENT", "Urgent"],
                ["EXPIRING_SOON", "Expiring soon"],
              ]}
            />
            <SelectField
              label="Sort"
              value={sort}
              onChange={(value) => setSort(value as SortMode)}
              options={[
                ["urgency", "Urgency"],
                ["expiry", "Expiry date"],
                ["employee", "Employee"],
              ]}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={pending || unreadCount === 0}
            onClick={markAllRead}
          >
            Mark all as read
          </Button>
        </div>
      </div>

      {filteredAlerts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#d2d2d7] bg-white px-6 py-16 text-center shadow-soft">
          <p className="text-sm font-medium text-ink">No alerts found</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-ink-secondary">
            Adjust your filters or search, or add documents with upcoming expiry dates.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-[#e5e5ea]/80 bg-white shadow-soft">
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e5ea] bg-surface-subtle text-left text-ink-tertiary">
                  <th className="px-6 py-4 font-medium">Employee</th>
                  <th className="px-6 py-4 font-medium">Document</th>
                  <th className="px-6 py-4 font-medium">Expiry</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => (
                  <AlertRow
                    key={`${alert.id}:${alert.alertKey}`}
                    alert={alert}
                    pending={pending}
                    onMarkRead={markRead}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-[#f2f2f7] md:hidden">
            {filteredAlerts.map((alert) => (
              <AlertCard
                key={`${alert.id}:${alert.alertKey}`}
                alert={alert}
                pending={pending}
                onMarkRead={markRead}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AlertRow({
  alert,
  pending,
  onMarkRead,
}: {
  alert: DocumentAlert;
  pending: boolean;
  onMarkRead: (alert: DocumentAlert) => void;
}) {
  return (
    <tr className={`data-table-row ${alert.isRead ? "opacity-65" : ""}`}>
      <td className="px-6 py-5">
        <p className="font-medium text-ink">{alert.employeeName}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-ink-tertiary">
          {alert.companyName}
        </p>
      </td>
      <td className="px-6 py-5">
        <p className="font-medium text-ink">{alert.documentType}</p>
        <p className="mt-1 text-sm text-ink-secondary">#{alert.referenceId}</p>
      </td>
      <td className="px-6 py-5">
        <p className="font-medium text-ink">{formatDate(alert.expiresAt)}</p>
        <p className="mt-1 text-sm text-ink-secondary">
          {alert.remainingDays} days remaining
        </p>
      </td>
      <td className="px-6 py-5">
        <StatusBadge status={alert.status} />
      </td>
      <td className="px-6 py-5 text-right">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending || alert.isRead}
          onClick={() => onMarkRead(alert)}
        >
          {alert.isRead ? "Read" : "Mark read"}
        </Button>
      </td>
    </tr>
  );
}

function AlertCard({
  alert,
  pending,
  onMarkRead,
}: {
  alert: DocumentAlert;
  pending: boolean;
  onMarkRead: (alert: DocumentAlert) => void;
}) {
  return (
    <div className={`p-5 ${alert.isRead ? "opacity-65" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-ink">{alert.employeeName}</p>
          <p className="mt-1 text-sm text-ink-secondary">
            {alert.documentType} · #{alert.referenceId}
          </p>
        </div>
        <StatusBadge status={alert.status} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
        {alert.message}
      </p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-ink-tertiary">
          {formatDate(alert.expiresAt)} · {alert.remainingDays} days
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending || alert.isRead}
          onClick={() => onMarkRead(alert)}
        >
          {alert.isRead ? "Read" : "Mark read"}
        </Button>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-ink">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-11 w-full rounded-2xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm transition-all duration-300 ease-apple focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

function urgencyRank(alert: DocumentAlert) {
  if (alert.status === "EXPIRED") return 0;
  if (alert.status === "URGENT") return 1;
  if (alert.status === "EXPIRING_SOON") return 2;
  return 3;
}
