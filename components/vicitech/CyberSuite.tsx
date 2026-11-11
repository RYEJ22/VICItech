"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Cpu,
  Heart,
  MemoryStick,
  Radio,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Timer,
  Zap,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { CyberButton, CyberToast, QCStatusBadge, type CyberToastMessage } from "./CyberUI";
import SpotlightCard from "./SpotlightCard";

export interface HardwareItem {
  id: string;
  name: string;
  model: string;
  category: "motherboard" | "cpu" | "ram" | "psu";
  socket?: string;
  memoryType?: "DDR4" | "DDR5";
  watts?: number;
  capacityWatts?: number;
}

export interface QCTestResult {
  testId: string;
  testName: string;
  status: "pass" | "fail";
  metric: string;
  completedAt: string;
}

export interface CommunityPost {
  id: string;
  author: UserProfile;
  title: string;
  body: string;
  category: string;
  likes: number;
  timeAgo: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  handle: string;
  initials: string;
  role: string;
}

type TestId = "cpu" | "ram" | "gpu" | "storage";
type TestStatus = "idle" | "running" | "complete";

const HARDWARE: HardwareItem[] = [
  { id: "board-b760", name: "MSI PRO B760M-A", model: "LGA1700 · DDR5", category: "motherboard", socket: "LGA1700", memoryType: "DDR5" },
  { id: "board-b550", name: "ASUS TUF B550-PLUS", model: "AM4 · DDR4", category: "motherboard", socket: "AM4", memoryType: "DDR4" },
  { id: "cpu-14600k", name: "Intel Core i5-14600K", model: "14C / 20T · 3.5 GHz", category: "cpu", socket: "LGA1700", watts: 181 },
  { id: "cpu-7600", name: "AMD Ryzen 5 7600", model: "6C / 12T · 3.8 GHz", category: "cpu", socket: "AM5", watts: 88 },
  { id: "cpu-5600", name: "AMD Ryzen 5 5600", model: "6C / 12T · 3.5 GHz", category: "cpu", socket: "AM4", watts: 76 },
  { id: "ram-ddr5", name: "32 GB DDR5-6000", model: "2 × 16 GB · CL36", category: "ram", memoryType: "DDR5", watts: 10 },
  { id: "ram-ddr4", name: "32 GB DDR4-3600", model: "2 × 16 GB · CL18", category: "ram", memoryType: "DDR4", watts: 8 },
  { id: "psu-450", name: "450 W Bronze", model: "80+ Bronze · ATX", category: "psu", capacityWatts: 450 },
  { id: "psu-650", name: "650 W Gold", model: "80+ Gold · ATX", category: "psu", capacityWatts: 650 },
  { id: "psu-850", name: "850 W Gold", model: "80+ Gold · ATX 3.0", category: "psu", capacityWatts: 850 },
];

const TESTS: Array<{
  id: TestId;
  name: string;
  detail: string;
  icon: typeof Cpu;
  metric: string;
  failureMetric: string;
  stages: string[];
}> = [
  { id: "cpu", name: "CPU Stress", detail: "Multi-core thermal stability", icon: Cpu, metric: "Peak 71 °C · 4.8 GHz", failureMetric: "Thermal limit exceeded · throttling detected", stages: ["Initializing worker threads", "Applying AVX2 load profile", "Checking thermal throttling", "Validating core stability"] },
  { id: "ram", name: "RAM Integrity", detail: "Address & pattern verification", icon: MemoryStick, metric: "32 GB verified · 0 errors", failureMetric: "2 address errors · integrity mismatch", stages: ["Mapping memory blocks", "Writing test patterns", "Verifying address lines", "Checking ECC / parity"] },
  { id: "gpu", name: "GPU Telemetry", detail: "Sensor & render pipeline check", icon: Activity, metric: "68 °C · 99.2% utilization", failureMetric: "Sensor timeout · telemetry stream lost", stages: ["Reading sensor channels", "Starting render workload", "Sampling frame consistency", "Checking power envelope"] },
  { id: "storage", name: "Storage Health", detail: "SMART status & throughput scan", icon: ShieldCheck, metric: "98% health · 3,420 MB/s", failureMetric: "SMART warning · media health below threshold", stages: ["Reading SMART attributes", "Scanning media integrity", "Measuring sequential I/O", "Checking controller response"] },
];

const COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: "post-airflow",
    author: { id: "maya-builds", displayName: "Maya Chen", handle: "@mayamakes", initials: "MC", role: "System Builder" },
    title: "Quiet airflow, lower temps",
    body: "A small fan-curve change brought this workstation down by 8 °C without adding noise.",
    category: "THERMAL DESIGN",
    likes: 128,
    timeAgo: "12 min ago",
  },
  {
    id: "post-lab",
    author: { id: "lab-notes", displayName: "Lab Notes", handle: "@labnotes", initials: "LN", role: "Community Lab" },
    title: "DDR5 stability checklist",
    body: "Our quick memory validation flow before handing a new build over to its owner.",
    category: "FIELD GUIDE",
    likes: 84,
    timeAgo: "1 hr ago",
  },
];

const LIST_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export interface DiagnosticPanelProps {
  notify: (message: string, tone?: CyberToastMessage["tone"]) => void;
}

export function DiagnosticPanel({ notify }: DiagnosticPanelProps) {
  const [activeTest, setActiveTest] = useState<TestId>("cpu");
  const [statuses, setStatuses] = useState<Record<TestId, TestStatus>>({ cpu: "idle", ram: "idle", gpu: "idle", storage: "idle" });
  const [progress, setProgress] = useState<Record<TestId, number>>({ cpu: 0, ram: 0, gpu: 0, storage: 0 });
  const [results, setResults] = useState<QCTestResult[]>([]);
  const [logs, setLogs] = useState<string[]>(["[07:42:11] Diagnostic console ready", "[07:42:11] Hardware link: simulation mode"]);
  const [saving, setSaving] = useState(false);
  const [faultInjection, setFaultInjection] = useState(false);
  const currentTest = TESTS.find((test) => test.id === activeTest)!;
  const activeResult = results.find((item) => item.testId === activeTest);
  const isRunning = statuses[activeTest] === "running";

  useEffect(() => {
    if (!isRunning) return;
    const startedAt = Date.now();
    let lastStage = -1;
    const timer = window.setInterval(() => {
      const percent = Math.min(100, Math.floor(((Date.now() - startedAt) / 4000) * 100));
      setProgress((current) => ({ ...current, [activeTest]: percent }));
      const stageIndex = Math.min(currentTest.stages.length - 1, Math.floor((percent / 100) * currentTest.stages.length));
      if (stageIndex > lastStage) {
        lastStage = stageIndex;
        const timestamp = new Date().toLocaleTimeString("en-GB", { hour12: false });
        setLogs((current) => [...current.slice(-7), `[${timestamp}] ${currentTest.stages[stageIndex]}`]);
      }
      if (percent >= 100) {
        window.clearInterval(timer);
        const result: QCTestResult = {
          testId: activeTest,
          testName: currentTest.name,
          status: faultInjection ? "fail" : "pass",
          metric: faultInjection ? currentTest.failureMetric : currentTest.metric,
          completedAt: new Date().toISOString(),
        };
        setResults((current) => [...current.filter((item) => item.testId !== activeTest), result]);
        setStatuses((current) => ({ ...current, [activeTest]: "complete" }));
        const timestamp = new Date().toLocaleTimeString("en-GB", { hour12: false });
        const statusLabel = faultInjection ? "FAIL" : "PASS";
        const metric = faultInjection ? currentTest.failureMetric : currentTest.metric;
        setLogs((current) => [...current.slice(-7), `[${timestamp}] ${currentTest.name}: ${statusLabel} · ${metric}`]);
      }
    }, 80);
    return () => window.clearInterval(timer);
  }, [activeTest, currentTest, faultInjection, isRunning]);

  const runTest = () => {
    setProgress((current) => ({ ...current, [activeTest]: 0 }));
    setStatuses((current) => ({ ...current, [activeTest]: "running" }));
    setResults((current) => current.filter((item) => item.testId !== activeTest));
    const timestamp = new Date().toLocaleTimeString("en-GB", { hour12: false });
    setLogs((current) => [...current.slice(-7), `[${timestamp}] Starting ${currentTest.name} · simulated profile`]);
  };

  const saveReport = async () => {
    if (!results.length || saving) return;
    setSaving(true);
    try {
      const client = getSupabaseBrowserClient();
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError) throw new Error(`Could not verify your account: ${authError.message}`);
      if (!user) {
        notify("Sign in to save this QC report to your account.", "error");
        return;
      }
      const allComplete = results.length === TESTS.length;
      const overallStatus = allComplete
        ? results.some((result) => result.status === "fail") ? "fail" : "pass"
        : "in_progress";
      const { error } = await client.from("qc_test_reports").insert({
        user_id: user.id,
        overall_status: overallStatus,
        results,
        environment: "simulated",
      });
      if (error) throw new Error(`Could not save your QC report: ${error.message}`);
      notify("QC report saved to your ViciTech account.", "success");
    } catch (error) {
      console.error("[ViciTech OS] QC report save failed:", error);
      notify(error instanceof Error ? error.message : "Could not save the QC report.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SpotlightCard className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            <Activity className="h-4 w-4" /> IoT quality control
          </div>
          <h2 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Diagnostic bench</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Run component checks and save the report to your account.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-400/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/5 dark:text-amber-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500 dark:bg-amber-400" /> Simulation mode
        </span>
      </div>

      <div role="tablist" aria-label="Hardware tests" className="no-scrollbar mt-5 flex min-w-0 gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-1 transition-colors duration-200 dark:border-zinc-800 dark:bg-zinc-950/80">
        {TESTS.map((test) => {
          const Icon = test.icon;
          const selected = test.id === activeTest;
          return (
            <button
              key={test.id}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={isRunning && !selected}
              onClick={() => setActiveTest(test.id)}
              className={`flex min-w-fit flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${selected ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{test.name}</span>
              <span className="sm:hidden">{test.id.toUpperCase()}</span>
              {statuses[test.id] === "complete" && (
                results.find((item) => item.testId === test.id)?.status === "fail"
                  ? <AlertTriangle className="h-3 w-3 text-red-700 dark:text-red-300" />
                  : <Check className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 transition-colors duration-200 dark:border-zinc-800/80 dark:bg-zinc-950/65">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{currentTest.name}</h3>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-500">{currentTest.detail}</p>
          </div>
          {isRunning ? <QCStatusBadge status="testing" /> : activeResult ? <QCStatusBadge status={activeResult.status === "pass" ? "passed" : "failed"} /> : <span className="font-mono text-xs text-zinc-500">READY</span>}
        </div>
        <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800" role="progressbar" aria-label={`${currentTest.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress[activeTest]}>
          <motion.div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-300" animate={{ width: `${progress[activeTest]}%` }} transition={{ duration: 0.16, ease: "linear" }} />
          {isRunning && <motion.div aria-hidden="true" className="absolute inset-y-0 w-1 bg-amber-300 shadow-[0_0_12px_4px_rgba(251,191,36,0.55)]" animate={{ left: ["0%", "100%"] }} transition={{ duration: 1.15, repeat: Infinity, ease: "linear" }} />}
        </div>
        <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-zinc-500 dark:text-zinc-500">
          <span>{progress[activeTest]}% complete</span>
          <span>{isRunning ? "LASER SWEEP ACTIVE" : "TEST PROFILE · SIMULATED"}</span>
        </div>
        {statuses[activeTest] === "complete" && (
          <div className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${activeResult?.status === "fail" ? "border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-200" : "border-emerald-500/15 bg-emerald-500/5 text-emerald-800 dark:text-emerald-200"}`}>
            {activeResult?.status === "fail" ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {activeResult?.metric}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-600 dark:text-zinc-400"><Radio className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> DEVICE LINK · LOCAL SIMULATOR</span>
            <button type="button" aria-pressed={faultInjection} disabled={isRunning} onClick={() => setFaultInjection((current) => !current)} className={`rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-wide transition-colors duration-200 disabled:opacity-40 ${faultInjection ? "border-amber-500/30 bg-amber-400/10 text-amber-800 dark:text-amber-300" : "border-zinc-200 text-zinc-600 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"}`}>
              {faultInjection ? "Fault injection on" : "Nominal profile"}
            </button>
          </div>
          <CyberButton type="button" onClick={runTest} disabled={isRunning} className="px-3 py-2 text-xs">
            {isRunning ? <><Timer className="h-3.5 w-3.5 animate-pulse" /> Running test</> : <><Sparkles className="h-3.5 w-3.5" /> {statuses[activeTest] === "complete" ? "Run again" : "Run test"}</>}
          </CyberButton>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-100 p-3.5 transition-colors duration-200 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-2 flex items-center gap-2 border-b border-zinc-200 pb-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500 dark:border-zinc-800">
          <span className="flex gap-1"><i className="h-1.5 w-1.5 rounded-full bg-red-400/80" /><i className="h-1.5 w-1.5 rounded-full bg-amber-400/80" /><i className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" /></span>
          QC_EVENT_STREAM
        </div>
        <div aria-live="polite" className="min-h-[104px] space-y-1 font-mono text-[10px] leading-4 text-zinc-600 dark:text-zinc-400">
          {logs.map((line, index) => <p key={`${index}-${line}`} className={line.includes("FAIL") ? "text-red-700 dark:text-red-300" : line.includes("PASS") ? "text-emerald-700 dark:text-emerald-300" : line.includes("Starting") ? "text-amber-800 dark:text-amber-300" : ""}>{line}</p>)}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[10px] text-zinc-600 dark:text-zinc-500">{results.length}/{TESTS.length} CHECKS RECORDED</span>
        <CyberButton type="button" variant="secondary" onClick={saveReport} disabled={!results.length || saving} className="text-xs">
          <ShieldCheck className="h-3.5 w-3.5" /> {saving ? "Saving report…" : "Save report to Supabase"}
        </CyberButton>
      </div>
    </SpotlightCard>
  );
}

export function HardwareBuilder() {
  const [selected, setSelected] = useState<Record<HardwareItem["category"], string>>({
    motherboard: "board-b760",
    cpu: "cpu-14600k",
    ram: "ram-ddr5",
    psu: "psu-650",
  });
  const parts = useMemo(() => Object.fromEntries(
    Object.entries(selected).map(([category, id]) => [category, HARDWARE.find((item) => item.id === id)!]),
  ) as Record<HardwareItem["category"], HardwareItem>, [selected]);
  const estimatedWatts = (parts.cpu.watts || 0) + (parts.ram.watts || 0) + 165;
  const recommendedCapacity = Math.ceil(estimatedWatts * 1.25);
  const socketMatch = parts.cpu.socket === parts.motherboard.socket;
  const memoryMatch = parts.ram.memoryType === parts.motherboard.memoryType;
  const powerMatch = (parts.psu.capacityWatts || 0) >= recommendedCapacity;
  const compatible = socketMatch && memoryMatch && powerMatch;
  const wattagePercent = Math.min(100, Math.round((estimatedWatts / (parts.psu.capacityWatts || 1)) * 100));
  const selectors: Array<{ key: HardwareItem["category"]; label: string }> = [
    { key: "motherboard", label: "Motherboard" },
    { key: "cpu", label: "Processor" },
    { key: "ram", label: "Memory" },
    { key: "psu", label: "Power supply" },
  ];

  return (
    <SpotlightCard className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300"><Cpu className="h-4 w-4" /> Compatibility lab</div>
          <h2 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Hardware builder</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Swap components and check platform fit and power headroom.</p>
        </div>
        <span className="hidden rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-emerald-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-emerald-300 sm:block"><Zap className="h-4 w-4" /></span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {selectors.map(({ key, label }) => (
          <label key={key} className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">{label}</span>
            <select
              value={selected[key]}
              onChange={(event) => setSelected((current) => ({ ...current, [key]: event.target.value }))}
              className="min-h-12 w-full min-w-0 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition-colors duration-200 hover:border-zinc-300 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-700 dark:focus:border-emerald-400/60 dark:focus:ring-emerald-400/10"
            >
              {HARDWARE.filter((item) => item.category === key).map((item) => (
                <option key={item.id} value={item.id}>{item.name} · {item.model}</option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className={`mt-4 flex items-start gap-3 rounded-xl border p-3.5 ${compatible ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/25 bg-amber-400/10"}`}>
        {compatible ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-800 dark:text-amber-300" />}
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${compatible ? "text-emerald-800 dark:text-emerald-200" : "text-amber-800 dark:text-amber-200"}`}>{compatible ? "100% Compatible" : "TDP / power wattage bottleneck detected"}</p>
          <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
            {!socketMatch ? "CPU socket does not match the motherboard." : !memoryMatch ? "RAM generation does not match the motherboard." : !powerMatch ? `Estimated draw needs ${recommendedCapacity} W with headroom; selected PSU is ${parts.psu.capacityWatts} W.` : "Socket, memory generation, and PSU headroom are all within spec."}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 transition-colors duration-200 dark:border-zinc-800 dark:bg-zinc-950/75">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">Estimated system draw</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{estimatedWatts}<span className="ml-1 text-xs font-normal text-zinc-500">W / {parts.psu.capacityWatts} W</span></p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xs text-zinc-500">RECOMMENDED</p>
            <p className="mt-1 font-mono text-sm text-emerald-700 dark:text-emerald-300">{recommendedCapacity} W</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800" role="meter" aria-label="Power supply load" aria-valuemin={0} aria-valuemax={100} aria-valuenow={wattagePercent}>
          <motion.div className={`h-full rounded-full ${powerMatch ? "bg-emerald-400" : "bg-amber-400"}`} animate={{ width: `${wattagePercent}%` }} transition={{ duration: 0.35 }} />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] text-zinc-500 dark:text-zinc-500"><span>0 W</span><span>{wattagePercent}% LOAD</span><span>{parts.psu.capacityWatts} W</span></div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-600 dark:text-zinc-400"><Thermometer className="h-3 w-3" /> Estimate includes 165 W for graphics and system overhead.</p>
    </SpotlightCard>
  );
}

function CommunityPreview() {
  const [liked, setLiked] = useState<string[]>([]);
  return (
    <section className="mt-8" aria-labelledby="community-preview-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300"><Sparkles className="h-3.5 w-3.5" /> Community pulse <span className="font-mono text-[9px] text-zinc-500 dark:text-zinc-500">SAMPLE POSTS</span></p>
          <h2 id="community-preview-title" className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Built by people who care</h2>
        </div>
        <a href="/community" className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 transition-colors duration-200 hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-300">Explore community <ArrowUpRight className="h-3.5 w-3.5" /></a>
      </div>
      <motion.div variants={LIST_VARIANTS} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} className="grid gap-3 md:grid-cols-2">
        {COMMUNITY_POSTS.map((post) => {
          const isLiked = liked.includes(post.id);
          return (
            <motion.article key={post.id} variants={ITEM_VARIANTS}>
              <SpotlightCard className="h-full p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 font-mono text-[10px] tracking-wide text-emerald-800 dark:border-emerald-400/20 dark:text-emerald-300">{post.category}</span>
                  <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-500">{post.timeAgo}</span>
                </div>
                <h3 className="mt-3 font-semibold text-zinc-900 dark:text-zinc-100">{post.title}</h3>
                <p className="mt-1.5 text-sm leading-5 text-zinc-600 dark:text-zinc-400">{post.body}</p>
                <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-3 dark:border-zinc-800">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-zinc-200 bg-zinc-100 font-mono text-[10px] text-emerald-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-emerald-300">{post.author.initials}</span>
                    <span className="min-w-0"><span className="block truncate text-xs font-medium text-zinc-800 dark:text-zinc-200">{post.author.displayName}</span><span className="block text-[10px] text-zinc-500 dark:text-zinc-500">{post.author.handle} · {post.author.role}</span></span>
                  </div>
                  <button type="button" aria-pressed={isLiked} onClick={() => setLiked((current) => isLiked ? current.filter((id) => id !== post.id) : [...current, post.id])} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors duration-200 ${isLiked ? "text-rose-600 dark:text-rose-300" : "text-zinc-600 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-300"}`}>
                    <Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-current" : ""}`} /> {post.likes + Number(isLiked)}
                  </button>
                </div>
              </SpotlightCard>
            </motion.article>
          );
        })}
      </motion.div>
    </section>
  );
}

export default function CyberSuite() {
  const [toast, setToast] = useState<CyberToastMessage | null>(null);
  const dismissToast = () => setToast(null);

  return (
    <section className="cyber-suite-theme border-t border-zinc-200 bg-zinc-50 px-4 py-10 text-zinc-900 transition-colors duration-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)] dark:bg-emerald-400" /> ViciTech OS · Component suite</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">Diagnostics &amp; build intelligence</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">Validate a component build, inspect simulated QC telemetry, and share practical notes from the hardware community.</p>
          </div>
          <span className="hidden items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-[10px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 md:inline-flex"><Radio className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> SYSTEM NOMINAL</span>
        </div>
        <div className="grid items-start gap-4 xl:grid-cols-2">
          <DiagnosticPanel notify={(message, tone = "info") => setToast({ message, tone })} />
          <HardwareBuilder />
        </div>
        <CommunityPreview />
      </div>
      <CyberToast toast={toast} onDismiss={dismissToast} />
    </section>
  );
}
