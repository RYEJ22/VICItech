'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import styles from './intro-splash.module.css';

const INTRO_SEEN_STORAGE_KEY = 'vicitech_intro_seen';
const VISIBLE_DURATION_MS = 1200;
const EXIT_DURATION_MS = 400;

type SplashPhase = 'idle' | 'visible' | 'exiting' | 'done';

/**
 * Clean Editorial intro splash screen rendered once per browser tab session.
 * Initial render returns null so SSR HTML matches initial client hydration cleanly.
 */
export function IntroSplash(): ReactElement | null {
  const [phase, setPhase] = useState<SplashPhase>('idle');
  const hasClaimedSessionRef = useRef(false);

  useEffect(() => {
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      try {
        window.sessionStorage.setItem(INTRO_SEEN_STORAGE_KEY, '1');
      } catch {
        // Ignore storage errors in restricted contexts.
      }
      setPhase('done');
      return;
    }

    if (!hasClaimedSessionRef.current) {
      let alreadySeen = false;
      try {
        alreadySeen = window.sessionStorage.getItem(INTRO_SEEN_STORAGE_KEY) === '1';
      } catch {
        alreadySeen = false;
      }

      if (alreadySeen) {
        setPhase('done');
        return;
      }

      hasClaimedSessionRef.current = true;
      try {
        window.sessionStorage.setItem(INTRO_SEEN_STORAGE_KEY, '1');
      } catch {
        // Ignore storage errors in restricted contexts.
      }
    }

    setPhase('visible');

    const exitTimer = window.setTimeout(() => {
      setPhase('exiting');
    }, VISIBLE_DURATION_MS);

    const doneTimer = window.setTimeout(() => {
      setPhase('done');
    }, VISIBLE_DURATION_MS + EXIT_DURATION_MS);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  if (phase === 'idle' || phase === 'done') {
    return null;
  }

  const isExiting = phase === 'exiting';

  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#FAF9F6] transition-all duration-[400ms] ease-out ${
        isExiting
          ? 'pointer-events-none -translate-y-4 opacity-0'
          : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="flex flex-col items-center">
        <span
          className={`${styles.wordmark ?? ''} select-none text-2xl font-semibold tracking-tight text-[#18181B] md:text-3xl`}
        >
          ViciTech
        </span>
        <div className="mt-4 h-[2px] w-32 overflow-hidden rounded-full bg-[#E4E4E7]">
          <div className={`${styles.progressFill ?? ''} h-full w-full bg-[#EA580C]`} />
        </div>
      </div>
    </div>
  );
}

export default IntroSplash;
