import Link from "next/link";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "default" | "outline" | "ghost" | "destructive" | "secondary";
type ButtonSize = "default" | "sm" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-ink text-white hover:bg-[#333336] shadow-soft focus-visible:ring-ink/30",
  secondary:
    "bg-brand-600 text-white hover:bg-brand-700 shadow-soft focus-visible:ring-brand-500/30",
  outline:
    "border border-[#d2d2d7] bg-white text-ink hover:bg-surface-subtle",
  ghost: "text-ink-secondary hover:bg-[#f2f2f7] hover:text-ink",
  destructive: "bg-accent-red text-white hover:bg-red-600",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-11 px-5 py-2.5 text-sm",
  sm: "h-9 px-4 text-xs",
  lg: "h-12 px-6 text-base",
};

export const buttonStyles = (
  variant: ButtonVariant = "default",
  size: ButtonSize = "default",
  className?: string
) =>
  cn(
    "inline-flex items-center justify-center rounded-2xl font-medium transition-all duration-300 ease-apple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
    variantClasses[variant],
    sizeClasses[size],
    className
  );

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonStyles(variant, size, className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export function ButtonLink({
  href,
  variant = "default",
  size = "default",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonStyles(variant, size, className)}>
      {children}
    </Link>
  );
}
