"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-start justify-center gap-4 px-4 py-16">
      <h1 className="text-lg font-semibold text-ink dark:text-ink">Something went wrong</h1>
      <p className="text-sm text-muted dark:text-muted">
        {error.message || "This page failed to load. You can try again."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-ink-solid px-3 py-2 text-sm font-medium text-white dark:bg-surface-muted dark:text-muted"
      >
        Try again
      </button>
    </div>
  );
}
