import Link from "next/link";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  showText = true,
  size = "md",
}: {
  className?: string;
  href?: string;
  showText?: boolean;
  size?: "sm" | "md";
}) {
  const iconSize = size === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm";

  return (
    <Link
      href={href}
      className={cn("group flex items-center gap-3", className)}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 font-semibold text-white shadow-soft transition-transform duration-300 ease-apple group-hover:scale-[1.02]",
          iconSize
        )}
      >
        {brand.logo.text}
      </span>
      {showText && (
        <span className="text-base font-semibold tracking-tight text-ink">
          {brand.name}
        </span>
      )}
    </Link>
  );
}
