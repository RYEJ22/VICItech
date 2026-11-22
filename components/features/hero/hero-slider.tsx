'use client';

import { Pause, Play } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useReducer, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';

import { usePageVisibility } from '@/hooks/use-page-visibility';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

import type { HeroSlides } from './hero-content';
import {
  INITIAL_SLIDER_STATE,
  mountedSlideCount,
  sliderReducer,
} from './hero-slider-state';
import styles from './hero-slider.module.css';

export interface HeroSliderMotion {
  /** Time each slide stays active. Keep it between 6000 and 8000 ms. */
  readonly intervalMs: number;
  /** Cross-fade duration. */
  readonly fadeMs: number;
  /** Final Ken Burns scale. Keep it at or below 1.15 to avoid visible pixelation. */
  readonly zoomScale: number;
}

/** Map these to the motion tokens in DESIGN.md once they exist. */
export const DEFAULT_HERO_MOTION: HeroSliderMotion = {
  intervalMs: 7000,
  fadeMs: 1600,
  zoomScale: 1.12,
};

type CssVariables = CSSProperties & Record<`--${string}`, string | number>;

interface HeroSliderProps {
  readonly slides: HeroSlides;
  readonly motion?: HeroSliderMotion;
}

function cx(...parts: ReadonlyArray<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Decorative background slider. Cross-fades between slides while each slide
 * slowly zooms (Ken Burns). Only `transform` and `opacity` are animated, so it
 * runs on the compositor and causes no layout shift.
 *
 * Renders a static first slide on the server, for visitors with
 * `prefers-reduced-motion: reduce`, and when there is a single slide.
 */
export function HeroSlider({
  slides,
  motion = DEFAULT_HERO_MOTION,
}: HeroSliderProps): ReactElement {
  const { intervalMs, fadeMs, zoomScale } = motion;
  const total = slides.length;

  const prefersReducedMotion = usePrefersReducedMotion();
  const isPageVisible = usePageVisibility();
  const [isUserPaused, setIsUserPaused] = useState(false);
  const [state, dispatch] = useReducer(sliderReducer, INITIAL_SLIDER_STATE);

  const isAnimated = !prefersReducedMotion && total > 1;
  const isRunning = isAnimated && !isUserPaused && isPageVisible;

  useEffect(() => {
    if (!isRunning) {
      return undefined;
    }
    const intervalId = window.setInterval(() => {
      dispatch({ type: 'advance', total });
    }, intervalMs);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [isRunning, total, intervalMs]);

  const activeIndex = isAnimated ? state.active : 0;
  const previousIndex = isAnimated ? state.previous : null;
  const mountedSlides = slides.slice(
    0,
    mountedSlideCount(total, state.reached, isAnimated),
  );

  const rootStyle: CssVariables = {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    overflow: 'hidden',
    '--hero-fade-ms': `${fadeMs}ms`,
    // The outgoing slide keeps zooming during the fade, so the zoom outlasts the interval.
    '--hero-zoom-ms': `${intervalMs + fadeMs}ms`,
    '--hero-zoom-scale': zoomScale,
  };

  return (
    <div
      className={styles.root}
      style={rootStyle}
      data-motion={isAnimated ? 'on' : 'off'}
      data-paused={isRunning ? 'false' : 'true'}
    >
      <div className={styles.layers} style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
        {mountedSlides.map((slide, index) => {
          const isActive = index === activeIndex;
          const isPrevious = index === previousIndex;
          return (
            <div
              key={slide.src}
              className={cx(
                styles.slide,
                isActive && styles.slideActive,
                isPrevious && styles.slidePrevious,
              )}
              onTransitionEnd={(event) => {
                if (
                  isPrevious &&
                  event.target === event.currentTarget &&
                  event.propertyName === 'opacity'
                ) {
                  dispatch({ type: 'settle' });
                }
              }}
            >
              <div
                className={cx(
                  styles.zoom,
                  isAnimated && (isActive || isPrevious) && styles.zoomRunning,
                )}
                style={{ transformOrigin: slide.zoomOrigin }}
              >
                <Image
                  src={slide.src}
                  alt=""
                  fill
                  sizes="100vw"
                  priority={index === 0}
                  className={styles.image}
                  style={{ objectPosition: slide.objectPosition }}
                  onLoad={() => {
                    dispatch({ type: 'loaded', index });
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {isAnimated ? (
        <button
          type="button"
          className={styles.pauseButton}
          aria-label={isUserPaused ? 'Putar animasi latar' : 'Jeda animasi latar'}
          onClick={() => {
            setIsUserPaused((paused) => !paused);
          }}
        >
          {isUserPaused ? (
            <Play className={styles.pauseIcon} aria-hidden="true" />
          ) : (
            <Pause className={styles.pauseIcon} aria-hidden="true" />
          )}
        </button>
      ) : null}
    </div>
  );
}
