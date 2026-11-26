import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building,
  CheckCircle2,
  DollarSign,
  FileSpreadsheet,
  GraduationCap,
  Leaf,
  Recycle,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  User,
} from "lucide-react";

/* ───────────────────────── Model Trade-In (tarif referensi, IDR) ───────────────────────── */

const ENTITIES = [
  {
    id: "Individu",
    segment: "B2C",
    icon: User,
    hint: "Tukar tambah satuan untuk upgrade laptop, PC, atau monitor pribadi.",
  },
  {
    id: "Sekolah / Lab CBT",
    segment: "B2S",
    icon: GraduationCap,
    hint: "Peremajaan armada lab sekolah dengan bonus jumlah besar hingga +10%.",
  },
  {
    id: "Kantor / Korporasi",
    segment: "B2B",
    icon: Building,
    hint: "Buyback aset IT perusahaan lengkap dengan sanitasi data NIST SP 800-88.",
  },
];

// base = estimasi nilai beli kembali per unit, kg = perkiraan bobot limbah elektronik per unit
const EQUIPMENT = {
  Laptop: { base: 2400000, kg: 2 },
  "PC Desktop": { base: 1500000, kg: 7 },
  Monitor: { base: 450000, kg: 5 },
  "Server / Jaringan": { base: 4000000, kg: 15 },
};

const CONDITIONS = {
  "Berfungsi Normal": { mult: 1, hint: "Menyala dan seluruh fitur berfungsi normal" },
  "Cacat Ringan": { mult: 0.6, hint: "Berfungsi, dengan lecet fisik atau kendala minor" },
  "Rusak / Suku Cadang": { mult: 0.15, hint: "Mati total, dinilai untuk komponen dan daur ulang" },
};

const STEPS = [
  { id: 1, title: "Segmen Pengaju", sub: "B2C, B2S, atau B2B" },
  { id: 2, title: "Detail & Kondisi", sub: "Jenis, jumlah & kondisi" },
  { id: 3, title: "Estimasi & Ajukan", sub: "Valuasi & langkah lanjut" },
];

const BULK = [{ min: 10, pct: 3 }, { min: 50, pct: 6 }, { min: 200, pct: 10 }]; // khusus kantor dan sekolah
const MAX_QTY = 5000;

function estimate({ entity, equipment, condition, qty }) {
  const bonus = entity === "Individu" ? 0 : [...BULK].reverse().find((t) => qty >= t.min)?.pct ?? 0;
  const equipMeta = EQUIPMENT[equipment] || EQUIPMENT.Laptop;
  const condMeta = CONDITIONS[condition] || CONDITIONS["Berfungsi Normal"];
  const mid = equipMeta.base * condMeta.mult * (1 + bonus / 100);
  const lowUnit = roundTo(mid * 0.85);
  const highUnit = roundTo(mid * 1.15);
  return { bonus, lowUnit, highUnit, low: lowUnit * qty, high: highUnit * qty, kg: Math.round(equipMeta.kg * qty * 10) / 10 };
}

/* ───────────────────────── Helpers ───────────────────────── */

const idr = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const num = (n) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n);
const roundTo = (n, step = 10000) => Math.round(n / step) * step;
const clampQty = (v) => Math.min(MAX_QTY, Math.max(1, parseInt(v, 10) || 1));
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

/* ───────────────────────── UI pieces ───────────────────────── */

