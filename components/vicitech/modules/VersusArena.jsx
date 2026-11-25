import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Gauge,
  Laptop,
  Layers,
  Scale,
  Search,
  Smartphone,
  Sparkles,
  Swords,
  Trophy,
  X,
} from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { listHardwareComponents } from "@/lib/hardware/components";
import {
  VERSUS_CATEGORIES,
  VERSUS_CATEGORY_META,
  VERSUS_PROFILES,
  evaluateVersus,
  formatVersusIdr,
  getVersusScenarioDisplay,
  mergeVersusCatalog,
} from "@/lib/algorithms/versusEngine";
import styles from "./versus-arena.module.css";

const CATEGORY_ICONS = {
  build: Layers,
  cpu: Cpu,
  gpu: Gauge,
  laptop: Laptop,
  smartphone: Smartphone,
};

const SOURCE_BADGES = {
  supabase_market: { cls: "vt-badge-sample", label: "Katalog Market" },
  supabase_hardware: { cls: "vt-badge-sample", label: "Katalog Komponen" },
  curated_sample: { cls: "vt-badge-sample", label: "Data Referensi" },
};

const MARGIN_BADGES = {
  dominant: "border-emerald-200 bg-emerald-50 text-emerald-800",
  narrow: "border-amber-200 bg-amber-50 text-amber-800",
  tie: "border-default bg-subtle text-primary",
};

