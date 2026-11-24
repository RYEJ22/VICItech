'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Film, Link2, LoaderCircle, Search, X } from 'lucide-react';
import {
  fetchChatGifs,
  isAllowedGiphyMediaUrl,
  type ChatGifItem,
} from '@/lib/chat/chat-media-catalog';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import communityStyles from './community-hub.module.css';

export interface SelectedCommentGif {
  readonly url: string;
  readonly title: string;
}

export interface CommunityGifPickerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSelectGif: (gif: SelectedCommentGif) => void;
  readonly triggerRef?: RefObject<HTMLButtonElement | null>;
  readonly disabled?: boolean;
}

export interface CommentGifDisplayProps {
  readonly src: string | null | undefined;
  readonly alt?: string;
  readonly className?: string;
}

const COMMENT_GIF_MARKER_RE = /\[\[vt:gif:(https:\/\/[^\s\]]+)\]\]/;
const MAX_COMMENT_GIF_URL_LENGTH = 2048;

/**
 * Validates and normalizes an HTTPS GIF URL for safe comment persistence & rendering.
 */
export function sanitizeCommentGifUrl(rawUrl: string | null | undefined): string | null {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > MAX_COMMENT_GIF_URL_LENGTH) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return null;

    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    const isDirectGif = path.endsWith('.gif');
    const isGiphy = isAllowedGiphyMediaUrl(trimmed);
    const isTenor = (host === 'tenor.com' || host.endsWith('.tenor.com')) && path.includes('.gif');

    if (!isDirectGif && !isGiphy && !isTenor) {
      return null;
    }

    return trimmed;
  } catch {
    return null;
  }
}

export function validateCommentGifUrl(
  rawUrl: string,
): { readonly ok: true; readonly url: string } | { readonly ok: false; readonly error: string } {
  const sanitized = sanitizeCommentGifUrl(rawUrl);
  if (!sanitized) {
    return {
      ok: false,
      error: 'Masukkan tautan HTTPS langsung yang berakhiran .gif (cth. https://.../reaksi.gif).',
    };
  }
  return { ok: true, url: sanitized };
}

/**
 * Encodes a GIF URL marker inside `content` as a graceful fallback if the `gif_url`
 * database column migration has not been applied on the remote Supabase project yet.
 */
export function encodeCommentGifFallback(text: string, gifUrl: string): string {
  const marker = `[[vt:gif:${gifUrl}]]`;
  const cleanText = text.trim();
  if (!cleanText) return marker.slice(0, 1000);

  const maxTextLength = Math.max(0, 1000 - marker.length - 1);
  const head = cleanText.slice(0, maxTextLength).trimEnd();
  return head ? `${head}\n${marker}` : marker.slice(0, 1000);
}

/**
 * Splits persisted comment text and GIF URL, supporting both native `gif_url`
 * columns and legacy fallback `[[vt:gif:...]]` markers.
 */
export function parseCommentBody(
  content: string | null | undefined,
  gifUrl?: string | null,
): { readonly text: string; readonly gifUrl: string | null } {
  const rawContent = typeof content === 'string' ? content : '';
  const directGif = sanitizeCommentGifUrl(gifUrl);
  if (directGif) {
    return { text: rawContent.trim(), gifUrl: directGif };
  }

  const markerMatch = COMMENT_GIF_MARKER_RE.exec(rawContent);
  if (markerMatch?.[1]) {
    const embeddedGif = sanitizeCommentGifUrl(markerMatch[1]);
    if (embeddedGif) {
      const strippedText = rawContent.replace(markerMatch[0], '').trim();
      return { text: strippedText, gifUrl: embeddedGif };
    }
  }

  return { text: rawContent.trim(), gifUrl: null };
}

export function CommentGifDisplay({
  src,
  alt,
  className = '',
}: CommentGifDisplayProps): ReactElement | null {
  const safeUrl = useMemo(() => sanitizeCommentGifUrl(src), [src]);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setHasFailed(false);
  }, [safeUrl]);

  if (!safeUrl) return null;

  if (hasFailed) {
    return (
      <div
        className={`mt-1.5 flex max-w-[240px] flex-col gap-1 rounded-xl border border-[#E4E4E7] bg-[#F3F1ED] p-3 text-left ${className}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="rounded bg-[#EA580C] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white">
            GIF
          </span>
          <span className="text-[11px] text-[#71717A]">GIF tidak dapat dimuat</span>
        </div>
        <p className="line-clamp-2 text-xs font-medium text-[#18181B]">
          {alt?.trim() || 'GIF komentar'}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative mt-1.5 inline-block max-w-[240px] overflow-hidden rounded-xl border border-[#E4E4E7] bg-[#F3F1ED] ${className}`}
    >
      <img
        src={safeUrl}
        alt={alt?.trim() || 'GIF komentar'}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setHasFailed(true)}
        className="block max-h-52 w-full object-contain"
      />
      <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-[#18181B]/80 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white">
        GIF
      </span>
    </div>
  );
}

