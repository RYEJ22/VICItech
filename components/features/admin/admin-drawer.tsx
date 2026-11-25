'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import styles from './admin-drawer.module.css';

interface AdminDrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly subtitle?: string;
  readonly badge?: string;
  readonly closeDisabled?: boolean;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}

export function AdminDrawer({
  open,
  onClose,
  title,
  subtitle,
  badge,
  closeDisabled = false,
  children,
  footer,
}: AdminDrawerProps): ReactElement | null {
  const titleId = useId();
  const panelRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !closeDisabled) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [closeDisabled, onClose, open]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !closeDisabled) {
          onClose();
        }
      }}
    >
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={styles.panel}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 md:hidden" aria-hidden="true">
          <span className={styles.dragHandle} />
        </div>

        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-default bg-surface px-5 py-4">
          <div className="min-w-0">
            {badge ? (
              <span className="inline-flex items-center rounded-md border border-accent-primary/25 bg-accent-subtle px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-accent-hover">
                {badge}
              </span>
            ) : null}
            <h2
              id={titleId}
              className="mt-1.5 font-sans text-xl font-bold tracking-tight text-primary [text-wrap:balance]"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 truncate text-xs text-secondary">{subtitle}</p>
            ) : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            disabled={closeDisabled}
            onClick={onClose}
            aria-label={`Tutup panel ${title}`}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-default bg-subtle text-primary transition hover:border-accent-primary/50 hover:bg-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </header>

        <div className={`${styles.body} bg-canvas/50 px-5 py-5`}>{children}</div>

        {footer ? (
          <footer className="shrink-0 border-t border-default bg-surface px-5 py-4">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
