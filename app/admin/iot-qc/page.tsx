'use client';

import {
  Activity,
  Cpu,
  LoaderCircle,
  ShieldCheck,
  Terminal,
  Thermometer,
  Wifi,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface TelemetryEntry {
  readonly id?: string;
  readonly serial_number: string;
  readonly order_id?: string | null;
  readonly cpu_temp_c?: number | null;
  readonly gpu_temp_c?: number | null;
  readonly fan_rpm?: number | null;
  readonly voltage_stability?: number | null;
  readonly stability_score?: number | null;
  readonly stress_test_status?: string | null;
  readonly burnin_hours?: number | null;
  readonly source?: 'esp32' | 'admin_simulation' | string | null;
  readonly created_at?: string | null;
}

interface QcUnit {
  readonly id?: string;
  readonly serial_number: string;
  readonly device_name: string;
  readonly status: string;
  readonly burnin_hours: number;
  readonly score?: number | null;
  readonly order_id?: string | null;
  readonly stress_test_status?: string | null;
  readonly cpu_temp_c?: number | null;
  readonly gpu_temp_c?: number | null;
  readonly stability_score?: number | null;
  readonly shipping_status?: string | null;
  readonly certificate_id?: string | null;
  readonly telemetry?: TelemetryEntry | null;
}

interface QcOrderRow {
  readonly id: string;
  readonly order_number?: string | null;
  readonly serial_number?: string | null;
  readonly product_name?: string | null;
  readonly customer_info?: { readonly fullName?: string; readonly name?: string } | null;
  readonly status?: string | null;
}

interface LogEntry {
  readonly id: string;
  readonly time: string;
  readonly message: string;
  readonly payload?: unknown;
}

interface IotQcGetResponse {
  readonly units?: readonly QcUnit[];
  readonly orders?: readonly QcOrderRow[];
  readonly telemetry?: readonly TelemetryEntry[];
  readonly error?: string;
}

interface IotQcPostResponse {
  readonly unit?: QcUnit;
  readonly error?: string;
}

function formatTime(value = new Date()): string {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(value);
}

interface MetricCardProps {
  readonly icon: typeof Activity;
  readonly label: string;
  readonly value: string;
  readonly level: number | null;
}

function MetricCard({ icon: Icon, label, value, level }: MetricCardProps): ReactElement {
  const gaugeLevel =
    level !== null && Number.isFinite(level) ? Math.max(0, Math.min(100, level)) : null;

  return (
    <div className="rounded-xl border border-default bg-canvas p-3.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-secondary">
        <Icon className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
        <span>{label}</span>
      </span>
      <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-primary">{value}</p>
      {gaugeLevel !== null ? (
        <div
          className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-default"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(gaugeLevel)}
          aria-label={`Gauge ${label}`}
        >
          <div
            className="h-full w-full origin-left rounded-full bg-accent-primary transition-transform duration-300 motion-reduce:transition-none"
            style={{ transform: `scaleX(${gaugeLevel / 100})` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function AdminIotQcPage(): ReactElement {
  const [units, setUnits] = useState<readonly QcUnit[]>([]);
  const [orders, setOrders] = useState<readonly QcOrderRow[]>([]);
  const [selectedSerial, setSelectedSerial] = useState('');
  const [logs, setLogs] = useState<readonly LogEntry[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState('');
  const [copiedCertificate, setCopiedCertificate] = useState(false);

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.serial_number === selectedSerial) || null,
    [selectedSerial, units],
  );

  const addLog = useCallback((message: string, payload?: unknown) => {
    setLogs((current) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          time: formatTime(),
          message,
          payload,
        },
        ...current,
      ].slice(0, 40),
    );
  }, []);

  const loadUnits = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/iot-qc', { cache: 'no-store' });
      const result = (await response.json()) as IotQcGetResponse;
      if (!response.ok) throw new Error(result.error || 'Gagal memuat registry unit QC.');

      const nextUnits = Array.isArray(result.units)
        ? result.units.filter(
            (unit): unit is QcUnit =>
              Boolean(unit) && typeof unit === 'object' && typeof unit.serial_number === 'string',
          )
        : [];
      setOrders(Array.isArray(result.orders) ? result.orders : []);
      setUnits(nextUnits);
      setSelectedSerial((current) =>
        nextUnits.some((unit) => unit.serial_number === current)
          ? current
          : nextUnits[0]?.serial_number || '',
      );

      if (nextUnits.length > 0) {
        addLog('Sesi admin terverifikasi; registry unit QC dimuat.', {
          units: nextUnits.length,
        });
      }

      if (Array.isArray(result.telemetry)) {
        result.telemetry
          .filter((entry) => Boolean(entry) && typeof entry.serial_number === 'string')
          .slice(0, 20)
          .reverse()
          .forEach((entry) =>
            addLog(
              entry.source === 'admin_simulation'
                ? 'Telemetry simulasi tersimpan dimuat.'
                : 'Telemetry ESP32 tersimpan dimuat.',
              entry,
            ),
          );
      }
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error ? loadError.message : 'Gagal memuat registry unit QC.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [addLog]);

  useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  useEffect(() => {
    let client: ReturnType<typeof getSupabaseBrowserClient>;
    try {
      client = getSupabaseBrowserClient();
    } catch (subscriptionError: unknown) {
      setError(
        subscriptionError instanceof Error
          ? subscriptionError.message
          : 'Gagal menginisialisasi klien realtime.',
      );
      return undefined;
    }

    const channel = client
      .channel('admin-iot-qc-telemetry')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'telemetry_logs',
        },
        (payload: { new: unknown }) => {
          const raw = payload.new;
          if (!raw || typeof raw !== 'object') return;
          const telemetry = raw as TelemetryEntry;
          if (typeof telemetry.serial_number !== 'string') return;

          setUnits((current) =>
            current.map((unit) =>
              unit.serial_number === telemetry.serial_number
                ? {
                    ...unit,
                    telemetry,
                    cpu_temp_c: telemetry.cpu_temp_c ?? unit.cpu_temp_c,
                    gpu_temp_c: telemetry.gpu_temp_c ?? unit.gpu_temp_c,
                    stability_score: telemetry.stability_score ?? unit.stability_score,
                    stress_test_status: telemetry.stress_test_status ?? unit.stress_test_status,
                    burnin_hours: telemetry.burnin_hours ?? unit.burnin_hours,
                  }
                : unit,
            ),
          );

          addLog(
            telemetry.source === 'admin_simulation'
              ? 'Payload simulasi ESP32 diterima.'
              : 'Telemetry sensor ESP32 live diterima.',
            telemetry,
          );
        },
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Koneksi telemetry realtime terputus. Klik Refresh untuk menyambung kembali.');
        }
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [addLog]);

  const registerOrder = async (order: QcOrderRow) => {
    setActiveAction(`register:${order.id}`);
    setError('');
    try {
      const response = await fetch('/api/admin/iot-qc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register_unit', order_id: order.id }),
      });
      const result = (await response.json()) as IotQcPostResponse;
      if (!response.ok) {
        throw new Error(result.error || 'Gagal mendaftarkan order ini ke antrean QC.');
      }
      const unit = result.unit;
      if (!unit?.serial_number) {
        throw new Error('Registrasi QC tidak mengembalikan nomor serial.');
      }

      setUnits((current) => [
        unit,
        ...current.filter((existing) => existing.serial_number !== unit.serial_number),
      ]);
      setSelectedSerial(unit.serial_number);
      setOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? { ...item, serial_number: unit.serial_number, status: 'In Production' }
            : item,
        ),
      );
      addLog('Order berhasil didaftarkan ke IoT QC.', {
        order_number: order.order_number,
        serial_number: unit.serial_number,
      });
    } catch (registerError: unknown) {
      setError(
        registerError instanceof Error
          ? registerError.message
          : 'Gagal mendaftarkan order ini ke antrean QC.',
      );
    } finally {
      setActiveAction('');
    }
  };

  const runAction = async (action: string, label: string) => {
    if (!selectedUnit) return;
    setActiveAction(action);
    setError('');
    try {
      const response = await fetch('/api/admin/iot-qc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, serial_number: selectedUnit.serial_number }),
      });
      const result = (await response.json()) as IotQcPostResponse;
      if (!response.ok) throw new Error(result.error || `${label} gagal dijalankan.`);
      const updatedUnit = result.unit;
      if (
        !updatedUnit ||
        typeof updatedUnit !== 'object' ||
        typeof updatedUnit.serial_number !== 'string'
      ) {
        throw new Error(`${label} mengembalikan respons unit QC yang tidak valid.`);
      }

      setUnits((current) =>
        current.map((unit) =>
          unit.serial_number === updatedUnit.serial_number
            ? {
                ...updatedUnit,
                telemetry: action === 'start_test' ? null : updatedUnit.telemetry ?? unit.telemetry,
              }
            : unit,
        ),
      );
      addLog(`${label} selesai.`, {
        serial_number: updatedUnit.serial_number,
        cpu_temp_c: updatedUnit.cpu_temp_c,
        gpu_temp_c: updatedUnit.gpu_temp_c,
        stability_score: updatedUnit.stability_score,
        stress_test_status: updatedUnit.stress_test_status,
        burnin_hours: updatedUnit.burnin_hours,
        shipping_status: updatedUnit.shipping_status,
        certificate_id: updatedUnit.certificate_id,
      });
    } catch (actionError: unknown) {
      const message =
        actionError instanceof Error ? actionError.message : `${label} gagal dijalankan.`;
      setError(message);
      addLog(`${label} gagal.`, { error: message });
    } finally {
      setActiveAction('');
    }
  };

  const hasCompletedBurnIn = Number(selectedUnit?.burnin_hours || 0) >= 4;
  const hasLiveTelemetry = selectedUnit?.telemetry?.source === 'esp32';
  const isPassed = selectedUnit?.status === 'Pass' && Boolean(selectedUnit?.certificate_id);
  const progress =
    ['Dikirim', 'Shipped'].includes(selectedUnit?.shipping_status || '')
      ? 100
      : isPassed
        ? 82
        : Math.min(75, 35 + (Number(selectedUnit?.burnin_hours || 0) / 4) * 40);

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-accent-primary">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Smart Bench · Akses Terbatas Admin</span>
          </span>
          <h1 className="mt-1.5 font-sans text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            Portal Kontrol IoT QC
          </h1>
          <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-secondary">
            Jalankan stress test terotorisasi, pantau payload sensor ESP32 realtime, dan terbitkan sertifikat kelulusan unit sebelum pengiriman.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadUnits()}
          disabled={isLoading}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-surface px-4 py-2 text-sm font-medium text-primary shadow-sm transition hover:border-accent-primary/45 hover:bg-accent-subtle disabled:opacity-50"
        >
          {isLoading ? (
            <LoaderCircle className="h-4 w-4 animate-spin text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Activity className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
          )}
          <span>Muat Ulang Unit</span>
        </button>
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-status-danger/30 bg-red-50 p-3.5 text-sm text-status-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)]">
        <div className="space-y-5">
          {/* Recent Orders Queue */}
          <section className="rounded-xl border border-default bg-surface p-4 shadow-sm">
            <h2 className="tracking-tight mb-3 text-sm font-bold text-primary">
              Antrean Order Terbaru ·{' '}
              <span className="font-mono tabular-nums text-accent-hover">{orders.length}</span>
            </h2>
            {orders.length ? (
              <ul className="max-h-52 space-y-2 overflow-y-auto pr-1">
                {orders.map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-default bg-canvas p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-semibold text-primary">
                        {order.order_number || order.id}
                      </p>
                      <p className="truncate text-sm text-secondary">
                        {order.product_name || 'Order'}
                      </p>
                      <p className="truncate text-xs text-secondary">
                        {order.customer_info?.fullName || order.customer_info?.name || 'Pelanggan tidak tercatat'} · {order.status || 'Status tidak diketahui'}
                      </p>
                    </div>
                    {order.serial_number ? (
                      <button type="button" onClick={() => {
                        const registered = units.find((unit) => unit.serial_number === order.serial_number);
                        if (registered) setSelectedSerial(registered.serial_number);
                        else void registerOrder(order);
                      }} className="vt-badge-live shrink-0 font-mono text-xs">
                        {order.serial_number}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={Boolean(activeAction)}
                        onClick={() => void registerOrder(order)}
                        className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-accent-primary/35 bg-accent-subtle px-3 py-1.5 text-xs font-semibold text-accent-hover transition hover:bg-accent-cta hover:text-white disabled:opacity-50"
                      >
                        {activeAction === `register:${order.id}` ? 'Mendaftarkan…' : 'Daftarkan QC'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-secondary">Belum ada order pelanggan yang tersedia.</p>
            )}
          </section>

          {/* Select Active Unit */}
          <section className="rounded-xl border border-default bg-surface p-4 shadow-sm">
            <label htmlFor="admin-qc-unit" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-secondary">
              Pilih Unit QC
            </label>
            {isLoading ? (
              <p className="flex items-center gap-2 py-2 text-sm text-secondary">
                <LoaderCircle className="h-4 w-4 animate-spin text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                <span>Memuat registry unit QC…</span>
              </p>
            ) : units.length ? (
              <select
                id="admin-qc-unit"
                value={selectedSerial}
                onChange={(event) => {
                  setSelectedSerial(event.target.value);
                  setCopiedCertificate(false);
                }}
                className="min-h-11 w-full rounded-lg border border-default bg-canvas px-3 py-2.5 font-mono text-sm text-primary outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
              >
                {units.map((unit) => (
                  <option key={unit.serial_number} value={unit.serial_number}>
                    {unit.order_id || unit.serial_number} · {unit.device_name} · {orders.find((order) => order.order_number === unit.order_id)?.customer_info?.fullName || orders.find((order) => order.order_number === unit.order_id)?.customer_info?.name || 'Pelanggan'} · QC {unit.status} / {unit.shipping_status || 'Belum dikirim'}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-secondary">
                Belum ada unit dari order aktif yang terdaftar untuk QC. Pilih order pada antrean di atas untuk mendaftarkannya.
              </p>
            )}
            {selectedUnit ? (() => {
              const order = orders.find((item) => item.order_number === selectedUnit.order_id);
              return order ? (
                <p className="mt-2 text-xs text-secondary">
                  Pelanggan: <strong className="text-primary">{order.customer_info?.fullName || order.customer_info?.name || 'Tidak tercatat'}</strong>
                  {' · '}Status order: <strong className="text-primary">{order.status || 'Tidak diketahui'}</strong>
                </p>
              ) : null;
            })() : null}
          </section>

          {/* Telemetry & Controls */}
          {selectedUnit ? (
            <>
              {(() => {
                const telemetry: Partial<TelemetryEntry> = selectedUnit.telemetry ?? {};
                const burninValue = Number(telemetry.burnin_hours ?? selectedUnit.burnin_hours ?? 0);
                return (
                  <section className="rounded-xl border border-default bg-surface p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
                          {selectedUnit.order_id || 'Unit QC Mandiri'}
                        </p>
                        <h2 className="tracking-tight mt-1 font-sans text-xl font-bold text-primary">
                          {selectedUnit.device_name}
                        </h2>
                        <p className="mt-0.5 font-mono text-sm text-accent-hover">
                          {selectedUnit.serial_number}
                        </p>
                      </div>

                      {telemetry.source === 'esp32' ? (
                        <span className="vt-badge-live">Live ESP32</span>
                      ) : telemetry.source === 'admin_simulation' ? (
                        <span className="vt-badge-simulated">Simulasi IoT QC</span>
                      ) : (
                        <span className="vt-badge-sample">Menunggu Telemetri</span>
                      )}
                    </div>

                    <div className="mt-5 flex justify-between text-xs font-medium text-secondary">
                      <span>Progres Perakitan / IoT QC / Pengiriman</span>
                      <span className="font-mono tabular-nums text-primary">{Math.round(progress)}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-default">
                      <div
                        className="h-full rounded-full bg-accent-primary transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="mt-5 space-y-4">
                      <section aria-label="Thermal dan airflow">
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-tight text-secondary">Thermal &amp; Airflow</h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <MetricCard
                            icon={Cpu}
                            label="Suhu CPU"
                            value={telemetry.cpu_temp_c == null ? '—' : `${telemetry.cpu_temp_c} °C`}
                            level={telemetry.cpu_temp_c == null ? null : (Number(telemetry.cpu_temp_c) / 120) * 100}
                          />
                          <MetricCard
                            icon={Thermometer}
                            label="Suhu GPU"
                            value={telemetry.gpu_temp_c == null ? '—' : `${telemetry.gpu_temp_c} °C`}
                            level={telemetry.gpu_temp_c == null ? null : (Number(telemetry.gpu_temp_c) / 120) * 100}
                          />
                          <MetricCard
                            icon={Activity}
                            label="Kecepatan Kipas"
                            value={telemetry.fan_rpm == null ? '—' : `${telemetry.fan_rpm} RPM`}
                            level={telemetry.fan_rpm == null ? null : (Number(telemetry.fan_rpm) / 2500) * 100}
                          />
                        </div>
                      </section>
                      <section aria-label="Power dan kestabilan voltase">
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-tight text-secondary">Power / Voltage Stability</h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <MetricCard
                            icon={Activity}
                            label="Stabilitas Voltase"
                            value={
                              telemetry.voltage_stability == null
                                ? '—'
                                : `${telemetry.voltage_stability}%`
                            }
                            level={
                              telemetry.voltage_stability == null
                                ? null
                                : Number(telemetry.voltage_stability)
                            }
                          />
                        </div>
                      </section>
                    </div>

                    <div className="mt-5">
                      <div className="mb-2 flex justify-between text-xs text-secondary">
                        <span>Burn-In Stress Test</span>
                        <span className="font-mono font-semibold tabular-nums text-primary">
                          {burninValue}/4 jam Burn-In
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-default">
                        <div
                          className="h-full rounded-full bg-ink transition-all"
                          style={{ width: `${Math.min(100, (burninValue / 4) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <section aria-label="Final readiness" className="mt-4 rounded-lg border border-default bg-canvas p-3">
                      <h3 className="text-xs font-bold uppercase tracking-tight text-secondary">Final Readiness</h3>
                      <p className="mt-2 text-xs text-secondary">
                        Status:{' '}
                        <strong className="text-primary">
                          {selectedUnit.stress_test_status || selectedUnit.status}
                        </strong>{' '}
                        · Pengiriman:{' '}
                        <strong className="text-primary">
                          {selectedUnit.shipping_status || 'Dalam Produksi'}
                        </strong>
                      </p>
                      <p className="mt-1 text-xs text-secondary">
                        {hasLiveTelemetry
                          ? 'Telemetry perangkat terverifikasi ESP32.'
                          : 'Menunggu telemetry ESP32 live sebelum QC dapat diselesaikan.'}
                      </p>

                    {selectedUnit.certificate_id ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-status-live/30 bg-status-live/5 p-3">
                        <p className="font-mono text-xs font-semibold text-status-live">Sertifikat terbit: {selectedUnit.certificate_id}</p>
                        <button type="button" onClick={async () => {
                          if (!selectedUnit.certificate_id) return;
                          await navigator.clipboard.writeText(selectedUnit.certificate_id);
                          setCopiedCertificate(true);
                        }} className="min-h-9 rounded-md border border-default bg-surface px-3 text-xs font-semibold text-primary hover:bg-accent-subtle">{copiedCertificate ? 'Tersalin' : 'Salin ID'}</button>
                      </div>
                    ) : null}
                    </section>
                  </section>
                );
              })()}

              <section aria-label="Kontrol aksi QC" className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={Boolean(activeAction)}
                  onClick={() => void runAction('start_test', 'Mulai Stress Test')}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent-cta px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-cta-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {activeAction === 'start_test' ? 'Memulai…' : 'Mulai Stress Test'}
                </button>

                <button
                  type="button"
                  disabled={Boolean(activeAction) || !hasCompletedBurnIn || !hasLiveTelemetry}
                  onClick={() => void runAction('pass_qc', 'Lulus IoT QC & Terbitkan Sertifikat')}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-status-live/45 bg-status-live/10 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-status-live/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {activeAction === 'pass_qc' ? 'Menerbitkan…' : 'Lulus IoT QC & Terbitkan Sertifikat'}
                </button>

                <button
                  type="button"
                  disabled={
                    Boolean(activeAction) ||
                    !isPassed ||
                    ['Dikirim', 'Shipped'].includes(selectedUnit.shipping_status || '')
                  }
                  onClick={() => void runAction('mark_shipped', 'Tandai Unit Dikirim')}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-ink bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {activeAction === 'mark_shipped' ? 'Memperbarui…' : 'Tandai Unit Dikirim'}
                </button>
              </section>

              <p className="text-xs text-secondary">
                Kelulusan QC memerlukan minimal 4 jam telemetry ESP32 live. Sertifikat diterbitkan saat QC diselesaikan; pengiriman tersedia setelah sertifikat terbit.
              </p>
            </>
          ) : null}
        </div>

        {/* Technical Console Terminal (Intentional High-Contrast Dark Instrument Surface) */}
        <section className="min-h-80 overflow-hidden rounded-xl border border-ink bg-ink text-white shadow-sm">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="tracking-tight flex items-center gap-2 text-sm font-bold text-white">
              <Terminal className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
              <span>Terminal Telemetri ESP32</span>
            </h2>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-status-live">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-live" aria-hidden="true" />
              <span>Aliran Aman</span>
            </span>
          </div>

          <div className="max-h-[620px] space-y-3 overflow-y-auto p-4 font-mono text-xs">
            {logs.length ? (
              logs.map((entry) => (
                <div key={entry.id} className="border-l border-accent-primary/60 pl-3">
                  <p className="text-white/70">
                    <span className="text-accent-primary">[{entry.time}]</span> {entry.message}
                  </p>
                  {entry.payload !== undefined ? (
                    <pre className="mt-1 whitespace-pre-wrap break-all text-white/85">
                      {JSON.stringify(entry.payload, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="flex items-center gap-2 text-white/60">
                <Wifi className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                <span>Menunggu operasi telemetry terautentikasi…</span>
              </p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
