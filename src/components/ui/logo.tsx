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
  const iconSize = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const textSize = size === "sm" ? "text-xs" : "text-[13px]";

  return (
    <Link
      href={href}
      className={cn("group flex items-center gap-3", className)}
    >
      <span
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-2xl bg-ink text-white shadow-soft ring-1 ring-white/10 transition-transform duration-300 ease-apple group-hover:scale-[1.02]",
          iconSize
        )}
        aria-label={`${brand.name} logo`}
      >
        <svg
          viewBox="0 0 36 36"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <rect width="36" height="36" rx="13" fill="#1D1D1F" />
          <path
            d="M11 8.5h9.2L25 13.3v14.2H11V8.5Z"
            fill="none"
            stroke="rgba(255,255,255,.82)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M20 8.8v5h5"
            fill="none"
            stroke="rgba(255,255,255,.55)"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M18 16.7c2-.9 3.8-1.7 5.8-1.7v4.1c0 3-1.8 5.4-5.8 7.1-4-1.7-5.8-4.1-5.8-7.1V15c2 0 3.8.8 5.8 1.7Z"
            fill="#0C8CE9"
            opacity=".95"
          />
          <path
            d="m15.7 20.5 1.6 1.6 3.3-3.7"
            fill="none"
            stroke="white"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className={cn("relative mt-[18px] font-semibold tracking-[-0.04em]", textSize)}>
          {brand.logo.text}
        </span>
      </span>
      {showText && (
        <span className="text-base font-semibold tracking-tight text-ink">
          {brand.name}
        </span>
      )}
    </Link>
  );
}
