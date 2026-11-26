import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  CircuitBoard,
  Cpu,
  Download,
  ExternalLink,
  Gauge,
  LoaderCircle,
  MemoryStick,
  Monitor,
  RefreshCw,
  Search,
  Share2,
  ShieldAlert,
  Sparkles,
  Store,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { openAiConsultation } from "@/lib/ai/open-ai-consultation";
import { listHardwareComponents } from "@/lib/hardware/components";
import { buildMarketCatalogUrl, matchPartToMarket } from "@/lib/part-matcher";
import { formatVersusIdr } from "@/lib/algorithms/versusEngine";
import { generateBottleneckCardPng } from "@/lib/algorithms/bottleneckCardCanvas";
import {
  BOTTLENECK_SCENARIOS,
  BOTTLENECK_SCENARIO_META,
  CURATED_BOTTLENECK_CATALOG,
  analyzeBottleneck,
  mergeBottleneckCatalog,
} from "@/lib/algorithms/bottleneckEngine";
import styles from "./bottleneck-analyzer.module.css";

const DEFAULT_SELECTION = {
  cpuId: "i5-12400f",
  gpuId: "rtx-3060",
  ramId: "d4-16",
  moboId: "b660m-d4",
  psuId: "psu-550",
  scenario: "1440p_aaa",
};

const SEVERITY_UI = {
  optimal: {
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
    strokeClass: "stroke-emerald-600",
    textClass: "text-emerald-700",
    Icon: CheckCircle2,
  },
  warning: {
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
    strokeClass: "stroke-amber-500",
    textClass: "text-amber-700",
    Icon: AlertTriangle,
  },
  high: {
    badgeClass: "border-rose-200 bg-rose-50 text-rose-800",
    strokeClass: "stroke-rose-600",
    textClass: "text-rose-700",
    Icon: ShieldAlert,
  },
};

