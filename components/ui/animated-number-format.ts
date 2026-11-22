export type AnimatedNumberFormat = 'currency' | 'number' | 'percent';

export function formatAnimatedNumber(
  value: number,
  format: AnimatedNumberFormat,
  decimals = 0,
): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  const clampedDecimals = Math.max(0, Math.min(4, Math.floor(decimals)));

  if (format === 'currency') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: clampedDecimals,
    }).format(safeValue);
  }

  if (format === 'percent') {
    const formatted = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: clampedDecimals,
      maximumFractionDigits: clampedDecimals,
    }).format(safeValue);
    return `${formatted}%`;
  }

  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: clampedDecimals,
    maximumFractionDigits: clampedDecimals,
  }).format(safeValue);
}
