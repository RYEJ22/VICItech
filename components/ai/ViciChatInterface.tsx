'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUp, RotateCcw, Sparkles } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import {
  AI_PROMPT_EVENT,
  OPEN_AI_WIDGET_EVENT,
  PENDING_AI_PROMPT_KEY,
  consumePendingAiPrompt,
} from '@/lib/ai/open-ai-consultation';

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

const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => <p className="mb-2 leading-6 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="my-1.5 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-6">{children}</li>,
  h1: ({ children }) => <h3 className="mb-1.5 mt-3 text-sm font-bold text-primary first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-1.5 mt-3 text-sm font-bold text-primary first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-1 mt-2.5 text-sm font-semibold text-primary first:mt-0">{children}</h4>,
  h4: ({ children }) => <h4 className="mb-1 mt-2 text-sm font-semibold text-primary first:mt-0">{children}</h4>,
  blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-accent-primary/50 pl-3 text-secondary">{children}</blockquote>,
  hr: () => <hr className="my-2.5 border-default" />,
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg border border-default bg-canvas p-3 font-mono text-xs leading-5 text-primary">
      {children}
    </pre>
  ),
  code: ({ children }) => (
    <code className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[12px] text-primary">
      {children}
    </code>
  ),
  a: ({ href, children }) => {
    const safeHref = typeof href === 'string' && /^(https?:\/\/|\/)/i.test(href) ? href : undefined;
    if (!safeHref) return <span>{children}</span>;
    const isExternal = /^https?:\/\//i.test(safeHref);
    return (
      <a
        href={safeHref}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="rounded-sm font-medium text-accent-hover underline underline-offset-2 hover:text-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
      >
        {children}
      </a>
    );
  },
};

function AssistantMarkdown({ content }: { readonly content: string }) {
  return (
    <div className="text-sm text-primary [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-xs">
      <ReactMarkdown components={MARKDOWN_COMPONENTS}>{content}</ReactMarkdown>
    </div>
  );
}

