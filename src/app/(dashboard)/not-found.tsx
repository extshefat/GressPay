import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-start justify-center gap-4 px-4 py-16">
      <h1 className="text-lg font-semibold text-ink dark:text-ink">Page not found</h1>
      <p className="text-sm text-muted dark:text-muted">
        This dashboard route does not exist or you no longer have access.
      </p>
      <Link
        href="/overview"
        className="rounded-lg bg-ink-solid px-3 py-2 text-sm font-medium text-white dark:bg-surface-muted dark:text-muted"
      >
        Back to overview
      </Link>
    </div>
  );
}
