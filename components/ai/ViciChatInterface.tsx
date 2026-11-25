'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUp, RotateCcw, Sparkles } from 'lucide-react';

const HISTORY_KEY = 'vicitech_ai_chat_history';
const STARTERS = ['Rakit PC gaming sesuai budget', 'Cek upgrade RAM dan SSD laptop', 'Jelaskan IoT QC dan pembayaran DP'];

interface ChatItem {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

interface ViciChatInterfaceProps {
  readonly variant: 'widget' | 'page';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readHistory(): ChatItem[] {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(HISTORY_KEY) ?? '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter((item): item is ChatItem => isRecord(item) &&
      (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string');
  } catch {
    return [];
  }
}

function MessageText({ text }: { readonly text: string }) {
  return <div className="space-y-1.5 text-sm leading-6">{text.split('\n').map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={index} className="h-1" />;
    const bullet = /^[-*•]\s+/.test(trimmed);
    const content = bullet ? trimmed.replace(/^[-*•]\s+/, '') : trimmed;
    return <p key={index} className={bullet ? 'pl-4 before:-ml-4 before:mr-2 before:content-["•"]' : ''}>{content}</p>;
  })}</div>;
}

export function ViciChatInterface({ variant }: ViciChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const compact = variant === 'widget';

  useEffect(() => {
    setMessages(readHistory());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, ready]);

  useEffect(() => {
    const receivePrompt = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail === 'string') setInput(event.detail);
    };
    window.addEventListener('vicitech:ai-prompt', receivePrompt);
    return () => window.removeEventListener('vicitech:ai-prompt', receivePrompt);
  }, []);

  async function sendMessage(event?: FormEvent<HTMLFormElement>, prompt?: string) {
    event?.preventDefault();
    const text = (prompt ?? input).trim();
    if (!text || loading) return;
    const updated: ChatItem[] = [...messages, { role: 'user', content: text }];
    setMessages(updated);
    setInput('');
    setLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated.map(({ role, content }) => ({ role, content })) }),
      });
      if (!response.ok || !response.body) {
        const result: unknown = await response.json().catch(() => ({}));
        const error = isRecord(result) && typeof result.error === 'string'
          ? result.error : 'Maaf, konsultan AI belum dapat menjawab. Coba lagi sebentar.';
        setMessages((current) => [...current, { role: 'assistant', content: error }]);
        return;
      }
      setMessages((current) => [...current, { role: 'assistant', content: '' }]);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamBuffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamBuffer += decoder.decode(value, { stream: true });
        const events = streamBuffer.split('\n\n');
        streamBuffer = events.pop() ?? '';
        for (const item of events) {
          const line = item.split('\n').find((entry) => entry.startsWith('data:'));
          if (!line) continue;
          try {
            const delta: unknown = JSON.parse(line.slice(5).trim());
            if (isRecord(delta) && typeof delta.text === 'string') {
              setMessages((current) => current.map((message, index) => index === current.length - 1 && message.role === 'assistant'
                ? { ...message, content: message.content + delta.text } : message));
            }
          } catch { /* Ignore malformed stream frames. */ }
        }
      }
    } catch {
      setMessages((current) => [...current, { role: 'assistant', content: 'Koneksi terputus. Silakan kirim pertanyaan sekali lagi.' }]);
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setMessages([]);
    sessionStorage.removeItem(HISTORY_KEY);
  }

  return (
    <section className={`flex min-h-0 flex-col bg-white ${compact ? 'h-full' : 'min-h-[560px] rounded-2xl border border-[#E7E2DC] shadow-sm'}`} aria-label="Konsultan Rakitan AI">
      <header className="flex items-center justify-between gap-3 border-b border-[#EEEAE5] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#EA580C]/10 text-[#EA580C]"><Sparkles size={18} aria-hidden="true" /></span>
          <div><h2 className="text-sm font-bold text-[#18181B]">ViciTech AI</h2><p className="text-xs text-[#71717A]">Konsultan Rakitan & Hardware</p></div>
        </div>
        <button type="button" onClick={resetChat} className="vt-motion-press inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-[#71717A] transition-colors hover:bg-[#F7F5F2] hover:text-[#18181B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/50"><RotateCcw size={14} aria-hidden="true" />Reset Obrolan</button>
      </header>

      <div className={`min-h-0 flex-1 space-y-4 overflow-y-auto p-4 ${compact ? 'max-h-[360px]' : 'max-h-[min(68vh,760px)] sm:p-6'}`} aria-live="polite">
        {messages.length === 0 ? <div className="mx-auto max-w-lg py-5 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#EA580C]/10 text-[#EA580C]"><Sparkles aria-hidden="true" /></span>
          <h3 className="mt-3 font-bold tracking-tight text-[#18181B]">Ada yang ingin dirakit?</h3>
          <p className="mt-1 text-sm text-[#71717A]">Ceritakan kebutuhan atau anggaranmu, kami bantu cari opsi yang pas.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">{STARTERS.map((starter) => <button key={starter} type="button" onClick={() => void sendMessage(undefined, starter)} className="vt-motion-press rounded-full border border-[#E7E2DC] px-3 py-2 text-xs font-medium text-[#52525B] transition-colors hover:border-[#EA580C]/40 hover:bg-[#FFF7ED] hover:text-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/50">{starter}</button>)}</div>
        </div> : messages.map((message, index) => <div key={`${index}-${message.role}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[90%] rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-[#EA580C] text-white' : 'border border-[#EEEAE5] bg-white text-[#27272A] shadow-sm'}`}>
            {message.content ? <MessageText text={message.content} /> : <span className="inline-flex gap-1 py-1" aria-label="AI sedang mengetik"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#EA580C]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#EA580C] [animation-delay:120ms]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#EA580C] [animation-delay:240ms]" /></span>}
          </div>
        </div>)}
        {loading && messages.at(-1)?.role !== 'assistant' && <p className="text-xs text-[#71717A]">ViciTech AI sedang menyiapkan jawaban…</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={(event) => void sendMessage(event)} className="flex gap-2 border-t border-[#EEEAE5] p-3 sm:p-4">
        <label className="sr-only" htmlFor={`vici-chat-input-${variant}`}>Pesan untuk ViciTech AI</label>
        <input id={`vici-chat-input-${variant}`} value={input} onChange={(event) => setInput(event.target.value)} maxLength={4000} placeholder="Tulis pertanyaan hardware…" className="vt-form-control min-w-0 flex-1 rounded-xl border border-[#E7E2DC] bg-[#FAFAF9] px-3 py-2.5 text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus-visible:outline-none" />
        <button type="submit" disabled={!input.trim() || loading} aria-label="Kirim pesan" className="vt-motion-press grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#EA580C] text-white transition-colors hover:bg-[#C2410C] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/50"><ArrowUp size={19} aria-hidden="true" /></button>
      </form>
    </section>
  );
}
