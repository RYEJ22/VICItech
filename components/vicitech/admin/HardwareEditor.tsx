"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Cpu, LoaderCircle, Save, Sparkles } from "lucide-react";
import {
  createHardwareComponent,
  getHardwareComponent,
  HARDWARE_CATEGORIES,
  HARDWARE_CONDITIONS,
  updateHardwareComponent,
} from "@/lib/hardware/components";
import type {
  HardwareCategory,
  HardwareComponent,
  HardwareComponentInput,
  HardwareCondition,
  HardwareSpecs,
} from "@/lib/hardware/components";

type SpecField = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "number" | "select";
  options?: string[];
};

const CATEGORY_FIELDS: Record<HardwareCategory, SpecField[]> = {
  cpu: [
    { key: "socket", label: "Socket type", placeholder: "LGA1700, AM5" },
    { key: "cores", label: "Cores", type: "number", placeholder: "8" },
    { key: "threads", label: "Threads", type: "number", placeholder: "16" },
    { key: "baseClockGHz", label: "Base clock (GHz)", type: "number", placeholder: "3.5" },
    { key: "boostClockGHz", label: "Boost clock (GHz)", type: "number", placeholder: "5.2" },
    { key: "integratedGpu", label: "Integrated GPU", type: "select", options: ["Yes", "No"] },
  ],
  gpu: [
    { key: "vramGB", label: "VRAM (GB)", type: "number", placeholder: "8" },
    { key: "memoryType", label: "Memory type", placeholder: "GDDR6 / GDDR6X" },
    { key: "busWidthBits", label: "Bus width (bits)", type: "number", placeholder: "128" },
    { key: "recommendedPsuWatts", label: "Recommended PSU (W)", type: "number", placeholder: "650" },
  ],
  ram: [
    { key: "capacityGB", label: "Capacity (GB)", type: "number", placeholder: "32" },
    { key: "speedMTs", label: "Speed (MT/s)", type: "number", placeholder: "6000" },
    { key: "memoryType", label: "Memory type", type: "select", options: ["DDR4", "DDR5", "LPDDR5"] },
    { key: "formFactor", label: "Form factor", type: "select", options: ["DIMM", "SO-DIMM"] },
  ],
  storage: [
    { key: "interface", label: "Interface", placeholder: "NVMe PCIe 4.0, SATA" },
    { key: "capacityGB", label: "Capacity (GB)", type: "number", placeholder: "2000" },
    { key: "readSpeedMBs", label: "Read speed (MB/s)", type: "number", placeholder: "7000" },
    { key: "writeSpeedMBs", label: "Write speed (MB/s)", type: "number", placeholder: "6500" },
  ],
  motherboard: [
    { key: "socket", label: "CPU socket", placeholder: "AM5, LGA1700" },
    { key: "chipset", label: "Chipset", placeholder: "B650, Z790" },
    { key: "formFactor", label: "Form factor", placeholder: "ATX, Micro-ATX, ITX" },
    { key: "memoryType", label: "Memory type", placeholder: "DDR5" },
  ],
  psu: [
    { key: "wattage", label: "Wattage (W)", type: "number", placeholder: "750" },
    { key: "efficiencyRating", label: "Efficiency rating", placeholder: "80 Plus Gold" },
    { key: "modular", label: "Modular cabling", type: "select", options: ["Fully modular", "Semi-modular", "Non-modular"] },
    { key: "formFactor", label: "Form factor", placeholder: "ATX, SFX" },
  ],
  case: [
    { key: "formFactor", label: "Form factor", placeholder: "ATX Mid Tower, Mini-ITX" },
    { key: "maxGpuLengthMM", label: "Max GPU length (mm)", type: "number", placeholder: "360" },
    { key: "includedFans", label: "Included fans", type: "number", placeholder: "3" },
    { key: "color", label: "Color", placeholder: "Black" },
  ],
  cooling: [
    { key: "coolerType", label: "Cooling type", type: "select", options: ["Air", "AIO liquid", "Custom loop"] },
    { key: "radiatorSizeMM", label: "Radiator size (mm)", type: "number", placeholder: "360" },
    { key: "socketCompatibility", label: "Socket compatibility", placeholder: "AM5, LGA1700" },
    { key: "noiseLevelDBA", label: "Noise level (dBA)", type: "number", placeholder: "28" },
  ],
};

