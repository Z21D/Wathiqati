import type { ExpiryStatus } from "@/lib/document-status";
import { EXPIRY_STATUS_LABELS } from "@/lib/document-status";
import { cn } from "@/lib/utils";

const styles: Record<ExpiryStatus, string> = {
  VALID: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  EXPIRING_SOON: "bg-amber-50 text-amber-800 ring-amber-100",
  URGENT: "bg-orange-50 text-orange-800 ring-orange-100",
  EXPIRED: "bg-red-50 text-red-700 ring-red-100",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ExpiryStatus | string;
  className?: string;
}) {
  const key = status as ExpiryStatus;
  const label = EXPIRY_STATUS_LABELS[key] ?? status;

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset",
        styles[key] ?? styles.VALID,
        className
      )}
    >
      {label}
    </span>
  );
}
