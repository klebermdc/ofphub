import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Card Skeleton - for metric cards
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass rounded-xl p-6", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

// Chart Skeleton - for chart components
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass rounded-xl p-6", className)}>
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="h-[300px] flex items-end justify-between gap-2 px-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="flex-1" 
            style={{ height: `${Math.random() * 60 + 40}%` }} 
          />
        ))}
      </div>
    </div>
  );
}

// Table Skeleton - for data tables
export function TableSkeleton({ 
  rows = 5, 
  columns = 4,
  className 
}: { 
  rows?: number; 
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("glass rounded-xl overflow-hidden", className)}>
      <div className="p-4 sm:p-6 border-b border-border">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-48 mt-2" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="p-3 sm:p-4">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border/50">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="p-3 sm:p-4">
                    <Skeleton className={cn(
                      "h-4",
                      colIndex === 0 ? "w-32" : "w-16"
                    )} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Ranking Skeleton - for sales ranking
export function RankingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass rounded-xl p-6", className)}>
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-28 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Metrics Grid Skeleton - for dashboard metric cards
export function MetricsGridSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// KPI Card Skeleton
export function KPISkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass rounded-xl p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-4">
        <div>
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  );
}

// Dashboard Header Skeleton
export function DashboardHeaderSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Skeleton className="h-10 w-32 rounded-lg" />
      <Skeleton className="h-10 w-40 rounded-lg" />
      <Skeleton className="h-10 w-36 rounded-lg" />
    </div>
  );
}

// Full Dashboard Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <DashboardHeaderSkeleton />
      <MetricsGridSkeleton count={4} />
      <ChartSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <KPISkeleton />
    </div>
  );
}

// CRM Kanban Skeleton
export function KanbanSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-80 glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: Math.floor(Math.random() * 3) + 1 }).map((_, j) => (
              <div key={j} className="p-4 rounded-lg bg-background/50">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24 mb-3" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
