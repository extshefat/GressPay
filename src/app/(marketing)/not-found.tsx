import Link from "next/link";

export default function MarketingNotFound() {
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-lg font-semibold text-ink dark:text-ink">Not found</h1>
      <p className="text-sm text-muted dark:text-muted">
        The page you requested is not available.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-ink-solid px-3 py-2 text-sm font-medium text-white dark:bg-surface-muted dark:text-muted"
      >
        Home
      </Link>
    </div>
  );
}
