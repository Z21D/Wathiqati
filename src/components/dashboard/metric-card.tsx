import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: number;
  description: string;
  tone?: "default" | "success" | "warning" | "danger" | "neutral";
}

const toneStyles = {
  default: "from-brand-50/80 to-white text-brand-700",
  success: "from-emerald-50/80 to-white text-emerald-700",
  warning: "from-amber-50/80 to-white text-amber-700",
  danger: "from-red-50/80 to-white text-red-700",
  neutral: "from-[#f5f5f7] to-white text-ink-secondary",
};

export function MetricCard({
  title,
  value,
  description,
  tone = "default",
}: MetricCardProps) {
  return (
    <div className="metric-card">
      <div
        className={cn(
          "mb-4 inline-flex rounded-2xl bg-gradient-to-br px-3 py-1.5 text-xs font-medium uppercase tracking-wide",
          toneStyles[tone]
        )}
      >
        {title}
      </div>
      <p className="text-4xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{description}</p>
    </div>
  );
}
