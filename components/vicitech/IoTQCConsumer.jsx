"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Cpu, Gauge, LoaderCircle, Radio, Search, ShieldCheck, Thermometer, Timer, Wifi } from "lucide-react";
import { getQcTrackingRecord, listMyOrders } from "@/lib/supabase";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const SERIAL_PATTERN = /^VICI-[A-Z]{3}-\d{4}-\d{4}$/;
const ORDER_PATTERN = /^VT-PO-\d{4}-\d{4}$/;

function getProgress(record) {
  if (!record || typeof record !== "object") return 0;
  if (["Dikirim", "Shipped"].includes(record.shipping_status)) return 100;
  if (record.stress_test_status === "Complete" || record.status === "Pass") return 82;
  if (record.stress_test_status === "Running" || record.status === "In Progress") {
    return Math.min(75, 35 + (Number(record.burnin_hours || 0) / 4) * 40);
  }
  return 18;
}

function translateStressStatus(rawStatus) {
  switch (rawStatus) {
    case "Complete":
    case "Pass":
      return "Lulus";
    case "Running":
    case "In Progress":
      return "Sedang Uji Beban";
    case "Failed":
    case "Fail":
      return "Gagal Uji";
    case "Pending":
    case "IoT Stress-Test Pending":
      return "Menunggu Uji QC";
    case "Ready to ship":
      return "Siap Kirim";
    case "Shipped":
    case "Dikirim":
      return "Terkirim";
    default:
      return rawStatus || "Menunggu Perakitan";
  }
}

const QC_15_POINT_GROUPS = [
  {
    title: "Termal & Stabilitas Daya (5 Titik)",
    items: [
      "Suhu idle & burn-in beban penuh CPU",
      "Suhu puncak GPU & stabilitas clock",
      "Profil kurva RPM kipas & akustik",
      "Stabilitas rail voltase PSU 12V / 5V / 3.3V",
      "Uji kestabilan daya berkelanjutan 4 jam",
    ],
  },
  {
    title: "Integritas Hardware & Port (5 Titik)",
    items: [
      "Kesehatan SMART SSD / NVMe & bad sector",
      "Uji memori RAM dual-channel bebas error",
      "Fungsi seluruh port USB, HDMI/DP & LAN/Wi-Fi",
      "Kalibrasi layar / analog kontroler (jika ada)",
      "Inspeksi fisik bodi & aplikasi thermal paste",
    ],
  },
  {
    title: "Sanitasi & Sertifikasi (5 Titik)",
    items: [
      "Sanitasi data permanen standar NIST SP 800-88",
      "Verifikasi BIOS/UEFI & firmware resmi terbaru",
      "Pengecekan lisensi & instalasi OS bersih",
      "Penerbitan nomor seri unik VICI-XXX",
      "Pengemasan anti-statis & segel garansi ViciCare",
    ],
  },
];

