import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type SectionColor = "emerald" | "amber" | "red" | "blue" | "violet" | "neutral";

const sectionStyles: Record<SectionColor, { bg: string; border: string; title: string }> = {
  emerald: {
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    title: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    title: "text-amber-600 dark:text-amber-400",
  },
  red: {
    bg: "bg-red-500/5",
    border: "border-red-500/20",
    title: "text-red-600 dark:text-red-400",
  },
  blue: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    title: "text-blue-600 dark:text-blue-400",
  },
  violet: {
    bg: "bg-violet-500/5",
    border: "border-violet-500/20",
    title: "text-violet-600 dark:text-violet-400",
  },
  neutral: {
    bg: "bg-muted/30",
    border: "border-border",
    title: "text-foreground",
  },
};

interface BreakdownSectionProps {
  title: string;
  color?: SectionColor;
  children: ReactNode;
  className?: string;
}

export function BreakdownSection({ title, color = "neutral", children, className }: BreakdownSectionProps) {
  const s = sectionStyles[color];
  return (
    <div className={cn(s.bg, s.border, "border rounded-md p-2 space-y-1", className)}>
      <p className={cn("font-semibold text-[11px] uppercase tracking-wide", s.title)}>{title}</p>
      {children}
    </div>
  );
}

type RowVariant = "default" | "warning" | "danger" | "success" | "subtotal" | "total";

interface BreakdownRowProps {
  label: ReactNode;
  value: ReactNode;
  variant?: RowVariant;
  indent?: boolean;
}

export function BreakdownRow({ label, value, variant = "default", indent }: BreakdownRowProps) {
  const valueClass = cn(
    "font-medium tabular-nums whitespace-nowrap",
    variant === "warning" && "text-amber-600 dark:text-amber-400",
    variant === "danger" && "text-red-500",
    variant === "success" && "text-emerald-500",
    (variant === "subtotal" || variant === "total") && "font-semibold",
  );
  return (
    <div
      className={cn(
        "flex justify-between gap-4",
        indent && "ml-3 pl-2 border-l border-border/40 text-[10px]",
        variant === "subtotal" && "border-t pt-1",
        variant === "total" && "border-t pt-1.5 font-bold text-sm",
      )}
    >
      <span className={cn(variant === "default" && "text-muted-foreground")}>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

interface BreakdownContainerProps {
  title: string;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function BreakdownContainer({ title, subtitle, footer, children }: BreakdownContainerProps) {
  return (
    <div className="space-y-2 text-xs">
      <div>
        <p className="font-semibold text-sm">{title}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
      {footer && (
        <p className="text-[10px] text-muted-foreground pt-1 border-t mt-2 leading-relaxed">{footer}</p>
      )}
    </div>
  );
}
