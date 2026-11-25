'use client';

import { useMemo, useState } from 'react';

interface Props { readonly data: readonly { readonly date: string; readonly amount: number }[] }
type Range = '7H' | '30H' | 'Semua';

export function RevenueLineChart({ data }: Props) {
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
    <div className="mb-1 flex justify-end gap-1">{(['7H', '30H', 'Semua'] as const).map((item) => <button key={item} type="button" onClick={() => { setRange(item); setActive(null); }} className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${range === item ? 'bg-white/15 text-white' : 'text-white/45 hover:bg-white/10 hover:text-white/80'}`}>{item}</button>)}</div>
    <div className="relative" onTouchMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const index = Math.round((event.touches[0]!.clientX - rect.left) / rect.width * (coords.length - 1)); setActive(Math.max(0, Math.min(coords.length - 1, index))); }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[112px] w-full overflow-visible" role="img" aria-label="Grafik tren pendapatan order">
        <defs><linearGradient id="revenue-area-gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#F97316" stopOpacity=".28"/><stop offset="100%" stopColor="#F97316" stopOpacity="0"/></linearGradient></defs>
        {[0.25, 0.55, 0.85].map((ratio) => <line key={ratio} x1={left} x2={width-right} y1={top+(height-top-bottom)*ratio} y2={top+(height-top-bottom)*ratio} stroke="white" strokeOpacity=".1" strokeDasharray="4 5"/>)}
        <path d={area} fill="url(#revenue-area-gradient)"/><path d={line} fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
        {coords.map((point, index) => <g key={point.date} onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)} onClick={() => setActive(active === index ? null : index)}><rect x={point.x-16} y={0} width="32" height={height-bottom} fill="transparent"/><circle cx={point.x} cy={point.y} r={active === index ? 4 : 2} fill="#F97316" className="transition-all duration-200"/></g>)}
        {activePoint && <line x1={activePoint.x} x2={activePoint.x} y1={top} y2={height-bottom} stroke="#F97316" strokeOpacity=".45" strokeDasharray="3 4"/>}
        {[0, Math.floor((coords.length-1)/2), coords.length-1].map((index) => coords[index] && <text key={index} x={coords[index]!.x} y={height-5} textAnchor={index === 0 ? 'start' : index === coords.length-1 ? 'end' : 'middle'} fill="white" fillOpacity=".4" fontSize="11">{formatDate(coords[index]!.date)}</text>)}
      </svg>
      {activePoint && <div className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-[#F97316]/40 bg-[#18181B] px-2.5 py-1.5 text-[11px] shadow-lg" style={{ left: `${activePoint.x / width * 100}%`, top: 0 }}><span className="block text-white/60">{formatDate(activePoint.date, true)}</span><strong className="text-[#FB923C]">Rp {Math.round(activePoint.amount).toLocaleString('id-ID')}</strong></div>}
      <div className="absolute inset-0" onMouseLeave={() => setActive(null)} onMouseMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const index = Math.round((event.clientX-rect.left)/rect.width*(coords.length-1)); setActive(Math.max(0,Math.min(coords.length-1,index))); }} />
    </div>
  </div>;
}
