import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-start justify-center gap-4 px-4 py-16">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Page not found</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        This dashboard route does not exist or you no longer have access.
      </p>
      <Link
        href="/overview"
        className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Back to overview
      </Link>
    </div>
  );
}
