import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  delay?: number;
  variant?: "default" | "success" | "danger" | "warning" | "info";
}

const variantStyles = {
  default: {
    gradient: "from-slate-900/50 to-slate-800/30",
    border: "border-slate-600/30",
    iconColor: "text-slate-400",
    valueColor: "text-foreground",
  },
  success: {
    gradient: "from-emerald-950/50 to-emerald-900/20",
    border: "border-emerald-500/40",
    iconColor: "text-emerald-500",
    valueColor: "text-emerald-500",
  },
  danger: {
    gradient: "from-red-950/50 to-red-900/20",
    border: "border-red-500/40",
    iconColor: "text-red-500",
    valueColor: "text-red-500",
  },
  warning: {
    gradient: "from-amber-950/50 to-amber-900/20",
    border: "border-amber-500/40",
    iconColor: "text-amber-500",
    valueColor: "text-amber-500",
  },
  info: {
    gradient: "from-blue-950/50 to-blue-900/20",
    border: "border-blue-500/40",
    iconColor: "text-blue-500",
    valueColor: "text-blue-500",
  },
};

export function MetricCard({ 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  icon: Icon,
  delay = 0,
  variant = "default"
}: MetricCardProps) {
  const styles = variantStyles[variant];

  return (
    <div 
      className={cn(
        "rounded-xl p-4 sm:p-6 animate-slide-up h-full",
        "bg-gradient-to-br border",
        styles.gradient,
        styles.border
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", styles.iconColor)} />
        <p className="text-xs sm:text-sm text-muted-foreground">{title}</p>
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
}
