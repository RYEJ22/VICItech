'use client';

import {
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageCircle,
  Send,
  Share2,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactElement } from 'react';
import { buildSharePlatformLinks, resolveShareUrl } from './share-state';
import type { SharePlatformLink } from './share-state';
import styles from './share.module.css';

interface ShareMenuProps {
  readonly title: string;
  readonly text?: string;
  readonly url?: string;
  readonly label?: string;
  readonly compact?: boolean;
  readonly openUpward?: boolean;
}

function PlatformIcon({ id }: { readonly id: SharePlatformLink['id'] }): ReactElement {
  switch (id) {
    case 'whatsapp':
      return <MessageCircle className="h-4 w-4 shrink-0 text-status-live" strokeWidth={1.75} aria-hidden="true" />;
    case 'telegram':
      return <Send className="h-4 w-4 shrink-0 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />;
    case 'x':
      return <ExternalLink className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden="true" />;
  }
}

export function ShareMenu({
  title,
  text = '',
  url,
  label = 'Bagikan',
  compact = false,
  openUpward = false,
}: ShareMenuProps): ReactElement {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const sheetCloseRef = useRef<HTMLButtonElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const menuTitleId = useId();

  const syncUrl = useCallback((): string => {
    if (typeof window === 'undefined') return '';
    const nextUrl = resolveShareUrl(url, window.location.href, window.location.origin);
    setResolvedUrl(nextUrl);
    return nextUrl;
  }, [url]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setToastMessage('');
    }, 3200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const closeAll = useCallback(() => {
    setPopoverOpen(false);
    setSheetOpen(false);
    window.requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    if (!popoverOpen && !sheetOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!popoverOpen) return;
      if (event.target instanceof Node && containerRef.current?.contains(event.target)) {
        return;
      }
      setPopoverOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAll();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeAll, popoverOpen, sheetOpen]);

  useEffect(() => {
    if (!sheetOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheetCloseRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [sheetOpen]);

  const platformLinks = useMemo(
    () =>
      buildSharePlatformLinks({
        title,
        text,
        url: resolvedUrl || url || '',
      }),
    [resolvedUrl, text, title, url],
  );

  const handleTriggerClick = async () => {
    const shareUrl = syncUrl();
    const isMobile =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

    if (isMobile && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    if (isMobile) {
      setSheetOpen(true);
      setPopoverOpen(false);
      return;
    }

    setPopoverOpen((prev) => !prev);
  };

  const handleCopyLink = async () => {
    const shareUrl = resolvedUrl || syncUrl();
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Tautan berhasil disalin');
      } else {
        showToast('Salin tautan dari bilah alamat browser Anda');
      }
    } catch {
      showToast('Tautan gagal disalin secara otomatis');
    }
    setPopoverOpen(false);
    setSheetOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => void handleTriggerClick()}
        aria-haspopup="dialog"
        aria-expanded={popoverOpen || sheetOpen}
        aria-label={compact ? `${label}: ${title}` : undefined}
        title={compact ? label : undefined}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-default bg-surface text-primary transition hover:border-accent-primary/50 hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 ${
          compact ? 'px-3 py-2 text-xs font-medium' : 'px-4 py-2.5 text-sm font-medium'
        }`}
      >
        <Share2 className="h-4 w-4 shrink-0 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
        {!compact && <span>{label}</span>}
      </button>

      {/* Desktop Anchored Popover (>= 768px) */}
      {popoverOpen && (
        <div
          role="dialog"
          aria-labelledby={menuTitleId}
          className={`hidden md:block ${styles.popover ?? ''} ${openUpward ? styles.popoverUpward ?? '' : ''}`}
        >
          <div className="border-b border-default px-3.5 py-2.5">
            <p id={menuTitleId} className="text-xs font-semibold text-primary">
              Bagikan ke
            </p>
          </div>
          <div className="grid gap-1 p-2">
            {platformLinks.map((platform) => (
              <a
                key={platform.id}
                href={platform.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setPopoverOpen(false)}
                className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-primary transition hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
              >
                <PlatformIcon id={platform.id} />
                <span>{platform.label}</span>
              </a>
            ))}
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="flex min-h-11 w-full items-center gap-2.5 rounded-lg border-t border-default px-3 py-2 text-left text-xs font-semibold text-primary transition hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
            >
              <Copy className="h-4 w-4 shrink-0 text-secondary" strokeWidth={1.75} aria-hidden="true" />
              <span>Salin Tautan</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Sheet Fallback (< 768px when Web Share API is unavailable) */}
      {sheetOpen && (
        <div className={`md:hidden ${styles.backdrop ?? ''}`} onClick={closeAll}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={menuTitleId}
            onClick={(event) => event.stopPropagation()}
            className={styles.bottomSheet}
          >
            <div className="flex justify-center pb-1 pt-3" aria-hidden="true">
              <span className={styles.dragHandle} />
            </div>
            <div className="flex items-center justify-between border-b border-default px-4 pb-3 pt-1">
              <p id={menuTitleId} className="font-sans text-base font-semibold text-primary">
                Bagikan Tautan
              </p>
              <button
                ref={sheetCloseRef}
                type="button"
                onClick={closeAll}
                aria-label="Tutup menu bagikan"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-default bg-subtle text-primary hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
              >
                <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
            <div className="grid gap-1.5 p-4">
              {platformLinks.map((platform) => (
                <a
                  key={platform.id}
                  href={platform.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeAll}
                  className="flex min-h-11 items-center gap-3 rounded-lg bg-subtle px-3.5 py-2.5 text-sm font-medium text-primary hover:bg-canvas"
                >
                  <PlatformIcon id={platform.id} />
                  <span>{platform.label}</span>
                </a>
              ))}
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-lg bg-accent-cta px-3.5 py-2.5 text-left text-sm font-semibold text-white hover:bg-accent-cta-hover"
              >
                <Copy className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span>Salin Tautan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-primary ${styles.toast ?? ''}`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-status-live" strokeWidth={1.75} aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
