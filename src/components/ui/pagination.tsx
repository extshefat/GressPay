"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400 ${className}`}
    >
      {totalItems !== undefined && pageSize !== undefined ? (
        <div>
          Showing{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {Math.min((currentPage - 1) * pageSize + 1, totalItems)}
          </span>{" "}
          to{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {Math.min(currentPage * pageSize, totalItems)}
          </span>{" "}
          of{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {totalItems}
          </span>{" "}
          results
        </div>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-8 px-2"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {pages.map((p, idx) => {
          if (p === "...") {
            return (
              <span key={`dots-${idx}`} className="px-2 py-1 text-zinc-400">
                ...
              </span>
            );
          }
          return (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => onPageChange(p)}
              className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors ${
                currentPage === p
                  ? "bg-[#077C74] text-white dark:bg-[#1BD1C0] dark:text-zinc-950 font-semibold"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {p}
            </button>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-8 px-2"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