function Stat({ icon: Icon, label, value, detail, color = "text-[#EA580C]", barColor = "bg-[#EA580C]", level }) {
  const gaugeLevel = Number.isFinite(level) ? Math.max(0, Math.min(100, level)) : null;
  return (
    <div className="vt-obsidian-panel rounded-xl p-4 transition-colors duration-200">
      <div className="flex items-center justify-between text-xs font-medium text-[#A1A1AA]">
        <span>{label}</span>
        <Icon className={`h-4 w-4 ${color}`} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <p className="mt-3 font-mono text-2xl font-bold tabular-nums text-[#FAFAFA]">{value}</p>
      {gaugeLevel !== null && (
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(gaugeLevel)}
          aria-label={`Indikator ${label}`}
        >
          <div
            className={`h-full w-full origin-left rounded-full transition-transform duration-300 motion-reduce:transition-none ${barColor}`}
            style={{ transform: `scaleX(${gaugeLevel / 100})` }}
          />
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-[#A1A1AA]">{detail}</p>
    </div>
  );
}

export default function IoTQCConsumer({ initialSerial, onTelemetrySourceChange }) {
  const [query, setQuery] = useState(typeof initialSerial === "string" ? initialSerial.trim().toUpperCase() : "");
  const [record, setRecord] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");

  useEffect(() => {
    if (!onTelemetrySourceChange) return;
    if (telemetry?.source === "esp32") {
      onTelemetrySourceChange("esp32");
    } else if (telemetry?.source === "admin_simulation") {
      onTelemetrySourceChange("admin_simulation");
    } else {
      onTelemetrySourceChange("idle");
    }
  }, [onTelemetrySourceChange, telemetry?.source]);

  const refreshOrders = useCallback(async (nextUserId) => {
    setUserId(nextUserId || "");
    setOrdersError("");
    if (!nextUserId) {
      setOrders([]);
      setOrdersLoading(false);
      return;
    }

    setOrdersLoading(true);
    try {
      const result = await listMyOrders({ userId: nextUserId });
      setOrders(Array.isArray(result) ? result : []);
    } catch (loadError) {
      setOrdersError(loadError.message || "Gagal memuat daftar pesanan Anda.");
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let client;
    try {
      client = getSupabaseBrowserClient();
    } catch (clientError) {
      setOrdersError(clientError.message);
      setOrdersLoading(false);
      return undefined;
    }

    client.auth.getUser().then(({ data, error: userError }) => {
      if (!active) return;
      if (userError && !/session missing/i.test(userError.message || "")) {
        setOrdersError(`Sesi akun tidak dapat diperiksa: ${userError.message}`);
        setOrdersLoading(false);
        return;
      }
      refreshOrders(data?.user?.id || "");
    }).catch((userError) => {
      if (active) {
        setOrdersError(userError.message || "Sesi akun tidak dapat diperiksa.");
        setOrdersLoading(false);
      }
    });

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (active) refreshOrders(session?.user?.id || "");
    });
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [refreshOrders]);

  const lookup = useCallback(async (value) => {
    const normalized = String(value ?? "").trim().toUpperCase();
    setQuery(normalized);
    if (!SERIAL_PATTERN.test(normalized) && !ORDER_PATTERN.test(normalized)) {
      setError("Masukkan nomor seri ViciTech atau nomor pesanan yang valid (contoh: VT-PO-2026-0412 atau VICI-SRV-2026-9042).");
      setRecord(null);
      setTelemetry(null);
      setStatus("idle");
      return;
    }

    setError("");
    setTelemetry(null);
    setStatus("loading");
    try {
      const result = await getQcTrackingRecord(normalized);
      if (result && typeof result === "object") {
        setRecord(result);
        setStatus("ready");
        return;
      }

      const ownedOrder = orders.find((order) => (
        order?.order_number?.toUpperCase() === normalized ||
        order?.serial_number?.toUpperCase() === normalized
      ));
      if (ownedOrder) {
        setRecord({
          order_id: ownedOrder.order_number,
          serial_number: ownedOrder.serial_number || "",
          device_name: ownedOrder.product_name,
          status: ownedOrder.status || "Menunggu Uji IoT QC",
          stress_test_status: "Pending",
          shipping_status: ownedOrder.status || "Dalam Perakitan",
          burnin_hours: 0,
          source: "order",
        });
        setStatus("ready");
        return;
      }

      setRecord(null);
      setStatus("notfound");
    } catch (lookupError) {
      console.error("[ViciTech] Public QC tracking lookup failed:", lookupError);
      setError(lookupError.message || "Data pelacakan QC tidak dapat dimuat.");
      setRecord(null);
      setStatus("error");
    }
  }, [orders]);

  useEffect(() => {
    if (initialSerial) lookup(initialSerial);
  }, [initialSerial, lookup]);

  useEffect(() => {
    const serial = record?.serial_number;
    if (!serial) return undefined;

    let active = true;
    let client;
    try {
      client = getSupabaseBrowserClient();
    } catch (subscriptionError) {
      setError(subscriptionError.message);
      return undefined;
    }

    const channel = client
      .channel(`customer-telemetry-${serial}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "telemetry_logs",
        filter: `serial_number=eq.${serial}`,
      }, ({ new: entry }) => {
        if (active && entry && entry.serial_number === serial) {
          setTelemetry(entry);
          setRecord((current) => current ? {
            ...current,
            burnin_hours: entry.burnin_hours,
            stress_test_status: entry.stress_test_status,
            status: entry.stress_test_status === "Failed" ? "Fail" : current.status,
          } : current);
        }
      })
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === "CHANNEL_ERROR" || subscriptionStatus === "TIMED_OUT") {
          setError("Aliran telemetri langsung sedang terputus. Status terakhir tetap ditampilkan; muat ulang untuk mencoba kembali.");
        }
      });

    client
      .from("telemetry_logs")
      .select("id, serial_number, order_id, cpu_temp_c, gpu_temp_c, fan_rpm, voltage_stability, stability_score, stress_test_status, burnin_hours, source, created_at")
      .eq("serial_number", serial)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error: telemetryError }) => {
        if (!active) return;
        if (telemetryError) {
          setError(`Gagal memuat telemetri: ${telemetryError.message}`);
          return;
        }
        if (data) {
          setTelemetry((current) => current || data);
          setRecord((current) => current ? {
            ...current,
            burnin_hours: data.burnin_hours,
            stress_test_status: data.stress_test_status,
            status: data.stress_test_status === "Failed" ? "Fail" : current.status,
          } : current);
        }
      })
      .catch((telemetryError) => {
        if (active) setError(telemetryError.message || "Gagal memuat telemetri.");
      });

    return () => {
      active = false;
      client.removeChannel(channel);
    };
  }, [record?.serial_number]);

  const progress = getProgress(record);
  const testLabel = translateStressStatus(record?.stress_test_status || record?.status);
  const burninHours = Number(telemetry?.burnin_hours ?? record?.burnin_hours ?? 0);

  const sourceBadge = telemetry?.source === "esp32" ? (
    <span className="vt-badge-live">Live ESP32</span>
  ) : telemetry?.source === "admin_simulation" ? (
    <span className="vt-badge-simulated">Simulated / Demo</span>
  ) : (
    <span className="vt-badge-sample">Menunggu Telemetri</span>
  );

  return (
    <div className="space-y-5 text-primary">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent-cta">
            <ShieldCheck className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Pelacakan Pelanggan</span>
          </p>
          <h2 className="mt-2 font-sans text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            Status Perakitan &amp; Telemetri IoT QC
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
            Lacak progres pesanan serta pembacaan sensor perangkat Anda. Tampilan ini bersifat baca-saja dan memisahkan data sensor ESP32 dari simulasi admin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sourceBadge}
          <span className="inline-flex items-center gap-1.5 rounded-md border border-default bg-surface px-3 py-1.5 text-xs font-medium text-secondary">
            <Wifi className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Status Baca-Saja</span>
          </span>
        </div>
      </header>

      {userId && (
        <section className="rounded-xl border border-default bg-surface p-5 shadow-sm transition-colors duration-200">
          <h3 className="tracking-tight text-sm font-bold text-primary">Pesanan Akun Anda</h3>
          {ordersLoading ? (
            <div role="status" aria-label="Memuat daftar pesanan" className="mt-3 grid gap-2 sm:grid-cols-2">
              {[0, 1].map((idx) => (
                <div key={idx} className="space-y-2 rounded-lg border border-default bg-canvas p-3">
                  <div className="h-3 w-28 animate-pulse rounded bg-subtle" />
                  <div className="h-4 w-44 animate-pulse rounded bg-subtle" />
                  <div className="h-3 w-20 animate-pulse rounded bg-subtle" />
                </div>
              ))}
            </div>
          ) : ordersError ? (
            <p role="alert" className="mt-3 text-sm text-status-danger">{ordersError}</p>
          ) : orders.length ? (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {orders.map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => lookup(order.order_number || order.serial_number)}
                    className="min-h-11 w-full rounded-lg border border-default bg-canvas p-3 text-left transition-colors hover:border-accent-primary/50 hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
                  >
                    <span className="block font-mono text-xs font-semibold text-status-live">
                      {order.order_number || "Menunggu ID Pesanan"}
                    </span>
                    <span className="mt-1 block truncate text-sm font-medium text-primary">{order.product_name}</span>
                    <span className="mt-1 block text-xs text-secondary">{translateStressStatus(order.status)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-secondary">Belum ada pesanan yang terhubung dengan akun Anda.</p>
          )}
        </section>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          lookup(query);
        }}
        className="rounded-xl border border-default bg-surface p-5 shadow-sm transition-colors duration-200 sm:p-6"
      >
        <label htmlFor="qc-tracking-query" className="mb-2 block text-sm font-medium text-primary">
          Nomor Seri Unit atau Nomor Pesanan
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" strokeWidth={1.75} aria-hidden="true" />
            <input
              id="qc-tracking-query"
              value={query}
              onChange={(event) => setQuery(event.target.value.toUpperCase())}
              placeholder="VT-PO-2026-0412 atau VICI-SRV-2026-9042"
              autoComplete="off"
              className="vt-form-control min-h-11 w-full rounded-lg border border-default bg-canvas py-2.5 pl-10 pr-3 font-mono text-sm text-primary outline-none transition-colors placeholder:text-secondary/65 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
            />
          </div>
          <button
            type="submit"
            disabled={status === "loading"}
            className="min-h-11 rounded-lg bg-accent-cta px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-cta-hover disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            {status === "loading" ? "Memeriksa…" : "Lacak Perangkat"}
          </button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-status-danger">{error}</p>}
      </form>

      {status === "loading" && (
        <div role="status" aria-label="Memuat status pelacakan IoT QC" className="mt-5 space-y-4">
          <div className="h-40 animate-pulse rounded-2xl border border-default bg-surface p-6" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[0, 1, 2, 3, 4].map((idx) => (
              <div key={idx} className="h-28 animate-pulse rounded-xl border border-default bg-surface" />
            ))}
          </div>
        </div>
      )}
      {status === "notfound" && (
        <p role="status" className="mt-5 rounded-xl border border-default bg-surface p-5 text-sm text-primary">
          Tidak ditemukan catatan pesanan atau laporan IoT QC untuk nomor tersebut.
        </p>
      )}

      {status === "ready" && record && typeof record === "object" && (
        <section aria-label="Status pelacakan perangkat" className="mt-6 space-y-5">
          <div className="vt-obsidian-panel rounded-2xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#EA580C]">
                  {record.order_id || "Pelacakan Unit"}
                </p>
                <h2 className="tracking-tight mt-1 font-sans text-xl font-bold text-[#FAFAFA]">
                  {record.device_name || "Unit Rakitan ViciTech"}
                </h2>
                <p className="mt-1 font-mono text-sm text-[#A1A1AA]">
                  {record.serial_number || "Nomor seri QC sedang disiapkan"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {sourceBadge}
                <span className="inline-flex items-center rounded-md border border-white/15 bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-[#FAFAFA]">
                  {translateStressStatus(record.shipping_status) || testLabel}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex justify-between text-xs text-[#A1A1AA]">
                <span>Progres perakitan dan uji burn-in</span>
                <span className="font-mono tabular-nums font-bold text-[#FAFAFA]">{Math.round(progress)}%</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progres perakitan dan uji burn-in"
              >
                <div
                  className="h-full w-full origin-left rounded-full bg-[#EA580C] transition-transform duration-300 motion-reduce:transition-none"
                  style={{ transform: `scaleX(${Math.max(0, Math.min(100, progress)) / 100})` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-[#A1A1AA]">
                <span>Perakitan</span>
                <span>Uji Beban QC</span>
                <span>Pengiriman</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Stat
              icon={Cpu}
              label="Suhu CPU"
              value={telemetry?.cpu_temp_c == null ? "—" : `${Number(telemetry.cpu_temp_c).toFixed(1)} °C`}
              detail="Pembacaan sensor terbaru"
              color="text-[#EA580C]"
              barColor="bg-[#EA580C]"
              level={telemetry?.cpu_temp_c == null ? null : (Number(telemetry.cpu_temp_c) / 120) * 100}
            />
            <Stat
              icon={Thermometer}
              label="Suhu GPU"
              value={telemetry?.gpu_temp_c == null ? "—" : `${Number(telemetry.gpu_temp_c).toFixed(1)} °C`}
              detail="Pembacaan sensor terbaru"
              color="text-amber-400"
              barColor="bg-amber-400"
              level={telemetry?.gpu_temp_c == null ? null : (Number(telemetry.gpu_temp_c) / 120) * 100}
            />
            <Stat
              icon={Gauge}
              label="Kecepatan Kipas"
              value={telemetry?.fan_rpm == null ? "—" : `${telemetry.fan_rpm} RPM`}
              detail="Pembacaan sensor terbaru"
              color="text-sky-400"
              barColor="bg-sky-400"
              level={telemetry?.fan_rpm == null ? null : (Number(telemetry.fan_rpm) / 2500) * 100}
            />
            <Stat
              icon={Activity}
              label="Stabilitas Voltase"
              value={telemetry?.voltage_stability == null ? "—" : `${telemetry.voltage_stability}%`}
              detail="Pembacaan sensor terbaru"
              color="text-emerald-400"
              barColor="bg-emerald-400"
              level={telemetry?.voltage_stability == null ? null : Number(telemetry.voltage_stability)}
            />
            <Stat
              icon={Timer}
              label="Status Uji Beban"
              value={translateStressStatus(telemetry?.stress_test_status) || testLabel}
              detail={`${burninHours} / 4 jam burn-in`}
              color="text-[#EA580C]"
            />
          </div>

          <div className="rounded-xl border border-default bg-surface p-4 text-xs leading-relaxed text-secondary shadow-sm">
            <Radio className="mr-2 inline h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            {telemetry
              ? `${telemetry.source === "admin_simulation" ? "Payload simulasi admin (Simulated / Demo, bukan sensor fisik)" : "Telemetri sensor ESP32 terverifikasi"} · ${new Date(telemetry.created_at).toLocaleString("id-ID")}`
              : "Menunggu kiriman payload telemetri. Tidak ada pembacaan sensor palsu yang ditampilkan sebagai data langsung."}{" "}
            Kontrol pengujian dibatasi khusus untuk administrator QC resmi.
          </div>
        </section>
      )}

      {/* Protokol Inspeksi 15 Titik Hybrid IoT QC */}
      <section aria-labelledby="qc-15-points-heading" className="rounded-2xl border border-default bg-surface p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-default pb-3.5">
          <div>
            <h3 id="qc-15-points-heading" className="font-sans text-base font-bold text-primary sm:text-lg">
              Standar Inspeksi 15 Titik Hybrid IoT QC
            </h3>
            <p className="mt-0.5 text-xs text-secondary">
              Setiap unit melewati 3 kelompok verifikasi sebelum terbit sertifikat serial digital.
            </p>
          </div>
          <span className="vt-badge-simulated">Protokol Referensi · ESP32 v2.5</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {QC_15_POINT_GROUPS.map((group) => (
            <div key={group.title} className="rounded-xl border border-default bg-canvas p-4">
              <p className="text-xs font-bold text-primary">{group.title}</p>
              <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-secondary">
                {group.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" strokeWidth={1.75} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
