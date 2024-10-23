import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Column {
  key: string;
  header: string;
  className?: string;
  width?: string;
}

interface CardTableProps<T> {
  data: T[];
  columns: Column[];
  footer?: ReactNode;
  onRowClick?: (row: T) => void;
  rowClassName?: string;
  tableClassName?: string;
  showHeader?: boolean;
  rowStyle?: (row: T) => React.CSSProperties;
  isRowSelected?: (row: T) => boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CardTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  rowClassName,
  tableClassName,
  showHeader = true,
  rowStyle,
  isRowSelected,
}: CardTableProps<T>) {
  return (
    <div
      className={cn("flex flex-col space-y-2", tableClassName)}
      role="table"
      aria-label="Card Table"
    >
      <div className="flex flex-col space-y-2 text-theme-900">
        {showHeader && (
          <div className="flex w-full px-4" role="row">
            {columns.map((column) => (
              <div
                key={column.key}
                className={cn(
                  "flex items-center text-xs font-medium text-muted-foreground text-theme-600",
                  column.className,
                )}
                style={{
                  width: column.width,
                  flexGrow: column.width ? 0 : 1,
                  flexShrink: column.width ? 0 : 1,
                  flexBasis: column.width ?? "0%",
                }}
                role="columnheader"
              >
                {column.header}
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col space-y-3" role="rowgroup">
          {data.map((row, index) => (
            <div
              key={index}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "flex w-full items-center rounded-sm border border-theme-200 p-4 shadow-light",
                "transition-colors duration-200",
                onRowClick && "cursor-pointer",
                isRowSelected?.(row)
                  ? "bg-theme-50"
                  : "bg-theme-off-white hover:bg-theme-50",
                rowClassName,
              )}
              role="row"
              style={rowStyle?.(row)}
            >
              {columns.map((column) => (
                <div
                  key={column.key}
                  className={cn(
                    "flex items-center text-sm text-theme-900",
                    column.className,
                  )}
                  style={{
                    width: column.width,
                    flexGrow: column.width ? 0 : 1,
                    flexShrink: column.width ? 0 : 1,
                    flexBasis: column.width ?? "0%",
                  }}
                  role="cell"
                >
                  {/* eslint-disable-next-line @typescript-eslint/no-unsafe-argument */}
                  {React.isValidElement(row[column.key])
                    ? row[column.key]
                    : String(row[column.key])}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CardTable;
