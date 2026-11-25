'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Bot, Maximize2, Minus, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

const ViciChatInterface = dynamic(
  () => import('@/components/ai/ViciChatInterface').then((module) => module.ViciChatInterface),
  { ssr: false, loading: () => <div className="grid min-h-48 flex-1 place-items-center text-sm text-[#52525B]" role="status">Menyiapkan konsultan…</div> },
);

export function FloatingChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (pathname.startsWith('/admin') || pathname === '/toolkit/konsultan-ai') return null;

  return <div className="fixed bottom-5 right-5 z-40">
    {open ? <section className="vt-panel-enter mb-3 flex h-[min(570px,calc(100dvh-7rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#E7E2DC] bg-white shadow-[0_20px_60px_rgba(24,24,27,0.18)]" aria-label="Chat ViciTech AI">
      <div className="flex items-center justify-end gap-1 border-b border-[#EEEAE5] px-2 py-1.5">
        <Link href="/toolkit/konsultan-ai" aria-label="Expand ke Layar Penuh" title="Expand ke Layar Penuh" className="vt-motion-press grid h-9 w-9 place-items-center rounded-lg text-[#71717A] transition-colors hover:bg-[#F7F5F2] hover:text-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/50"><Maximize2 size={16} aria-hidden="true" /></Link>
        <button type="button" onClick={() => setOpen(false)} aria-label="Minimalkan chat" className="vt-motion-press grid h-9 w-9 place-items-center rounded-lg text-[#71717A] transition-colors hover:bg-[#F7F5F2] hover:text-[#18181B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/50"><Minus size={17} aria-hidden="true" /></button>
        <button type="button" onClick={() => setOpen(false)} aria-label="Tutup chat" className="vt-motion-press grid h-9 w-9 place-items-center rounded-lg text-[#71717A] transition-colors hover:bg-[#F7F5F2] hover:text-[#18181B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/50"><X size={17} aria-hidden="true" /></button>
      </div>
      <ViciChatInterface variant="widget" />
    </section> : null}
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="vt-motion-press ml-auto flex min-h-12 items-center gap-2 rounded-full bg-[#EA580C] px-5 text-sm font-semibold text-white shadow-lg shadow-[#EA580C]/20 transition-[transform,box-shadow,background-color] duration-motion-hover ease-natural hover:-translate-y-0.5 hover:bg-[#C2410C] hover:shadow-xl active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/50 focus-visible:ring-offset-2">
      <Bot size={18} aria-hidden="true" />{open ? 'Tutup ViciTech AI' : 'Tanya ViciTech AI'}
    </button>
  </div>;
}
