'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from 'react';
import { ArrowUp, ArrowUpRight, Package, RotateCcw, Sparkles, X } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { useLanguage } from '@/components/providers/LanguageProvider';
import {
  AI_PROMPT_EVENT,
  OPEN_AI_WIDGET_EVENT,
  PENDING_AI_PROMPT_KEY,
  consumePendingAiPrompt,
} from '@/lib/ai/open-ai-consultation';
import styles from './vici-chat.module.css';

const HISTORY_KEY = 'vicitech_ai_chat_history';
const MAX_TEXTAREA_HEIGHT_PX = 128;

interface ChatItem {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

interface ViciChatInterfaceProps {
  readonly variant: 'widget' | 'page';
}

interface ParsedTableSegment {
  readonly kind: 'table';
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

interface ParsedCatalogCard {
  readonly title: string;
  readonly category?: string;
  readonly price?: string;
  readonly stock?: string;
  readonly specs?: string;
  readonly href: string;
}

interface ParsedCatalogSegment {
  readonly kind: 'catalog';
  readonly items: readonly ParsedCatalogCard[];
}

interface ParsedMarkdownSegment {
  readonly kind: 'markdown';
  readonly text: string;
}

type AssistantSegment = ParsedTableSegment | ParsedCatalogSegment | ParsedMarkdownSegment;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readHistory(): ChatItem[] {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(HISTORY_KEY) ?? '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter(
      (item): item is ChatItem =>
        isRecord(item) &&
        (item.role === 'user' || item.role === 'assistant') &&
        typeof item.content === 'string',
    );
  } catch {
    return [];
  }
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function isTableSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|') || !trimmed.includes('-')) return false;
  return /^\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/.test(trimmed);
}

function parseCatalogLine(line: string): ParsedCatalogCard | null {
  const cleaned = line.trim().replace(/^[-*•]\s+/, '');
  if (!cleaned) return null;

  // Format A: structured catalog line with pipes & Rp price (e.g., "Title | Category | Rp 12.500.000 | stok: ready | spesifikasi: ...")
  if (cleaned.includes('|') && /Rp\s?[\d.,]+/i.test(cleaned)) {
    const parts = cleaned
      .split('|')
      .map((part) => part.replace(/\*\*/g, '').trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      const title = parts[0] ?? '';
      if (!title || title.length > 140) return null;
      let price: string | undefined;
      let stock: string | undefined;
      let specs: string | undefined;
      let category: string | undefined;

      for (const part of parts.slice(1)) {
        if (!price && /^Rp\s?[\d.,]+/i.test(part)) {
          price = part;
        } else if (!stock && /^(stok|stock)\s*:/i.test(part)) {
          stock = part.replace(/^(stok|stock)\s*:\s*/i, '').trim();
        } else if (!specs && /^(spesifikasi|specs?)\s*:/i.test(part)) {
          specs = part.replace(/^(spesifikasi|specs?)\s*:\s*/i, '').trim();
        } else if (!category) {
          category = part;
        } else {
          specs = specs ? `${specs} · ${part}` : part;
        }
      }

      if (price) {
        return {
          title,
          category,
          price,
          stock,
          specs,
          href: `/market?q=${encodeURIComponent(title)}`,
        };
      }
    }
  }

  // Format B: explicit markdown link to a /market/<slug> product entry
  const marketLinkMatch = /^\[([^\]]{3,120})\]\((\/market\/[a-zA-Z0-9_%-]+)\)(.*)$/.exec(cleaned);
  if (marketLinkMatch) {
    const title = (marketLinkMatch[1] ?? '').replace(/\*\*/g, '').trim();
    const href = marketLinkMatch[2] ?? '/market';
    const tail = (marketLinkMatch[3] ?? '').replace(/^[\s—–:-]+/, '').trim();
    const priceMatch = tail.match(/Rp\s?[\d.,]+(?:\s?(?:jt|juta|rb|ribu))?/i);
    const specs = tail
      .replace(priceMatch?.[0] ?? '', '')
      .replace(/^[\s—–|,-]+|[\s—–|,-]+$/g, '')
      .trim();
    return {
      title,
      price: priceMatch?.[0],
      specs: specs || undefined,
      href,
    };
  }

  return null;
}

