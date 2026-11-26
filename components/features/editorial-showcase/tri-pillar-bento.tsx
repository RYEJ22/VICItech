import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Gauge,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Store,
  Users,
  Wrench,
} from 'lucide-react';
import type { ReactElement } from 'react';

export function TriPillarBento(): ReactElement {
  return (
    <section aria-labelledby="tri-pillar-heading" className="space-y-6">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#EA580C]">
          Tri-Pillar Moat ViciTech
        </p>
        <h2
          id="tri-pillar-heading"
          className="mt-2 font-sans text-2xl font-extrabold tracking-tight text-[#18181B] [text-wrap:balance] sm:text-4xl"
        >
          Tiga pilar yang bikin keputusan hardware Anda lebih presisi dan aman.
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-[#52525B] sm:text-base">
          Satukan kalkulator simulasi, verifikasi kualitas transparan, dan komunitas teknis aktif
          sebelum mengeluarkan anggaran sepeser pun.
        </p>
      </div>

      {/* Asymmetric 12-column Bento Grid */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Pillar 1 (Wide — 7 cols): Toolkit Simulasi */}
        <article className="vt-card-lift group flex flex-col justify-between rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#EA580C]/40 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:transform-none sm:p-7 lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF7ED] px-3 py-1 text-xs font-semibold text-[#C2410C]">
                <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
                Pilar 1 · Toolkit Simulasi
              </span>
              <span className="rounded-full border border-[#E4E4E7] bg-[#FAF9F6] px-2.5 py-0.5 text-[11px] font-medium text-[#52525B]">
                Gratis · Tanpa Login
              </span>
            </div>

            <h3 className="mt-4 font-sans text-xl font-bold tracking-tight text-[#18181B] sm:text-2xl">
              Simulasi rakitan, bottleneck, dan upgrade sebelum beli komponen.
            </h3>
            <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-[#52525B]">
              Cek kecocokan soket &amp; DDR, hitung headroom daya PSU +35%, proyeksi FPS per game,
              hingga potensi ekspansi RAM/SSD laptop Anda dengan bantuan ViciTech AI.
            </p>

            {/* Mini Visual Preview */}
            <div className="mt-5 rounded-xl border border-[#EEEAE5] bg-[#FAF9F6] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#18181B]">
                  Contoh Simulasi · Ryzen 5 7600 + RTX 4060
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-800">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  Seimbang (4.2%)
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-[#E4E4E7] bg-white px-2.5 py-2">
                  <p className="text-[10px] font-medium text-[#52525B]">Beban PSU</p>
                  <p className="mt-0.5 font-mono text-xs font-bold text-[#18181B]">340 W / 550 W</p>
                </div>
                <div className="rounded-lg border border-[#E4E4E7] bg-white px-2.5 py-2">
                  <p className="text-[10px] font-medium text-[#52525B]">1080p Kompetitif</p>
                  <p className="mt-0.5 font-mono text-xs font-bold text-[#EA580C]">240+ FPS</p>
                </div>
                <div className="rounded-lg border border-[#E4E4E7] bg-white px-2.5 py-2">
                  <p className="text-[10px] font-medium text-[#52525B]">Buffer JIT</p>
                  <p className="mt-0.5 font-mono text-xs font-bold text-[#18181B]">5% Dinamis</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-[#EEEAE5] pt-4">
            <Link
              href="/builder"
              className="vt-motion-press inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#EA580C] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
            >
              <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Preset Builder</span>
            </Link>
            <Link
              href="/bottleneck"
              className="vt-motion-press inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#E4E4E7] bg-[#FAF9F6] px-3.5 text-xs font-semibold text-[#18181B] transition-colors hover:bg-[#F3F1ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
            >
              <Gauge className="h-3.5 w-3.5 text-[#EA580C]" aria-hidden="true" />
              <span>Bottleneck</span>
            </Link>
            <Link
              href="/market?view=upgrade"
              className="vt-motion-press inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#E4E4E7] bg-[#FAF9F6] px-3.5 text-xs font-semibold text-[#18181B] transition-colors hover:bg-[#F3F1ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
            >
              <Wrench className="h-3.5 w-3.5 text-[#EA580C]" aria-hidden="true" />
              <span>Upgrade Analyzer</span>
            </Link>
            <Link
              href="/toolkit/konsultan-ai"
              className="vt-motion-press inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#E4E4E7] bg-[#FAF9F6] px-3.5 text-xs font-semibold text-[#18181B] transition-colors hover:bg-[#F3F1ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
            >
              <Bot className="h-3.5 w-3.5 text-[#EA580C]" aria-hidden="true" />
              <span>Konsultan AI</span>
            </Link>
          </div>
        </article>

        {/* Pillar 2 (Tall — 5 cols): Hybrid IoT QC */}
        <article className="vt-card-lift group flex flex-col justify-between rounded-2xl border border-[#E4E4E7] bg-[#FAF9F6] p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#EA580C]/40 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:transform-none sm:p-7 lg:col-span-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#18181B] border border-[#E4E4E7]">
                <Activity className="h-3.5 w-3.5 text-[#EA580C]" aria-hidden="true" />
                Pilar 2 · Hybrid IoT QC
              </span>
              <span className="vt-badge-simulated">Simulated / Demo</span>
            </div>

            <h3 className="mt-4 font-sans text-xl font-bold tracking-tight text-[#18181B] sm:text-2xl">
              Verifikasi 15 titik &amp; sertifikat serial anti-zonk.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#52525B]">
              Transparansi log uji termal, voltase, dan sanitasi data NIST SP 800-88 yang dapat
              dicek publik lewat nomor seri. Integrasi sensor fisik ESP32 dijadwalkan di v2.5.
            </p>

            {/* Mini Telemetry Card Preview */}
            <div className="mt-5 space-y-2.5 rounded-xl border border-[#E4E4E7] bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-[#18181B]">VICI-PC-2026-0104</span>
                <span className="rounded bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                  Profil Demo QC
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[#52525B]">
                  <span>Burn-In Termal CPU/GPU</span>
                  <span className="font-mono font-semibold text-[#18181B]">64°C · Stabil</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#F3F1ED]">
                  <div className="h-full w-[88%] rounded-full bg-[#EA580C]" />
                </div>
                <div className="flex items-center justify-between pt-1 text-[#52525B]">
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                    Sanitasi NIST SP 800-88
                  </span>
                  <span className="font-mono font-semibold text-emerald-800">15/15 Lulus</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-[#E4E4E7] pt-4">
            <Link
              href="/qc-panel"
              className="vt-motion-press inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#E4E4E7] bg-white px-4 text-xs font-semibold text-[#18181B] transition-colors hover:border-[#EA580C]/40 hover:text-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
            >
              <span>Buka Panel Simulasi IoT QC</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </article>

        {/* Pillar 3 (Bottom Left — 7 cols): Community Hub */}
        <article className="vt-card-lift group flex flex-col justify-between rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#EA580C]/40 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:transform-none sm:p-7 lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF7ED] px-3 py-1 text-xs font-semibold text-[#C2410C]">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                Pilar 3 · Community Hub
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#52525B]">
                <MessageSquare className="h-3.5 w-3.5 text-[#EA580C]" aria-hidden="true" />
                Diskusi &amp; DM Langsung
              </span>
            </div>

            <h3 className="mt-4 font-sans text-xl font-bold tracking-tight text-[#18181B]">
              Belajar dari rakitan nyata, cari anggota, dan diskusi langsung.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#52525B]">
              Bagikan hasil rakitan PC, tanyakan pengalaman upgrade laptop, atau kirim pesan
              langsung ke builder dan teknisi terpercaya di komunitas ViciTech.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {['#ShowcaseRakitan', '#TanyaUpgrade', '#DiskusiBottleneck', '#DMKomunitas'].map(
                (tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#E4E4E7] bg-[#FAF9F6] px-3 py-1 text-xs font-medium text-[#52525B]"
                  >
                    {tag}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-[#EEEAE5] pt-4">
            <Link
              href="/community"
              className="vt-motion-press inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#18181B] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#EA580C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
            >
              <span>Jelajahi Komunitas</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Link
              href="/messages"
              className="vt-motion-press inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#E4E4E7] bg-[#FAF9F6] px-4 text-xs font-semibold text-[#18181B] transition-colors hover:bg-[#F3F1ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
            >
              <MessageSquare className="h-3.5 w-3.5 text-[#EA580C]" aria-hidden="true" />
              <span>Pesan Langsung</span>
            </Link>
          </div>
        </article>

        {/* Bottom Right (5 cols): Circular Market & Trade-In */}
        <article className="vt-card-lift group flex flex-col justify-between rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#EA580C]/40 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:transform-none sm:p-7 lg:col-span-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF9F6] border border-[#E4E4E7] px-3 py-1 text-xs font-semibold text-[#18181B]">
              <Store className="h-3.5 w-3.5 text-[#EA580C]" aria-hidden="true" />
              Market &amp; Circular Trade-In
            </span>
            <h3 className="mt-4 font-sans text-xl font-bold tracking-tight text-[#18181B]">
              PC, Laptop, Consoles &amp; Handhelds dalam satu etalase.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#52525B]">
              Beli unit siap kirim dengan Smart Part Matcher atau tukar tambah perangkat lama Anda
              secara transparan.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-[#EEEAE5] pt-4">
            <Link
              href="/market"
              className="vt-motion-press inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#EA580C] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
            >
              <span>Buka Market</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Link
              href="/trade-in"
              className="vt-motion-press inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#E4E4E7] bg-[#FAF9F6] px-4 text-xs font-semibold text-[#18181B] transition-colors hover:bg-[#F3F1ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#EA580C]" aria-hidden="true" />
              <span>Trade-In</span>
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
