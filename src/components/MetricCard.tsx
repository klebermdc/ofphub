import { cn } from "@/lib/utils";
import { LucideIcon, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  delay?: number;
  variant?: "default" | "success" | "danger" | "warning" | "info";
  formula?: string;
}

const variantStyles = {
  default: {
    gradient: "dark:from-slate-900/50 dark:to-slate-800/30 from-slate-100 to-slate-50",
    border: "dark:border-slate-600/30 border-slate-200",
    iconColor: "dark:text-slate-400 text-slate-500",
    valueColor: "text-foreground",
  },
  success: {
    gradient: "dark:from-emerald-950/50 dark:to-emerald-900/20 from-emerald-50 to-emerald-100/50",
    border: "dark:border-emerald-500/40 border-emerald-300",
    iconColor: "dark:text-emerald-500 text-emerald-600",
    valueColor: "dark:text-emerald-500 text-emerald-700",
  },
  danger: {
    gradient: "dark:from-red-950/50 dark:to-red-900/20 from-red-50 to-red-100/50",
    border: "dark:border-red-500/40 border-red-300",
    iconColor: "dark:text-red-500 text-red-600",
    valueColor: "dark:text-red-500 text-red-700",
  },
  warning: {
    gradient: "dark:from-amber-950/50 dark:to-amber-900/20 from-amber-50 to-orange-100/50",
    border: "dark:border-amber-500/40 border-amber-300",
    iconColor: "dark:text-amber-500 text-amber-600",
    valueColor: "dark:text-amber-500 text-amber-700",
  },
  info: {
    gradient: "dark:from-blue-950/50 dark:to-blue-900/20 from-blue-50 to-blue-100/50",
    border: "dark:border-blue-500/40 border-blue-300",
    iconColor: "dark:text-blue-500 text-blue-600",
    valueColor: "dark:text-blue-500 text-blue-700",
  },
};

export function MetricCard({ 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  icon: Icon,
  delay = 0,
  variant = "default",
  formula
}: MetricCardProps) {
  const styles = variantStyles[variant];

  const cardContent = (
    <div 
      className={cn(
        "rounded-xl p-4 sm:p-6 animate-slide-up h-full relative group",
        "bg-gradient-to-br border",
        styles.gradient,
        styles.border,
        formula && "cursor-help"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", styles.iconColor)} />
        <p className="text-xs sm:text-sm text-muted-foreground flex-1">{title}</p>
        {formula && (
          <Info className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
        )}
      </div>
      <p className={cn("text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight", styles.valueColor)}>{value}</p>
      {change && (
        <p className={cn(
          "text-xs sm:text-sm font-medium mt-2",
          changeType === "positive" && "text-emerald-500",
          changeType === "negative" && "text-red-500",
          changeType === "neutral" && "text-muted-foreground"
        )}>
          {change}
        </p>
      )}
    </div>
  );

  if (!formula) return cardContent;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {cardContent}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[280px] text-xs leading-relaxed">
        <p className="font-semibold mb-1">📐 Cálculo:</p>
        <p className="whitespace-pre-line">{formula}</p>
      </TooltipContent>
    </Tooltip>
  );
}
