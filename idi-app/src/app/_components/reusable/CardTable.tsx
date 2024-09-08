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
}

function CardTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  rowClassName,
  tableClassName,
}: CardTableProps<T>) {
  return (
    <div
      className={cn("flex flex-col space-y-2", tableClassName)}
      role="table"
      aria-label="Card Table"
    >
      <div className="text-theme-900 flex flex-col space-y-2">
        <div className="flex w-full px-4" role="row">
          {columns.map((column) => (
            <div
              key={column.key}
              className={cn(
                "text-theme-600 flex items-center text-xs font-medium text-muted-foreground",
                column.className,
              )}
              style={{
                width: column.width,
                flexGrow: column.width ? 0 : 1,
                flexShrink: column.width ? 0 : 1,
                flexBasis: column.width || "0%",
              }}
              role="columnheader"
            >
              {column.header}
            </div>
          ))}
        </div>
        <div className="flex flex-col space-y-3" role="rowgroup">
          {data.map((row, index) => (
            <div
              key={index}
              onClick={() => onRowClick && onRowClick(row)}
              className={cn(
                "border-theme-200 bg-theme-off-white shadow-light flex w-full items-center rounded-sm border p-4",
                "hover:bg-theme-50 transition-colors duration-200",
                onRowClick && "cursor-pointer",
                rowClassName,
              )}
              role="row"
            >
              {columns.map((column) => (
                <div
                  key={column.key}
                  className={cn(
                    "text-theme-900 flex items-center text-sm",
                    column.className,
                  )}
                  style={{
                    width: column.width,
                    flexGrow: column.width ? 0 : 1,
                    flexShrink: column.width ? 0 : 1,
                    flexBasis: column.width || "0%",
                  }}
                  role="cell"
                >
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
