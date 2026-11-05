import Link from "next/link";

export default function MarketingNotFound() {
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Not found</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        The page you requested is not available.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Home
      </Link>
    </div>
  );
}
