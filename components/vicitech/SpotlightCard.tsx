'use client';

import {
  useMotionTemplate,
  useMotionValue,
  motion,
  type HTMLMotionProps,
} from 'framer-motion';
import type { ReactElement, ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

interface SpotlightCardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  readonly children: ReactNode;
  readonly className?: string;
}

export default function SpotlightCard({
  children,
  className = '',
  ...props
}: SpotlightCardProps): ReactElement {
  const prefersReducedMotion = usePrefersReducedMotion();
  const pointerX = useMotionValue(-500);
  const pointerY = useMotionValue(-500);
  const spotlight = useMotionTemplate`radial-gradient(360px circle at ${pointerX}px ${pointerY}px, rgb(255 255 255 / 0.55), transparent 80%)`;

  return (
    <motion.div
      onPointerMove={
        prefersReducedMotion
          ? undefined
          : (event) => {
              const bounds = event.currentTarget.getBoundingClientRect();
              pointerX.set(event.clientX - bounds.left);
              pointerY.set(event.clientY - bounds.top);
            }
      }
      onPointerLeave={
        prefersReducedMotion
          ? undefined
          : () => {
              pointerX.set(-500);
              pointerY.set(-500);
            }
      }
      className={`relative isolate overflow-hidden rounded-xl border border-default bg-surface shadow-sm ${
        prefersReducedMotion ? '' : 'transition-transform duration-150 ease-out hover:-translate-y-0.5'
      } ${className}`}
      {...props}
    >
      {!prefersReducedMotion && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: spotlight }}
        />
      )}
      {children}
    </motion.div>
  );
}
