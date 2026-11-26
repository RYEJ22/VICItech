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
    <section
      aria-labelledby="tri-pillar-heading"
      className="vt-grid-bg space-y-6 rounded-xl border border-default bg-canvas/80 p-4 sm:p-7"
    >
      <div className="max-w-3xl">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent-primary">
          <span className="vt-pixel-led bg-accent-primary" aria-hidden="true" />
          <span>Tri-Pillar Moat ViciTech</span>
        </p>
        <h2
          id="tri-pillar-heading"
          className="mt-2 font-sans text-2xl font-extrabold tracking-tight text-primary [text-wrap:balance] sm:text-4xl"
        >
          Tiga pilar yang bikin keputusan hardware Anda lebih presisi dan aman.
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-secondary sm:text-base">
          Satukan kalkulator simulasi, verifikasi kualitas transparan, dan komunitas teknis aktif
          sebelum mengeluarkan anggaran sepeser pun.
        </p>
        <span aria-hidden="true" className="vt-pixel-divider mt-5 max-w-xs" />
      </div>

      {/* Asymmetric 12-column Bento Grid */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Pillar 1 (Wide — 7 cols): Toolkit Simulasi */}
        <article className="vt-card-lift group flex flex-col justify-between rounded-xl border border-default bg-surface p-5 shadow-card transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-strong hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:transform-none sm:p-7 lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-subtle px-3 py-1 text-xs font-semibold text-accent-hover">
                <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
                Pilar 1 · Toolkit Simulasi
              </span>
              <span className="rounded-full border border-default bg-canvas px-2.5 py-0.5 text-[11px] font-medium text-secondary">
                Gratis · Tanpa Login
              </span>
            </div>

            <h3 className="mt-4 font-sans text-xl font-bold tracking-tight text-primary sm:text-2xl">
              Simulasi rakitan, bottleneck, dan upgrade sebelum beli komponen.
            </h3>
            <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-secondary">
              Cek kecocokan soket &amp; DDR, hitung headroom daya PSU +35%, proyeksi FPS per game,
              hingga potensi ekspansi RAM/SSD laptop Anda dengan bantuan ViciTech AI.
            </p>

            {/* Mini Visual Preview */}
            <div className="mt-5 rounded-xl border border-default bg-canvas p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-primary">
                  Contoh Simulasi · Ryzen 5 7600 + RTX 4060
                </span>
                <span className="vt-badge-live font-mono tabular-nums">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  Seimbang (4.2%)
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-default bg-surface px-2.5 py-2">
                  <p className="text-[10px] font-medium text-secondary">Beban PSU</p>
                  <p className="mt-0.5 font-mono text-xs font-bold tabular-nums text-primary">340 W / 550 W</p>
                </div>
                <div className="rounded-lg border border-default bg-surface px-2.5 py-2">
                  <p className="text-[10px] font-medium text-secondary">1080p Kompetitif</p>
                  <p className="mt-0.5 font-mono text-xs font-bold tabular-nums text-accent-primary">240+ FPS</p>
                </div>
                <div className="rounded-lg border border-default bg-surface px-2.5 py-2">
                  <p className="text-[10px] font-medium text-secondary">Buffer JIT</p>
                  <p className="mt-0.5 font-mono text-xs font-bold tabular-nums text-primary">5% Dinamis</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-default pt-4">
            <Link
              href="/builder"
              className="vt-motion-press inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-accent-primary px-4 text-xs font-semibold text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Preset Builder</span>
            </Link>
            <Link
              href="/bottleneck"
              className="vt-motion-press inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-default bg-canvas px-3.5 text-xs font-semibold text-primary transition-all duration-200 ease-smooth hover:bg-subtle active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <Gauge className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />
              <span>Bottleneck</span>
            </Link>
            <Link
              href="/market?view=upgrade"
              className="vt-motion-press inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-default bg-canvas px-3.5 text-xs font-semibold text-primary transition-all duration-200 ease-smooth hover:bg-subtle active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <Wrench className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />
              <span>Upgrade Analyzer</span>
            </Link>
            <Link
              href="/toolkit/konsultan-ai"
              className="vt-motion-press inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-default bg-canvas px-3.5 text-xs font-semibold text-primary transition-all duration-200 ease-smooth hover:bg-subtle active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <Bot className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />
              <span>Konsultan AI</span>
            </Link>
          </div>
        </article>

        {/* Pillar 2 (Tall — 5 cols): Hybrid IoT QC with Contained Obsidian Telemetry Preview */}
        <article className="vt-card-lift group flex flex-col justify-between rounded-xl border border-default bg-surface p-5 shadow-card transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-strong hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:transform-none sm:p-7 lg:col-span-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-subtle px-3 py-1 text-xs font-semibold text-accent-hover">
                <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                Pilar 2 · Hybrid IoT QC
              </span>
              <span className="vt-badge-simulated font-mono">
                Simulated / Demo
              </span>
            </div>

            <h3 className="mt-4 font-sans text-xl font-bold tracking-tight text-primary sm:text-2xl">
              Verifikasi 15 titik &amp; sertifikat serial anti-zonk.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              Transparansi log uji termal, voltase, dan sanitasi data NIST SP 800-88 yang dapat
              dicek publik lewat nomor seri. Integrasi sensor fisik ESP32 dijadwalkan di v2.5.
            </p>

            {/* Contained Mini Obsidian Telemetry Widget */}
            <div className="vt-obsidian-panel mt-5 space-y-2.5 rounded-xl p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 font-mono text-xs font-bold tabular-nums text-[#FAFAFA]">
                  <span className="vt-pixel-led vt-pixel-led-pulse bg-sky-400" aria-hidden="true" />
                  <span>VICI-PC-2026-0104</span>
                </span>
                <span className="vt-badge-simulated !px-2 !py-0.5 !text-[10px]">
                  Profil Demo QC
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[#D4D4D8]">
                  <span>Burn-In Termal CPU/GPU</span>
                  <span className="font-mono font-semibold tabular-nums text-[#FAFAFA]">64.0°C · Stabil</span>
                </div>
                <div className="vt-pixel-bar h-2 overflow-hidden rounded-[3px] bg-white/15">
                  <div className="h-full w-[88%] rounded-[2px] bg-accent-primary" />
                </div>
                <div className="flex items-center justify-between pt-1 text-[#D4D4D8]">
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Sanitasi NIST SP 800-88
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-emerald-400">15/15 Lulus</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-default pt-4">
            <Link
              href="/qc-panel"
              className="vt-motion-press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-primary px-4 text-xs font-semibold text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <span>Buka Panel Simulasi IoT QC</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </article>

        {/* Pillar 3 (Bottom Left — 7 cols): Community Hub */}
        <article className="vt-card-lift group flex flex-col justify-between rounded-xl border border-default bg-surface p-5 shadow-card transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-strong hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:transform-none sm:p-7 lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-subtle px-3 py-1 text-xs font-semibold text-accent-hover">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                Pilar 3 · Community Hub
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-secondary">
                <MessageSquare className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />
                Diskusi &amp; DM Langsung
              </span>
            </div>

            <h3 className="mt-4 font-sans text-xl font-bold tracking-tight text-primary">
              Belajar dari rakitan nyata, cari anggota, dan diskusi langsung.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              Bagikan hasil rakitan PC, tanyakan pengalaman upgrade laptop, atau kirim pesan
              langsung ke builder dan teknisi terpercaya di komunitas ViciTech.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {['#ShowcaseRakitan', '#TanyaUpgrade', '#DiskusiBottleneck', '#DMKomunitas'].map(
                (tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-default bg-canvas px-3 py-1 text-xs font-medium text-secondary"
                  >
                    {tag}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-default pt-4">
            <Link
              href="/community"
              className="vt-motion-press inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-accent-primary px-4 text-xs font-semibold text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <span>Jelajahi Komunitas</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Link
              href="/messages"
              className="vt-motion-press inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-default bg-canvas px-4 text-xs font-semibold text-primary transition-all duration-200 ease-smooth hover:bg-subtle active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <MessageSquare className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />
              <span>Pesan Langsung</span>
            </Link>
          </div>
        </article>

        {/* Bottom Right (5 cols): Circular Market & Trade-In */}
        <article className="vt-card-lift group flex flex-col justify-between rounded-xl border border-default bg-surface p-5 shadow-card transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-strong hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:transform-none sm:p-7 lg:col-span-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-default bg-canvas px-3 py-1 text-xs font-semibold text-primary">
              <Store className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />
              Market &amp; Circular Trade-In
            </span>
            <h3 className="mt-4 font-sans text-xl font-bold tracking-tight text-primary">
              PC, Laptop, Consoles &amp; Handhelds dalam satu etalase.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              Beli unit siap kirim dengan Smart Part Matcher atau tukar tambah perangkat lama Anda
              secara transparan.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-default pt-4">
            <Link
              href="/market"
              className="vt-motion-press inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-primary px-4 text-xs font-semibold text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <span>Buka Market</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Link
              href="/trade-in"
              className="vt-motion-press inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-default bg-canvas px-4 text-xs font-semibold text-primary transition-all duration-200 ease-smooth hover:bg-subtle active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <RefreshCw className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />
              <span>Trade-In</span>
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