const PSU_STATUS_UI = {
  safe: {
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
    barClass: "bg-emerald-600",
    strokeClass: "stroke-emerald-600",
    segmentActive: "bg-emerald-600",
  },
  tight: {
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
    barClass: "bg-amber-500",
    strokeClass: "stroke-amber-500",
    segmentActive: "bg-amber-500",
  },
  insufficient: {
    badgeClass: "border-rose-200 bg-rose-50 text-rose-800",
    barClass: "bg-rose-600",
    strokeClass: "stroke-rose-600",
    segmentActive: "bg-rose-600",
  },
  unspecified: {
    badgeClass: "border-default bg-subtle text-secondary",
    barClass: "bg-secondary/40",
    strokeClass: "stroke-secondary/40",
    segmentActive: "bg-secondary/40",
  },
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";
const selectClass = `vt-form-control min-h-11 w-full rounded-lg border border-default bg-canvas px-3 py-2.5 text-sm text-primary ${focusRing}`;

const RING_RADIUS = 56;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function BottleneckGaugeMeter({ pct, severity, statusBadge }) {
  const sevStyle = SEVERITY_UI[severity];
  const SevIcon = sevStyle.Icon;
  const clampedFraction = Math.min(1, Math.max(0.03, pct / 50));
  const dashOffset = RING_CIRCUMFERENCE * (1 - clampedFraction);
  const obsidianBadge =
    severity === "optimal"
      ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
      : severity === "warning"
        ? "border-amber-400/30 bg-amber-500/15 text-amber-300"
        : "border-rose-400/30 bg-rose-500/15 text-rose-300";

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-40 w-40">
        <svg
          viewBox="0 0 144 144"
          className="h-full w-full -rotate-90"
          role="img"
          aria-label={`Skor bottleneck ${pct.toFixed(1)} persen, status ${statusBadge}`}
        >
          <circle
            cx="72"
            cy="72"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="12"
            className="stroke-white/10"
          />
          <circle
            cx="72"
            cy="72"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            className={`${sevStyle.strokeClass} transition-[stroke-dashoffset,stroke] duration-500 ease-out motion-reduce:transition-none`}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <AnimatedNumber
            value={pct}
            format="percent"
            decimals={1}
            className="font-mono text-3xl font-bold tracking-tight tabular-nums text-[#FAFAFA]"
          />
          <span className="mt-0.5 text-[11px] font-medium text-[#A1A1AA]">
            Bottleneck
          </span>
        </div>
      </div>

      <span
        className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-300 ${obsidianBadge}`}
      >
        <SevIcon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        <span>{statusBadge}</span>
      </span>

      <ul className="mt-3 flex flex-wrap justify-center gap-x-3.5 gap-y-1 text-[11px] text-[#A1A1AA]">
        <li className="inline-flex items-center gap-1.5">
          <span className="vt-pixel-led bg-emerald-400" aria-hidden="true" />
          <span className="font-mono font-semibold tabular-nums text-emerald-400">&lt;10%</span> Optimal
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="vt-pixel-led bg-amber-400" aria-hidden="true" />
          <span className="font-mono font-semibold tabular-nums text-amber-400">10–19.9%</span> Perhatian
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="vt-pixel-led bg-rose-400" aria-hidden="true" />
          <span className="font-mono font-semibold tabular-nums text-rose-400">≥20%</span> Bottleneck
        </li>
      </ul>
    </div>
  );
}

function GpuScaledBar({ label, valuePct, badgeLabel, barColorClass, dark = false }) {
  const clampedScale = Math.max(0.04, Math.min(1, valuePct / 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`font-medium ${dark ? "text-[#FAFAFA]" : "text-primary"}`}>{label}</span>
          {badgeLabel && (
            <span
              className={`vt-pixel-tag rounded border px-2 py-0.5 ${
                dark
                  ? "border-accent-primary/40 bg-accent-primary/20 text-orange-300"
                  : "border-accent-primary/30 bg-accent-subtle text-accent-hover"
              }`}
            >
              {badgeLabel}
            </span>
          )}
        </div>
        <span className={`font-mono tabular-nums font-bold ${dark ? "text-[#FAFAFA]" : "text-primary"}`}>
          {Math.round(valuePct)}%
        </span>
      </div>
      <div
        className={`h-2.5 overflow-hidden ${dark ? "vt-pixel-bar rounded-[3px] bg-white/10" : "rounded-full bg-subtle"}`}
        role="presentation"
      >
        <div
          className={`h-full w-full origin-left transition-transform duration-500 ease-out motion-reduce:transition-none ${dark ? "rounded-[2px]" : "rounded-full"} ${barColorClass}`}
          style={{ transform: `scaleX(${clampedScale})` }}
        />
      </div>
    </div>
  );
}

function getHardwareTier(score) {
  if (score >= 85) return "Flagship";
  if (score >= 68) return "High-End";
  if (score >= 48) return "Mid-Range";
  return "Entry";
}

function HardwareSearchCombobox({
  id,
  label,
  Icon,
  items,
  selectedId,
  onSelect,
  placeholder,
  getSubtitle,
  getTier,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedItem = items.find((item) => item.id === selectedId) ?? items[0];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const hay = `${item.name} ${getSubtitle(item)} ${getTier(item)} ${item.id}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, search, getSubtitle, getTier]);

  useEffect(() => {
    setActiveIndex(0);
  }, [search, open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const handleChoose = (item) => {
    onSelect(item.id);
    setOpen(false);
    setSearch("");
  };

  const handleKeyDown = (event) => {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
    } else if (event.key === "Enter" && filtered[activeIndex]) {
      event.preventDefault();
      handleChoose(filtered[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
      setSearch("");
    }
  };

  const listboxId = `${id}-listbox`;

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="mb-1.5 flex items-center justify-between gap-2 text-sm font-medium text-primary">
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
          <span>{label}</span>
        </span>
        {selectedItem && (
          <span className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[10px] font-semibold text-secondary">
            {getTier(selectedItem)}
          </span>
        )}
      </label>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered[activeIndex] ? `${id}-opt-${filtered[activeIndex].id}` : undefined}
          value={open ? search : selectedItem?.name ?? ""}
          placeholder={open ? placeholder : selectedItem?.name ?? placeholder}
          onFocus={() => {
            setOpen(true);
            setSearch("");
          }}
          onChange={(event) => {
            if (!open) setOpen(true);
            setSearch(event.target.value);
          }}
          onKeyDown={handleKeyDown}
          className={`vt-form-control min-h-11 w-full rounded-lg border border-default bg-canvas py-2.5 pl-9 pr-10 text-sm text-primary placeholder:text-secondary ${focusRing}`}
        />
        {open && search ? (
          <button
            type="button"
            aria-label={`Hapus pencarian ${label}`}
            onClick={() => {
              setSearch("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-secondary hover:bg-subtle hover:text-primary"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            aria-label={open ? `Tutup daftar ${label}` : `Buka daftar ${label}`}
            onClick={() => {
              setOpen((prev) => !prev);
              if (!open) {
                setSearch("");
                inputRef.current?.focus();
              }
            }}
            className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-secondary hover:bg-subtle hover:text-primary"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
        )}
      </div>

      {selectedItem && !open && (
        <p className="mt-1 font-mono text-[11px] text-secondary">
          {getSubtitle(selectedItem)}
        </p>
      )}

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={`Daftar pilihan ${label}`}
          className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-default bg-surface p-1 shadow-lg"
        >
          {filtered.length > 0 ? (
            filtered.map((item, idx) => {
              const isSelected = item.id === selectedId;
              const isHighlighted = idx === activeIndex;
              return (
                <li
                  key={item.id}
                  id={`${id}-opt-${item.id}`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleChoose(item);
                    }}
                    className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors sm:text-sm ${
                      isSelected
                        ? "bg-accent-subtle font-semibold text-accent-cta"
                        : isHighlighted
                          ? "bg-subtle text-primary"
                          : "text-primary hover:bg-subtle"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{item.name}</span>
                      <span className="block truncate font-mono text-[11px] text-secondary">
                        {getSubtitle(item)} · {getTier(item)}
                      </span>
                    </span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-accent-cta" strokeWidth={2} aria-hidden="true" />}
                  </button>
                </li>
              );
            })
          ) : (
            <li className="px-3 py-3 text-center text-xs text-secondary">
              Tidak ditemukan komponen untuk “{search}”.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function findBottleneckMatch(list, rawHint) {
  if (!Array.isArray(list) || !list.length || !rawHint) return null;
  const clean = String(rawHint).trim().toLowerCase();
  if (!clean) return null;

  const exact = list.find((item) => item.id.toLowerCase() === clean || item.name.toLowerCase() === clean);
  if (exact) return exact;

  const prefix = list.find(
    (item) =>
      item.id.toLowerCase().startsWith(clean) ||
      clean.startsWith(item.id.toLowerCase()),
  );
  if (prefix) return prefix;

  const normalized = clean.replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter((t) => t.length >= 2);
  if (!normalized.length) return null;
  let best = null;
  let bestScore = 0;
  for (const item of list) {
    const hay = `${item.id} ${item.name}`.toLowerCase();
    let score = 0;
    for (const token of normalized) {
      if (hay.includes(token)) score += token.length >= 4 ? 2 : 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return bestScore >= 2 ? best : null;
}

export default function BottleneckAnalyzer({ onSwapToPreset, marketProducts = [] }) {
  const { t } = useLanguage();
  const bn = t.routes.bottleneck;
  const [remoteComponents, setRemoteComponents] = useState([]);
  const [catalogNotice, setCatalogNotice] = useState("");
  const [selection, setSelection] = useState(DEFAULT_SELECTION);
  const [actionNote, setActionNote] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const appliedQueryRef = useRef(false);

  useEffect(() => {
    if (!shareStatus) return undefined;
    const timer = window.setTimeout(() => setShareStatus(""), 3200);
    return () => window.clearTimeout(timer);
  }, [shareStatus]);

  useEffect(() => {
    let active = true;
    listHardwareComponents({ activeOnly: true })
      .then((components) => {
        if (active) setRemoteComponents(components);
      })
      .catch(() => {
        if (active) {
          setCatalogNotice("Inventaris komponen Supabase belum tersambung; menggunakan katalog simulasi terkurasi.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const catalog = useMemo(
    () => mergeBottleneckCatalog(remoteComponents),
    [remoteComponents],
  );

  // Terima konfigurasi langsung dari Preset Builder via query params (?cpu=...&gpu=...&ram=...&mobo=...&psu=...)
  useEffect(() => {
    if (appliedQueryRef.current || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cpuParam = params.get("cpu");
    const gpuParam = params.get("gpu");
    const ramParam = params.get("ram");
    const moboParam = params.get("mobo");
    const psuParam = params.get("psu");
    const scenarioParam = params.get("scenario");

    if (!cpuParam && !gpuParam && !ramParam && !moboParam && !psuParam) return;
    appliedQueryRef.current = true;

    const matchedCpu = findBottleneckMatch(catalog.cpus, cpuParam);
    const matchedGpu = findBottleneckMatch(catalog.gpus, gpuParam);
    const matchedRam = findBottleneckMatch(catalog.rams, ramParam);
    const matchedMobo = findBottleneckMatch(catalog.motherboards, moboParam);
    let matchedPsu = findBottleneckMatch(catalog.psus, psuParam);
    if (!matchedPsu && psuParam) {
      const wattNum = Number(String(psuParam).replace(/[^\d]/g, ""));
      if (Number.isFinite(wattNum) && wattNum > 0) {
        const sortedPsus = [...catalog.psus].sort((a, b) => a.wattage - b.wattage);
        matchedPsu = sortedPsus.find((p) => p.wattage >= wattNum) || sortedPsus[sortedPsus.length - 1] || null;
      }
    }

    setSelection((prev) => ({
      ...prev,
      cpuId: matchedCpu?.id ?? prev.cpuId,
      gpuId: matchedGpu?.id ?? prev.gpuId,
      ramId: matchedRam?.id ?? prev.ramId,
      moboId: matchedMobo?.id ?? prev.moboId,
      psuId: matchedPsu?.id ?? prev.psuId,
      scenario:
        scenarioParam && BOTTLENECK_SCENARIOS.includes(scenarioParam)
          ? scenarioParam
          : prev.scenario,
    }));
    setActionNote("Konfigurasi rakitan dari Preset Builder berhasil dimuat untuk analisis bottleneck.");
  }, [catalog]);

  const selectedCpu =
    catalog.cpus.find((c) => c.id === selection.cpuId) ?? CURATED_BOTTLENECK_CATALOG.cpus[0];
  const selectedGpu =
    catalog.gpus.find((g) => g.id === selection.gpuId) ?? CURATED_BOTTLENECK_CATALOG.gpus[0];
  const selectedRam = selection.ramId
    ? catalog.rams.find((r) => r.id === selection.ramId) ?? null
    : null;
  const selectedMobo = selection.moboId
    ? catalog.motherboards.find((m) => m.id === selection.moboId) ?? null
    : null;
  const selectedPsu = selection.psuId
    ? catalog.psus.find((p) => p.id === selection.psuId) ?? null
    : null;

  const result = useMemo(
    () =>
      analyzeBottleneck({
        cpu: selectedCpu,
        gpu: selectedGpu,
        ram: selectedRam,
        motherboard: selectedMobo,
        psu: selectedPsu,
        scenario: selection.scenario,
        availableCpus: catalog.cpus,
        availableGpus: catalog.gpus,
      }),
    [selectedCpu, selectedGpu, selectedRam, selectedMobo, selectedPsu, selection.scenario, catalog.cpus, catalog.gpus],
  );

  const sevUi = SEVERITY_UI[result.severity];
  const psuUi = PSU_STATUS_UI[result.psuHeadroom.status];

  const handleApplySuggestion = (suggestion) => {
    if (suggestion.targetKind === "cpu") {
      setSelection((prev) => ({ ...prev, cpuId: suggestion.candidateId }));
    } else {
      setSelection((prev) => ({ ...prev, gpuId: suggestion.candidateId }));
    }
    setActionNote(
      `Menerapkan ${suggestion.candidateName}: estimasi bottleneck turun dari ${suggestion.currentBottleneckPct.toFixed(1)}% menjadi ${suggestion.projectedBottleneckPct.toFixed(1)}%.`,
    );
  };

  const handleSendToPreset = () => {
    onSwapToPreset?.({
      cpu: selectedCpu.id,
      gpu: selectedGpu.id,
      ram: selectedRam?.id,
      psu: selectedPsu?.id,
    });
  };

  const handleAskViciAi = () => {
    const prompt = [
      `Halo ViciTech AI, tolong evaluasi hasil analisis bottleneck rakitan PC saya berikut ini:`,
      `- Skenario: ${result.scenario.label}`,
      `- CPU: ${selectedCpu.name} (${selectedCpu.socket}, ${selectedCpu.tdpWatts} W)`,
      `- GPU: ${selectedGpu.name} (${selectedGpu.vramGb > 0 ? `${selectedGpu.vramGb} GB VRAM` : "iGPU"}, ${selectedGpu.tdpWatts} W)`,
      `- RAM: ${selectedRam ? `${selectedRam.name} (${selectedRam.memoryType})` : "Belum dipilih"}`,
      `- PSU: ${selectedPsu ? selectedPsu.name : "Belum dipilih"}`,
      `- Hasil Bottleneck: ${result.bottleneckPct.toFixed(1)}% (${result.directionLabel} — ${result.statusBadge})`,
      `- Headroom PSU: Estimasi beban ${result.psuHeadroom.estimatedWattage} W, saran PSU minimal ${result.psuHeadroom.recommendedPsuWatts} W (${result.psuHeadroom.statusLabel})`,
      `Apakah kombinasi ini sudah ideal untuk jangka panjang, atau ada saran upgrade komponen yang lebih seimbang dari katalog ViciTech?`,
    ].join("\n");
    openAiConsultation(prompt);
  };

  const handleShareOrDownloadCard = async () => {
    if (isGeneratingCard) return;
    setIsGeneratingCard(true);
    setShareStatus("");
    try {
      const blob = await generateBottleneckCardPng({
        cpuName: selectedCpu.name,
        gpuName: selectedGpu.name,
        ramName: selectedRam ? `${selectedRam.name} (${selectedRam.memoryType})` : "Tidak ditentukan",
        moboName: selectedMobo ? selectedMobo.name : "Tidak ditentukan",
        psuName: selectedPsu ? selectedPsu.name : "Belum dipilih",
        result,
      });

      const fileName = `vicitech-bottleneck-${selectedCpu.id}-${selectedGpu.id}.png`;
      const shareFile = typeof File !== "undefined" ? new File([blob], fileName, { type: "image/png" }) : null;

      if (
        shareFile &&
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [shareFile] }) &&
        typeof navigator.share === "function"
      ) {
        try {
          await navigator.share({
            title: "Hasil Analisis Bottleneck ViciTech",
            text: `${selectedCpu.name} + ${selectedGpu.name} (${result.bottleneckPct.toFixed(1)}% · ${result.statusBadge})`,
            files: [shareFile],
          });
          setShareStatus("Kartu hasil siap dibagikan!");
          return;
        } catch (shareErr) {
          if (shareErr instanceof Error && shareErr.name === "AbortError") {
            return;
          }
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setShareStatus("Kartu hasil PNG berhasil diunduh! Siap unggah ke WhatsApp / IG Story.");
    } catch (err) {
      setShareStatus(err instanceof Error ? err.message : "Gagal membuat kartu hasil PNG.");
    } finally {
      setIsGeneratingCard(false);
    }
  };

  return (
    <div className="bg-canvas text-primary antialiased">
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 sm:pb-24 sm:pt-10 lg:px-8">
        <header className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="vt-badge-simulated">{bn.badge}</span>
            <span className="text-xs font-medium text-secondary">
              {bn.eyebrow}
            </span>
          </div>
          <h1 className="mt-3 flex items-center gap-3 font-sans text-3xl font-bold tracking-tight text-primary [text-wrap:balance] sm:text-4xl">
            <Gauge className="h-7 w-7 shrink-0 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
            <span>{bn.title}</span>
          </h1>
          <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-secondary sm:text-base">
            {bn.desc}
          </p>
        </header>

        {catalogNotice && (
          <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
            {catalogNotice}
          </p>
        )}

        {/* Scenario Selector Pills */}
        <section
          aria-label="Pilih skenario resolusi dan beban kerja"
          className="mt-7 rounded-xl border border-default bg-surface p-3.5 shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Target Skenario">
            {BOTTLENECK_SCENARIOS.map((scenarioId) => {
              const meta = BOTTLENECK_SCENARIO_META[scenarioId];
              const isSelected = selection.scenario === scenarioId;
              return (
                <button
                  key={scenarioId}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => {
                    setSelection((prev) => ({ ...prev, scenario: scenarioId }));
                    setActionNote("");
                  }}
                  className={`vt-btn-tactile min-h-11 rounded-full px-4 py-2 text-xs font-semibold sm:text-sm ${focusRing} ${
                    isSelected
                      ? "bg-accent-cta text-white hover:bg-accent-cta-hover"
                      : "border border-default bg-canvas text-secondary hover:bg-subtle hover:text-primary"
                  }`}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-secondary">
            {result.scenario.description}
          </p>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          {/* Left Panel: Hardware Inputs */}
          <section
            aria-labelledby="pairing-heading"
            className="space-y-4 rounded-xl border border-default bg-surface p-5 shadow-sm lg:sticky lg:top-24 lg:col-span-5 lg:self-start"
          >
            <div className="flex items-center justify-between gap-2 border-b border-default pb-3">
              <h2 id="pairing-heading" className="tracking-tight font-sans text-xl font-bold text-primary">
                Konfigurasi Komponen
              </h2>
              <button
                type="button"
                onClick={() => {
                  setSelection(DEFAULT_SELECTION);
                  setActionNote("");
                }}
                className={`vt-btn-tactile inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-surface px-3 py-2 text-xs font-medium text-secondary hover:bg-subtle hover:text-primary ${focusRing}`}
              >
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                <span>Reset</span>
              </button>
            </div>

            <HardwareSearchCombobox
              id="bn-cpu"
              label="Prosesor (CPU)"
              Icon={Cpu}
              items={catalog.cpus}
              selectedId={selectedCpu.id}
              placeholder="Ketik merek/seri CPU (cth. Intel, Ryzen 5, 7800X3D)…"
              getSubtitle={(cpu) => `${cpu.socket} · ${cpu.tdpWatts} W`}
              getTier={(cpu) => getHardwareTier(Math.max(cpu.gamingScore, cpu.multiCoreScore))}
              onSelect={(cpuId) => {
                setSelection((prev) => ({ ...prev, cpuId }));
                setActionNote("");
              }}
            />

            <HardwareSearchCombobox
              id="bn-gpu"
              label="Kartu Grafis (GPU)"
              Icon={Monitor}
              items={catalog.gpus}
              selectedId={selectedGpu.id}
              placeholder="Ketik merek/seri GPU (cth. RTX 4060, RX 6600, 4070)…"
              getSubtitle={(gpu) => `${gpu.vramGb > 0 ? `${gpu.vramGb} GB VRAM` : "Shared RAM"} · ${gpu.tdpWatts} W`}
              getTier={(gpu) => getHardwareTier(gpu.rasterScore)}
              onSelect={(gpuId) => {
                setSelection((prev) => ({ ...prev, gpuId }));
                setActionNote("");
              }}
            />

            <div>
              <label htmlFor="bn-ram" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-primary">
                <MemoryStick className="h-4 w-4 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
                <span>Kapasitas &amp; Tipe RAM (Opsional)</span>
              </label>
              <select
                id="bn-ram"
                value={selection.ramId}
                onChange={(event) => {
                  setSelection((prev) => ({ ...prev, ramId: event.target.value }));
                  setActionNote("");
                }}
                className={selectClass}
              >
                <option value="">-- Tanpa evaluasi RAM spesifik --</option>
                {catalog.rams.map((ram) => (
                  <option key={ram.id} value={ram.id}>
                    {ram.name} ({ram.memoryType})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bn-mobo" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-primary">
                <CircuitBoard className="h-4 w-4 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
                <span>Motherboard &amp; Soket (Opsional)</span>
              </label>
              <select
                id="bn-mobo"
                value={selection.moboId}
                onChange={(event) => {
                  setSelection((prev) => ({ ...prev, moboId: event.target.value }));
                  setActionNote("");
                }}
                className={selectClass}
              >
                <option value="">-- Tanpa pengecekan motherboard spesifik --</option>
                {catalog.motherboards.map((mobo) => (
                  <option key={mobo.id} value={mobo.id}>
                    {mobo.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bn-psu" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-primary">
                <Zap className="h-4 w-4 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
                <span>Power Supply / PSU (Opsional)</span>
              </label>
              <select
                id="bn-psu"
                value={selection.psuId}
                onChange={(event) => {
                  setSelection((prev) => ({ ...prev, psuId: event.target.value }));
                  setActionNote("");
                }}
                className={selectClass}
              >
                <option value="">-- Belum memilih PSU --</option>
                {catalog.psus.map((psu) => (
                  <option key={psu.id} value={psu.id}>
                    {psu.name}
                  </option>
                ))}
              </select>
            </div>

            {actionNote && (
              <div
                role="status"
                aria-live="polite"
                className="vt-pop flex items-start justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-900"
              >
                <span className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" strokeWidth={1.75} aria-hidden="true" />
                  <span>{actionNote}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActionNote("")}
                  aria-label="Tutup notifikasi penyeimbangan"
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-emerald-800 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/50"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-default pt-4 text-sm">
              <span className="text-secondary">Estimasi Harga Komponen</span>
              <span className="text-base font-semibold text-primary">
                <AnimatedNumber value={result.totalSelectedPriceIdr} format="currency" />
              </span>
            </div>

            <button
              type="button"
              onClick={handleSendToPreset}
              className={`vt-btn-tactile inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-cta px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-cta-hover ${focusRing}`}
            >
              <span>Kirim ke Preset Builder</span>
              <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </section>

          {/* Right Panel: Telemetry Output */}
          <div className="space-y-6 lg:col-span-7">
            {/* Obsidian Telemetry Highlight Card: Bottleneck Gauge & Effective Load */}
            <section
              aria-labelledby="gauge-heading"
              className="vt-obsidian-panel rounded-2xl p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3.5">
                <h2 id="gauge-heading" className="tracking-tight flex items-center gap-2 font-sans text-lg font-bold text-[#FAFAFA] sm:text-xl">
                  <Activity className="h-5 w-5 text-[#EA580C]" strokeWidth={1.75} aria-hidden="true" />
                  <span>Meter Bottleneck: {result.scenario.label}</span>
                </h2>
                <span className="font-mono text-xs text-[#A1A1AA]">
                  {result.projectedMetricLabel}:{" "}
                  <strong className="text-[#FAFAFA]">
                    <AnimatedNumber value={result.projectedMetricValue} format="number" /> {result.projectedMetricUnit}
                  </strong>
                </span>
              </div>

              <div className="mt-5 grid items-center gap-6 md:grid-cols-12">
                <div className="md:col-span-5">
                  <BottleneckGaugeMeter
                    pct={result.bottleneckPct}
                    severity={result.severity}
                    statusBadge={result.statusBadge}
                  />
                </div>

                <div className="space-y-4 md:col-span-7">
                  <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3.5 text-sm text-[#FAFAFA]">
                    <p className="font-bold text-[#FAFAFA]">{result.directionLabel}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#A1A1AA] sm:text-sm">
                      {result.explanation}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <GpuScaledBar
                      dark
                      label={`Utilisasi CPU (${selectedCpu.name})`}
                      valuePct={result.cpuUtilizationPct}
                      badgeLabel={result.direction === "cpu" ? "Pembatas Utama" : undefined}
                      barColorClass={result.direction === "cpu" ? "bg-[#EA580C]" : "bg-emerald-500"}
                    />
                    <GpuScaledBar
                      dark
                      label={`Utilisasi GPU (${selectedGpu.name})`}
                      valuePct={result.gpuUtilizationPct}
                      badgeLabel={result.direction === "gpu" ? "Pembatas Utama" : undefined}
                      barColorClass={result.direction === "gpu" ? "bg-[#EA580C]" : "bg-emerald-500"}
                    />
                  </div>
                </div>
              </div>

              {/* Aksi Cepat Hasil: Tanya ViciTech AI & Bagikan / Unduh Kartu PNG */}
              <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={handleAskViciAi}
                  className={`vt-motion-press vt-btn-tactile inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#C2410C] active:scale-[0.98] sm:flex-initial sm:text-sm ${focusRing}`}
                >
                  <Bot className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span>Tanya ViciTech AI soal Hasil Ini</span>
                </button>

                <button
                  type="button"
                  disabled={isGeneratingCard}
                  onClick={() => void handleShareOrDownloadCard()}
                  className={`vt-motion-press vt-btn-tactile inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-xs font-semibold text-[#FAFAFA] hover:border-[#EA580C]/60 hover:bg-white/[0.12] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 sm:flex-initial sm:text-sm ${focusRing}`}
                >
                  {isGeneratingCard ? (
                    <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-[#EA580C]" aria-hidden="true" />
                  ) : (
                    <Download className="h-4 w-4 shrink-0 text-[#EA580C]" strokeWidth={1.75} aria-hidden="true" />
                  )}
                  <span>{isGeneratingCard ? "Menyiapkan Kartu…" : "Bagikan / Unduh Kartu Hasil"}</span>
                </button>
              </div>

              {shareStatus && (
                <div
                  role="status"
                  aria-live="polite"
                  className="vt-pop mt-3 inline-flex w-full items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-900"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" strokeWidth={2} aria-hidden="true" />
                    <span>{shareStatus}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShareStatus("")}
                    aria-label="Tutup notifikasi kartu hasil"
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-emerald-800 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/50"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </section>

            {/* Concrete 4-Scenario Simulation Benchmarks */}
            <section
              aria-labelledby="scenario-bench-heading"
              className="rounded-xl border border-default bg-surface p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-default pb-3">
                <div>
                  <h2 id="scenario-bench-heading" className="tracking-tight font-sans text-lg font-bold text-primary">
                    Simulasi Performa Nyata · {result.scenario.label}
                  </h2>
                  <p className="mt-0.5 text-xs text-secondary">
                    Kisaran performa pada 4 judul/aplikasi populer sesuai skenario yang dipilih.
                  </p>
                </div>
                <span className="vt-badge-simulated">Estimasi Simulasi</span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {result.scenarioBenchmarks.map((item) => {
                  const tierBarClass =
                    item.tierLabel === "Sangat Lancar"
                      ? "bg-emerald-600"
                      : item.tierLabel === "Lancar"
                        ? "bg-accent-primary"
                        : item.tierLabel === "Cukup"
                          ? "bg-amber-500"
                          : "bg-rose-600";
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-default bg-canvas p-3.5 transition-colors hover:border-accent-primary/35"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-primary">{item.title}</p>
                          <p className="truncate text-[11px] text-secondary">{item.preset}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            item.tierLabel === "Sangat Lancar"
                              ? "bg-emerald-50 text-emerald-800"
                              : item.tierLabel === "Lancar"
                                ? "bg-accent-subtle text-accent-cta"
                                : item.tierLabel === "Cukup"
                                  ? "bg-amber-50 text-amber-800"
                                  : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {item.tierLabel}
                        </span>
                      </div>
                      <div className="mt-2.5 flex items-baseline justify-between gap-2">
                        <p className="font-mono text-base font-bold tabular-nums text-primary">
                          {item.metricDisplay}
                        </p>
                        <span className="font-mono text-[10px] text-secondary">
                          {Math.round(item.barPct)}% indeks
                        </span>
                      </div>
                      <div className="vt-pixel-bar mt-2 h-2 overflow-hidden rounded-[3px] bg-subtle">
                        <div
                          className={`h-full rounded-[2px] transition-all duration-500 motion-reduce:transition-none ${tierBarClass}`}
                          style={{ width: `${item.barPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-secondary">
                Catatan: Angka merupakan <strong>Estimasi Simulasi</strong> berbasis skor CPU/GPU/RAM/VRAM dan dapat bervariasi tergantung patch game, driver, serta suhu perangkat.
              </p>
            </section>

            {/* PSU Headroom (Obsidian Telemetry) & Compatibility Checklist */}
            <div className="grid gap-6 md:grid-cols-2">
              <section
                aria-labelledby="psu-heading"
                className="vt-obsidian-panel rounded-2xl p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <h2 id="psu-heading" className="tracking-tight flex items-center gap-2 font-sans text-lg font-bold text-[#FAFAFA]">
                    <Zap className="h-4 w-4 text-[#EA580C]" strokeWidth={1.75} aria-hidden="true" />
                    <span>Headroom Daya PSU</span>
                  </h2>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors duration-300 ${psuUi.badgeClass}`}>
                    {result.psuHeadroom.statusLabel}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-xs text-[#A1A1AA]">Estimasi Beban</p>
                    <p className="mt-1 font-mono text-xl font-bold tabular-nums text-[#FAFAFA]">
                      <AnimatedNumber value={result.psuHeadroom.estimatedWattage} format="number" suffix=" W" />
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-xs text-[#A1A1AA]">Rekomendasi (+35%)</p>
                    <p className="mt-1 font-mono text-xl font-bold tabular-nums text-[#EA580C]">
                      <AnimatedNumber value={result.psuHeadroom.recommendedPsuWatts} format="number" suffix=" W" />
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#A1A1AA]">
                      {result.psuHeadroom.selectedPsuWatts
                        ? `Beban terhadap PSU ${result.psuHeadroom.selectedPsuWatts} W`
                        : "Belum ada PSU dipilih"}
                    </span>
                    <span className="font-mono tabular-nums font-bold text-[#FAFAFA]">
                      {result.psuHeadroom.loadPct !== null ? `${result.psuHeadroom.loadPct.toFixed(1)}%` : "-"}
                    </span>
                  </div>
                  {/* 10-Segment Health Bar */}
                  <div
                    role="meter"
                    aria-label="Persentase beban daya PSU"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={result.psuHeadroom.loadPct !== null ? Math.round(result.psuHeadroom.loadPct) : 0}
                    className="grid grid-cols-10 gap-1"
                  >
                    {Array.from({ length: 10 }, (_, segIdx) => {
                      const threshold = (segIdx + 1) * 10;
                      const active =
                        result.psuHeadroom.loadPct !== null &&
                        result.psuHeadroom.loadPct >= threshold - 5;
                      return (
                        <span
                          key={segIdx}
                          className={`h-2.5 rounded-sm transition-colors duration-300 motion-reduce:transition-none ${
                            active ? psuUi.segmentActive : "bg-white/10"
                          }`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-[#A1A1AA]">
                    <span>0% Aman</span>
                    <span>75% Ideal</span>
                    <span>90%+ Kritis</span>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-[#A1A1AA]">
                  {result.psuHeadroom.explanation}
                </p>
              </section>

              <section
                aria-labelledby="compat-heading"
                className="rounded-xl border border-default bg-surface p-5 shadow-sm"
              >
                <h2 id="compat-heading" className="tracking-tight border-b border-default pb-3 font-sans text-lg font-bold text-primary">
                  Daftar Periksa Kompatibilitas
                </h2>
                <ul className="mt-3 divide-y divide-default">
                  {result.compatibilityChecks.map((check) => {
                    const StatusIcon =
                      check.status === "pass"
                        ? CheckCircle2
                        : check.status === "warn"
                          ? AlertTriangle
                          : XCircle;
                    const iconTone =
                      check.status === "pass"
                        ? "text-emerald-700"
                        : check.status === "warn"
                          ? "text-amber-700"
                          : "text-red-700";

                    return (
                      <li key={check.id} className="flex items-start gap-2.5 py-2.5 text-xs">
                        <StatusIcon
                          className={`mt-0.5 h-4 w-4 shrink-0 ${iconTone}`}
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-primary">{check.label}</p>
                          <p className="mt-0.5 leading-relaxed text-secondary">{check.detail}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>

            {/* Actionable Upgrade Suggestions */}
            <section
              aria-labelledby="upgrade-rec-heading"
              className="rounded-xl border border-default bg-surface p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-default pb-3">
                <h2 id="upgrade-rec-heading" className="tracking-tight flex items-center gap-2 font-sans text-lg font-bold text-primary">
                  <Sparkles className="h-5 w-5 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
                  <span>Rekomendasi Penyeimbangan Otomatis</span>
                </h2>
                <span className="font-mono text-xs text-secondary">
                  Ambang Rekomendasi: &gt;= 12%
                </span>
              </div>

              {result.upgradeSuggestions.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {result.upgradeSuggestions.map((suggestion) => {
                    const partMatch = matchPartToMarket(
                      suggestion.candidateName,
                      suggestion.targetKind === "cpu" ? "cpu" : "gpu",
                      marketProducts,
                    );
                    return (
                      <li
                        key={suggestion.candidateId}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent-primary/25 bg-accent-subtle p-4"
                      >
                        <div className="min-w-0 flex-1 basis-56">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-primary">
                              Ganti {suggestion.targetKind === "cpu" ? "CPU" : "GPU"} ke {suggestion.candidateName}
                            </p>
                            {partMatch.matched ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                <Store className="h-3 w-3" aria-hidden="true" />
                                {partMatch.badge}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full border border-default bg-surface px-2 py-0.5 text-[10px] font-medium text-secondary">
                                {partMatch.badge}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-secondary">
                            {suggestion.reason}
                          </p>
                          <p className="mt-1.5 font-mono text-xs font-medium text-accent-cta">
                            Bottleneck {suggestion.currentBottleneckPct.toFixed(1)}% -&gt;{" "}
                            {suggestion.projectedBottleneckPct.toFixed(1)}% (Turun{" "}
                            {suggestion.improvementPct.toFixed(1)}%) · Selisih{" "}
                            {suggestion.priceDeltaIdr >= 0
                              ? `+${formatVersusIdr(suggestion.priceDeltaIdr)}`
                              : `-${formatVersusIdr(Math.abs(suggestion.priceDeltaIdr))}`}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {partMatch.matched ? (
                            <Link
                              href={partMatch.href}
                              aria-label={`Beli ${suggestion.candidateName} di ViciTech Market`}
                              className={`vt-motion-press inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-emerald-300 bg-surface px-3.5 py-2 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 ${focusRing}`}
                            >
                              <Store className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                              <span>{partMatch.ctaLabel}</span>
                            </Link>
                          ) : (
                            <a
                              href={partMatch.href}
                              target="_blank"
                              rel="noopener noreferrer sponsored"
                              title={partMatch.badge}
                              aria-label={`Cek ${suggestion.candidateName} di Toko Resmi (Partner)`}
                              className={`vt-motion-press inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-surface px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:border-accent-primary/40 hover:text-accent-cta ${focusRing}`}
                            >
                              <span>{partMatch.ctaLabel}</span>
                              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleApplySuggestion(suggestion)}
                            className={`vt-btn-tactile min-h-11 rounded-lg bg-accent-cta px-4 py-2 text-xs font-semibold text-white hover:bg-accent-cta-hover sm:text-sm ${focusRing}`}
                          >
                            Terapkan
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-4 flex items-center gap-2 text-sm text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span>
                    {result.bottleneckPct < 10
                      ? `Pasangan komponen ini sudah optimal untuk ${result.scenario.label} (bottleneck di bawah 10%).`
                      : result.bottleneckPct < 12
                        ? `Selisih keseimbangan tergolong ringan (${result.bottleneckPct.toFixed(1)}%), masih di bawah ambang rekomendasi upgrade otomatis (12%).`
                        : "Tidak ditemukan kandidat pengganti lebih seimbang pada katalog aktif saat ini."}
                  </span>
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-default pt-3">
                <p className="text-xs text-secondary">
                  Cari stok komponen bergaransi IoT QC atau bandingkan harga di etalase resmi.
                </p>
                <Link
                  href={buildMarketCatalogUrl()}
                  className={`vt-motion-press inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-accent-primary/35 bg-accent-subtle px-3.5 py-2 text-xs font-semibold text-accent-cta transition-colors hover:bg-accent-primary/15 ${focusRing}`}
                >
                  <Store className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  <span>Cek Semua Komponen di Market</span>
                </Link>
              </div>
            </section>

            {/* Collapsible Methodology & Formula */}
            <section className="rounded-xl border border-default bg-surface">
              <button
                type="button"
                aria-expanded={showMethodology}
                onClick={() => setShowMethodology((prev) => !prev)}
                className={`vt-motion-press flex min-h-11 w-full items-center justify-between gap-3 px-5 py-4 text-left ${focusRing}`}
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="vt-badge-simulated">Model Simulasi ViciTech</span>
                  <span className="font-sans text-base font-semibold text-primary">
                    Metodologi &amp; Rumus
                  </span>
                </div>
                <ChevronDown
                  className={`vt-chevron h-4 w-4 shrink-0 text-secondary ${
                    showMethodology ? "rotate-180" : ""
                  }`}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </button>
              {showMethodology && (
                <div className="space-y-2.5 border-t border-default px-5 py-4 text-xs leading-relaxed text-secondary sm:text-sm">
                  <p>
                    1. <strong className="text-primary">Skor Efektif &amp; Bottleneck:</strong> Skor CPU dikalikan bobot skenario (misalnya{" "}
                    <span className="font-mono text-primary">0.85x</span> CPU /{" "}
                    <span className="font-mono text-primary">1.15x</span> GPU di 1080p Kompetitif, atau{" "}
                    <span className="font-mono text-primary">1.12x</span> CPU /{" "}
                    <span className="font-mono text-primary">0.95x</span> GPU di 4K Ultra) serta faktor kapasitas RAM dan VRAM. Persentase dihitung dari{" "}
                    <span className="font-mono text-primary">(1 - min(CPU, GPU) / max(CPU, GPU)) x 100%</span>.
                  </p>
                  <p>
                    2. <strong className="text-primary">Estimasi Watt &amp; Headroom PSU:</strong> Beban puncak sistem dihitung via{" "}
                    <span className="font-mono text-primary">TDP CPU + TDP GPU + 90 W</span> (board, drive, kipas), lalu kapasitas PSU yang disarankan dibulatkan ke kelipatan{" "}
                    <span className="font-mono text-primary">50 W</span> terdekat dari{" "}
                    <span className="font-mono text-primary">Estimasi Beban x 1.35</span> (margin aman 35% untuk lonjakan transien).
                  </p>
                  <p>
                    3. <strong className="text-primary">Ambang Status PSU:</strong> Beban{" "}
                    <span className="font-mono">&lt;= 75%</span> = Aman/Optimal,{" "}
                    <span className="font-mono">76–89%</span> = Mepet,{" "}
                    <span className="font-mono">&gt;= 90%</span> = Tidak Disarankan / Kurang Daya.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