function parseAssistantSegments(content: string): AssistantSegment[] {
  const lines = content.split(/\r?\n/);
  const segments: AssistantSegment[] = [];
  let mdBuffer: string[] = [];
  let inFence = false;

  const flushMarkdown = () => {
    const joined = mdBuffer.join('\n').trim();
    if (joined) segments.push({ kind: 'markdown', text: joined });
    mdBuffer = [];
  };

  let idx = 0;
  while (idx < lines.length) {
    const line = lines[idx] ?? '';
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      mdBuffer.push(line);
      idx += 1;
      continue;
    }

    if (!inFence) {
      const nextLine = lines[idx + 1] ?? '';
      if (line.includes('|') && isTableSeparatorLine(nextLine)) {
        const headers = splitTableRow(line);
        if (headers.length >= 2) {
          flushMarkdown();
          idx += 2;
          const rows: string[][] = [];
          while (idx < lines.length) {
            const rowLine = lines[idx] ?? '';
            if (!rowLine.trim() || !rowLine.includes('|')) break;
            rows.push(splitTableRow(rowLine));
            idx += 1;
          }
          segments.push({ kind: 'table', headers, rows });
          continue;
        }
      }

      const catalogCard = parseCatalogLine(line);
      if (catalogCard) {
        flushMarkdown();
        const cards: ParsedCatalogCard[] = [catalogCard];
        idx += 1;
        while (idx < lines.length) {
          const nextCard = parseCatalogLine(lines[idx] ?? '');
          if (!nextCard) break;
          cards.push(nextCard);
          idx += 1;
        }
        segments.push({ kind: 'catalog', items: cards });
        continue;
      }
    }

    mdBuffer.push(line);
    idx += 1;
  }

  flushMarkdown();
  return segments;
}

const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => (
    <p className="mb-2 break-words leading-6 tabular-nums last:mb-0">{children}</p>
  ),
  strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="my-1.5 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="break-words leading-6 tabular-nums">{children}</li>,
  h1: ({ children }) => (
    <h3 className="mb-1.5 mt-3 text-sm font-bold text-primary first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mb-1.5 mt-3 text-sm font-bold text-primary first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mb-1 mt-2.5 text-sm font-semibold text-primary first:mt-0">{children}</h4>
  ),
  h4: ({ children }) => (
    <h4 className="mb-1 mt-2 text-sm font-semibold text-primary first:mt-0">{children}</h4>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-accent-primary/50 pl-3 text-secondary">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-2.5 border-default" />,
  table: ({ children }) => (
    <div className={`${styles.markdownTableWrap} my-2.5`}>
      <table className="w-full min-w-[260px] border-collapse text-left text-xs tabular-nums">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-default bg-subtle text-[11px] font-semibold uppercase tracking-wide text-secondary">
      {children}
    </thead>
  ),
  th: ({ children }) => <th className="whitespace-nowrap px-3 py-2 font-semibold">{children}</th>,
  td: ({ children }) => (
    <td className="border-t border-default/60 px-3 py-2 align-top text-primary">{children}</td>
  ),
  pre: ({ children }) => (
    <pre className="my-2 w-full max-w-full overflow-x-auto rounded-lg border border-default bg-canvas p-3 font-mono text-xs leading-5 tabular-nums text-primary">
      {children}
    </pre>
  ),
  code: ({ children }) => (
    <code className="break-all rounded bg-subtle px-1.5 py-0.5 font-mono text-[12px] tabular-nums text-primary">
      {children}
    </code>
  ),
  a: ({ href, children }) => {
    const safeHref =
      typeof href === 'string' && /^(https?:\/\/|\/)/i.test(href) ? href : undefined;
    if (!safeHref) return <span>{children}</span>;
    const isExternal = /^https?:\/\//i.test(safeHref);
    return (
      <a
        href={safeHref}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="break-words rounded-sm font-medium text-accent-hover underline underline-offset-2 hover:text-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
      >
        {children}
      </a>
    );
  },
};