export function ViciChatInterface({ variant }: ViciChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const latestInputRef = useRef('');
  latestInputRef.current = input;
  const compact = variant === 'widget';

  useEffect(() => {
    setMessages(readHistory());
    setReady(true);

    let initialPrompt = consumePendingAiPrompt();
    if (!initialPrompt && typeof window !== 'undefined') {
      const urlPrompt = new URLSearchParams(window.location.search).get('prompt');
      if (urlPrompt) initialPrompt = urlPrompt.trim();
    }
    if (initialPrompt) {
      setInput(initialPrompt);
      window.requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, []);

  useEffect(() => {
    if (ready) sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, ready]);

  useEffect(() => {
    const receivePrompt = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail === 'string') {
        const clean = event.detail.trim();
        if (!clean) return;
        consumePendingAiPrompt();
        setInput(clean);
        window.requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      }
    };
    window.addEventListener(AI_PROMPT_EVENT, receivePrompt);
    window.addEventListener(OPEN_AI_WIDGET_EVENT, receivePrompt);
    return () => {
      window.removeEventListener(AI_PROMPT_EVENT, receivePrompt);
      window.removeEventListener(OPEN_AI_WIDGET_EVENT, receivePrompt);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (variant !== 'widget' || typeof window === 'undefined') return;
      const draftText = latestInputRef.current.trim();
      if (draftText) {
        try {
          window.sessionStorage.setItem(PENDING_AI_PROMPT_KEY, draftText);
        } catch {
          // Abaikan kegagalan storage.
        }
      }
    };
  }, [variant]);

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
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) setMessages((current) => current.map((message, index) => index === current.length - 1 && message.role === 'assistant'
          ? { ...message, content: message.content + chunk } : message));
      }
      const finalChunk = decoder.decode();
      if (finalChunk) setMessages((current) => current.map((message, index) => index === current.length - 1 && message.role === 'assistant'
        ? { ...message, content: message.content + finalChunk } : message));
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
    <section className={`flex min-h-0 flex-col bg-surface ${compact ? 'h-full' : 'min-h-[460px] rounded-xl border border-default shadow-card sm:min-h-[560px]'}`} aria-label="Konsultan Rakitan AI">
      <header className="flex items-center justify-between gap-2 border-b border-default px-3.5 py-3 sm:gap-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent-primary"><Sparkles size={18} aria-hidden="true" /></span>
          <div className="min-w-0"><h2 className="truncate text-sm font-bold text-primary">ViciTech AI</h2><p className="truncate text-xs text-secondary">Konsultan Rakitan &amp; Hardware</p></div>
        </div>
        <button type="button" onClick={resetChat} className="vt-motion-press inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-secondary transition-colors hover:bg-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"><RotateCcw size={14} aria-hidden="true" />Reset Obrolan</button>
      </header>

      <div className={`min-h-0 flex-1 space-y-4 overflow-y-auto p-3.5 sm:p-4 ${compact ? 'max-h-[340px]' : 'max-h-[min(58dvh,680px)] sm:max-h-[min(68vh,760px)] sm:p-6'}`} aria-live="polite">
        {messages.length === 0 ? <div className="mx-auto max-w-lg py-5 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent-subtle text-accent-primary"><Sparkles aria-hidden="true" /></span>
          <h3 className="mt-3 font-bold tracking-tight text-primary">Ada yang ingin dirakit?</h3>
          <p className="mt-1 text-sm text-secondary">Ceritakan kebutuhan atau anggaranmu, kami bantu cari opsi yang pas.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">{STARTERS.map((starter) => <button key={starter} type="button" onClick={() => void sendMessage(undefined, starter)} className="vt-motion-press min-h-10 rounded-full border border-default bg-canvas px-3.5 py-2 text-xs font-medium text-secondary transition-all duration-200 ease-smooth hover:border-accent-primary/40 hover:bg-accent-subtle hover:text-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50">{starter}</button>)}</div>
        </div> : messages.map((message, index) => <div key={`${index}-${message.role}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[92%] break-words overflow-x-auto rounded-xl px-3.5 py-3 sm:max-w-[90%] sm:px-4 ${message.role === 'user' ? 'bg-accent-primary text-white' : 'border border-default bg-canvas text-primary shadow-card'}`}>
            {message.content ? (
              message.role === 'user' ? (
                <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
              ) : (
                <AssistantMarkdown content={message.content} />
              )
            ) : <span className="inline-flex gap-1 py-1" aria-label="AI sedang mengetik"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-primary" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-primary [animation-delay:120ms]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-primary [animation-delay:240ms]" /></span>}
          </div>
        </div>)}
        {loading && messages.at(-1)?.role !== 'assistant' && <p className="text-xs text-secondary">ViciTech AI sedang menyiapkan jawaban…</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={(event) => void sendMessage(event)} className="flex items-end gap-2 border-t border-default p-3 sm:p-4">
        <label className="sr-only" htmlFor={`vici-chat-input-${variant}`}>Pesan untuk ViciTech AI</label>
        <textarea
          ref={inputRef}
          id={`vici-chat-input-${variant}`}
          rows={input.length > 72 || input.includes('\n') ? 3 : 1}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void sendMessage();
            }
          }}
          maxLength={4000}
          placeholder="Tulis pertanyaan hardware…"
          className="vt-form-control min-h-11 max-h-36 min-w-0 flex-1 resize-y rounded-lg border border-default bg-subtle px-3 py-2.5 text-sm leading-5 text-primary placeholder:text-secondary focus-visible:border-accent-primary focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
        />
        <button type="submit" disabled={!input.trim() || loading} aria-label="Kirim pesan" className="vt-motion-press grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent-primary text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 focus-visible:ring-offset-1"><ArrowUp size={19} aria-hidden="true" /></button>
      </form>
    </section>
  );
}
