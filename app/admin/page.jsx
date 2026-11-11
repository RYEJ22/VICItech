import Link from "next/link";
import { Activity, ArrowUpRight, Cpu, ShieldCheck, ShoppingBag } from "lucide-react";

const cards = [
  {
    title: "Customer orders",
    description: "Review incoming checkouts and update order progress.",
    href: "/admin/dashboard",
    icon: ShoppingBag,
  },
  {
    title: "IoT QC operations",
    description: "Review quality-control operations and device certification workflows.",
    href: "/admin/iot-qc",
    icon: Activity,
  },
  {
    title: "Hardware inventory",
    description: "Manage component specifications, pricing, stock and catalog visibility.",
    href: "/admin/hardware",
    icon: Cpu,
  },
];

export default function AdminDashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
          <ShieldCheck className="h-4 w-4" /> Authorized workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Admin overview</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Manage ViciTech operations from a workspace separate from the client experience.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ title, description, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-5 transition hover:border-emerald-600/40 dark:hover:border-emerald-400/40 hover:bg-white dark:hover:bg-zinc-900"
          >
            <Icon className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
            <h2 className="mt-4 flex items-center justify-between font-semibold text-zinc-900 dark:text-zinc-100">
              {title}
              <ArrowUpRight className="h-4 w-4 text-zinc-500 transition group-hover:text-cyan-700 dark:group-hover:text-cyan-300" />
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