function GifThumbOption({
  gif,
  disabled,
  onPick,
}: {
  readonly gif: ChatGifItem;
  readonly disabled: boolean;
  readonly onPick: (gif: ChatGifItem) => void;
}): ReactElement {
  const [failed, setFailed] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(gif)}
      aria-label={`Pilih GIF ${gif.title}`}
      className="group relative overflow-hidden rounded-xl border border-[#E4E4E7] bg-[#FAF9F6] text-left transition hover:border-[#EA580C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {failed ? (
        <div className="flex h-20 w-full flex-col justify-between bg-[#F3F1ED] p-2">
          <span className="w-fit rounded bg-[#EA580C] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-white">
            GIF
          </span>
          <span className="line-clamp-2 text-[11px] font-medium text-[#18181B]">{gif.title}</span>
        </div>
      ) : (
        <div className="relative h-20 w-full bg-[#F3F1ED]">
          <img
            src={gif.previewUrl}
            alt={gif.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        </div>
      )}
      <span className="block truncate bg-white px-2 py-1 text-[11px] font-medium text-[#18181B]">
        {gif.title}
      </span>
    </button>
  );
}

export function CommunityGifPicker({
  isOpen,
  onClose,
  onSelectGif,
  triggerRef,
  disabled = false,
}: CommunityGifPickerProps): ReactElement | null {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<readonly ChatGifItem[]>([]);
  const [gifSource, setGifSource] = useState<'giphy' | 'fallback'>('fallback');
  const [isLoadingGifs, setIsLoadingGifs] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{ readonly top: number; readonly left: number } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    if (query.trim() !== debouncedQuery.trim()) {
      setIsLoadingGifs(true);
      return undefined;
    }

    const controller = new AbortController();
    let active = true;
    setIsLoadingGifs(true);

    void fetchChatGifs({
      query: debouncedQuery,
      apiKey: process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? '',
      signal: controller.signal,
    })
      .then((result) => {
        if (!active) return;
        setGifs(result.items);
        setGifSource(result.source);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (!active) return;
        setGifs([]);
        setGifSource('fallback');
      })
      .finally(() => {
        if (active) setIsLoadingGifs(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [debouncedQuery, isOpen, query]);

  const handleClose = useCallback(() => {
    setQuery('');
    onClose();
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        triggerRef?.current?.focus();
      });
    }
  }, [onClose, triggerRef]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const updatePosition = (): void => {
      const rect = triggerRef?.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(336, window.innerWidth - 32);
      const height = Math.min(390, window.innerHeight - 24);
      const left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16));
      const openAbove = rect.top >= height + 12;
      const preferredTop = openAbove ? rect.top - height - 8 : rect.bottom + 8;
      const top = Math.max(12, Math.min(preferredTop, window.innerHeight - height - 12));
      setPanelPosition({ top, left });
    };
    updatePosition();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };

    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef?.current?.contains(target)) return;
      setQuery('');
      onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [handleClose, isOpen, onClose, triggerRef]);

  const handlePickGif = (gif: ChatGifItem): void => {
    if (disabled) return;
    setUrlError('');
    setQuery('');
    onSelectGif({ url: gif.url, title: gif.title });
    onClose();
  };

  const handleApplyCustomUrl = (): void => {
    if (disabled) return;
    const result = validateCommentGifUrl(customUrl);
    if (!result.ok) {
      setUrlError(result.error);
      return;
    }
    setUrlError('');
    setCustomUrl('');
    setQuery('');
    onSelectGif({ url: result.url, title: 'GIF Tautan' });
    onClose();
  };

  const handleCustomUrlKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      handleApplyCustomUrl();
    }
  };

  if (!isOpen || !isMounted || !panelPosition) return null;

  return createPortal((
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Pilih GIF untuk komentar"
      className="fixed z-50 flex max-h-[calc(100dvh-1.5rem)] w-[336px] max-w-[calc(100vw-2rem)] flex-col overflow-y-auto rounded-2xl border border-[#E4E4E7] bg-white shadow-lg"
      style={{ top: panelPosition.top, left: panelPosition.left }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[#E4E4E7] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-[#EA580C]" strokeWidth={1.75} aria-hidden="true" />
          <span className="text-xs font-semibold text-[#18181B]">Pilih GIF Komentar</span>
          <span className="rounded-full bg-[#FAF9F6] px-2 py-0.5 font-mono text-[10px] font-medium text-[#71717A] border border-[#E4E4E7]">
            {isLoadingGifs ? 'Memuat GIF' : gifSource === 'giphy' ? 'Trending GIPHY' : 'Koleksi Kurasi'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Tutup pemilih GIF"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#71717A] transition hover:bg-[#F3F1ED] hover:text-[#18181B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Filter Search */}
      <div className="border-b border-[#E4E4E7] bg-[#FAF9F6] px-3 py-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#71717A]"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari GIF (mantap, coding, gaming, thermal)…"
            aria-label="Cari GIF"
            className="h-9 w-full rounded-lg border border-[#E4E4E7] bg-white pl-8 pr-3 text-xs text-[#18181B] placeholder:text-[#71717A] focus:border-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20"
          />
        </div>
      </div>

      {/* Live GIF Grid */}
      <div className={`max-h-[210px] overflow-y-auto p-2.5 ${communityStyles.feedScroll ?? ''}`}>
        {isLoadingGifs && gifs.length === 0 ? (
          <div className="grid grid-cols-2 gap-2" aria-label="Memuat GIF">
            {[0, 1, 2, 3].map((slot) => <div key={slot} className="h-24 animate-pulse rounded-xl border border-[#E4E4E7] bg-[#F3F1ED]" />)}
          </div>
        ) : gifs.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {gifs.map((gif) => (
              <GifThumbOption
                key={gif.id}
                gif={gif}
                disabled={disabled}
                onPick={handlePickGif}
              />
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-xs text-[#71717A]">
            {query.trim()
              ? `Tidak ada GIF yang cocok dengan “${debouncedQuery.trim()}”.`
              : 'GIF belum tersedia. Coba lagi atau tempel tautan GIF langsung.'}
          </p>
        )}
        {isLoadingGifs && gifs.length > 0 ? <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-[#71717A]"><LoaderCircle className="h-3 w-3 animate-spin" />Memperbarui hasil…</p> : null}
        {gifSource === 'fallback' && gifs.length > 0 && !isLoadingGifs ? <p className="mt-2 text-center text-[10px] text-[#71717A]">Pencarian GIF live sedang tidak tersedia; menampilkan koleksi kurasi.</p> : null}
      </div>

      {/* Direct .gif URL Input (div instead of form to avoid nested forms) */}
      <div className="rounded-b-2xl border-t border-[#E4E4E7] bg-[#FAF9F6] p-2.5">
        <div className="flex items-center gap-1.5">
          <div className="relative min-w-0 flex-1">
            <Link2
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#71717A]"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <input
              type="url"
              value={customUrl}
              onChange={(event) => {
                setCustomUrl(event.target.value);
                if (urlError) setUrlError('');
              }}
              onKeyDown={handleCustomUrlKeyDown}
              disabled={disabled}
              placeholder="Atau tempel link langsung .gif (https://...)"
              aria-label="Tempel URL GIF langsung"
              className="h-9 w-full rounded-lg border border-[#E4E4E7] bg-white pl-8 pr-2.5 text-xs text-[#18181B] placeholder:text-[#71717A] focus:border-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20"
            />
          </div>
          <button
            type="button"
            disabled={disabled || !customUrl.trim()}
            onClick={handleApplyCustomUrl}
            className="h-9 shrink-0 rounded-lg bg-[#EA580C] px-3 text-xs font-semibold text-white transition hover:bg-[#C2410C] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
          >
            Pakai
          </button>
        </div>
        {urlError ? (
          <p role="alert" className="mt-1.5 text-[11px] leading-snug text-red-600">
            {urlError}
          </p>
        ) : null}
      </div>
    </div>
  ), document.body);
}

export default CommunityGifPicker;
