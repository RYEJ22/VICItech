'use client';

import { AnimatePresence, motion, type HTMLMotionProps } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

export interface CyberToastMessage {
  readonly message: string;
  readonly tone: 'success' | 'error' | 'info';
}

interface CyberButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  readonly variant?: 'primary' | 'secondary';
  readonly children: ReactNode;
}

export function CyberButton({
  variant = 'primary',
  className = '',
  type = 'button',
  children,
  ...props
}: CyberButtonProps): ReactElement {
  const prefersReducedMotion = usePrefersReducedMotion();
  const styles =
    variant === 'primary'
      ? 'bg-accent-cta text-white font-semibold hover:bg-accent-cta-hover shadow-sm border-none'
      : 'bg-surface text-primary font-medium hover:bg-subtle border border-default shadow-sm';

  return (
    <motion.button
      whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
      whileHover={prefersReducedMotion ? undefined : { y: -1 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.16, ease: 'easeOut' }}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 disabled:cursor-not-allowed disabled:opacity-45 ${styles} ${className}`}
      type={type}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function CyberToast({
  toast,
  onDismiss,
}: {
  readonly toast: CyberToastMessage | null;
  readonly onDismiss: () => void;
}): ReactElement {
  const prefersReducedMotion = usePrefersReducedMotion();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!toast) return undefined;

    timerRef.current = window.setTimeout(() => {
      onDismiss();
    }, 4500);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [toast, onDismiss]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeOut' } }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, transition: { duration: 0.15, ease: 'easeIn' } }}
          className="fixed inset-x-3 bottom-20 z-50 flex items-center gap-3 rounded-xl border border-default bg-surface p-4 text-primary shadow-xl sm:inset-x-auto sm:right-4 sm:max-w-sm md:bottom-6 md:right-6"
          role="status"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent-primary">
            <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <p className="text-sm font-medium leading-snug">{toast.message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
