"use client";

export default function AppError({ error, reset }) {
  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-zinc-50 px-4 py-12 text-zinc-900 transition-colors duration-200 dark:bg-zinc-950 dark:text-zinc-100">
      <section role="alert" className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-white p-8 shadow-xl shadow-zinc-200/50 dark:bg-zinc-900/70 dark:shadow-black/30">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700 dark:text-red-300">Application error</p>
        <h1 className="mt-3 text-2xl font-semibold">ViciTech could not load this page</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          The page encountered an unexpected error. Retry to reload it; if the issue continues, check the browser console and development server logs.
        </p>
        {error?.digest && <p className="mt-3 font-mono text-xs text-zinc-500 dark:text-zinc-500">Error reference: {error.digest}</p>}
        <button type="button" onClick={reset} className="mt-6 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-400 dark:text-zinc-950 dark:hover:bg-emerald-300">
          Retry page
        </button>
      </section>
    </main>
  );
}
