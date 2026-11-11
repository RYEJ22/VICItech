import { LoaderCircle } from "lucide-react";

export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-5 py-2">
      <span className="inline-flex items-center gap-2 text-sm text-cyan-800 dark:text-cyan-200">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading admin workspace…
      </span>
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-24 animate-pulse rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50" />
        ))}
      </div>
      <div aria-hidden="true" className="h-72 animate-pulse rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50" />
    </div>
  );
}
