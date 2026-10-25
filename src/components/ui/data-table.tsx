import React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Skeleton } from "./skeleton";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  align?: "left" | "center" | "right";
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  loading = false,
  emptyState,
  sortKey,
  sortDirection,
  onSort,
  onRowClick,
  className = "",
}: DataTableProps<T>) {
  return (
    <div
      className={`overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 ${className}`}
    >
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40">
            {columns.map((col) => {
              const alignClass =
                col.align === "right"
                  ? "text-right"
                  : col.align === "center"
                  ? "text-center"
                  : "text-left";

              return (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-400 ${alignClass} ${
                    col.sortable ? "cursor-pointer select-none hover:text-zinc-900 dark:hover:text-zinc-100" : ""
                  } ${col.className || ""}`}
                  onClick={() => col.sortable && onSort && onSort(col.key)}
                >
                  <div
                    className={`inline-flex items-center gap-1.5 ${
                      col.align === "right"
                        ? "justify-end"
                        : col.align === "center"
                        ? "justify-center"
                        : "justify-start"
                    }`}
                  >
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-zinc-400">
                        {sortKey === col.key ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="w-3 h-3 text-[#077C74] dark:text-[#1BD1C0]" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-[#077C74] dark:text-[#1BD1C0]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {loading ? (
            Array.from({ length: 5 }).map((_, rIdx) => (
              <tr key={`skel-row-${rIdx}`}>
                {columns.map((col, cIdx) => (
                  <td key={`skel-col-${cIdx}`} className="px-4 py-3.5">
                    <Skeleton className="h-4 w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                {emptyState || (
                  <span className="text-zinc-500 dark:text-zinc-400">No records found.</span>
                )}
              </td>
            </tr>
          ) : (
            data.map((row, rIdx) => (
              <tr
                key={row.id || rIdx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors ${
                  onRowClick
                    ? "cursor-pointer hover:bg-zinc-50/80 dark:hover:bg-zinc-900/60"
                    : "hover:bg-zinc-50/40 dark:hover:bg-zinc-900/30"
                }`}
              >
                {columns.map((col) => {
                  const alignClass =
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                      ? "text-center"
                      : "text-left";

                  return (
                    <td
                      key={col.key}
                      className={`px-4 py-3.5 text-zinc-700 dark:text-zinc-300 ${alignClass} ${
                        col.className || ""
                      }`}
                    >
                      {col.render
                        ? col.render(row)
                        : (row as Record<string, unknown>)[col.key] !== undefined
                        ? String((row as Record<string, unknown>)[col.key])
                        : null}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
