"use client";

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={
            value === t.id
              ? "flex-1 rounded-lg bg-white px-3 py-2 text-sm font-medium shadow-sm dark:bg-zinc-950"
              : "flex-1 rounded-lg px-3 py-2 text-sm text-zinc-500"
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
