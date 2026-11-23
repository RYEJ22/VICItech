import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Recycle, Building, GraduationCap, CheckCircle2, DollarSign, Leaf, ShieldAlert, FileSpreadsheet,
  User, ShieldCheck, ShoppingBag,
} from "lucide-react";

/* ───────────────────────── Model Trade-In (tarif referensi, IDR) ───────────────────────── */

const ENTITIES = [
  { id: "Kantor / Korporasi", icon: Building },
  { id: "Sekolah / Lab CBT", icon: GraduationCap },
  { id: "Individu", icon: User },
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

function Choice({ active, onClick, icon: Icon, title, hint }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`flex min-h-11 items-start gap-3 rounded-lg border p-3 text-left transition-colors ${focusRing} ${
        active ? "border-accent-primary bg-accent-subtle" : "border-default bg-surface hover:bg-subtle"
      }`}
    >
      {Icon && <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-accent-primary" : "text-secondary"}`} strokeWidth={1.75} aria-hidden="true" />}
      <span>
        <span className={`block text-sm font-medium ${active ? "text-accent-cta" : "text-primary"}`}>{title}</span>
        {hint && <span className="mt-0.5 block text-xs text-secondary">{hint}</span>}
      </span>
    </button>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function CircularPortal() {
  const [form, setForm] = useState({ entity: "Sekolah / Lab CBT", equipment: "Laptop", condition: "Berfungsi Normal", qty: "25" });
  const [revealed, setRevealed] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [submittedRef, setSubmittedRef] = useState("");

  const qty = clampQty(form.qty);
  const est = useMemo(() => estimate({ ...form, qty }), [form.entity, form.equipment, form.condition, qty]); // eslint-disable-line react-hooks/exhaustive-deps
  const nextBulk = form.entity !== "Individu" ? BULK.find((t) => qty < t.min) : null;

  const set = (key) => (value) => { setForm((f) => ({ ...f, [key]: value })); setSubmittedRef(""); };

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
    <div className="bg-canvas text-primary antialiased">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="vt-badge-sample">Tarif Referensi</span>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-cta">
            Perpanjang Siklus Pakai Perangkat Keras
          </span>
        </div>
        <h1 className="mt-3 flex items-center gap-3 font-serif text-3xl font-semibold tracking-tight text-primary sm:text-5xl">
          <Recycle className="h-8 w-8 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
          <span>Portal Trade-In &amp; Buyback Sirkular</span>
        </h1>
        <p className="mt-3 max-w-2xl text-secondary">
          Simulasikan estimasi nilai beli kembali (buyback) atau tukar tambah perangkat keras lama Anda secara transparan, baik untuk pengajuan individu, sekolah, maupun peremajaan armada IT kantor.
        </p>

        {/* Form Trade-in */}
        <section className="mt-10" aria-labelledby="buyback-title">
          <h2 id="buyback-title" className="flex items-center gap-2 font-serif text-2xl font-semibold text-primary">
            <DollarSign className="h-5 w-5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Simulasi Valuasi &amp; Buyback Aset</span>
          </h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-5">
            <div className="space-y-5 rounded-xl border border-default bg-surface p-6 shadow-sm lg:col-span-3">
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-primary">Tipe Pengaju</legend>
                <div role="radiogroup" aria-label="Tipe pengaju" className="grid gap-2 sm:grid-cols-3">
                  {ENTITIES.map((e) => <Choice key={e.id} active={form.entity === e.id} icon={e.icon} title={e.id} onClick={() => set("entity")(e.id)} />)}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="equipment" className="mb-2 block text-sm font-medium text-primary">Jenis Perangkat</label>
                  <select id="equipment" value={form.equipment} onChange={(e) => set("equipment")(e.target.value)} className={`min-h-11 w-full rounded-lg border border-default bg-canvas px-3 py-2.5 text-sm text-primary ${focusRing}`}>
                    {Object.keys(EQUIPMENT).map((k) => <option key={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="qty" className="mb-2 block text-sm font-medium text-primary">Jumlah Unit</label>
                  <input
                    id="qty" type="number" inputMode="numeric" min={1} max={MAX_QTY} value={form.qty}
                    onChange={(e) => set("qty")(e.target.value)}
                    onBlur={() => set("qty")(String(qty))}
                    className={`min-h-11 w-full rounded-lg border border-default bg-canvas px-3 py-2.5 font-mono text-sm tabular-nums text-primary ${focusRing}`}
                  />
                </div>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-primary">Perkiraan Kondisi Unit</legend>
                <div role="radiogroup" aria-label="Perkiraan kondisi unit" className="grid gap-2 sm:grid-cols-3">
                  {Object.entries(CONDITIONS).map(([k, c]) => <Choice key={k} active={form.condition === k} title={k} hint={c.hint} onClick={() => set("condition")(k)} />)}
                </div>
              </fieldset>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button type="button" onClick={() => setRevealed(true)} className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-cta-hover ${focusRing}`}>
                  <DollarSign className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  <span>Hitung Estimasi Valuasi</span>
                </button>
                <button type="button" onClick={downloadTemplate} className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-canvas px-4 py-2.5 text-sm font-medium text-primary hover:bg-subtle ${focusRing}`}>
                  <FileSpreadsheet className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                  <span>Unduh Template Daftar Aset (CSV)</span>
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-default bg-surface p-6 shadow-sm lg:col-span-2" aria-live="polite">
              {!revealed ? (
                <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
                  <DollarSign className="h-8 w-8 text-secondary" strokeWidth={1.75} aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium text-primary">Estimasi nilai tampil di sini.</p>
                  <p className="mt-1 text-sm text-secondary">Isi formulir di samping lalu klik Hitung Estimasi Valuasi.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="vt-badge-sample">Estimasi Tarif Referensi</span>
                    <p className="mt-2 text-sm text-secondary">Perkiraan nilai buyback untuk {qty} unit</p>
                    <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-status-live">
                      {idr(est.low)} – {idr(est.high)}
                    </p>
                  </div>
                  <dl className="divide-y divide-default rounded-lg border border-default bg-canvas text-sm">
                    <div className="flex justify-between gap-3 px-3 py-2">
                      <dt className="text-secondary">Nilai per unit</dt>
                      <dd className="text-right font-mono tabular-nums text-primary">{idr(est.lowUnit)} – {idr(est.highUnit)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 px-3 py-2">
                      <dt className="text-secondary">Bonus jumlah besar</dt>
                      <dd className="font-mono tabular-nums text-primary">{est.bonus ? `+${est.bonus}%` : "Tidak ada"}</dd>
                    </div>
                    <div className="flex justify-between gap-3 px-3 py-2">
                      <dt className="flex items-center gap-1.5 text-secondary">
                        <Leaf className="h-3.5 w-3.5 text-status-live" aria-hidden="true" />
                        <span>Limbah elektronik tercegah</span>
                      </dt>
                      <dd className="font-mono tabular-nums text-primary">{num(est.kg)} kg</dd>
                    </div>
                  </dl>
                  {nextBulk && (
                    <p className="text-xs text-secondary">
                      Tambah {nextBulk.min - qty} unit lagi untuk mendapatkan bonus grosir +{nextBulk.pct}%.
                    </p>
                  )}
                  {form.entity === "Individu" && (
                    <p className="text-xs text-secondary">Bonus jumlah besar berlaku untuk pengajuan kantor dan sekolah.</p>
                  )}

                  <p className="flex gap-2 rounded-lg border border-status-sample/30 bg-amber-50 p-3 text-xs text-amber-900">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-status-sample" aria-hidden="true" />
                    <span>Tarif bersifat estimasi referensi. Nilai final dikonfirmasi setelah inspeksi fisik di Hub ViciTech atau mitra terdekat.</span>
                  </p>

                  {submittedRef ? (
                    <p role="status" className="flex gap-2 rounded-lg border border-status-live/30 bg-emerald-50 p-3 text-sm text-emerald-800">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-live" aria-hidden="true" />
                      <span>Pengajuan {submittedRef} dicatat. Penawaran resmi akan dikirim ke {email.trim()}.</span>
                    </p>
                  ) : (
                    <div>
                      <label htmlFor="email" className="mb-2 block text-sm font-medium text-primary">Email Kontak</label>
                      <div className="flex gap-2">
                        <input
                          id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(false); }}
                          aria-invalid={emailError} placeholder="nama@instansi.id"
                          className={`min-h-11 min-w-0 flex-1 rounded-lg border bg-canvas px-3 py-2.5 text-sm text-primary placeholder:text-secondary ${focusRing} ${emailError ? "border-status-danger" : "border-default"}`}
                        />
                        <button type="button" onClick={submit} className={`min-h-11 shrink-0 rounded-lg bg-accent-cta px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-cta-hover ${focusRing}`}>
                          Ajukan Valuasi
                        </button>
                      </div>
                      {emailError && <p className="mt-1.5 text-xs text-status-danger">Masukkan alamat email yang valid untuk menerima penawaran resmi.</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Banner CTA tunggal ke Etalase Market */}
        <section className="mt-12" aria-labelledby="market-refurb-cta-title">
          <div className="flex flex-col justify-between gap-6 rounded-2xl border border-default bg-surface p-6 shadow-sm sm:p-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="vt-badge-live">
                  <ShieldCheck className="h-3.5 w-3.5 text-status-live" strokeWidth={1.75} aria-hidden="true" />
                  <span>Terverifikasi IoT QC 15 Titik</span>
                </span>
                <span className="rounded-md border border-default bg-canvas px-2.5 py-0.5 text-xs font-medium text-secondary">
                  Garansi 12 Bulan ViciCare
                </span>
              </div>
              <h2
                id="market-refurb-cta-title"
                className="font-serif text-2xl font-semibold tracking-tight text-primary sm:text-3xl"
              >
                Cari unit refurbished lulus uji IoT QC 15 titik?
              </h2>
              <p className="text-sm leading-relaxed text-secondary">
                Seluruh unit Grade A+ dan Recertified Enterprise yang siap kirim kini terpusat di Etalase Market resmi ViciTech—lengkap dengan foto fisik, status stok real-time, dan log telemetri QC.
              </p>
            </div>

            <div className="shrink-0">
              <Link
                href="/market"
                className={`vt-btn-tactile inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-cta px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-cta-hover ${focusRing}`}
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
