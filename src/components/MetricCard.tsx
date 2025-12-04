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
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    valueBg: "",
  },
  success: {
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    valueBg: "",
  },
  danger: {
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
    valueBg: "",
  },
  warning: {
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    valueBg: "",
  },
  info: {
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    valueBg: "",
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
      className="glass rounded-xl p-4 sm:p-6 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2 min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-muted-foreground">{title}</p>
          <p className={cn("text-lg sm:text-xl lg:text-2xl font-bold tracking-tight break-all", styles.valueBg)}>{value}</p>
          {change && (
            <p className={cn(
              "text-xs sm:text-sm font-medium",
              changeType === "positive" && "text-success",
              changeType === "negative" && "text-destructive",
              changeType === "neutral" && "text-muted-foreground"
            )}>
              {change}
            </p>
          )}
        </div>
        <div className={cn("rounded-lg p-2 sm:p-3 shrink-0", styles.iconBg)}>
          <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", styles.iconColor)} />
        </div>
      </div>
    </div>
  );
}
