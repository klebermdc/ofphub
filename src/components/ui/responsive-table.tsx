import React from 'react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
  mobileLabel?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T, index: number) => string;
  title?: string;
  subtitle?: string;
  className?: string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T, index: number) => string;
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  title,
  subtitle,
  className,
  emptyMessage = "Nenhum dado encontrado.",
  onRowClick,
  rowClassName,
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className={cn("glass rounded-xl p-6", className)}>
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
        )}
        <p className="text-muted-foreground text-center py-8">{emptyMessage}</p>
      </div>
    );
  }

  const visibleColumns = columns.filter(col => !col.hideOnMobile);
  const mobileColumns = columns.filter(col => col.hideOnMobile);

  return (
    <div className={cn("glass rounded-xl overflow-hidden", className)}>
      {title && (
        <div className="p-4 sm:p-6 border-b border-border">
          <h3 className="text-lg font-semibold">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      )}
      
      {/* Desktop view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {columns.map((col) => (
                <th 
                  key={String(col.key)} 
                  className={cn(
                    "text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-muted-foreground",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr 
                key={keyExtractor(item, index)}
                className={cn(
                  "border-b border-border/50 hover:bg-secondary/20 transition-colors",
                  onRowClick && "cursor-pointer",
                  rowClassName?.(item, index)
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td 
                    key={String(col.key)} 
                    className={cn("p-3 sm:p-4", col.className)}
                  >
                    {col.render 
                      ? col.render(item, index) 
                      : String(item[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden divide-y divide-border">
        {data.map((item, index) => (
          <div 
            key={keyExtractor(item, index)}
            className={cn(
              "p-4 hover:bg-secondary/10 transition-colors",
              onRowClick && "cursor-pointer",
              rowClassName?.(item, index)
            )}
            onClick={() => onRowClick?.(item)}
          >
            {/* Primary info (always visible columns) */}
            <div className="space-y-2">
              {visibleColumns.map((col) => (
                <div key={String(col.key)} className={col.className}>
                  {col.render 
                    ? col.render(item, index) 
                    : String(item[col.key] ?? '')}
                </div>
              ))}
            </div>
            
            {/* Secondary info (hidden on desktop) */}
            {mobileColumns.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-sm">
                {mobileColumns.map((col) => (
                  <div key={String(col.key)}>
                    <span className="text-muted-foreground text-xs">
                      {col.mobileLabel || col.header}:
                    </span>
                    <div className={col.className}>
                      {col.render 
                        ? col.render(item, index) 
                        : String(item[col.key] ?? '')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
