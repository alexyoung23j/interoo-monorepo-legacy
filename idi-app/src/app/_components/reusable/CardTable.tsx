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
  rowClassName?: string | ((row: T) => string);
  rowStyle?: (row: T) => React.CSSProperties;
  tableClassName?: string;
  showHeader?: boolean;
}

function CardTable<T extends Record<string, unknown>>({
  data,
  columns,
  onRowClick,
  rowClassName,
  rowStyle,
  tableClassName,
  showHeader = true,
}: CardTableProps<T>) {
  const renderCellContent = (value: unknown): ReactNode => {
    if (React.isValidElement(value)) {
      return value;
    }
    if (value == null) {
      return "";
    }
    return String(value);
  };

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
                typeof rowClassName === "function"
                  ? rowClassName(row)
                  : rowClassName,
              )}
              role="row"
              style={rowStyle ? rowStyle(row) : {}}
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
                  {renderCellContent(row[column.key])}
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
