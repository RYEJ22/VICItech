"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Cpu,
  Database,
  Gauge,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Thermometer,
  Wifi,
  Zap,
} from "lucide-react";
import { getQcLogBySerial } from "@/lib/supabase";

const SERIAL_PATTERN = /^VICI-[A-Z]{3}-\d{4}-\d{4}$/;
const SAMPLE_RECORDS = {
  "VICI-SRV-2026-9042": {
    name: "ViciTech GPU Server 4U",
    specs: "Ryzen 9 7950X · RTX 4070 Super · 64 GB DDR5 ECC · 2 TB NVMe",
    averageTemperature: 69,
    maxWattage: 438,
    status: "Pass",
  },
  "VICI-LTP-2026-1187": {
    name: "ThinkPad T14 Gen 4 (Refurbished A+)",
    specs: "Ryzen 7 PRO 7840U · 16 GB LPDDR5 · 512 GB NVMe",
    averageTemperature: 71,
    maxWattage: 66,
    status: "Pass",
  },
  "VICI-DSK-2026-3305": {
    name: "ViciTech Office Workstation SFF",
    specs: "Core i5-12400 · 16 GB DDR4 · 512 GB NVMe",
    averageTemperature: 63,
    maxWattage: 118,
    status: "Pass",
  },
};

const SAMPLE_SERIALS = Object.keys(SAMPLE_RECORDS);
const QC_CHECKS = [
  "Thermal paste and heatsink contact",
  "CPU stress and thermal stability",
  "GPU stress and artifact check",
  "Memory integrity test",
  "BIOS and firmware integrity",
  "NVMe health and endurance",
  "Storage read/write benchmark",
  "Secure data wipe verification",
  "Power supply rail stability",
  "Capacitor and solder inspection",
  "USB and display port checks",
  "Network throughput test",
  "Fan curve and bearing noise",
  "Dust and contamination cleaning",
  "Final burn-in review",
];

const INITIAL_TELEMETRY = {
  temperature: 36.4,
  current: 2.35,
  voltage: 12.08,
  updatedAt: null,
};

const formatNumber = (value, fractionDigits = 1) =>
  new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);

function LocalHeader() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
            <Cpu className="h-5 w-5 text-emerald-400" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-zinc-100">ViciTech OS</p>
            <p className="text-xs text-zinc-500">IoT quality control</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          QC ENGINE
        </span>
      </div>
    </header>
  );
}

function MetricCard({ icon: Icon, label, value, detail, accent = "text-emerald-400" }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition-colors hover:border-zinc-700">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{label}</p>
        <Icon className={`h-4 w-4 ${accent}`} aria-hidden="true" />
      </div>
      <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight text-zinc-50">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{detail}</p>
    </section>
  );
}

