import { RetryFailedEmailButton } from "@/components/email-center/email-center-tools";
import { EMAIL_TYPE_LABELS } from "@/lib/email/types";
import type { EmailLog } from "@prisma/client";

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusTone(status: string) {
  if (status === "SENT") return "bg-emerald-50 text-emerald-700";
  if (status === "FAILED") return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-700";
}

function deliveryTone(status: string) {
  if (["DELIVERED", "ACCEPTED", "QUEUED"].includes(status)) {
    return "bg-emerald-50 text-emerald-700";
  }
  if (["FAILED", "REJECTED", "BOUNCED", "BLOCKED"].includes(status)) {
    return "bg-red-50 text-red-700";
  }
  if (status === "DEFERRED") return "bg-amber-50 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

export function EmailHistoryTable({ logs }: { logs: EmailLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[#e5e5ea] bg-white px-6 py-10 text-center text-sm text-ink-secondary">
        No email history yet. Send a test email to verify your configuration.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-[#e5e5ea] bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-tertiary">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Recipient</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Delivery</th>
              <th className="px-4 py-3">Message ID</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-[#f2f2f7] align-top">
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatTimestamp(log.createdAt)}
                </td>
                <td className="px-4 py-3">{log.recipient}</td>
                <td className="px-4 py-3">
                  {EMAIL_TYPE_LABELS[
                    log.emailType as keyof typeof EMAIL_TYPE_LABELS
                  ] ?? log.emailType}
                </td>
                <td className="px-4 py-3 capitalize">{log.provider}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(log.status)}`}
                  >
                    {log.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${deliveryTone(log.deliveryStatus)}`}
                  >
                    {log.deliveryStatus}
                  </span>
                  {log.error && (
                    <p className="mt-1 max-w-xs text-xs text-red-700">{log.error}</p>
                  )}
                </td>
                <td className="px-4 py-3 max-w-[10rem] truncate text-xs text-ink-secondary">
                  {log.providerMessageId ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {log.status === "FAILED" && (
                    <RetryFailedEmailButton emailLogId={log.id} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