function Choice({ active, onClick, icon: Icon, badge, title, hint }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`vt-motion-press flex min-h-11 flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors ${focusRing} ${
        active
          ? "border-accent-primary bg-accent-subtle shadow-sm"
          : "border-default bg-canvas hover:border-accent-primary/40 hover:bg-subtle/60"
      }`}
    >
      <div className="flex w-full items-center justify-between gap-2">
        {Icon ? (
          <span
            className={`grid h-9 w-9 place-items-center rounded-lg ${
              active ? "bg-accent-primary text-white" : "border border-default bg-surface text-secondary"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </span>
        ) : null}
        {badge ? (
          <span
            className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold ${
              active ? "bg-accent-primary text-white" : "border border-default bg-surface text-secondary"
            }`}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <div>
        <span className={`block text-sm font-bold ${active ? "text-accent-cta" : "text-primary"}`}>{title}</span>
        {hint && <span className="mt-1 block text-xs leading-relaxed text-secondary">{hint}</span>}
      </div>
    </button>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function CircularPortal() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ entity: "Sekolah / Lab CBT", equipment: "Laptop", condition: "Berfungsi Normal", qty: "25" });
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [submittedRef, setSubmittedRef] = useState("");

  const qty = clampQty(form.qty);
  const est = useMemo(() => estimate({ ...form, qty }), [form.entity, form.equipment, form.condition, qty]); // eslint-disable-line react-hooks/exhaustive-deps
  const nextBulk = form.entity !== "Individu" ? BULK.find((t) => qty < t.min) : null;
  const activeEntityMeta = ENTITIES.find((item) => item.id === form.entity) || ENTITIES[1];

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSubmittedRef("");
  };

  const submit = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setEmailError(true);
    setEmailError(false);
    setSubmittedRef(`VT-TI-${Date.now().toString(36).toUpperCase().slice(-6)}`);
  };

  const downloadTemplate = () => {
    const csv = `Jenis Perangkat,Merek dan Model,Nomor Seri,Kondisi,Jumlah\r\n"${form.equipment}",,,"${form.condition}",${qty}\r\n`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "template-daftar-aset-vicitech.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-w-0 bg-canvas text-primary antialiased">
      <div className="mx-auto max-w-7xl px-3 pb-24 pt-5 sm:px-6 sm:pb-28 sm:pt-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="vt-badge-sample">Tarif Referensi</span>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-cta">
            Perpanjang Siklus Pakai Perangkat Keras
          </span>
        </div>
        <h1 className="mt-2.5 flex items-center gap-2 font-sans text-2xl font-bold tracking-tight text-primary sm:mt-3 sm:gap-3 sm:text-5xl">
          <Recycle className="h-6 w-6 shrink-0 text-accent-primary sm:h-8 sm:w-8" strokeWidth={1.75} aria-hidden="true" />
          <span>Portal Trade-In &amp; Buyback Sirkular</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-secondary sm:mt-3 sm:text-base">
          Simulasikan estimasi nilai beli kembali (buyback) atau tukar tambah perangkat keras lama Anda dalam 3 langkah ringkas untuk pengajuan individu, sekolah, maupun perusahaan.
        </p>

        {/* Visual 3-Step Progress Stepper */}
        <nav aria-label="Langkah simulasi trade-in" className="mt-6 sm:mt-8">
          <ol className="grid gap-2.5 sm:grid-cols-3 sm:gap-4">
            {STEPS.map((item) => {
              const isCurrent = step === item.id;
              const isCompleted = step > item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setStep(item.id)}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`vt-motion-press flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${focusRing} ${
                      isCurrent
                        ? "border-accent-primary bg-surface shadow-sm ring-1 ring-accent-primary/20"
                        : isCompleted
                          ? "border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50"
                          : "border-default bg-surface/75 hover:bg-surface"
                    }`}
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-mono text-xs font-bold ${
                        isCurrent
                          ? "bg-accent-primary text-white"
                          : isCompleted
                            ? "bg-emerald-600 text-white"
                            : "border border-default bg-canvas text-secondary"
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : item.id}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-bold ${isCurrent ? "text-accent-cta" : "text-primary"}`}>
                        {item.title}
                      </span>
                      <span className="block truncate text-xs text-secondary">{item.sub}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Guided Multi-Step Container + Sticky Live Summary */}
        <section className="mt-6 grid gap-6 lg:grid-cols-12" aria-labelledby="buyback-title">
          <div className="rounded-2xl border border-default bg-surface p-5 shadow-sm sm:p-7 lg:col-span-8">
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <p className="font-mono text-xs font-bold uppercase tracking-wider text-accent-cta">
                    Langkah 1 dari 3
                  </p>
                  <h2 id="buyback-title" className="mt-1 font-sans text-xl font-bold tracking-tight text-primary sm:text-2xl">
                    Pilih Segmen Pengaju Trade-In
                  </h2>
                  <p className="mt-1 text-sm text-secondary">
                    Skema bonus grosir dan dukungan sanitasi data disesuaikan dengan kebutuhan pengajuan Anda.
                  </p>
                </div>

                <fieldset>
                  <legend className="sr-only">Tipe pengaju</legend>
                  <div role="radiogroup" aria-label="Tipe pengaju" className="grid gap-3 sm:grid-cols-3">
                    {ENTITIES.map((e) => (
                      <Choice
                        key={e.id}
                        active={form.entity === e.id}
                        icon={e.icon}
                        badge={e.segment}
                        title={e.id}
                        hint={e.hint}
                        onClick={() => set("entity")(e.id)}
                      />
                    ))}
                  </div>
                </fieldset>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4">
                  <p className="text-xs text-secondary">
                    Segmen terpilih: <strong className="text-primary">{activeEntityMeta.segment} · {form.entity}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className={`vt-motion-press vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent-cta px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-cta-hover ${focusRing}`}
                  >
                    <span>Lanjut ke Detail Perangkat</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <p className="font-mono text-xs font-bold uppercase tracking-wider text-accent-cta">
                    Langkah 2 dari 3
                  </p>
                  <h2 id="buyback-title" className="mt-1 font-sans text-xl font-bold tracking-tight text-primary sm:text-2xl">
                    Detail &amp; Kondisi Perangkat
                  </h2>
                  <p className="mt-1 text-sm text-secondary">
                    Tentukan jenis perangkat, jumlah unit, dan kondisi fisik/fungsi saat ini.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="equipment" className="mb-2 block text-sm font-semibold text-primary">
                      Jenis Perangkat
                    </label>
                    <select
                      id="equipment"
                      value={form.equipment}
                      onChange={(e) => set("equipment")(e.target.value)}
                      className={`vt-form-control min-h-11 w-full rounded-xl border border-default bg-canvas px-3.5 py-2.5 text-sm text-primary ${focusRing}`}
                    >
                      {Object.keys(EQUIPMENT).map((k) => (
                        <option key={k}>{k}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="qty" className="mb-2 block text-sm font-semibold text-primary">
                      Jumlah Unit
                    </label>
                    <input
                      id="qty"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_QTY}
                      value={form.qty}
                      onChange={(e) => set("qty")(e.target.value)}
                      onBlur={() => set("qty")(String(qty))}
                      className={`vt-form-control min-h-11 w-full rounded-xl border border-default bg-canvas px-3.5 py-2.5 font-mono text-sm tabular-nums text-primary ${focusRing}`}
                    />
                  </div>
                </div>

                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-primary">Perkiraan Kondisi Unit</legend>
                  <div role="radiogroup" aria-label="Perkiraan kondisi unit" className="grid gap-3 sm:grid-cols-3">
                    {Object.entries(CONDITIONS).map(([k, c]) => (
                      <Choice
                        key={k}
                        active={form.condition === k}
                        title={k}
                        hint={c.hint}
                        onClick={() => set("condition")(k)}
                      />
                    ))}
                  </div>
                </fieldset>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-default bg-canvas px-4 py-2 text-sm font-medium text-primary hover:bg-subtle ${focusRing}`}
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      <span>Kembali</span>
                    </button>
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-default bg-canvas px-4 py-2 text-xs font-medium text-primary hover:bg-subtle sm:text-sm ${focusRing}`}
                    >
                      <FileSpreadsheet className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                      <span>Template Aset (CSV)</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className={`vt-motion-press vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent-cta px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-cta-hover ${focusRing}`}
                  >
                    <DollarSign className="h-4 w-4" aria-hidden="true" />
                    <span>Lihat Estimasi Nilai</span>
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5" aria-live="polite">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-bold uppercase tracking-wider text-accent-cta">
                      Langkah 3 dari 3
                    </p>
                    <h2 id="buyback-title" className="mt-1 font-sans text-xl font-bold tracking-tight text-primary sm:text-2xl">
                      Estimasi Nilai &amp; Langkah Selanjutnya
                    </h2>
                  </div>
                  <span className="vt-badge-sample">Estimasi Tarif Referensi</span>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
                    Perkiraan Total Valuasi ({qty} unit {form.equipment})
                  </p>
                  <p className="mt-1.5 font-mono text-2xl font-extrabold tabular-nums text-emerald-800 sm:text-3xl">
                    {idr(est.low)} – {idr(est.high)}
                  </p>
                  <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                    <div className="rounded-xl border border-emerald-200/80 bg-white p-3">
                      <p className="text-[11px] text-secondary">Nilai per unit</p>
                      <p className="mt-0.5 font-mono text-xs font-bold tabular-nums text-primary">
                        {idr(est.lowUnit)} – {idr(est.highUnit)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-200/80 bg-white p-3">
                      <p className="text-[11px] text-secondary">Bonus jumlah besar</p>
                      <p className="mt-0.5 font-mono text-xs font-bold tabular-nums text-primary">
                        {est.bonus ? `+${est.bonus}% (${activeEntityMeta.segment})` : "Tidak ada"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-200/80 bg-white p-3">
                      <p className="flex items-center gap-1 text-[11px] text-secondary">
                        <Leaf className="h-3 w-3 text-emerald-700" aria-hidden="true" />
                        E-waste tercegah
                      </p>
                      <p className="mt-0.5 font-mono text-xs font-bold tabular-nums text-emerald-800">
                        {num(est.kg)} kg
                      </p>
                    </div>
                  </div>
                </div>

                {nextBulk && (
                  <p className="text-xs text-secondary">
                    Tips: Tambah <strong className="text-primary">{nextBulk.min - qty} unit</strong> lagi untuk mendapatkan bonus grosir +{nextBulk.pct}%.
                  </p>
                )}

                <p className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                  <span>
                    Tarif bersifat estimasi referensi. Nilai final dikonfirmasi setelah inspeksi fisik di Hub ViciTech atau mitra terdekat, lengkap dengan sanitasi data NIST SP 800-88.
                  </span>
                </p>

                {submittedRef ? (
                  <div role="status" className="vt-pop flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                    <div>
                      <p className="font-bold">Pengajuan {submittedRef} berhasil dicatat!</p>
                      <p className="mt-0.5 text-xs leading-relaxed">
                        Ringkasan penawaran resmi dan jadwal inspeksi akan dikirimkan ke <strong>{email.trim()}</strong>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-default bg-canvas p-4">
                    <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-primary">
                      Kirim Pengajuan Valuasi Resmi via Email
                    </label>
                    <p className="mb-3 text-xs text-secondary">
                      Tim ViciTech akan menghubungi Anda dengan jadwal pengecekan fisik dan opsi kredit tukar tambah.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setEmailError(false);
                        }}
                        aria-invalid={emailError}
                        placeholder="nama@instansi.id"
                        className={`vt-form-control min-h-11 min-w-0 flex-1 rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-primary placeholder:text-secondary ${focusRing} ${
                          emailError ? "border-status-danger" : "border-default"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={submit}
                        className={`vt-motion-press min-h-11 shrink-0 rounded-xl bg-accent-cta px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-cta-hover ${focusRing}`}
                      >
                        Ajukan Valuasi
                      </button>
                    </div>
                    {emailError && (
                      <p className="mt-1.5 text-xs text-status-danger">
                        Masukkan alamat email yang valid untuk menerima penawaran resmi.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-default pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-default bg-canvas px-4 py-2 text-sm font-medium text-primary hover:bg-subtle ${focusRing}`}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    <span>Ubah Detail Perangkat</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-default bg-canvas px-4 py-2 text-xs font-medium text-primary hover:bg-subtle sm:text-sm ${focusRing}`}
                  >
                    <FileSpreadsheet className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                    <span>Unduh Template CSV</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Live Summary Sidebar */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:col-span-4 lg:self-start" aria-label="Ringkasan konfigurasi trade-in">
            <div className="rounded-2xl border border-default bg-surface p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-accent-cta">
                Ringkasan Pengajuan
              </p>
              <dl className="mt-3 divide-y divide-default text-sm">
                <div className="flex justify-between gap-3 py-2.5">
                  <dt className="text-secondary">Segmen</dt>
                  <dd className="text-right font-semibold text-primary">
                    {activeEntityMeta.segment} · {form.entity}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 py-2.5">
                  <dt className="text-secondary">Perangkat</dt>
                  <dd className="text-right font-semibold text-primary">{form.equipment}</dd>
                </div>
                <div className="flex justify-between gap-3 py-2.5">
                  <dt className="text-secondary">Jumlah</dt>
                  <dd className="text-right font-mono font-semibold tabular-nums text-primary">{qty} unit</dd>
                </div>
                <div className="flex justify-between gap-3 py-2.5">
                  <dt className="text-secondary">Kondisi</dt>
                  <dd className="text-right font-semibold text-primary">{form.condition}</dd>
                </div>
                <div className="flex justify-between gap-3 pt-3">
                  <dt className="text-secondary">Estimasi Cepat</dt>
                  <dd className="text-right font-mono text-sm font-bold tabular-nums text-emerald-800">
                    {idr(est.low)} – {idr(est.high)}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-default bg-canvas px-3 py-2.5 text-xs text-secondary">
                <Leaf className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                <span>
                  Dampak sirkular: mencegah <strong className="font-mono text-primary">{num(est.kg)} kg</strong> e-waste.
                </span>
              </div>
            </div>
          </aside>
        </section>

        {/* Banner CTA tunggal ke Etalase Market */}
        <section className="mt-8 sm:mt-12" aria-labelledby="market-refurb-cta-title">
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-default bg-surface p-5 shadow-sm sm:gap-6 sm:p-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="vt-badge-simulated">
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  <span>Standar 15 Titik IoT QC (Simulated / Demo)</span>
                </span>
                <span className="rounded-md border border-default bg-canvas px-2.5 py-0.5 text-xs font-medium text-secondary">
                  Garansi 12 Bulan ViciCare
                </span>
              </div>
              <h2
                id="market-refurb-cta-title"
                className="font-sans text-2xl font-bold tracking-tight text-primary sm:text-3xl"
              >
                Cari unit refurbished &amp; rakitan terkurasi?
              </h2>
              <p className="text-sm leading-relaxed text-secondary">
                Seluruh unit Grade A+ dan Recertified Enterprise yang siap kirim terpusat di Etalase Market resmi ViciTech—lengkap dengan foto fisik, status stok, dan detail spesifikasi transparan.
              </p>
            </div>

            <div className="shrink-0">
              <Link
                href="/market"
                className={`vt-motion-press vt-btn-tactile inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-cta px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-cta-hover ${focusRing}`}
              >
                <ShoppingBag className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <span>Lihat di Etalase Market →</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
