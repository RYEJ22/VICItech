"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Power,
} from "lucide-react";
import {
  deleteHardwareComponent,
  HARDWARE_CATEGORIES,
  listHardwareComponents,
  updateHardwareComponent,
} from "@/lib/hardware/components";
import type { HardwareCategory, HardwareComponent, HardwareCondition } from "@/lib/hardware/components";

type ConditionFilter = "all" | HardwareCondition;

const idr = (value: number) => new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format(Number(value) || 0);

function conditionLabel(condition: HardwareCondition): string {
  if (condition === "brand_new") return "Brand New";
  if (condition === "refurbished_qc_passed") return "Refurbished";
  return "Used";
}

function conditionClass(condition: HardwareCondition): string {
  if (condition === "brand_new") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (condition === "refurbished_qc_passed") return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
  return "border-amber-500/30 bg-amber-500/10 text-amber-300";
}

export default function HardwareInventoryPage() {
  const [components, setComponents] = useState<HardwareComponent[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | HardwareCategory>("all");
  const [condition, setCondition] = useState<ConditionFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  const loadComponents = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      setComponents(await listHardwareComponents());
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load hardware inventory.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadComponents();
  }, [loadComponents]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return components.filter((item) => {
      const matchesQuery = !query || `${item.name} ${item.brand}`.toLowerCase().includes(query);
      return matchesQuery
        && (category === "all" || item.category === category)
        && (condition === "all" || item.condition === condition);
    });
  }, [components, search, category, condition]);

  const lowStock = components.filter((item) => item.stock_quantity < 5).length;
  const activeCount = components.filter((item) => item.is_active).length;

  const toggleActive = async (item: HardwareComponent) => {
    setBusyId(item.id);
    setErrorMessage("");
    setNotice("");
    try {
      const updated = await updateHardwareComponent(item.id, { is_active: !item.is_active });
      setComponents((current) => current.map((component) => component.id === item.id ? updated : component));
      setNotice(`${item.name} is now ${updated.is_active ? "active" : "inactive"}.`);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update component status.");
    } finally {
      setBusyId("");
    }
  };

  const removeComponent = async (item: HardwareComponent) => {
    if (!window.confirm(`Permanently delete "${item.name}" from the hardware inventory?`)) return;
    setBusyId(item.id);
    setErrorMessage("");
    setNotice("");
    try {
      await deleteHardwareComponent(item.id);
      setComponents((current) => current.filter((component) => component.id !== item.id));
      setNotice(`${item.name} was deleted.`);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Could not delete component.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Hardware operations</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">Hardware Inventory &amp; Spec Registry</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Manage the live component registry for catalog and builder experiences.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void loadComponents()} disabled={isLoading} aria-label="Refresh hardware inventory" className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-2.5 text-zinc-700 dark:text-zinc-300 transition hover:border-emerald-600/50 dark:hover:border-emerald-400/50 hover:text-cyan-800 dark:hover:text-cyan-200 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <Link href="/admin/hardware/new" className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300">
            <Plus className="h-4 w-4" /> Add New Hardware
          </Link>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Total items</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{components.length.toLocaleString("id-ID")}</p>
        </article>
        <article className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-800/80 dark:text-amber-200/80">Low stock (&lt; 5 units)</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-amber-800 dark:text-amber-200">{lowStock.toLocaleString("id-ID")}</p>
        </article>
        <article className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-sm text-emerald-800/80 dark:text-emerald-200/80">Active components</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-800 dark:text-emerald-200">{activeCount.toLocaleString("id-ID")}</p>
        </article>
      </div>

      {(errorMessage || notice) && (
        <p role={errorMessage ? "alert" : "status"} className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${errorMessage ? "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"}`}>
          {errorMessage ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          {errorMessage || notice}
        </p>
      )}

      <div className="grid gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-4 md:grid-cols-[minmax(220px,1fr)_190px_210px]">
        <label className="relative">
          <span className="sr-only">Search name or brand</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or brand…" className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 py-2.5 pl-9 pr-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-600/60 dark:focus:border-emerald-400/60" />
        </label>
        <label>
          <span className="sr-only">Filter category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value as "all" | HardwareCategory)} className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 outline-none focus:border-emerald-600/60 dark:focus:border-emerald-400/60">
            <option value="all">All categories</option>
            {HARDWARE_CATEGORIES.map((item) => <option value={item} key={item}>{item.toUpperCase()}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter condition</span>
          <select value={condition} onChange={(event) => setCondition(event.target.value as ConditionFilter)} className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 outline-none focus:border-emerald-600/60 dark:focus:border-emerald-400/60">
            <option value="all">All conditions</option>
            <option value="brand_new">Brand New</option>
            <option value="refurbished_qc_passed">Refurbished (QC Passed)</option>
            <option value="used">Used</option>
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
        <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
          Showing {filtered.length.toLocaleString("id-ID")} of {components.length.toLocaleString("id-ID")} components
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-white/60 dark:bg-zinc-950/60 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th scope="col" className="px-4 py-3">Component / Brand</th>
                <th scope="col" className="px-4 py-3">Category</th>
                <th scope="col" className="px-4 py-3">Price</th>
                <th scope="col" className="px-4 py-3">Stock</th>
                <th scope="col" className="px-4 py-3">Benchmark</th>
                <th scope="col" className="px-4 py-3">Condition</th>
                <th scope="col" className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-600 dark:text-zinc-400"><span className="inline-flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading inventory…</span></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{components.length ? "No components match these filters." : "Your hardware registry is empty."}</p>
                    <Link href="/admin/hardware/new" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-400/10">
                      <Plus className="h-4 w-4" /> Add hardware
                    </Link>
                  </td>
                </tr>
              ) : filtered.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-zinc-100/40 dark:hover:bg-zinc-800/40">
                  <td className="px-4 py-3">
                    <span className="block font-medium text-zinc-900 dark:text-zinc-100">{item.name}</span>
                    <span className="mt-0.5 block text-xs text-zinc-500">{item.brand}{item.architecture ? ` · ${item.architecture}` : ""}</span>
                  </td>
                  <td className="px-4 py-3"><span className="rounded-full border border-emerald-600/20 dark:border-emerald-400/20 bg-emerald-600/5 dark:bg-emerald-400/5 px-2.5 py-1 text-xs font-medium uppercase text-cyan-800 dark:text-cyan-200">{item.category}</span></td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-zinc-800 dark:text-zinc-200">{idr(item.base_price)}</td>
                  <td className="px-4 py-3"><span className={item.stock_quantity < 5 ? "font-semibold text-amber-700 dark:text-amber-300" : "text-zinc-700 dark:text-zinc-300"}>{item.stock_quantity}</span></td>
                  <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-300">{item.performance_score.toLocaleString("id-ID")}</td>
                  <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-xs ${conditionClass(item.condition)}`}>{conditionLabel(item.condition)}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/admin/hardware/${item.id}/edit`} aria-label={`Edit ${item.name}`} title="Edit" className="rounded-md border border-zinc-200 dark:border-zinc-700 p-2 text-zinc-700 dark:text-zinc-300 transition hover:border-emerald-600/50 dark:hover:border-emerald-400/50 hover:text-cyan-800 dark:hover:text-cyan-200">
                        <Edit3 className="h-4 w-4" />
                      </Link>
                      <button type="button" onClick={() => void toggleActive(item)} disabled={busyId === item.id} aria-label={`${item.is_active ? "Deactivate" : "Activate"} ${item.name}`} title={item.is_active ? "Deactivate" : "Activate"} className="rounded-md border border-zinc-200 dark:border-zinc-700 p-2 text-zinc-700 dark:text-zinc-300 transition hover:border-amber-400/50 hover:text-amber-800 dark:hover:text-amber-200 disabled:opacity-50">
                        {busyId === item.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => void removeComponent(item)} disabled={busyId === item.id} aria-label={`Delete ${item.name}`} title="Delete" className="rounded-md border border-zinc-200 dark:border-zinc-700 p-2 text-zinc-600 dark:text-zinc-400 transition hover:border-red-400/50 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <span className={`mt-1 block text-[10px] ${item.is_active ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-500"}`}>{item.is_active ? "Active" : "Inactive"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
