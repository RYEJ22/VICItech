import Link from "next/link";
import { ArrowUpRight, Cpu, HardDrive, MemoryStick, Monitor, Search, Zap } from "lucide-react";

const CATEGORIES = [
  {
    name: "Processors",
    description: "Compare desktop CPUs by socket, cores, and power draw.",
    icon: Cpu,
    count: "24 components",
  },
  {
    name: "Graphics cards",
    description: "Explore GPUs for gaming, creation, and workstation builds.",
    icon: Monitor,
    count: "18 components",
  },
  {
    name: "Memory",
    description: "Find DDR4 and DDR5 kits matched to your platform.",
    icon: MemoryStick,
    count: "16 components",
  },
  {
    name: "Storage",
    description: "Browse NVMe and SATA drives by capacity and interface.",
    icon: HardDrive,
    count: "21 components",
  },
];

export default function MarketplacePage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50 px-4 py-12 text-zinc-900 transition-colors duration-200 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
              <Zap className="h-4 w-4" aria-hidden="true" />
              Hardware marketplace
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Find the right parts for your next build.</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400 sm:text-base">
              Explore the ViciTech catalog by component family. Compatibility and live inventory tools are coming to this catalog.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <Search className="h-4 w-4" aria-hidden="true" />
            Catalog preview
          </div>
        </div>

        <section aria-label="Hardware categories" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map(({ name, description, icon: Icon, count }) => (
            <article
              key={name}
              className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-500/40"
            >
              <div className="mb-8 grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{count}</p>
              <h2 className="mt-2 text-lg font-semibold">{name}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{description}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Explore category
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </article>
          ))}
        </section>

        <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm text-zinc-700 dark:text-zinc-300 sm:flex sm:items-center sm:justify-between">
          <p>Planning a new system? Check component fit in the QC and compatibility workspace.</p>
          <Link href="/qc-panel" className="mt-3 inline-flex font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 sm:mt-0">
            Open QC Panel <span className="sr-only">to check your hardware</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