function TelemetryPanel() {
  const [telemetry, setTelemetry] = useState(INITIAL_TELEMETRY);
  const [history, setHistory] = useState([36.4, 36.2, 36.5, 36.3, 36.4, 36.4]);
  const [streaming, setStreaming] = useState(true);
  const lastTemperature = useRef(INITIAL_TELEMETRY.temperature);

  useEffect(() => {
    if (!streaming) return undefined;

    const timer = window.setInterval(() => {
      const nextTemperature = Math.min(
        39.5,
        Math.max(34, lastTemperature.current + (Math.random() - 0.5) * 0.7),
      );
      const next = {
        temperature: Number(nextTemperature.toFixed(1)),
        current: Number((2.2 + Math.random() * 0.45).toFixed(2)),
        voltage: Number((12.0 + Math.random() * 0.16).toFixed(2)),
        updatedAt: new Date(),
      };
      lastTemperature.current = next.temperature;
      setTelemetry(next);
      setHistory((values) => [...values.slice(-19), next.temperature]);
    }, 1800);

    return () => window.clearInterval(timer);
  }, [streaming]);

  const loadWatts = telemetry.current * telemetry.voltage;
  const isOptimized = telemetry.temperature < 39 && loadWatts < 36;
  const latestTime = telemetry.updatedAt
    ? telemetry.updatedAt.toLocaleTimeString()
    : "Waiting for first sensor update";
  const points = history
    .map((value, index) => {
      const x = (index / Math.max(history.length - 1, 1)) * 100;
      const y = 36 - ((value - 34) / 6) * 30;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className={`relative flex h-2.5 w-2.5 ${streaming ? "" : "opacity-50"}`}>
              {streaming && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              )}
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <h2 className="font-semibold text-zinc-100">
              {streaming ? "ESP32 sensor feed active" : "Sensor feed paused"}
            </h2>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Simulated live readings · Last update: {latestTime}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setStreaming((active) => !active)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-emerald-500/50 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-pressed={streaming}
        >
          {streaming ? <Radio className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
          {streaming ? "Pause feed" : "Resume feed"}
        </button>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          icon={Thermometer}
          label="DHT22 · Ambient temperature"
          value={`${formatNumber(telemetry.temperature)} °C`}
          detail="Sensor connected · Sampling every 1.8 s"
        />
        <MetricCard
          icon={Zap}
          label="INA219 · Current load"
          value={`${formatNumber(telemetry.current, 2)} A`}
          detail={`${formatNumber(telemetry.voltage, 2)} V rail · ${formatNumber(loadWatts)} W`}
          accent="text-amber-400"
        />
        <MetricCard
          icon={Gauge}
          label="System optimization"
          value={isOptimized ? "Optimal" : "Review"}
          detail={isOptimized ? "Thermals and power are within target" : "Check system temperature or power"}
          accent={isOptimized ? "text-emerald-400" : "text-amber-400"}
        />
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-zinc-100">Temperature history</h3>
            <p className="mt-1 text-xs text-zinc-500">DHT22 · Recent sensor samples</p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs text-zinc-400">
            <Wifi className="h-3.5 w-3.5 text-emerald-400" />
            ESP32 simulation
          </span>
        </div>
        <div className="mt-5 h-32">
          <svg
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
            role="img"
            aria-label={`Recent DHT22 temperature readings, currently ${formatNumber(telemetry.temperature)} degrees Celsius`}
          >
            <polyline
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              className="text-emerald-400 transition-all duration-500"
            />
          </svg>
        </div>
        <div className="mt-2 flex justify-between text-xs text-zinc-600">
          <span>Oldest sample</span>
          <span>Latest sample</span>
        </div>
      </section>

      <p className="text-xs leading-relaxed text-zinc-600">
        This dashboard simulates ESP32 sensor feeds in the browser. It does not connect to physical hardware.
      </p>
    </div>
  );
}

export default function IotQcEngine({ initialSerial }) {
  const normalizedInitial = (initialSerial || SAMPLE_SERIALS[0]).trim().toUpperCase();
  const [activeTab, setActiveTab] = useState("lookup");
  const [query, setQuery] = useState(normalizedInitial);
  const [serial, setSerial] = useState(normalizedInitial);
  const [lookupRequest, setLookupRequest] = useState(0);
  const [record, setRecord] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialSerial && SERIAL_PATTERN.test(initialSerial.trim().toUpperCase())) {
      const nextSerial = initialSerial.trim().toUpperCase();
      setQuery(nextSerial);
      setSerial(nextSerial);
      setLookupRequest((request) => request + 1);
    }
  }, [initialSerial]);

  useEffect(() => {
    if (!serial) return undefined;

    let active = true;
    setStatus("loading");
    setRecord(null);
    setError("");

    const lookup = async () => {
      try {
        const [qcLog] = await Promise.all([
          getQcLogBySerial(serial),
          new Promise((resolve) => window.setTimeout(resolve, 450)),
        ]);
        if (!active) return;

        const sample = SAMPLE_RECORDS[serial];
        if (!qcLog && !sample) {
          setStatus("notfound");
          return;
        }

        const scorePercent = Number(qcLog?.score);
        const checksPassed = Number.isFinite(scorePercent)
          ? Math.max(0, Math.min(QC_CHECKS.length, Math.round((scorePercent / 100) * QC_CHECKS.length)))
          : QC_CHECKS.length;
        const recordStatus = qcLog?.status || sample?.status || "Pass";

        setRecord({
          serial,
          name: qcLog?.device_name || sample?.name || "ViciTech certified device",
          specs: sample?.specs || "Automated QC tested build · Certified hardware",
          status: recordStatus,
          checksPassed,
          averageTemperature: sample?.averageTemperature ?? 68,
          maxWattage: sample?.maxWattage ?? 195,
          testedAt: qcLog?.created_at || new Date().toISOString(),
          source: qcLog?.source,
        });
        setStatus("ready");
      } catch (lookupError) {
        if (!active) return;
        console.error("[ViciTech OS] QC lookup failed:", lookupError);
        setError("The QC record could not be retrieved. Please try again.");
        setStatus("error");
      }
    };

    lookup();
    return () => {
      active = false;
    };
  }, [serial, lookupRequest]);

  const formattedTestTime = useMemo(() => {
    if (!record?.testedAt) return "";
    const parsedDate = new Date(record.testedAt);
    return Number.isNaN(parsedDate.getTime())
      ? "Timestamp unavailable"
      : new Intl.DateTimeFormat("en-ID", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Jakarta",
        }).format(parsedDate) + " WIB";
  }, [record]);

  const submitLookup = (event) => {
    event.preventDefault();
    const value = query.trim().toUpperCase();
    if (!SERIAL_PATTERN.test(value)) {
      setError("Enter a serial in the format VICI-SRV-2026-9042.");
      setRecord(null);
      setStatus("idle");
      return;
    }
    setError("");
    setQuery(value);
    setSerial(value);
    setLookupRequest((request) => request + 1);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
      <LocalHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
            <Activity className="h-4 w-4" aria-hidden="true" />
            Hardware assurance
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
            IoT QC Engine
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400 sm:text-base">
            Verify a unit&apos;s 15-point quality inspection or monitor the live ESP32 sensor feed.
          </p>
        </div>

        <div className="mt-8 border-b border-zinc-800">
          <div className="flex gap-6" role="tablist" aria-label="QC engine views">
            {[
              ["lookup", "S/N Lookup", Search],
              ["telemetry", "Live Rig Telemetry", Activity],
            ].map(([tab, label, Icon]) => (
              <button
                key={tab}
                id={`tab-${tab}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`panel-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={`-mb-px inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  activeTab === tab
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "lookup" ? (
          <section
            id="panel-lookup"
            role="tabpanel"
            aria-labelledby="tab-lookup"
            className="pt-6"
          >
            <form
              onSubmit={submitLookup}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5"
            >
              <label htmlFor="serial-number" className="mb-2 block text-sm font-medium text-zinc-200">
                Hardware serial number
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                    aria-hidden="true"
                  />
                  <input
                    id="serial-number"
                    name="serial"
                    type="text"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value.toUpperCase());
                      setError("");
                    }}
                    placeholder="VICI-SRV-2026-9042"
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "lookup-error" : "lookup-hint"}
                    className={`w-full rounded-lg border bg-zinc-950 py-3 pl-10 pr-3 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 transition focus:outline-none focus:ring-2 ${
                      error
                        ? "border-red-500/70 focus:ring-red-500/50"
                        : "border-zinc-700 focus:border-emerald-500/60 focus:ring-emerald-500/30"
                    }`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-wait disabled:opacity-70"
                >
                  {status === "loading" ? (
                    <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Search className="h-4 w-4" aria-hidden="true" />
                  )}
                  {status === "loading" ? "Checking…" : "Check serial"}
                </button>
              </div>
              {error ? (
                <p id="lookup-error" role="alert" className="mt-2 text-sm text-red-400">
                  {error}
                </p>
              ) : (
                <p id="lookup-hint" className="mt-2 text-xs text-zinc-500">
                  Choose a sample serial or enter a ViciTech unit number.
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {SAMPLE_SERIALS.map((sampleSerial) => (
                  <button
                    key={sampleSerial}
                    type="button"
                    onClick={() => {
                      setQuery(sampleSerial);
                      setError("");
                      setSerial(sampleSerial);
                      setLookupRequest((request) => request + 1);
                    }}
                    className="rounded-full border border-zinc-700 px-3 py-1.5 font-mono text-xs text-zinc-400 transition hover:border-emerald-500/50 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    {sampleSerial}
                  </button>
                ))}
              </div>
            </form>

            {status === "loading" && (
              <div role="status" className="mt-5 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" aria-hidden="true" />
                Retrieving QC record for <span className="font-mono text-zinc-200">{serial}</span>
              </div>
            )}

            {status === "notfound" && (
              <div role="status" className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                <p className="font-medium text-zinc-200">No QC record found for {serial}.</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Check the serial number or select one of the sample records above.
                </p>
              </div>
            )}

            {status === "ready" && record && (
              <article className="mt-5 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
                <div className="flex flex-col justify-between gap-4 border-b border-zinc-800 p-5 sm:flex-row sm:items-start sm:p-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-sm text-emerald-400">{record.serial}</p>
                      {record.source === "supabase" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                          <Database className="h-3 w-3" aria-hidden="true" />
                          Supabase
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 text-xl font-semibold text-zinc-50">{record.name}</h2>
                    <p className="mt-1 text-sm text-zinc-400">{record.specs}</p>
                  </div>
                  <span
                    className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${
                      record.status.toLowerCase() === "pass"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {record.status.toLowerCase() === "pass" ? (
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Activity className="h-4 w-4" aria-hidden="true" />
                    )}
                    {record.status === "Pass" ? "QC Passed" : record.status}
                  </span>
                </div>

                <div className="grid gap-px bg-zinc-800 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: "15-point QC score",
                      value: `${record.checksPassed} / ${QC_CHECKS.length}`,
                      detail: `${Math.round((record.checksPassed / QC_CHECKS.length) * 100)}% checks passed`,
                    },
                    {
                      label: "Average temperature",
                      value: `${formatNumber(record.averageTemperature)} °C`,
                      detail: "Burn-in test average",
                    },
                    {
                      label: "Maximum wattage",
                      value: `${formatNumber(record.maxWattage, 0)} W`,
                      detail: "Peak load measured",
                    },
                    {
                      label: "Testing timestamp",
                      value: formattedTestTime,
                      detail: "Asia/Jakarta (WIB)",
                    },
                  ].map((metric) => (
                    <div key={metric.label} className="bg-zinc-900/80 p-5">
                      <p className="text-xs font-medium text-zinc-500">{metric.label}</p>
                      <p className="mt-2 text-lg font-semibold tabular-nums text-zinc-100">{metric.value}</p>
                      <p className="mt-1 text-xs text-zinc-600">{metric.detail}</p>
                    </div>
                  ))}
                </div>

                <details className="group border-t border-zinc-800">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800/30 sm:px-6">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                      Inspection checklist
                    </span>
                    <span className="text-xs text-zinc-500">15 checks</span>
                  </summary>
                  <ol className="grid gap-x-6 border-t border-zinc-800 px-5 py-4 sm:grid-cols-2 sm:px-6">
                    {QC_CHECKS.map((check, index) => (
                      <li key={check} className="flex items-center gap-2 py-2 text-sm text-zinc-400">
                        {index < record.checksPassed ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                        ) : (
                          <Activity className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                        )}
                        {check}
                      </li>
                    ))}
                  </ol>
                </details>
              </article>
            )}

            {status === "idle" && !error && (
              <div className="mt-5 rounded-xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">
                Submit a serial number to view its QC result.
              </div>
            )}
          </section>
        ) : (
          <section
            id="panel-telemetry"
            role="tabpanel"
            aria-labelledby="tab-telemetry"
            className="pt-6"
          >
            <TelemetryPanel />
          </section>
        )}
      </main>
    </div>
  );
}