const BRANDS = ["AMD", "ASUS", "Cooler Master", "Corsair", "Crucial", "Dell", "Gigabyte", "Intel", "Kingston", "MSI", "NVIDIA", "Samsung", "Seagate", "Western Digital"];
const inputClass = "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-300";
const idr = (value: number) => new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format(Number.isFinite(value) ? value : 0);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeSpecs(specs: HardwareSpecs): Record<string, string | boolean> {
  return Object.fromEntries(
    Object.entries(specs).map(([key, value]) => [key, typeof value === "boolean" ? value : String(value ?? "")]),
  );
}

function specsFromFields(category: HardwareCategory, values: Record<string, string | boolean>, tdp: string): HardwareSpecs {
  const result: HardwareSpecs = {};
  for (const field of CATEGORY_FIELDS[category]) {
    const value = values[field.key];
    if (value === undefined || value === "") continue;
    if (field.type === "number") {
      const number = Number(value);
      if (Number.isFinite(number)) result[field.key] = number;
    } else if (field.key === "integratedGpu") {
      result[field.key] = value === "Yes" || value === true;
    } else {
      result[field.key] = value;
    }
  }
  if (tdp.trim()) result.tdpWatts = Number(tdp);
  return result;
}

function componentInput(
  form: {
    name: string;
    brand: string;
    category: HardwareCategory;
    architecture: string;
    basePrice: string;
    stock: string;
    condition: HardwareCondition;
    performanceScore: string;
    isActive: boolean;
  },
  specs: HardwareSpecs,
): HardwareComponentInput {
  return {
    name: form.name.trim(),
    brand: form.brand.trim(),
    category: form.category,
    architecture: form.architecture.trim() || null,
    base_price: Number(form.basePrice),
    stock_quantity: Number(form.stock),
    condition: form.condition,
    specs,
    performance_score: Number(form.performanceScore),
    is_active: form.isActive,
  };
}

