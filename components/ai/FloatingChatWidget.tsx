'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Bot, Maximize2, Minus, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { OPEN_AI_WIDGET_EVENT } from '@/lib/ai/open-ai-consultation';

const ViciChatInterface = dynamic(
  () => import('@/components/ai/ViciChatInterface').then((module) => module.ViciChatInterface),
  { ssr: false, loading: () => <div className="grid min-h-48 flex-1 place-items-center text-sm text-[#52525B]" role="status">Menyiapkan konsultan…</div> },
);

export function FloatingChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpenRequest = () => {
      setOpen(true);
    };
    window.addEventListener(OPEN_AI_WIDGET_EVENT, handleOpenRequest);
    return () => window.removeEventListener(OPEN_AI_WIDGET_EVENT, handleOpenRequest);
  }, []);

  if (
    pathname.startsWith('/admin') ||
    pathname === '/messages' ||
    pathname.startsWith('/messages/') ||
    pathname === '/toolkit/konsultan-ai'
  ) {
    return null;
  }

  const positionClass =
    pathname === '/builder'
      ? 'bottom-[7.5rem] right-4 md:bottom-20 md:right-5 lg:bottom-5'
      : 'bottom-[4.5rem] right-4 md:bottom-5 md:right-5';

  return <div className={`fixed z-40 ${positionClass}`}>
    {open ? <section className="vt-panel-enter mb-3 flex h-[min(570px,calc(100dvh-7rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#E7E2DC] bg-white shadow-[0_20px_60px_rgba(24,24,27,0.18)]" aria-label="Chat ViciTech AI">
      <div className="flex items-center justify-end gap-1 border-b border-[#EEEAE5] px-2 py-1.5">
        <Link href="/toolkit/konsultan-ai" aria-label="Perluas chat ke layar penuh" title="Perluas chat ke layar penuh" className="vt-motion-press grid h-9 w-9 place-items-center rounded-lg text-[#52525B] transition-colors hover:bg-[#F7F5F2] hover:text-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"><Maximize2 size={16} aria-hidden="true" /></Link>
        <button type="button" onClick={() => setOpen(false)} aria-label="Minimalkan jendela chat" title="Minimalkan jendela chat" className="vt-motion-press grid h-9 w-9 place-items-center rounded-lg text-[#52525B] transition-colors hover:bg-[#F7F5F2] hover:text-[#18181B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"><Minus size={17} aria-hidden="true" /></button>
        <button type="button" onClick={() => setOpen(false)} aria-label="Tutup jendela chat" title="Tutup jendela chat" className="vt-motion-press grid h-9 w-9 place-items-center rounded-lg text-[#52525B] transition-colors hover:bg-[#F7F5F2] hover:text-[#18181B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"><X size={17} aria-hidden="true" /></button>
      </div>
      <ViciChatInterface variant="widget" />
    </section> : null}
    <button
      type="button"
      onClick={() => setOpen((value) => !value)}
      aria-expanded={open}
      aria-label={open ? 'Tutup ViciTech AI' : 'Tanya ViciTech AI'}
      className="group ml-auto flex h-12 min-w-12 items-center justify-center rounded-full bg-[#EA580C] px-3.5 text-sm font-semibold text-white shadow-md shadow-[#EA580C]/25 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105 hover:bg-[#C2410C] hover:px-4 hover:shadow-lg hover:shadow-[#EA580C]/30 focus-visible:px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 focus-visible:ring-offset-2 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
    >
      <Bot size={20} className="shrink-0" aria-hidden="true" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:ml-2 group-hover:max-w-[180px] group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-[180px] group-focus-visible:opacity-100 motion-reduce:transition-none">
        {open ? 'Tutup ViciTech AI' : 'Tanya ViciTech AI'}
      </span>
    </button>
  </div>;
}
