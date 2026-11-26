'use client';

import { useMemo, useState } from 'react';

interface Props { readonly data: readonly { readonly date: string; readonly amount: number; readonly orderCount?: number }[]; readonly variant?: 'dark' | 'light' }
type Range = '7H' | '30H' | 'Semua';

export function RevenueLineChart({ data, variant = 'dark' }: Props) {
  const [range, setRange] = useState<Range>('7H');
  const [active, setActive] = useState<number | null>(null);
  const points = useMemo(() => data.slice(range === '7H' ? -7 : range === '30H' ? -30 : 0), [data, range]);
  const width = 600; const height = 124; const left = 8; const right = 8; const top = 10; const bottom = 25;
  const max = Math.max(1, ...points.map((point) => point.amount));
  const coords = points.map((point, index) => ({ x: left + index * (width - left - right) / Math.max(1, points.length - 1), y: top + (1 - point.amount / max) * (height - top - bottom), ...point }));
  const line = coords.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const area = `${line} L ${width - right} ${height - bottom} L ${left} ${height - bottom} Z`;
  const formatDate = (value: string, full = false) => new Intl.DateTimeFormat('id-ID', full ? { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' } : { day: '2-digit', month: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(`${value}T12:00:00+07:00`));
  const activePoint = active === null ? null : coords[active];
  return <div className="mt-4">
    <div className="mb-1 flex justify-end gap-1">{(['7H', '30H', 'Semua'] as const).map((item) => <button key={item} type="button" onClick={() => { setRange(item); setActive(null); }} className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 ${variant === 'dark' ? range === item ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white/85' : range === item ? 'bg-accent-subtle text-accent-hover' : 'text-secondary hover:bg-subtle hover:text-primary'}`}>{variant === 'light' ? item === '7H' ? '7 Hari' : item === '30H' ? '30 Hari' : item : item}</button>)}</div>
    <div className="relative" onTouchMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const index = Math.round((event.touches[0]!.clientX - rect.left) / rect.width * (coords.length - 1)); setActive(Math.max(0, Math.min(coords.length - 1, index))); }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[112px] w-full overflow-visible" role="img" aria-label="Grafik tren pendapatan order">
        <defs><linearGradient id="revenue-area-gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--accent-primary, #EA580C)" stopOpacity=".28"/><stop offset="100%" stopColor="var(--accent-primary, #EA580C)" stopOpacity="0"/></linearGradient></defs>
        {[0.25, 0.55, 0.85].map((ratio) => <line key={ratio} x1={left} x2={width-right} y1={top+(height-top-bottom)*ratio} y2={top+(height-top-bottom)*ratio} stroke={variant === 'dark' ? 'white' : '#A1A1AA'} strokeOpacity={variant === 'dark' ? '.1' : '.3'} strokeDasharray="4 5"/>)}
        <path d={area} fill="url(#revenue-area-gradient)"/><path d={line} fill="none" stroke="var(--accent-primary, #EA580C)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
        {coords.map((point, index) => <g key={point.date} onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)} onClick={() => setActive(active === index ? null : index)}><rect x={point.x-16} y={0} width="32" height={height-bottom} fill="transparent"/><circle cx={point.x} cy={point.y} r={active === index ? 4 : 2} fill="var(--accent-primary, #EA580C)" className="transition-all duration-200"/></g>)}
        {activePoint && <line x1={activePoint.x} x2={activePoint.x} y1={top} y2={height-bottom} stroke="var(--accent-primary, #EA580C)" strokeOpacity=".45" strokeDasharray="3 4"/>}
        {[0, Math.floor((coords.length-1)/2), coords.length-1].map((index) => coords[index] && <text key={index} x={coords[index]!.x} y={height-5} textAnchor={index === 0 ? 'start' : index === coords.length-1 ? 'end' : 'middle'} fill={variant === 'dark' ? 'white' : '#52525B'} fillOpacity={variant === 'dark' ? '.45' : '1'} fontSize="11">{formatDate(coords[index]!.date)}</text>)}
      </svg>
      {activePoint && <div className="vt-obsidian-panel pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-accent-primary/40 px-2.5 py-1.5 text-[11px] shadow-floating" style={{ left: `${activePoint.x / width * 100}%`, top: 0 }}><span className="block text-white/70">{formatDate(activePoint.date, true)}</span><strong className="font-mono tabular-nums text-accent-primary">Rp {Math.round(activePoint.amount).toLocaleString('id-ID')}</strong>{variant === 'light' && <span className="block font-mono tabular-nums text-white/70">{activePoint.orderCount ?? 0} order</span>}</div>}
      <div className="absolute inset-0" onMouseLeave={() => setActive(null)} onMouseMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const index = Math.round((event.clientX-rect.left)/rect.width*(coords.length-1)); setActive(Math.max(0,Math.min(coords.length-1,index))); }} />
    </div>
  </div>;
}