export default function HardwareEditor({ componentId }: { componentId?: string }) {
  const [form, setForm] = useState({
    name: "",
    brand: "",
    category: "cpu" as HardwareCategory,
    architecture: "",
    basePrice: "0",
    stock: "0",
    condition: "brand_new" as HardwareCondition,
    performanceScore: "0",
    isActive: true,
  });
  const [specValues, setSpecValues] = useState<Record<string, string | boolean>>({});
  const [tdp, setTdp] = useState("");
  const [rawSpecs, setRawSpecs] = useState("{}");
  const [advancedMode, setAdvancedMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(componentId));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!componentId) return;
    let active = true;
    getHardwareComponent(componentId).then((component: HardwareComponent) => {
      if (!active) return;
      setForm({
        name: component.name,
        brand: component.brand,
        category: component.category,
        architecture: component.architecture || "",
        basePrice: String(component.base_price),
        stock: String(component.stock_quantity),
        condition: component.condition,
        performanceScore: String(component.performance_score),
        isActive: component.is_active,
      });
      setSpecValues(normalizeSpecs(component.specs || {}));
      setTdp(component.specs?.tdpWatts === undefined ? "" : String(component.specs.tdpWatts));
      setRawSpecs(JSON.stringify(component.specs || {}, null, 2));
    }).catch((error: unknown) => {
      if (active) setErrorMessage(error instanceof Error ? error.message : "Could not load hardware.");
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [componentId]);

  const currentSpecs = useMemo(
    () => specsFromFields(form.category, specValues, tdp),
    [form.category, specValues, tdp],
  );

  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleCategoryChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const category = event.target.value as HardwareCategory;
    updateForm("category", category);
    setSpecValues({});
    setTdp("");
  };

  const toggleAdvanced = () => {
    setErrorMessage("");
    if (!advancedMode) {
      setRawSpecs(JSON.stringify(currentSpecs, null, 2));
      setAdvancedMode(true);
      return;
    }
    try {
      const parsed: unknown = JSON.parse(rawSpecs);
      if (!isRecord(parsed)) throw new Error("Specifications must be a JSON object.");
      setSpecValues(normalizeSpecs(parsed));
      setTdp(parsed.tdpWatts === undefined ? "" : String(parsed.tdpWatts));
      setAdvancedMode(false);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Enter valid JSON before switching modes.");
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccess("");

    const basePrice = Number(form.basePrice);
    const stock = Number(form.stock);
    const performanceScore = Number(form.performanceScore);
    if (!form.name.trim() || !form.brand.trim()) {
      setErrorMessage("Component name and brand are required.");
      return;
    }
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      setErrorMessage("Enter a valid non-negative price in IDR.");
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      setErrorMessage("Stock quantity must be a non-negative whole number.");
      return;
    }
    if (!Number.isInteger(performanceScore) || performanceScore < 0 || performanceScore > 10000) {
      setErrorMessage("Performance score must be an integer between 0 and 10,000.");
      return;
    }
    if (!advancedMode && tdp.trim() && (!Number.isFinite(Number(tdp)) || Number(tdp) < 0)) {
      setErrorMessage("Power consumption / TDP must be a non-negative number.");
      return;
    }

    let specs: HardwareSpecs;
    if (advancedMode) {
      try {
        const parsed: unknown = JSON.parse(rawSpecs);
        if (!isRecord(parsed)) throw new Error("Specifications must be a JSON object.");
        specs = parsed;
      } catch (error: unknown) {
        setErrorMessage(error instanceof Error ? `Invalid specifications JSON: ${error.message}` : "Invalid specifications JSON.");
        return;
      }
    } else {
      specs = currentSpecs;
    }

    setIsSaving(true);
    try {
      const payload = componentInput(form, specs);
      if (componentId) {
        await updateHardwareComponent(componentId, payload);
        setSuccess("Hardware component updated successfully.");
      } else {
        await createHardwareComponent(payload);
        setSuccess("Hardware component added successfully.");
        setForm((current) => ({ ...current, name: "" }));
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save hardware component.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p role="status" className="flex items-center gap-2 py-12 text-sm text-zinc-600 dark:text-zinc-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading hardware details…</p>;
  }

  const visibleSpecs = advancedMode ? (() => {
    try {
      const parsed: unknown = JSON.parse(rawSpecs);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  })() : currentSpecs;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/hardware" className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 transition hover:text-cyan-700 dark:hover:text-cyan-300">
            <ArrowLeft className="h-4 w-4" /> Hardware inventory
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            {componentId ? "Edit Hardware" : "Add New Hardware"}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Register specifications and inventory for the ViciTech ecosystem.</p>
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
        <form onSubmit={submit} className="space-y-5">
          <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-5">
            <h2 className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100"><Cpu className="h-4 w-4 text-emerald-700 dark:text-emerald-400" /> General information</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className={labelClass}>Full component name</span>
                <input required maxLength={160} value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="Intel Core i5-1334U" className={inputClass} />
              </label>
              <label>
                <span className={labelClass}>Brand</span>
                <input required list="hardware-brand-options" maxLength={80} value={form.brand} onChange={(event) => updateForm("brand", event.target.value)} placeholder="Select or enter a brand" className={inputClass} />
                <datalist id="hardware-brand-options">{BRANDS.map((brand) => <option value={brand} key={brand} />)}</datalist>
              </label>
              <label>
                <span className={labelClass}>Category</span>
                <select value={form.category} onChange={handleCategoryChange} className={inputClass}>
                  {HARDWARE_CATEGORIES.map((category) => <option value={category} key={category}>{category.toUpperCase()}</option>)}
                </select>
              </label>
              <label>
                <span className={labelClass}>Architecture (optional)</span>
                <input maxLength={100} value={form.architecture} onChange={(event) => updateForm("architecture", event.target.value)} placeholder="Raptor Lake, Ada Lovelace, Zen 4" className={inputClass} />
              </label>
              <label>
                <span className={labelClass}>Base price (IDR)</span>
                <input type="number" min="0" step="1" required value={form.basePrice} onChange={(event) => updateForm("basePrice", event.target.value)} className={inputClass} />
              </label>
              <label>
                <span className={labelClass}>Stock quantity</span>
                <input type="number" min="0" step="1" required value={form.stock} onChange={(event) => updateForm("stock", event.target.value)} className={inputClass} />
              </label>
              <label>
                <span className={labelClass}>Condition</span>
                <select value={form.condition} onChange={(event) => updateForm("condition", event.target.value as HardwareCondition)} className={inputClass}>
                  {HARDWARE_CONDITIONS.map((condition) => (
                    <option value={condition} key={condition}>
                      {condition === "brand_new" ? "Brand New" : condition === "refurbished_qc_passed" ? "Refurbished (QC Passed)" : "Used"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={labelClass}>Performance score (0–10,000)</span>
                <input type="number" min="0" max="10000" step="1" required value={form.performanceScore} onChange={(event) => updateForm("performanceScore", event.target.value)} className={inputClass} />
              </label>
              <label className="flex items-center gap-3 self-end rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300">
                <input type="checkbox" checked={form.isActive} onChange={(event) => updateForm("isActive", event.target.checked)} className="h-4 w-4 accent-emerald-400" />
                Active and visible in catalog
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Performance &amp; specifications</h2>
                <p className="mt-1 text-xs text-zinc-500">Category-specific specs are stored as JSONB for catalog and builder use.</p>
              </div>
              <button type="button" onClick={toggleAdvanced} className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition hover:border-emerald-600/50 dark:hover:border-emerald-400/50 hover:text-cyan-800 dark:hover:text-cyan-200">
                {advancedMode ? "Use guided fields" : "Advanced JSON mode"}
              </button>
            </div>
            <div className="mt-5">
              {advancedMode ? (
                <label>
                  <span className={labelClass}>Specifications JSON object</span>
                  <textarea rows={14} spellCheck={false} value={rawSpecs} onChange={(event) => setRawSpecs(event.target.value)} className={`${inputClass} font-mono text-xs leading-relaxed`} placeholder={'{\n  "socket": "AM5",\n  "tdpWatts": 170\n}'} />
                </label>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {CATEGORY_FIELDS[form.category].map((field) => (
                    <label key={field.key}>
                      <span className={labelClass}>{field.label}</span>
                      {field.type === "select" ? (
                        <select
                          value={String(specValues[field.key] ?? "")}
                          onChange={(event) => setSpecValues((current) => ({ ...current, [field.key]: event.target.value }))}
                          className={inputClass}
                        >
                          <option value="">Select…</option>
                          {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      ) : (
                        <input
                          type={field.type || "text"}
                          min={field.type === "number" ? "0" : undefined}
                          step={field.type === "number" ? "any" : undefined}
                          value={String(specValues[field.key] ?? "")}
                          onChange={(event) => setSpecValues((current) => ({ ...current, [field.key]: event.target.value }))}
                          placeholder={field.placeholder}
                          className={inputClass}
                        />
                      )}
                    </label>
                  ))}
                  <label>
                    <span className={labelClass}>Power consumption / TDP (W)</span>
                    <input type="number" min="0" step="any" value={tdp} onChange={(event) => setTdp(event.target.value)} placeholder="170" className={inputClass} />
                  </label>
                </div>
              )}
            </div>
          </section>

          {errorMessage && (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-800 dark:text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {errorMessage}
            </p>
          )}
          {success && (
            <p role="status" className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <Link href="/admin/hardware" className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 transition hover:border-zinc-500">Cancel</Link>
            <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-50">
              {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {componentId ? "Save Changes" : "Add Hardware"}
            </button>
          </div>
        </form>

        <aside className="space-y-4 xl:sticky xl:top-6">
          <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400"><Sparkles className="h-4 w-4" /> Live preview</p>
            <article className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg border border-emerald-400/20 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300"><Cpu className="h-5 w-5" /></span>
                <span className="rounded-full border border-emerald-600/20 dark:border-emerald-400/20 bg-emerald-600/5 dark:bg-emerald-400/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-800 dark:text-cyan-200">{form.category}</span>
              </div>
              <p className="mt-4 text-xs font-medium text-zinc-500">{form.brand || "Brand"}</p>
              <h3 className="mt-1 break-words font-semibold text-zinc-900 dark:text-zinc-100">{form.name || "Hardware component name"}</h3>
              {form.architecture && <p className="mt-1 text-xs text-zinc-500">{form.architecture}</p>}
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-3">
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{idr(Number(form.basePrice))}</span>
                <span className="text-xs text-zinc-500">Stock: {form.stock || "0"}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-zinc-500">{form.condition === "brand_new" ? "Brand New" : form.condition === "refurbished_qc_passed" ? "Refurbished · QC Passed" : "Used"}</span>
                <span className="text-amber-700 dark:text-amber-300">Score {form.performanceScore || "0"}</span>
              </div>
              {Object.keys(visibleSpecs).length > 0 && (
                <dl className="mt-4 space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-3">
                  {Object.entries(visibleSpecs).slice(0, 5).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-3 text-xs">
                      <dt className="capitalize text-zinc-500">{key.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}</dt>
                      <dd className="max-w-[60%] text-right text-zinc-700 dark:text-zinc-300">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </article>
          </section>
          <p className="text-xs leading-relaxed text-zinc-500">
            Public catalog reads are open. Adding, editing, and deleting components is enforced by Supabase RLS and requires an administrator profile.
          </p>
        </aside>
      </div>
    </div>
  );
}
