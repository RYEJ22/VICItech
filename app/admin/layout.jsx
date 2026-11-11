import Link from "next/link";
import { headers } from "next/headers";
import AdminSignOutButton from "@/components/vicitech/admin/AdminSignOutButton";

export default function AdminLayout({ children }) {
  if (headers().get("x-admin-pathname") === "/admin/login") {
    return children;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-600 dark:bg-emerald-400 font-bold text-white dark:text-zinc-950">V</span>
            <span>
              <span className="block font-semibold tracking-tight">ViciTech OS</span>
              <span className="block text-xs uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-400">Admin workspace</span>
            </span>
          </Link>
          <AdminSignOutButton />
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Admin workspace" className="flex gap-2 overflow-x-auto md:flex-col">
          <Link href="/admin" className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:border-emerald-600/40 dark:hover:border-emerald-400/40 hover:text-cyan-800 dark:hover:text-cyan-200">
            Overview
          </Link>
          <Link href="/admin/dashboard" className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:border-emerald-600/40 dark:hover:border-emerald-400/40 hover:text-cyan-800 dark:hover:text-cyan-200">
            Orders
          </Link>
          <Link href="/admin/hardware" className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:border-emerald-600/40 dark:hover:border-emerald-400/40 hover:text-cyan-800 dark:hover:text-cyan-200">
            Hardware inventory
          </Link>
          <Link href="/admin/iot-qc" className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:border-emerald-600/40 dark:hover:border-emerald-400/40 hover:text-cyan-800 dark:hover:text-cyan-200">
            IoT QC operations
          </Link>
          <Link href="/" className="rounded-lg border border-transparent px-3 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
            Client storefront
          </Link>
        </nav>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
