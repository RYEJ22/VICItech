'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface MediaLightboxProps {
  readonly images: readonly string[];
  readonly initialIndex: number;
  readonly altPrefix?: string;
  readonly onClose: () => void;
}

export function MediaLightbox({
  images,
  initialIndex,
  altPrefix,
  onClose,
}: MediaLightboxProps): ReactElement | null {
  const { isEnglish } = useLanguage();
  const resolvedPrefix = altPrefix || (isEnglish ? 'Image attachment' : 'Lampiran gambar');
  const total = images.length;
  const clampedInitial =
    total > 0 ? Math.min(Math.max(initialIndex, 0), total - 1) : 0;
  const [activeIndex, setActiveIndex] = useState(clampedInitial);

  const labelId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setActiveIndex(total > 0 ? Math.min(Math.max(initialIndex, 0), total - 1) : 0);
  }, [initialIndex, total]);

  useEffect(() => {
    if (total === 0) return undefined;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowLeft' && total > 1) {
        setActiveIndex((current) => (current - 1 + total) % total);
      } else if (event.key === 'ArrowRight' && total > 1) {
        setActiveIndex((current) => (current + 1) % total);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose, total]);

  if (total === 0) return null;

  const activeUrl = images[activeIndex];
  if (!activeUrl) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[#141518]/92 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="mb-3 flex w-full max-w-5xl items-center justify-between gap-4">
        <p id={labelId} className="min-w-0 truncate font-mono text-xs font-medium text-white/85">
          {resolvedPrefix} ({activeIndex + 1}/{total})
        </p>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={isEnglish ? 'Close full-screen image view' : 'Tutup tampilan gambar penuh'}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        >
          <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <div className="relative flex max-h-[82vh] w-full max-w-5xl items-center justify-center">
        {total > 1 ? (
          <button
            type="button"
            onClick={() => setActiveIndex((current) => (current - 1 + total) % total)}
            aria-label={isEnglish ? 'Previous image' : 'Gambar sebelumnya'}
            className="absolute left-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-[#141518]/75 text-white transition hover:bg-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        ) : null}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeUrl}
          alt={`${resolvedPrefix} ${activeIndex + 1}`}
          decoding="async"
          className="max-h-[80vh] max-w-full rounded-2xl border border-white/15 bg-black/40 object-contain shadow-2xl"
        />

        {total > 1 ? (
          <button
            type="button"
            onClick={() => setActiveIndex((current) => (current + 1) % total)}
            aria-label={isEnglish ? 'Next image' : 'Gambar berikutnya'}
            className="absolute right-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-[#141518]/75 text-white transition hover:bg-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default MediaLightbox;
