import Link from "next/link";
import { ArrowRight, Heart, MessageCircle, Wrench } from "lucide-react";

const BUILDS = [
  {
    title: "Quiet workstation refresh",
    author: "Mira K.",
    category: "Workstation",
    summary: "A compact, low-noise build for development and 3D work, with room for a future GPU upgrade.",
    parts: "Ryzen 7 · 64 GB DDR5 · 2 TB NVMe",
    likes: 28,
    replies: 6,
  },
  {
    title: "First SFF gaming build",
    author: "Arif P.",
    category: "Small form factor",
    summary: "Balancing thermals and performance in a small case, with notes on cable routing and fan curves.",
    parts: "Core i5 · Radeon RX · 32 GB DDR5",
    likes: 19,
    replies: 4,
  },
  {
    title: "Giving an older laptop a second life",
    author: "Nadia R.",
    category: "Upgrade guide",
    summary: "A practical RAM and storage upgrade that extended the useful life of a five-year-old laptop.",
    parts: "16 GB RAM · 1 TB SSD · Linux",
    likes: 42,
    replies: 11,
  },
];

export default function CommunityPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50 px-4 py-12 text-zinc-900 transition-colors duration-200 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
              <Wrench className="h-4 w-4" aria-hidden="true" />
              ViciTech community
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Build, share, and learn together.</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400 sm:text-base">
              A preview of community builds and upgrade stories from people who love making technology last.
            </p>
          </div>
          <Link
            href="/community/create"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 dark:bg-emerald-400 dark:text-zinc-950 dark:hover:bg-emerald-300"
          >
            Share a build <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <section aria-label="Community build feed" className="grid gap-4">
          {BUILDS.map((build) => (
            <article key={build.title} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors duration-200 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  {build.category}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Shared by {build.author}</span>
              </div>
              <h2 className="mt-4 text-xl font-semibold tracking-tight">{build.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">{build.summary}</p>
              <p className="mt-4 font-mono text-xs text-zinc-500 dark:text-zinc-400">{build.parts}</p>
              <div className="mt-5 flex items-center gap-5 border-t border-zinc-100 pt-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1.5"><Heart className="h-4 w-4" aria-hidden="true" />{build.likes} appreciations</span>
                <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-4 w-4" aria-hidden="true" />{build.replies} replies</span>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
