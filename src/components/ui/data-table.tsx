"use client";
import * as React from "react";
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
    density?: "comfortable" | "compact";
}
export function DataTable<T extends {
    id?: string | number;
}>({ columns, data, loading = false, emptyState, sortKey, sortDirection, onSort, onRowClick, className = "", density: initialDensity = "comfortable" }: DataTableProps<T>) {
    const [density, setDensity] = React.useState(initialDensity);
    const value = (row: T, col: Column<T>) => col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "");
    const align = (col: Column<T>) => col.align === "right" ? "text-right tabular-nums" : col.align === "center" ? "text-center" : "text-left";
    const empty = emptyState || <p className="p-6 text-center text-muted">No records found.</p>;
    return <div className={className}><div className="mb-2 flex justify-end"><label className="flex items-center gap-2 text-xs text-muted">Density<select aria-label="Table density" className="rounded-md border border-border-strong bg-card px-2 py-1 text-ink" value={density} onChange={e => setDensity(e.target.value as typeof density)}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label></div>
 <div className="gp-table-desktop gp-surface max-h-[32rem] overflow-auto" data-elevation="flat"><table className="gp-data-table" data-density={density}><thead><tr>{columns.map(col => <th key={col.key} scope="col" aria-sort={sortKey === col.key ? (sortDirection === "desc" ? "descending" : "ascending") : col.sortable ? "none" : undefined} className={`${align(col)} ${col.className || ""}`}>{col.sortable && onSort ? <button type="button" className="inline-flex min-h-8 items-center gap-2" onClick={() => onSort(col.key)}>{col.header}{sortKey === col.key ? (sortDirection === "desc" ? <ArrowDown size={16}/> : <ArrowUp size={16}/>) : <ArrowUpDown size={16}/>}</button> : col.header}</th>)}</tr></thead><tbody>{loading ? Array.from({ length: 5 }, (_, index) => <tr key={index}>{columns.map(col => <td key={col.key}><Skeleton className="h-4 w-24"/></td>)}</tr>) : data.length ? data.map((row, index) => <tr key={row.id ?? index} tabIndex={onRowClick ? 0 : undefined} role={onRowClick ? "button" : undefined} aria-label={onRowClick ? `Open row ${index + 1}` : undefined} onClick={() => onRowClick?.(row)} onKeyDown={e => { if (onRowClick && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onRowClick(row);
    } }} className={onRowClick ? "cursor-pointer hover:bg-surface" : ""}>{columns.map(col => <td key={col.key} className={`${align(col)} ${col.className || ""}`}>{value(row, col)}</td>)}</tr>) : <tr><td colSpan={columns.length}>{empty}</td></tr>}</tbody></table></div>
 <div className="gp-table-mobile space-y-3">{onSort && <label className="block text-sm">Sort by<select className="gp-control mt-1" value={sortKey || ""} onChange={e => onSort(e.target.value)}><option value="" disabled>Choose a column</option>{columns.filter(col => col.sortable).map(col => <option key={col.key} value={col.key}>{typeof col.header === "string" ? col.header : col.key}</option>)}</select></label>}{loading ? <Skeleton className="h-32"/> : data.length ? data.map((row, index) => <article key={row.id ?? index} className="gp-surface p-4" data-elevation="flat"><dl className="space-y-3">{columns.map(col => <div key={col.key} className="flex flex-wrap justify-between gap-2"><dt className="text-sm text-muted">{col.header}</dt><dd className="max-w-full break-words text-sm tabular-nums">{value(row, col)}</dd></div>)}</dl>{onRowClick && <button type="button" className="gp-button mt-3 min-h-10 w-full" data-variant="secondary" onClick={() => onRowClick(row)}>Open details</button>}</article>) : empty}</div></div>;
}
