'use client';

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  LoaderCircle,
  Save,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { formatIdr } from '@/lib/admin/products-validation';
import {
  createHardwareComponent,
  getHardwareComponent,
  HARDWARE_CATEGORIES,
  HARDWARE_CONDITIONS,
  updateHardwareComponent,
} from '@/lib/hardware/components';
import type {
  HardwareCategory,
  HardwareComponent,
  HardwareComponentInput,
  HardwareCondition,
  HardwareSpecs,
} from '@/lib/hardware/components';

interface SpecField {
  readonly key: string;
  readonly label: string;
  readonly placeholder?: string;
  readonly type?: 'number' | 'select';
  readonly options?: readonly string[];
}

const CATEGORY_FIELDS: Readonly<Record<HardwareCategory, readonly SpecField[]>> = {
  cpu: [
    { key: 'socket', label: 'Socket type', placeholder: 'LGA1700, AM5' },
    { key: 'cores', label: 'Cores', type: 'number', placeholder: '8' },
    { key: 'threads', label: 'Threads', type: 'number', placeholder: '16' },
    { key: 'baseClockGHz', label: 'Base clock (GHz)', type: 'number', placeholder: '3.5' },
    { key: 'boostClockGHz', label: 'Boost clock (GHz)', type: 'number', placeholder: '5.2' },
    { key: 'integratedGpu', label: 'Integrated GPU', type: 'select', options: ['Yes', 'No'] },
  ],
  gpu: [
    { key: 'vramGB', label: 'VRAM (GB)', type: 'number', placeholder: '8' },
    { key: 'memoryType', label: 'Memory type', placeholder: 'GDDR6 / GDDR6X' },
    { key: 'busWidthBits', label: 'Bus width (bits)', type: 'number', placeholder: '128' },
    { key: 'recommendedPsuWatts', label: 'Recommended PSU (W)', type: 'number', placeholder: '650' },
  ],
  ram: [
    { key: 'capacityGB', label: 'Capacity (GB)', type: 'number', placeholder: '32' },
    { key: 'speedMTs', label: 'Speed (MT/s)', type: 'number', placeholder: '6000' },
    { key: 'memoryType', label: 'Memory type', type: 'select', options: ['DDR4', 'DDR5', 'LPDDR5'] },
    { key: 'formFactor', label: 'Form factor', type: 'select', options: ['DIMM', 'SO-DIMM'] },
  ],
  storage: [
    { key: 'interface', label: 'Interface', placeholder: 'NVMe PCIe 4.0, SATA' },
    { key: 'capacityGB', label: 'Capacity (GB)', type: 'number', placeholder: '2000' },
    { key: 'readSpeedMBs', label: 'Read speed (MB/s)', type: 'number', placeholder: '7000' },
    { key: 'writeSpeedMBs', label: 'Write speed (MB/s)', type: 'number', placeholder: '6500' },
  ],
  motherboard: [
    { key: 'socket', label: 'CPU socket', placeholder: 'AM5, LGA1700' },
    { key: 'chipset', label: 'Chipset', placeholder: 'B650, Z790' },
    { key: 'formFactor', label: 'Form factor', placeholder: 'ATX, Micro-ATX, ITX' },
    { key: 'memoryType', label: 'Memory type', placeholder: 'DDR5' },
  ],
  psu: [
    { key: 'wattage', label: 'Wattage (W)', type: 'number', placeholder: '750' },
    { key: 'efficiencyRating', label: 'Efficiency rating', placeholder: '80 Plus Gold' },
    {
      key: 'modular',
      label: 'Modular cabling',
      type: 'select',
      options: ['Fully modular', 'Semi-modular', 'Non-modular'],
    },
    { key: 'formFactor', label: 'Form factor', placeholder: 'ATX, SFX' },
  ],
  case: [
    { key: 'formFactor', label: 'Form factor', placeholder: 'ATX Mid Tower, Mini-ITX' },
    { key: 'maxGpuLengthMM', label: 'Max GPU length (mm)', type: 'number', placeholder: '360' },
    { key: 'includedFans', label: 'Included fans', type: 'number', placeholder: '3' },
    { key: 'color', label: 'Color', placeholder: 'Black' },
  ],
  cooling: [
    { key: 'coolerType', label: 'Cooling type', type: 'select', options: ['Air', 'AIO liquid', 'Custom loop'] },
    { key: 'radiatorSizeMM', label: 'Radiator size (mm)', type: 'number', placeholder: '360' },
    { key: 'socketCompatibility', label: 'Socket compatibility', placeholder: 'AM5, LGA1700' },
    { key: 'noiseLevelDBA', label: 'Noise level (dBA)', type: 'number', placeholder: '28' },
  ],
};