const DEFAULT_MARKET_LINKS = {
  build: "/market?category=pc-build",
  cpu: "/market?tab=market&view=catalog",
  gpu: "/market?tab=market&view=catalog",
  laptop: "/market?category=laptop",
  smartphone: "/market?category=smartphone",
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

function ItemComparisonCard({ item, sideLabel, compositeScore, resolved, isWinner, Icon, buttonRef, onPick }) {
  const sourceBadge = SOURCE_BADGES[item.source] ?? SOURCE_BADGES.curated_sample;
  const smartphone = resolved.smartphone;

  return (
    <article
      className={`vt-card-interactive flex flex-col justify-between rounded-xl border bg-surface p-5 shadow-sm ${
        isWinner ? "border-accent-primary ring-1 ring-accent-primary/20" : "border-default"
      }`}
    >
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-secondary">
              {sideLabel}
            </span>
            <span className={sourceBadge.cls}>{sourceBadge.label}</span>
          </div>
          {isWinner && (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
              <Trophy className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              <span>Unggul</span>
            </span>
          )}
        </div>

        <div className="mt-4 flex items-start gap-3">
          <span
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-default ${
              isWinner ? "bg-accent-subtle text-accent-cta" : "bg-subtle text-secondary"
            }`}
            aria-hidden="true"
          >
            <Icon className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="tracking-tight font-sans text-lg font-bold leading-snug text-primary [text-wrap:balance]">
              {item.name}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-secondary">{item.subtitle}</p>
            <p className="mt-1.5 inline-block rounded-md border border-default bg-subtle px-2 py-0.5 text-[11px] font-medium text-secondary">
              {item.conditionLabel}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-default pt-4">
          <div>
            <p className="text-xs text-secondary">Skor Komposit</p>
            <p className="mt-0.5 flex items-baseline gap-1">
              <AnimatedNumber
                value={compositeScore}
                format="number"
                decimals={1}
                className={`text-2xl font-semibold ${isWinner ? "text-accent-cta" : "text-primary"}`}
              />
              <span className="font-mono text-xs text-secondary">/ 100</span>
            </p>
          </div>
          {smartphone ? (
            <div>
              <p className="text-xs text-secondary">Baterai &amp; Charging</p>
              <p className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
                <AnimatedNumber
                  value={smartphone.batteryMah}
                  format="number"
                  suffix=" mAh"
                  className="text-base font-semibold text-primary"
                />
                <span className="text-xs text-secondary">/</span>
                <AnimatedNumber
                  value={smartphone.chargingWatt}
                  format="number"
                  suffix=" W"
                  className="text-base font-semibold text-accent-cta"
                />
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-secondary">Estimasi TDP</p>
              <p className="mt-0.5 flex items-baseline gap-1">
                <AnimatedNumber
                  value={resolved.tdpWatts}
                  format="number"
                  suffix=" W"
                  className="text-lg font-semibold text-primary"
                />
              </p>
            </div>
          )}
        </div>

        <div className="mt-3">
          <p className="text-xs text-secondary">Harga Katalog</p>
          <p className="mt-0.5 text-xl font-semibold text-primary">
            <AnimatedNumber value={resolved.priceIdr} format="currency" />
          </p>
        </div>
      </div>

      <button
        ref={buttonRef}
        type="button"
        onClick={onPick}
        className={`vt-btn-tactile mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-default bg-surface px-4 py-2.5 text-sm font-medium text-primary hover:border-accent-primary/50 hover:bg-subtle ${focusRing}`}
      >
        <Search className="h-4 w-4 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
        <span>Ganti {sideLabel}</span>
      </button>
    </article>
  );
}

function ItemPickerDrawer({ categoryLabel, sideLabel, items, otherId, currentId, onPick, onClose, triggerRef }) {
  const [query, setQuery] = useState("");
  const drawerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const rafId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "Tab" && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus?.();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus?.();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
      triggerRef?.current?.focus?.();
    };
  }, [onClose, triggerRef]);

  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = items.filter((item) =>
    tokens.every((token) =>
      `${item.brand} ${item.name} ${item.subtitle}`.toLowerCase().includes(token),
    ),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 md:items-stretch md:justify-end"
      onClick={onClose}
    >
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Pilih ${sideLabel} untuk ${categoryLabel}`}
        onClick={(event) => event.stopPropagation()}
        className="vt-pop flex max-h-[85vh] w-full flex-col rounded-t-2xl border-t border-default bg-surface shadow-2xl md:h-full md:max-h-none md:max-w-lg md:rounded-none md:rounded-l-xl md:border-l md:border-t-0"
      >
        <div className="flex justify-center pt-2.5 md:hidden" aria-hidden="true">
          <span className="h-1.5 w-10 rounded-full bg-default" />
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-default px-5 py-4">
          <div>
            <h2 className="tracking-tight font-sans text-lg font-bold text-primary">
              Pilih {sideLabel}
            </h2>
            <p className="text-xs text-secondary">{categoryLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel pemilih perangkat"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border border-default bg-surface text-secondary hover:bg-subtle hover:text-primary ${focusRing}`}
          >
            <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div className="border-b border-default p-4">
          <label htmlFor="versus-picker-search" className="sr-only">
            Cari perangkat di kategori {categoryLabel}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              id="versus-picker-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama produk, merek, chipset, CPU, atau GPU..."
              className={`min-h-11 w-full rounded-lg border border-default bg-canvas py-2.5 pl-10 pr-3 text-sm text-primary placeholder:text-secondary ${focusRing}`}
            />
          </div>
        </div>

        <ul className="flex-1 divide-y divide-default overflow-y-auto p-2">
          {filtered.length === 0 && (
            <li className="p-6 text-center text-sm text-secondary">
              Tidak ada perangkat yang cocok dengan kata kunci tersebut.
            </li>
          )}
          {filtered.map((item) => {
            const isOther = item.id === otherId;
            const isCurrent = item.id === currentId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={isOther}
                  onClick={() => onPick(item.id)}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition-colors ${focusRing} ${
                    isOther
                      ? "cursor-not-allowed opacity-45"
                      : isCurrent
                        ? "bg-accent-subtle text-primary"
                        : "hover:bg-subtle"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-primary">
                      {item.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-secondary">
                      {item.subtitle}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-xs font-semibold tabular-nums text-primary">
                      {formatVersusIdr(item.specs.priceIdr)}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-secondary">
                      {isOther
                        ? "Dipakai pembanding lain"
                        : isCurrent
                          ? "Terpilih"
                          : item.conditionLabel}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}

export default function VersusArena({ onDeployToPreset, marketProducts = [] }) {
  const [remoteHardware, setRemoteHardware] = useState([]);
  const [catalogNotice, setCatalogNotice] = useState("");
  const [category, setCategory] = useState("build");
  const [profile, setProfile] = useState("gaming");
  const [selections, setSelections] = useState({});
  const [pickerSide, setPickerSide] = useState(null);
  const [showMethodology, setShowMethodology] = useState(false);

  const buttonARef = useRef(null);
  const buttonBRef = useRef(null);

  useEffect(() => {
    let active = true;
    listHardwareComponents({ activeOnly: true })
      .then((items) => {
        if (active) setRemoteHardware(items);
      })
      .catch(() => {
        if (active) {
          setCatalogNotice("Sebagian katalog komponen Supabase belum dapat dimuat; menampilkan katalog referensi terkurasi.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const catalogByCategory = useMemo(
    () => mergeVersusCatalog(remoteHardware, marketProducts),
    [remoteHardware, marketProducts],
  );

  const items = catalogByCategory[category] ?? [];
  const defaultItemA = items[0];
  const defaultItemB = items[1] ?? items[0];
  const savedPair = selections[category];
  const itemA = items.find((item) => item.id === savedPair?.a) ?? defaultItemA;
  const itemB =
    items.find((item) => item.id === savedPair?.b && item.id !== itemA?.id) ??
    items.find((item) => item.id !== itemA?.id) ??
    defaultItemB;

  const result = useMemo(() => {
    if (!itemA || !itemB) return null;
    return evaluateVersus(itemA, itemB, profile);
  }, [itemA, itemB, profile]);

  if (!itemA || !itemB || !result) {
    return null;
  }

  const CatIcon = CATEGORY_ICONS[category] ?? Layers;
  const catMeta = VERSUS_CATEGORY_META[category];
  const activeScenario = getVersusScenarioDisplay(category, profile);
  const winnerSide = result.verdict.winnerSide;
  const winnerItem = winnerSide === "a" ? itemA : itemB;
  const winnerMarketHref = winnerItem.marketSlug
    ? `/market/${encodeURIComponent(winnerItem.marketSlug)}`
    : DEFAULT_MARKET_LINKS[category] ?? "/market?tab=market&view=catalog";
  const supportsPresetBuilder = category === "build" || category === "cpu" || category === "gpu";

  const handleSwap = () => {
    setSelections((prev) => ({
      ...prev,
      [category]: { a: itemB.id, b: itemA.id },
    }));
  };

  const handlePick = (side, pickedId) => {
    setSelections((prev) => ({
      ...prev,
      [category]: {
        a: side === "a" ? pickedId : itemA.id,
        b: side === "b" ? pickedId : itemB.id,
      },
    }));
    setPickerSide(null);
  };

  const handleDeployWinner = () => {
    onDeployToPreset?.(winnerItem);
  };

  return (
    <div className="bg-canvas text-primary antialiased">
      <div className="mx-auto max-w-shell px-4 py-10 sm:px-6">
        <header className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="vt-badge-simulated">Skor Simulasi Terbobot</span>
            <span className="text-xs font-medium text-secondary">
              Mesin Komparasi ViciTech
            </span>
          </div>
          <h1 className="mt-3 flex items-center gap-3 font-sans text-3xl font-bold tracking-tight text-primary [text-wrap:balance] sm:text-4xl">
            <Swords className="h-7 w-7 shrink-0 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
            <span>Versus Arena</span>
          </h1>
          <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-secondary sm:text-base">
            Bandingkan dua konfigurasi PC, CPU, GPU, laptop, atau smartphone dalam kategori yang sama berdasarkan bobot skenario nyata dan indeks Price-to-Performance.
          </p>
        </header>

        {catalogNotice && (
          <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
            {catalogNotice}
          </p>
        )}

        {/* Category Filter Pill Bar */}
        <section
          aria-label="Filter kategori perangkat"
          className="mt-7 rounded-xl border border-default bg-surface p-3.5 shadow-sm"
        >
          <div
            role="tablist"
            aria-label="Kategori perbandingan perangkat"
            className="flex flex-wrap items-center gap-2"
          >
            {VERSUS_CATEGORIES.map((catKey) => {
              const meta = VERSUS_CATEGORY_META[catKey];
              const Icon = CATEGORY_ICONS[catKey];
              const isSelected = category === catKey;
              return (
                <button
                  key={catKey}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => {
                    setCategory(catKey);
                    setPickerSide(null);
                  }}
                  className={`vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold sm:text-sm ${focusRing} ${
                    isSelected
                      ? "bg-accent-cta text-white hover:bg-accent-cta-hover"
                      : "border border-default bg-canvas text-secondary hover:bg-subtle hover:text-primary"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span>{meta.pillLabel}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 text-xs text-secondary">
            Kategori aktif: <strong className="text-primary">{catMeta.label}</strong> — {catMeta.subtitle}.
          </p>
        </section>

        {/* Use-case Weighting Pills */}
        <section
          aria-label="Profil skenario penilaian"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-default bg-surface p-3.5"
        >
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Pilih skenario bobot">
            {VERSUS_PROFILES.map((profKey) => {
              const scenario = getVersusScenarioDisplay(category, profKey);
              const isActive = profile === profKey;
              return (
                <button
                  key={profKey}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setProfile(profKey)}
                  className={`vt-btn-tactile min-h-11 rounded-full px-4 py-2 text-xs font-semibold sm:text-sm ${focusRing} ${
                    isActive
                      ? "bg-primary text-surface"
                      : "border border-default bg-canvas text-secondary hover:bg-subtle hover:text-primary"
                  }`}
                >
                  {scenario.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs leading-relaxed text-secondary">
            {activeScenario.description}
          </p>
        </section>

        {/* 2-Column Head-to-Head + Swap */}
        <section aria-label="Perbandingan langsung dua perangkat" className="mt-6 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
          <ItemComparisonCard
            item={itemA}
            sideLabel="Kandidat A"
            compositeScore={result.subScoresA.compositeScore}
            resolved={result.resolvedA}
            isWinner={winnerSide === "a"}
            Icon={CatIcon}
            buttonRef={buttonARef}
            onPick={() => setPickerSide("a")}
          />

          <div className="flex items-center justify-center gap-3 md:flex-col">
            <span
              className="grid h-11 w-11 place-items-center rounded-full border border-default bg-surface text-accent-cta shadow-sm"
              aria-hidden="true"
            >
              <Swords className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <button
              type="button"
              onClick={handleSwap}
              className={`vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-surface px-3.5 py-2 text-xs font-semibold text-primary hover:border-accent-primary/50 hover:bg-subtle ${focusRing}`}
            >
              <ArrowRightLeft className="h-4 w-4 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
              <span>Tukar Posisi</span>
            </button>
          </div>

          <ItemComparisonCard
            item={itemB}
            sideLabel="Kandidat B"
            compositeScore={result.subScoresB.compositeScore}
            resolved={result.resolvedB}
            isWinner={winnerSide === "b"}
            Icon={CatIcon}
            buttonRef={buttonBRef}
            onPick={() => setPickerSide("b")}
          />
        </section>

        {/* Sub-Score GPU Horizontal Bars + Verdict Summary */}
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <section
            aria-labelledby="subscore-heading"
            className="rounded-xl border border-default bg-surface p-5 shadow-sm lg:col-span-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-default pb-3">
              <h2 id="subscore-heading" className="tracking-tight flex items-center gap-2 font-sans text-xl font-bold text-primary">
                <Scale className="h-5 w-5 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
                <span>Skor Sub-Metrik (0–100)</span>
              </h2>
              <span className="font-mono text-xs text-secondary">
                Profil: {activeScenario.label}
              </span>
            </div>

            <div className="mt-4 space-y-5">
              {result.subScoreBars.map((bar) => (
                <div key={bar.key} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium text-primary">{bar.label}</span>
                    <span className="font-mono text-xs text-secondary">
                      {bar.weightPct > 0 ? `Bobot ${bar.weightPct}%` : "Metrik Referensi"}
                    </span>
                  </div>

                  {/* Bar Item A */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate pr-2 text-secondary">{itemA.name}</span>
                      <span
                        className={`font-mono tabular-nums font-semibold ${
                          bar.winner === "a" ? "text-accent-cta" : "text-primary"
                        }`}
                      >
                        {bar.scoreA.toFixed(1)}
                      </span>
                    </div>
                    <div className={styles.barTrack} role="presentation">
                      <div
                        className={`${styles.barFill} ${
                          bar.winner === "a" ? "bg-accent-primary" : "bg-secondary/35"
                        }`}
                        style={{ transform: `scaleX(${Math.max(0.03, Math.min(1, bar.scoreA / 100))})` }}
                      />
                    </div>
                  </div>

                  {/* Bar Item B */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate pr-2 text-secondary">{itemB.name}</span>
                      <span
                        className={`font-mono tabular-nums font-semibold ${
                          bar.winner === "b" ? "text-accent-cta" : "text-primary"
                        }`}
                      >
                        {bar.scoreB.toFixed(1)}
                      </span>
                    </div>
                    <div className={styles.barTrack} role="presentation">
                      <div
                        className={`${styles.barFill} ${
                          bar.winner === "b" ? "bg-accent-primary" : "bg-secondary/35"
                        }`}
                        style={{ transform: `scaleX(${Math.max(0.03, Math.min(1, bar.scoreB / 100))})` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Verdict ViciTech Card */}
          <section
            aria-labelledby="verdict-heading"
            className="flex flex-col justify-between rounded-xl border border-default bg-surface p-5 shadow-sm lg:col-span-6"
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-default pb-3">
                <h2 id="verdict-heading" className="tracking-tight flex items-center gap-2 font-sans text-xl font-bold text-primary">
                  <Sparkles className="h-5 w-5 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
                  <span>Verdict ViciTech</span>
                </h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold ${MARGIN_BADGES[result.verdict.marginTier]}`}
                >
                  <Trophy className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  <span>
                    {result.verdict.marginLabel} ({result.verdict.marginPts.toFixed(1)} poin)
                  </span>
                </span>
              </div>

              <div className="mt-4 rounded-lg border border-default bg-accent-subtle p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent-cta">
                  Rekomendasi Utama · {activeScenario.label}
                </p>
                <p className="mt-1 font-sans text-xl font-semibold leading-snug text-primary [text-wrap:balance]">
                  {result.verdict.headline}
                </p>
              </div>

              <ul className="mt-4 space-y-3">
                {result.verdict.bullets.map((bullet, index) => (
                  <li key={index} className="flex items-start gap-2.5 text-sm leading-relaxed text-secondary">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-accent-cta"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-default pt-4">
              <Link
                href={winnerMarketHref}
                className={`vt-btn-tactile inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent-cta px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-cta-hover ${focusRing}`}
              >
                <span>Lihat di Market</span>
                <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </Link>
              {supportsPresetBuilder ? (
                <button
                  type="button"
                  onClick={handleDeployWinner}
                  className={`vt-btn-tactile inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-default bg-surface px-4 py-2.5 text-sm font-medium text-primary hover:border-accent-primary/50 hover:bg-subtle ${focusRing}`}
                >
                  <Cpu className="h-4 w-4 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
                  <span>Muat ke Preset Builder</span>
                </button>
              ) : (
                <Link
                  href="/market?tab=market&view=catalog"
                  className={`vt-btn-tactile inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-default bg-surface px-4 py-2.5 text-sm font-medium text-primary hover:border-accent-primary/50 hover:bg-subtle ${focusRing}`}
                >
                  <Layers className="h-4 w-4 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
                  <span>Jelajahi Katalog Hardware</span>
                </Link>
              )}
            </div>
          </section>
        </div>

        {/* Detailed Spec Table */}
        <section
          aria-labelledby="matrix-heading"
          className="mt-6 overflow-hidden rounded-xl border border-default bg-surface shadow-sm"
        >
          <div className="border-b border-default px-5 py-4">
            <h2 id="matrix-heading" className="tracking-tight font-sans text-lg font-bold text-primary">
              Matriks Spesifikasi Teknis
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-default bg-subtle text-left">
                  <th className="w-56 px-4 py-3 font-semibold text-secondary">Parameter</th>
                  <th className="px-4 py-3 font-semibold text-primary">{itemA.name}</th>
                  <th className="px-4 py-3 font-semibold text-primary">{itemB.name}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default">
                {result.specRows.map((row) => (
                  <tr key={row.key}>
                    <th scope="row" className="px-4 py-3 text-left font-medium text-secondary">
                      {row.label}
                    </th>
                    {[
                      ["a", row.valueA],
                      ["b", row.valueB],
                    ].map(([side, displayValue]) => {
                      const isRowWinner = row.winner === side;
                      return (
                        <td
                          key={side}
                          className={`px-4 py-3 align-top font-mono text-xs tabular-nums sm:text-sm ${
                            isRowWinner
                              ? "bg-accent-subtle/60 font-semibold text-primary"
                              : "text-secondary"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {isRowWinner && (
                              <CheckCircle2
                                className="mt-0.5 h-4 w-4 shrink-0 text-accent-cta"
                                strokeWidth={1.75}
                                aria-label="Unggul pada parameter ini"
                              />
                            )}
                            <div>
                              <span>{displayValue}</span>
                              {isRowWinner && row.deltaNote && (
                                <span className="mt-0.5 block font-sans text-xs font-medium text-accent-cta">
                                  {row.deltaNote}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Methodology Accordion */}
        <section className="mt-6 rounded-xl border border-default bg-surface">
          <button
            type="button"
            aria-expanded={showMethodology}
            onClick={() => setShowMethodology((prev) => !prev)}
            className={`flex min-h-11 w-full items-center justify-between gap-3 px-5 py-4 text-left ${focusRing}`}
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="vt-badge-simulated">Simulasi Deterministik</span>
              <span className="font-sans text-base font-semibold text-primary">
                Metodologi &amp; Rumus Penilaian
              </span>
            </div>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-secondary transition-transform duration-200 ${
                showMethodology ? "rotate-180" : ""
              }`}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </button>
          {showMethodology && (
            <div className="space-y-3 border-t border-default px-5 py-4 text-xs leading-relaxed text-secondary sm:text-sm">
              {category === "smartphone" ? (
                <p>
                  Untuk kategori <strong className="text-primary">Smartphone / HP</strong>, setiap perangkat dinormalisasi pada rentang <span className="font-mono text-primary">0–100</span> berdasarkan Performa Chipset (SoC), Panel &amp; Refresh Rate layar, Gabungan Kapasitas Baterai (<span className="font-mono">mAh</span>) + Kecepatan Charging (<span className="font-mono">W</span>), Kamera, dan Indeks <em>Price-to-Performance</em> per Rp 1 juta.
                </p>
              ) : (
                <p>
                  Setiap perangkat dinilai menggunakan empat sub-skor ternormalisasi pada rentang <span className="font-mono text-primary">0–100</span>: Performa Utama, Indeks <em>Price-to-Performance</em> (skor per Rp 1 juta), Efisiensi Termal/Daya (skor per Watt TDP), dan Masa Pakai Platform (soket/DDR/VRAM).
                </p>
              )}
              <p>
                Bobot aktif untuk skenario <strong className="text-primary">{activeScenario.label}</strong>:{" "}
                <span className="font-medium text-primary">{activeScenario.weightBreakdownText}</span>. Ambang verdict: Unggul Telak (<span className="font-mono">&gt;= 10</span> poin), Menang Tipis (<span className="font-mono">3–9.9</span> poin), Seimbang (<span className="font-mono">&lt; 3</span> poin).
              </p>
            </div>
          )}
        </section>
      </div>

      {pickerSide && (
        <ItemPickerDrawer
          categoryLabel={catMeta.label}
          sideLabel={pickerSide === "a" ? "Kandidat A" : "Kandidat B"}
          items={items}
          otherId={pickerSide === "a" ? itemB.id : itemA.id}
          currentId={pickerSide === "a" ? itemA.id : itemB.id}
          triggerRef={pickerSide === "a" ? buttonARef : buttonBRef}
          onPick={(pickedId) => handlePick(pickerSide, pickedId)}
          onClose={() => setPickerSide(null)}
        />
      )}
    </div>
  );
}
