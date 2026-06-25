import type { ReactNode, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none rounded-xl whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-primary text-white shadow-soft hover:-translate-y-0.5 hover:shadow-warm",
  secondary:
    "bg-white text-ink border border-line hover:border-sun-300 hover:bg-sun-50",
  ghost: "bg-transparent text-ink hover:bg-sun-50",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-14 px-7 text-base",
};

export function SunButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: Props) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  );
}
