import type { BottleneckAnalysisResult } from './bottleneckEngine';

export interface ShareCardPayload {
  readonly cpuName: string;
  readonly gpuName: string;
  readonly ramName: string;
  readonly moboName: string;
  readonly psuName: string;
  readonly result: BottleneckAnalysisResult;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 3 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

/**
 * Merender kartu hasil analisis Bottleneck & PSU ke PNG 1080×1350 (4:5)
 * siap dibagikan ke WhatsApp atau Instagram Story.
 */
export async function generateBottleneckCardPng(payload: ShareCardPayload): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('Generator kartu hanya tersedia di browser.');
  }

  const width = 1080;
  const height = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Gagal menginisialisasi kanvas gambar.');
  }

  const { result } = payload;

  // Latar Clean Editorial (#FAF9F6)
  ctx.fillStyle = '#FAF9F6';
  ctx.fillRect(0, 0, width, height);

  // Garis aksen oranye tipis di paling atas
  ctx.fillStyle = '#EA580C';
  ctx.fillRect(0, 0, width, 12);

  // Header Brand & Badge
  ctx.fillStyle = '#EA580C';
  ctx.font = '700 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('VICITECH OS · TOOLKIT TELEMETRI', 64, 86);

  ctx.fillStyle = '#18181B';
  ctx.font = '800 44px system-ui, -apple-system, sans-serif';
  ctx.fillText('Hasil Analisis Bottleneck & PSU', 64, 144);

  // Pill Skenario
  const scenarioText = `Skenario: ${result.scenario.label} · Estimasi Simulasi`;
  ctx.font = '600 22px system-ui, -apple-system, sans-serif';
  const pillW = Math.min(width - 128, ctx.measureText(scenarioText).width + 44);
  drawRoundedRect(ctx, 64, 168, pillW, 44, 22);
  ctx.fillStyle = '#FFF7ED';
  ctx.fill();
  ctx.strokeStyle = '#FDBA74';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#C2410C';
  ctx.fillText(scenarioText, 86, 198);

  // Kartu Utama: Skor Bottleneck & Utilisasi
  drawRoundedRect(ctx, 64, 240, width - 128, 250, 24);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#E4E2DD';
  ctx.lineWidth = 2;
  ctx.stroke();

  const severityColor =
    result.severity === 'optimal'
      ? '#059669'
      : result.severity === 'warning'
        ? '#D97706'
        : '#DC2626';

  // Gauge semi-lingkaran
  const cx = 210;
  const cy = 408;
  const radius = 92;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI, 0, false);
  ctx.strokeStyle = '#F3F1ED';
  ctx.lineWidth = 20;
  ctx.lineCap = 'round';
  ctx.stroke();

  const frac = Math.min(1, Math.max(0.03, result.bottleneckPct / 50));
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI, Math.PI + Math.PI * frac, false);
  ctx.strokeStyle = severityColor;
  ctx.lineWidth = 20;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.fillStyle = '#18181B';
  ctx.font = '800 46px ui-monospace, SFMono-Regular, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${result.bottleneckPct.toFixed(1)}%`, cx, cy - 10);
  ctx.fillStyle = severityColor;
  ctx.font = '700 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(result.statusBadge.toUpperCase(), cx, cy + 28);
  ctx.textAlign = 'left';

  // Penjelasan & Utilisasi kanan
  const rx = 365;
  ctx.fillStyle = '#18181B';
  ctx.font = '700 28px system-ui, -apple-system, sans-serif';
  ctx.fillText(truncateText(ctx, result.directionLabel, 610), rx, 296);

  ctx.fillStyle = '#52525B';
  ctx.font = '500 21px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Utilisasi CPU: ${result.cpuUtilizationPct}%   ·   Utilisasi GPU: ${result.gpuUtilizationPct}%`, rx, 336);

  // Bar Utilisasi CPU & GPU
  const barW = 580;
  const drawMiniBar = (label: string, pct: number, yPos: number, color: string) => {
    ctx.fillStyle = '#52525B';
    ctx.font = '600 18px system-ui, -apple-system, sans-serif';
    ctx.fillText(label, rx, yPos);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#18181B';
    ctx.font = '700 18px ui-monospace, SFMono-Regular, monospace';
    ctx.fillText(`${pct}%`, rx + barW, yPos);
    ctx.textAlign = 'left';

    drawRoundedRect(ctx, rx, yPos + 10, barW, 14, 7);
    ctx.fillStyle = '#F3F1ED';
    ctx.fill();

    drawRoundedRect(ctx, rx, yPos + 10, Math.max(18, (barW * Math.min(100, pct)) / 100), 14, 7);
    ctx.fillStyle = color;
    ctx.fill();
  };

  drawMiniBar('CPU Load', result.cpuUtilizationPct, 384, result.direction === 'cpu' ? '#EA580C' : '#059669');
  drawMiniBar('GPU Load', result.gpuUtilizationPct, 444, result.direction === 'gpu' ? '#EA580C' : '#059669');

  // Kartu Spesifikasi Rakitan
  drawRoundedRect(ctx, 64, 516, width - 128, 308, 24);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#E4E2DD';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#18181B';
  ctx.font = '700 24px system-ui, -apple-system, sans-serif';
  ctx.fillText('Spesifikasi Konfigurasi', 96, 562);

  const specRows: readonly [string, string][] = [
    ['CPU', payload.cpuName],
    ['GPU', payload.gpuName],
    ['RAM', payload.ramName || 'Tidak ditentukan'],
    ['Motherboard', payload.moboName || 'Tidak ditentukan'],
    ['Power Supply', `${payload.psuName || 'Belum dipilih'} (${result.psuHeadroom.statusLabel})`],
  ];

  specRows.forEach(([label, val], idx) => {
    const y = 610 + idx * 42;
    ctx.fillStyle = '#71717A';
    ctx.font = '600 20px system-ui, -apple-system, sans-serif';
    ctx.fillText(label, 96, y);

    ctx.fillStyle = '#18181B';
    ctx.font = '600 20px ui-monospace, SFMono-Regular, monospace';
    ctx.fillText(truncateText(ctx, val, 680), 285, y);
  });

  // Kartu PSU Headroom + Breakdown Skenario
  drawRoundedRect(ctx, 64, 850, width - 128, 130, 24);
  ctx.fillStyle = '#FFF7ED';
  ctx.fill();
  ctx.strokeStyle = '#FED7AA';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#9A3412';
  ctx.font = '700 20px system-ui, -apple-system, sans-serif';
  ctx.fillText('HEADROOM DAYA PSU (+35% MARGIN AMAN)', 96, 894);

  ctx.fillStyle = '#18181B';
  ctx.font = '700 28px ui-monospace, SFMono-Regular, monospace';
  ctx.fillText(
    `Beban: ${result.psuHeadroom.estimatedWattage} W   |   Saran PSU: ≥ ${result.psuHeadroom.recommendedPsuWatts} W   |   ${result.psuHeadroom.statusLabel}`,
    96,
    944,
  );

  // Breakdown 4 Skenario Simulasi
  drawRoundedRect(ctx, 64, 1006, width - 128, 244, 24);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#E4E2DD';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#18181B';
  ctx.font = '700 22px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Estimasi Simulasi — ${result.scenario.label}`, 96, 1048);

  const items = result.scenarioBenchmarks.slice(0, 4);
  items.forEach((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const bx = 96 + col * 456;
    const by = 1072 + row * 80;

    drawRoundedRect(ctx, bx, by, 432, 66, 14);
    ctx.fillStyle = '#FAF9F6';
    ctx.fill();
    ctx.strokeStyle = '#E4E2DD';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#18181B';
    ctx.font = '700 18px system-ui, -apple-system, sans-serif';
    ctx.fillText(truncateText(ctx, item.title, 220), bx + 16, by + 28);

    ctx.fillStyle = '#71717A';
    ctx.font = '500 14px system-ui, -apple-system, sans-serif';
    ctx.fillText(truncateText(ctx, item.preset, 220), bx + 16, by + 50);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#EA580C';
    ctx.font = '700 19px ui-monospace, SFMono-Regular, monospace';
    ctx.fillText(truncateText(ctx, item.metricDisplay, 185), bx + 416, by + 39);
    ctx.textAlign = 'left';
  });

  // Watermark halus di bagian bawah
  ctx.fillStyle = '#71717A';
  ctx.font = '600 18px system-ui, -apple-system, sans-serif';
  ctx.fillText('vicitech.id · Marketplace & Ekosistem Circular IT Terverifikasi IoT QC', 64, 1304);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#A1A1AA';
  ctx.font = '500 16px ui-monospace, SFMono-Regular, monospace';
  ctx.fillText('Simulasi Referensi ViciTech', width - 64, 1304);
  ctx.textAlign = 'left';

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Gagal mengekspor kartu hasil ke PNG.'));
    }, 'image/png');
  });
}
