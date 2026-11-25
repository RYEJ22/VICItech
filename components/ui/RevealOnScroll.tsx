'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

interface RevealOnScrollProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly as?: 'div' | 'section' | 'article';
  readonly ariaLabel?: string;
  readonly ariaLabelledBy?: string;
}

/** Adds a one-time, transform-and-opacity reveal without hiding server markup. */
export function RevealOnScroll({
  children,
  className = '',
  as = 'div',
  ariaLabel,
  ariaLabelledBy,
}: RevealOnScrollProps): ReactElement {
  const Element = as;
  const elementRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [motionReady, setMotionReady] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      setMotionReady(true);
      setIsVisible(true);
      return undefined;
    }

    setMotionReady(true);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { rootMargin: '0px 0px 80px 0px', threshold: 0.08 },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  return (
    <Element
      ref={(element) => {
        elementRef.current = element;
      }}
      className={`vt-reveal ${className}`.trim()}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      data-motion-ready={motionReady ? 'true' : 'false'}
      data-motion-visible={isVisible ? 'true' : 'false'}
      onFocusCapture={() => setIsVisible(true)}
    >
      {children}
    </Element>
  );
}
