'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { formatAnimatedNumber } from './animated-number-format';
import type { AnimatedNumberFormat } from './animated-number-format';

interface AnimatedNumberProps {
  readonly value: number;
  readonly format?: AnimatedNumberFormat;
  readonly decimals?: number;
  readonly durationMs?: number;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly className?: string;
}

export function AnimatedNumber({
  value,
  format = 'number',
  decimals = 0,
  durationMs = 360,
  prefix = '',
  suffix = '',
  className = '',
}: AnimatedNumberProps): ReactElement {
  const safeTarget = Number.isFinite(value) ? value : 0;
  const prefersReducedMotion = usePrefersReducedMotion();

  const [displayValue, setDisplayValue] = useState<number>(safeTarget);
  const [isPopping, setIsPopping] = useState<boolean>(false);

  const hasMountedRef = useRef<boolean>(false);
  const latestDisplayRef = useRef<number>(safeTarget);
  const committedTargetRef = useRef<number>(safeTarget);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      latestDisplayRef.current = safeTarget;
      committedTargetRef.current = safeTarget;
      setDisplayValue(safeTarget);
      return undefined;
    }

    if (committedTargetRef.current === safeTarget) {
      return undefined;
    }

    const fromValue = latestDisplayRef.current;
    committedTargetRef.current = safeTarget;

    if (prefersReducedMotion || durationMs <= 0) {
      latestDisplayRef.current = safeTarget;
      setDisplayValue(safeTarget);
      setIsPopping(false);
      return undefined;
    }

    setIsPopping(true);
    let rafId = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = fromValue + (safeTarget - fromValue) * eased;

      if (progress < 1) {
        const roundedIntermediate =
          decimals > 0 ? Number(nextValue.toFixed(decimals)) : Math.round(nextValue);
        latestDisplayRef.current = nextValue;
        setDisplayValue(roundedIntermediate);
        rafId = window.requestAnimationFrame(step);
      } else {
        latestDisplayRef.current = safeTarget;
        setDisplayValue(safeTarget);
      }
    };

    rafId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [decimals, durationMs, prefersReducedMotion, safeTarget]);

  const formatted = formatAnimatedNumber(displayValue, format, decimals);

  return (
    <span
      onAnimationEnd={() => setIsPopping(false)}
      className={`font-mono tabular-nums ${isPopping ? 'vt-num-pop' : ''} ${className}`}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