const BRANDS = [
  'AMD',
  'ASUS',
  'Cooler Master',
  'Corsair',
  'Crucial',
  'Dell',
  'Gigabyte',
  'Intel',
  'Kingston',
  'MSI',
  'NVIDIA',
  'Samsung',
  'Seagate',
  'Western Digital',
] as const;

const inputClass =
  'min-h-11 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary outline-none transition placeholder:text-secondary/65 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20';
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeSpecs(specs: HardwareSpecs): Record<string, string | boolean> {
  return Object.fromEntries(
    Object.entries(specs).map(([key, value]) => [
      key,
      typeof value === 'boolean' ? value : String(value ?? ''),
    ]),
  );
}

function specsFromFields(
  category: HardwareCategory,
  values: Record<string, string | boolean>,
  tdp: string,
): HardwareSpecs {
  const result: HardwareSpecs = {};
  for (const field of CATEGORY_FIELDS[category]) {
    const value = values[field.key];
    if (value === undefined || value === '') continue;
    if (field.type === 'number') {
      const number = Number(value);
      if (Number.isFinite(number)) result[field.key] = number;
    } else if (field.key === 'integratedGpu') {
      result[field.key] = value === 'Yes' || value === true;
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

export default function HardwareEditor({ componentId }: { readonly componentId?: string }): ReactElement {
  const [form, setForm] = useState({
    name: '',
    brand: '',
    category: 'cpu' as HardwareCategory,
    architecture: '',
    basePrice: '0',
    stock: '0',
    condition: 'brand_new' as HardwareCondition,
    performanceScore: '0',
    isActive: true,
  });
  const [specValues, setSpecValues] = useState<Record<string, string | boolean>>({});
  const [tdp, setTdp] = useState('');
  const [rawSpecs, setRawSpecs] = useState('{}');
  const [advancedMode, setAdvancedMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(componentId));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!componentId) return undefined;
    let active = true;
    getHardwareComponent(componentId)
      .then((component: HardwareComponent) => {
        if (!active) return;
        setForm({
          name: component.name,
          brand: component.brand,
          category: component.category,
          architecture: component.architecture || '',
          basePrice: String(component.base_price),
          stock: String(component.stock_quantity),
          condition: component.condition,
          performanceScore: String(component.performance_score),
          isActive: component.is_active,
        });
        setSpecValues(normalizeSpecs(component.specs || {}));
        setTdp(component.specs?.tdpWatts === undefined ? '' : String(component.specs.tdpWatts));
        setRawSpecs(JSON.stringify(component.specs || {}, null, 2));
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Gagal memuat detail komponen hardware.',
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [componentId]);

  const currentSpecs = useMemo(
    () => specsFromFields(form.category, specValues, tdp),
    [form.category, specValues, tdp],
  );

  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleCategoryChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const val = event.target.value;
    if ((HARDWARE_CATEGORIES as readonly string[]).includes(val)) {
      updateForm('category', val as HardwareCategory);
      setSpecValues({});
      setTdp('');
    }
  };

  const toggleAdvanced = () => {
    setErrorMessage('');
    if (!advancedMode) {
      setRawSpecs(JSON.stringify(currentSpecs, null, 2));
      setAdvancedMode(true);
      return;
    }
    try {
      const parsed: unknown = JSON.parse(rawSpecs);
      if (!isRecord(parsed)) throw new Error('Spesifikasi harus berupa objek JSON.');
      setSpecValues(normalizeSpecs(parsed));
      setTdp(parsed.tdpWatts === undefined ? '' : String(parsed.tdpWatts));
      setAdvancedMode(false);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Perbaiki format JSON sebelum beralih mode.',
      );
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccess('');

    const basePrice = Number(form.basePrice);
    const stock = Number(form.stock);
    const performanceScore = Number(form.performanceScore);
    if (!form.name.trim() || !form.brand.trim()) {
      setErrorMessage('Nama komponen dan brand wajib diisi.');
      return;
    }
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      setErrorMessage('Masukkan harga valid dalam IDR.');
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      setErrorMessage('Jumlah stok harus berupa bilangan bulat non-negatif.');
      return;
    }
    if (!Number.isInteger(performanceScore) || performanceScore < 0 || performanceScore > 10000) {
      setErrorMessage('Skor performa harus berupa angka bulat antara 0 hingga 10.000.');
      return;
    }
    if (!advancedMode && tdp.trim() && (!Number.isFinite(Number(tdp)) || Number(tdp) < 0)) {
      setErrorMessage('Konsumsi daya / TDP harus berupa angka non-negatif.');
      return;
    }

    let specs: HardwareSpecs;
    if (advancedMode) {
      try {
        const parsed: unknown = JSON.parse(rawSpecs);
        if (!isRecord(parsed)) throw new Error('Spesifikasi harus berupa objek JSON.');
        specs = parsed;
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error ? `JSON spesifikasi tidak valid: ${error.message}` : 'JSON spesifikasi tidak valid.',
        );
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
        setSuccess('Komponen hardware berhasil diperbarui.');
      } else {
        await createHardwareComponent(payload);
        setSuccess('Komponen hardware baru berhasil ditambahkan.');
        setForm((current) => ({ ...current, name: '' }));
      }
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Gagal menyimpan komponen hardware.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <p role="status" className="flex items-center gap-2 py-12 text-sm text-secondary">
        <LoaderCircle className="h-4 w-4 animate-spin text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
        <span>Memuat detail hardware…</span>
      </p>
    );
  }

  const visibleSpecs = advancedMode
    ? (() => {
        try {
          const parsed: unknown = JSON.parse(rawSpecs);
          return isRecord(parsed) ? parsed : {};
        } catch {
          return {};
        }
      })()
    : currentSpecs;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/hardware"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-secondary transition hover:text-accent-hover"
          >
            <ArrowLeft className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Kembali ke Hardware Inventory</span>
          </Link>
          <h1 className="mt-1 font-sans text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            {componentId ? 'Edit Komponen Hardware' : 'Tambah Hardware Baru'}
          </h1>
          <p className="mt-1 text-sm text-secondary">
            Daftarkan spesifikasi, harga pasar, dan stok komponen untuk ekosistem ViciTech Builder.
          </p>
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
        <form onSubmit={(e) => void submit(e)} className="space-y-5">
          <section className="rounded-xl border border-default bg-surface p-5 shadow-sm">
            <h2 className="tracking-tight flex items-center gap-2 font-sans text-lg font-bold text-primary">
              <Cpu className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
              <span>Informasi Umum</span>
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className={labelClass}>Nama Lengkap Komponen</span>
                <input
                  required
                  maxLength={160}
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  placeholder="Intel Core i5-1334U"
                  className={inputClass}
                />
              </label>

              <label>
                <span className={labelClass}>Brand</span>
                <input
                  required
                  list="hardware-brand-options"
                  maxLength={80}
                  value={form.brand}
                  onChange={(event) => updateForm('brand', event.target.value)}
                  placeholder="Pilih atau ketik brand"
                  className={inputClass}
                />
                <datalist id="hardware-brand-options">
                  {BRANDS.map((brand) => (
                    <option value={brand} key={brand} />
                  ))}
                </datalist>
              </label>

              <label>
                <span className={labelClass}>Kategori</span>
                <select value={form.category} onChange={handleCategoryChange} className={inputClass}>
                  {HARDWARE_CATEGORIES.map((category) => (
                    <option value={category} key={category}>
                      {category.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className={labelClass}>Arsitektur (Opsional)</span>
                <input
                  maxLength={100}
                  value={form.architecture}
                  onChange={(event) => updateForm('architecture', event.target.value)}
                  placeholder="Raptor Lake, Ada Lovelace, Zen 4"
                  className={inputClass}
                />
              </label>

              <label>
                <span className={labelClass}>Harga Dasar (IDR)</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={form.basePrice}
                  onChange={(event) => updateForm('basePrice', event.target.value)}
                  className={`${inputClass} font-mono tabular-nums`}
                />
              </label>

              <label>
                <span className={labelClass}>Stok Unit</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={form.stock}
                  onChange={(event) => updateForm('stock', event.target.value)}
                  className={`${inputClass} font-mono tabular-nums`}
                />
              </label>

              <label>
                <span className={labelClass}>Kondisi</span>
                <select
                  value={form.condition}
                  onChange={(event) => {
                    const val = event.target.value;
                    if ((HARDWARE_CONDITIONS as readonly string[]).includes(val)) {
                      updateForm('condition', val as HardwareCondition);
                    }
                  }}
                  className={inputClass}
                >
                  {HARDWARE_CONDITIONS.map((condition) => (
                    <option value={condition} key={condition}>
                      {condition === 'brand_new'
                        ? 'Brand New'
                        : condition === 'refurbished_qc_passed'
                          ? 'Refurbished (QC Passed)'
                          : 'Used'}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className={labelClass}>Skor Benchmark (0–10.000)</span>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  step={1}
                  required
                  value={form.performanceScore}
                  onChange={(event) => updateForm('performanceScore', event.target.value)}
                  className={`${inputClass} font-mono tabular-nums`}
                />
              </label>

              <label className="flex min-h-11 cursor-pointer items-center gap-3 self-end rounded-lg border border-default bg-canvas px-3.5 py-2.5 text-sm font-medium text-primary">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => updateForm('isActive', event.target.checked)}
                  className="h-4 w-4 accent-[#EA580C]"
                />
                <span>Aktif dan tampil di PC Builder</span>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-default bg-surface p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="tracking-tight font-sans text-lg font-bold text-primary">
                  Performa &amp; Spesifikasi Teknis
                </h2>
                <p className="mt-1 text-xs text-secondary">
                  Spesifikasi tersimpan sebagai JSONB untuk perhitungan bottleneck &amp; kompatibilitas socket.
                </p>
              </div>
              <button
                type="button"
                onClick={toggleAdvanced}
                className="inline-flex min-h-11 items-center rounded-lg border border-default bg-canvas px-3.5 py-2 text-xs font-semibold text-primary transition hover:border-accent-primary/45 hover:bg-accent-subtle"
              >
                {advancedMode ? 'Gunakan Field Terpandu' : 'Mode JSON Mentah'}
              </button>
            </div>

            <div className="mt-5">
              {advancedMode ? (
                <label>
                  <span className={labelClass}>Objek JSON Spesifikasi</span>
                  <textarea
                    rows={12}
                    spellCheck={false}
                    value={rawSpecs}
                    onChange={(event) => setRawSpecs(event.target.value)}
                    className="w-full rounded-lg border border-default bg-canvas p-3 font-mono text-xs leading-relaxed text-primary outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                    placeholder={'{\n  "socket": "AM5",\n  "tdpWatts": 170\n}'}
                  />
                </label>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {CATEGORY_FIELDS[form.category].map((field) => (
                    <label key={field.key}>
                      <span className={labelClass}>{field.label}</span>
                      {field.type === 'select' ? (
                        <select
                          value={String(specValues[field.key] ?? '')}
                          onChange={(event) =>
                            setSpecValues((current) => ({
                              ...current,
                              [field.key]: event.target.value,
                            }))
                          }
                          className={inputClass}
                        >
                          <option value="">Pilih…</option>
                          {field.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type || 'text'}
                          min={field.type === 'number' ? '0' : undefined}
                          step={field.type === 'number' ? 'any' : undefined}
                          value={String(specValues[field.key] ?? '')}
                          onChange={(event) =>
                            setSpecValues((current) => ({
                              ...current,
                              [field.key]: event.target.value,
                            }))
                          }
                          placeholder={field.placeholder}
                          className={inputClass}
                        />
                      )}
                    </label>
                  ))}
                  <label>
                    <span className={labelClass}>Konsumsi Daya / TDP (W)</span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={tdp}
                      onChange={(event) => setTdp(event.target.value)}
                      placeholder="170"
                      className={`${inputClass} font-mono tabular-nums`}
                    />
                  </label>
                </div>
              )}
            </div>
          </section>

          {errorMessage ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-status-danger/30 bg-red-50 p-3.5 text-sm text-status-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span>{errorMessage}</span>
            </p>
          ) : null}

          {success ? (
            <p
              role="status"
              className="flex items-center gap-2 rounded-xl border border-default bg-surface p-3.5 text-sm text-primary shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-status-live" strokeWidth={1.75} aria-hidden="true" />
              <span>{success}</span>
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href="/admin/hardware"
              className="inline-flex min-h-11 items-center rounded-lg border border-default bg-surface px-4 py-2 text-sm font-medium text-primary transition hover:bg-subtle"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-cta-hover disabled:cursor-wait disabled:opacity-55"
            >
              {isSaving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              )}
              <span>{componentId ? 'Simpan Perubahan' : 'Tambah Hardware'}</span>
            </button>
          </div>
        </form>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <section className="rounded-xl border border-default bg-surface p-5 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-primary">
              <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Live Preview Kartu</span>
            </p>
            <article className="mt-4 rounded-xl border border-default bg-canvas p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg border border-default bg-surface text-accent-primary">
                  <Cpu className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="rounded-md border border-accent-primary/25 bg-accent-subtle px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent-hover">
                  {form.category}
                </span>
              </div>
              <p className="mt-4 text-xs font-medium text-secondary">{form.brand || 'Brand'}</p>
              <h3 className="tracking-tight mt-1 break-words font-bold text-primary">
                {form.name || 'Nama komponen hardware'}
              </h3>
              {form.architecture ? (
                <p className="mt-1 text-xs text-secondary">{form.architecture}</p>
              ) : null}
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-default pt-3">
                <span className="font-mono text-sm font-semibold tabular-nums text-primary">
                  {formatIdr(Number(form.basePrice))}
                </span>
                <span className="font-mono text-xs text-secondary">Stok: {form.stock || '0'}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-secondary">
                  {form.condition === 'brand_new'
                    ? 'Brand New'
                    : form.condition === 'refurbished_qc_passed'
                      ? 'Refurbished · QC Passed'
                      : 'Used'}
                </span>
                <span className="font-mono font-semibold text-accent-hover">
                  Skor {form.performanceScore || '0'}
                </span>
              </div>
              {Object.keys(visibleSpecs).length > 0 ? (
                <dl className="mt-4 space-y-2 border-t border-default pt-3">
                  {Object.entries(visibleSpecs)
                    .slice(0, 5)
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-3 text-xs">
                        <dt className="capitalize text-secondary">
                          {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                        </dt>
                        <dd className="max-w-[60%] text-right font-mono text-primary">
                          {String(value)}
                        </dd>
                      </div>
                    ))}
                </dl>
              ) : null}
            </article>
          </section>

          <p className="text-xs leading-relaxed text-secondary">
            Pembacaan katalog bersifat publik. Penambahan, perubahan, dan penghapusan komponen divalidasi oleh RLS Supabase khusus akun admin.
          </p>
        </aside>
      </div>
    </div>
  );
}
