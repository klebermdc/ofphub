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
      className="glass rounded-xl p-4 sm:p-5 animate-slide-up h-full"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs sm:text-sm text-muted-foreground">{title}</p>
        <div className={cn("rounded-lg p-2", styles.iconBg)}>
          <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", styles.iconColor)} />
        </div>
      </div>
      <p className={cn("text-xl sm:text-2xl font-bold tracking-tight", styles.valueBg)}>{value}</p>
      {change && (
        <p className={cn(
          "text-xs sm:text-sm font-medium mt-1",
          changeType === "positive" && "text-success",
          changeType === "negative" && "text-destructive",
          changeType === "neutral" && "text-muted-foreground"
        )}>
          {change}
        </p>
      )}
    </div>
  );
}