function AssistantMessageBody({
  content,
  catalogCardLabel,
  catalogCardCta,
  stockReady,
  stockPreorder,
}: {
  readonly content: string;
  readonly catalogCardLabel: string;
  readonly catalogCardCta: string;
  readonly stockReady: string;
  readonly stockPreorder: string;
}): ReactElement {
  const segments = useMemo(() => parseAssistantSegments(content), [content]);

  return (
    <div className="min-w-0 max-w-full space-y-2.5 text-sm text-primary [&_pre_code]:break-normal [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-xs">
      {segments.map((segment, index) => {
        if (segment.kind === 'table') {
          return (
            <div key={`tbl-${index}`} className={styles.markdownTableWrap}>
              <table className="w-full min-w-[280px] border-collapse text-left text-xs tabular-nums">
                <thead className="border-b border-default bg-subtle text-[11px] font-semibold uppercase tracking-wide text-secondary">
                  <tr>
                    {segment.headers.map((header, hIdx) => (
                      <th key={`th-${hIdx}`} className="whitespace-nowrap px-3 py-2 font-semibold">
                        {header.replace(/\*\*/g, '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-default/60">
                  {segment.rows.map((row, rIdx) => (
                    <tr key={`tr-${rIdx}`} className="odd:bg-surface/60 even:bg-transparent">
                      {segment.headers.map((_h, cIdx) => {
                        const cell = (row[cIdx] ?? '').replace(/\*\*/g, '');
                        const isNumeric = /(?:Rp\s?\d|\d+\s?(?:FPS|W|°C|°F|GB|TB|MHz|RPM|%))/i.test(cell);
                        return (
                          <td
                            key={`td-${rIdx}-${cIdx}`}
                            className={`px-3 py-2 align-top text-primary ${
                              isNumeric ? 'whitespace-nowrap font-mono font-semibold tabular-nums' : 'min-w-[6.5rem]'
                            }`}
                          >
                            {cell}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (segment.kind === 'catalog') {
          return (
            <div key={`cat-${index}`} className="grid grid-cols-1 gap-2">
              {segment.items.map((item, cIdx) => {
                const isPreorder = /pre[-_\s]?order/i.test(item.stock ?? '');
                const stockLabel = item.stock
                  ? isPreorder
                    ? stockPreorder
                    : stockReady
                  : null;
                return (
                  <div
                    key={`${item.title}-${cIdx}`}
                    className={`${styles.catalogCard} flex min-w-0 flex-col gap-2 rounded-xl p-3`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-accent-primary">
                        <Package className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{item.category || catalogCardLabel}</span>
                      </span>
                      {stockLabel && (
                        <span className={isPreorder ? 'vt-badge-sample' : 'vt-badge-live'}>
                          {stockLabel}
                        </span>
                      )}
                    </div>
                    <p className="break-words text-sm font-bold leading-snug text-primary">
                      {item.title}
                    </p>
                    {item.specs && (
                      <p className="break-words text-xs leading-relaxed text-secondary">
                        {item.specs}
                      </p>
                    )}
                    <div className="mt-0.5 flex flex-wrap items-center justify-between gap-2 border-t border-default/70 pt-2">
                      {item.price && (
                        <span className="font-mono text-sm font-bold tabular-nums text-primary">
                          {item.price}
                        </span>
                      )}
                      <Link
                        href={item.href}
                        className="vt-motion-press ml-auto inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-accent-primary px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
                      >
                        <span>{catalogCardCta}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }

        return (
          <div key={`md-${index}`} className="min-w-0 max-w-full">
            <ReactMarkdown components={MARKDOWN_COMPONENTS}>{segment.text}</ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
}

export function ViciChatInterface({ variant }: ViciChatInterfaceProps) {
  const { t, language } = useLanguage();
  const ai = t.routes.aiConsultant;
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

  // Bounded auto-resize textarea (1 line up to ~5 lines, then inner vertical scroll).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT_PX);
    el.style.height = `${Math.max(44, nextHeight)}px`;
  }, [input]);

  useEffect(() => {
    if (ready) sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
    const prefersReduced =
      typeof window !== 'undefined' &&
      (document.documentElement.getAttribute('data-reduced-motion') === 'true' ||
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
    bottomRef.current?.scrollIntoView({
      behavior: prefersReduced ? 'auto' : 'smooth',
      block: 'end',
    });
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
        body: JSON.stringify({
          messages: updated.map(({ role, content }) => ({ role, content })),
          language,
        }),
      });
      if (!response.ok || !response.body) {
        const result: unknown = await response.json().catch(() => ({}));
        const error =
          isRecord(result) && typeof result.error === 'string'
            ? result.error
            : ai.errorFallback;
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
        if (chunk)
          setMessages((current) =>
            current.map((message, index) =>
              index === current.length - 1 && message.role === 'assistant'
                ? { ...message, content: message.content + chunk }
                : message,
            ),
          );
      }
      const finalChunk = decoder.decode();
      if (finalChunk)
        setMessages((current) =>
          current.map((message, index) =>
            index === current.length - 1 && message.role === 'assistant'
              ? { ...message, content: message.content + finalChunk }
              : message,
          ),
        );
    } catch {
      setMessages((current) => [...current, { role: 'assistant', content: ai.networkError }]);
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setMessages([]);
    sessionStorage.removeItem(HISTORY_KEY);
    inputRef.current?.focus();
  }

  return (
    <section
      className={`${styles.chatShell} box-border flex w-full max-w-full min-w-0 flex-col overflow-hidden ${
        compact
          ? 'h-full min-h-0'
          : 'h-full min-h-0 flex-1 rounded-xl border shadow-card lg:min-h-[600px]'
      }`}
      aria-label={ai.chatAria}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-default bg-surface px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent-primary">
            <Sparkles size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-sm font-bold text-primary">ViciTech AI</h2>
              <span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-800 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-status-live" aria-hidden="true" />
                <span>{ai.catalogBadge}</span>
              </span>
            </div>
            <p className="truncate text-xs text-secondary">{ai.assistantSubtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={resetChat}
          aria-label={ai.resetAria}
          className="vt-motion-press inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-default bg-canvas px-2.5 text-xs font-medium text-secondary transition-colors hover:border-strong hover:bg-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 sm:min-h-10 sm:rounded-full sm:px-3"
        >
          <RotateCcw size={14} aria-hidden="true" />
          <span className="sm:hidden">{ai.resetShort}</span>
          <span className="hidden sm:inline">{ai.resetBtn}</span>
        </button>
      </header>

      <div
        className={`${styles.threadViewport} min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-3 sm:space-y-4 sm:p-5 ${
          compact ? 'max-h-[340px]' : 'lg:max-h-[min(68vh,740px)]'
        }`}
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center py-4 text-center sm:py-6">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-accent-subtle text-accent-primary sm:h-12 sm:w-12">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-3 text-base font-bold tracking-tight text-primary sm:text-lg">
              {ai.emptyTitle}
            </h3>
            <p className="mt-1 max-w-[36ch] text-xs leading-relaxed text-secondary sm:text-sm">
              {ai.emptyDesc}
            </p>
            <div className="mt-4 w-full max-w-full min-w-0 overflow-hidden">
              <div className="no-scrollbar flex w-full flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible sm:pb-0">
                {ai.starters.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => void sendMessage(undefined, starter)}
                    className={`${styles.starterChip} vt-motion-press inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-medium active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 sm:whitespace-normal`}
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${index}-${message.role}`}
              className={`flex min-w-0 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`box-border min-w-0 max-w-[88%] break-words rounded-2xl p-3 sm:max-w-[78%] sm:p-4 ${
                  message.role === 'user' ? styles.userBubble : styles.assistantBubble
                }`}
              >
                {message.content ? (
                  message.role === 'user' ? (
                    <p className="break-words whitespace-pre-wrap text-sm leading-6 tabular-nums">
                      {message.content}
                    </p>
                  ) : (
                    <AssistantMessageBody
                      content={message.content}
                      catalogCardLabel={ai.catalogCardLabel}
                      catalogCardCta={ai.catalogCardCta}
                      stockReady={ai.stockReady}
                      stockPreorder={ai.stockPreorder}
                    />
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 py-1" aria-label={ai.typingAria}>
                    <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-primary motion-reduce:animate-none" />
                    <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-primary [animation-delay:120ms] motion-reduce:animate-none" />
                    <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-primary [animation-delay:240ms] motion-reduce:animate-none" />
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        {loading && messages.at(-1)?.role !== 'assistant' && (
          <p className="text-xs text-secondary">{ai.preparingReply}</p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(event) => void sendMessage(event)}
        className={`${styles.composerBar} shrink-0 p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:p-3.5`}
      >
        <div className="flex w-full min-w-0 items-end gap-2">
          <label className="sr-only" htmlFor={`vici-chat-input-${variant}`}>
            {ai.inputLabel}
          </label>
          <textarea
            ref={inputRef}
            id={`vici-chat-input-${variant}`}
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            maxLength={4000}
            placeholder={ai.inputPlaceholder}
            className="vt-form-control box-border min-h-11 max-h-32 w-full min-w-0 flex-1 resize-none overflow-y-auto rounded-xl border border-default bg-subtle px-3 py-2.5 text-sm leading-5 text-primary placeholder:text-secondary focus-visible:border-accent-primary focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
          />
          {input.length > 0 && !loading && (
            <button
              type="button"
              onClick={() => {
                setInput('');
                inputRef.current?.focus();
              }}
              aria-label={ai.clearInputAria}
              className="vt-motion-press grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-default bg-canvas text-secondary transition-colors hover:bg-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label={ai.sendAria}
            className="vt-motion-press grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-primary text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 focus-visible:ring-offset-1"
          >
            <ArrowUp size={19} aria-hidden="true" />
          </button>
        </div>
        {!compact && (
          <p className="mt-1.5 hidden px-1 text-[11px] text-secondary sm:block">{ai.enterHint}</p>
        )}
      </form>
    </section>
  );
}
