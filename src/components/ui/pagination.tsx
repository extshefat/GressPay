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
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted dark:text-muted ${className}`}
    >
      {totalItems !== undefined && pageSize !== undefined ? (
        <div>
          Showing{" "}
          <span className="font-medium text-ink dark:text-ink">
            {Math.min((currentPage - 1) * pageSize + 1, totalItems)}
          </span>{" "}
          to{" "}
          <span className="font-medium text-ink dark:text-ink">
            {Math.min(currentPage * pageSize, totalItems)}
          </span>{" "}
          of{" "}
          <span className="font-medium text-ink dark:text-ink">
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
          className="h-9 px-2"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {pages.map((p, idx) => {
          if (p === "...") {
            return (
              <span key={`dots-${idx}`} className="px-2 py-1 text-muted">
                ...
              </span>
            );
          }
          return (
            <button
              key={`page-${p}`}
              aria-label={`Page ${p}`}
              aria-current={currentPage === p ? "page" : undefined}
              type="button"
              onClick={() => onPageChange(p)}
              className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors ${
                currentPage === p
                  ? "bg-brand text-white dark:bg-brand dark:text-on-brand font-semibold"
                  : "text-muted hover:bg-surface dark:text-muted dark:hover:bg-ink-solid"
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
          className="h-9 px-2"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
