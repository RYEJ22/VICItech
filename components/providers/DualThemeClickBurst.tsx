'use client';

import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';

// ── Constants ──

const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  '[role="button"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="switch"]',
  '.vt-card-interactive',
  '.vt-card-lift',
  '.vt-btn-tactile',
  '.vt-motion-press',
  '.vt-chip',
  '[data-click-burst="true"]',
].join(', ');

const DARK_PIXEL_PALETTE = [
  '#E11D48',
  '#F43F5E',
  '#E11D48',
  '#38BDF8',
  '#10B981',
  '#FDA4AF',
  '#6366F1',
  '#F43F5E',
] as const;

const LIGHT_CRUMB_PALETTE = [
  '#EA580C',
  '#C2410C',
  '#78350F',
  '#EA580C',
  '#B45309',
  '#78350F',
  '#9A3412',
] as const;

const CRUMB_SHAPE_COUNT = 4;
const BURST_THROTTLE_MS = 45;
const MAX_CONCURRENT_BURSTS = 6;
const CLEANUP_DELAY_MS = 340;

// ── Helpers ──

function isReducedMotionActive(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return true;
  }
  const attrReduced = document.documentElement.getAttribute('data-reduced-motion') === 'true';
  const mediaReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return attrReduced || mediaReduced;
}

function resolveInteractiveTarget(rawTarget: EventTarget | null): HTMLElement | null {
  if (!(rawTarget instanceof Element)) return null;
  if (rawTarget.closest('[data-click-burst="false"]')) return null;

  const formEl = rawTarget.closest('input, textarea, select');
  if (formEl instanceof HTMLInputElement) {
    const type = formEl.type.toLowerCase();
    if (type !== 'button' && type !== 'submit' && type !== 'reset') {
      return null;
    }
  } else if (formEl) {
    return null;
  }

  const interactive = rawTarget.closest(INTERACTIVE_SELECTOR);
  if (!(interactive instanceof HTMLElement)) return null;
  if (interactive.matches(':disabled') || interactive.getAttribute('aria-disabled') === 'true') {
    return null;
  }
  return interactive;
}

function resolveBurstOrigin(
  event: MouseEvent,
  element: HTMLElement,
): { readonly x: number; readonly y: number } | null {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw <= 0 || vh <= 0) return null;

  if (event.clientX > 0 || event.clientY > 0) {
    return {
      x: Math.min(Math.max(8, event.clientX), Math.max(8, vw - 8)),
      y: Math.min(Math.max(8, event.clientY), Math.max(8, vh - 8)),
    };
  }

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  if (cx < 0 || cx > vw || cy < 0 || cy > vh) return null;
  return { x: cx, y: cy };
}

function buildDarkPixelParticles(
  origin: HTMLSpanElement,
  subtleIntensity: boolean,
): void {
  const count = subtleIntensity ? 6 : 8;
  const minR = subtleIntensity ? 14 : 18;
  const maxR = subtleIntensity ? 24 : 34;

  if (!subtleIntensity) {
    const core = document.createElement('span');
    core.className = 'vt-burst-pixel-core';
    origin.appendChild(core);
  }

  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.42;
    const distance = minR + Math.random() * (maxR - minR);
    const dx = Math.round(Math.cos(angle) * distance);
    const dy = Math.round(Math.sin(angle) * distance);
    const size = i % 3 === 0 ? 5 : i % 2 === 0 ? 4 : 3;
    const duration = 230 + Math.round(Math.random() * 35);

    const px = document.createElement('span');
    px.className = 'vt-burst-pixel';
    px.style.width = `${size}px`;
    px.style.height = `${size}px`;
    px.style.backgroundColor = DARK_PIXEL_PALETTE[i % DARK_PIXEL_PALETTE.length]!;
    px.style.setProperty('--vt-bx', `${dx}px`);
    px.style.setProperty('--vt-by', `${dy}px`);
    px.style.setProperty('--vt-bd', `${duration}ms`);
    origin.appendChild(px);
  }
}

function buildLightCrumbParticles(origin: HTMLSpanElement): void {
  const count = 5 + Math.floor(Math.random() * 3);
  const baseRotation = Math.random() * Math.PI * 2;

  for (let i = 0; i < count; i += 1) {
    const angle = baseRotation + (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.55;
    const distance = 16 + Math.random() * 18;
    const dx = Math.round(Math.cos(angle) * distance);
    const dyMid = Math.round(Math.sin(angle) * distance * 0.72);
    const dyEnd = Math.round(Math.sin(angle) * distance + 6 + Math.random() * 6);
    const width = 4 + Math.round(Math.random() * 3);
    const height = 3 + Math.round(Math.random() * 3);
    const startAngle = Math.round(Math.random() * 180 - 90);
    const endAngle = startAngle + Math.round(Math.random() * 160 - 80);
    const duration = 255 + Math.round(Math.random() * 45);
    const shapeIdx = (i + Math.floor(Math.random() * CRUMB_SHAPE_COUNT)) % CRUMB_SHAPE_COUNT;

    const crumb = document.createElement('span');
    crumb.className = `vt-burst-crumb vt-crumb-shape-${shapeIdx}`;
    crumb.style.width = `${width}px`;
    crumb.style.height = `${height}px`;
    crumb.style.backgroundColor =
      LIGHT_CRUMB_PALETTE[(i + Math.floor(Math.random() * 2)) % LIGHT_CRUMB_PALETTE.length]!;
    crumb.style.setProperty('--vt-bx', `${dx}px`);
    crumb.style.setProperty('--vt-by-mid', `${dyMid}px`);
    crumb.style.setProperty('--vt-by-end', `${dyEnd}px`);
    crumb.style.setProperty('--vt-br0', `${startAngle}deg`);
    crumb.style.setProperty('--vt-br1', `${endAngle}deg`);
    crumb.style.setProperty('--vt-bd', `${duration}ms`);
    origin.appendChild(crumb);
  }
}

export function DualThemeClickBurst(): ReactElement {
  const layerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    const activeTimers = new Set<number>();
    let lastBurstAt = 0;

    const handleClick = (event: MouseEvent): void => {
      if (!event.isTrusted) return;
      if (isReducedMotionActive()) return;

      const interactive = resolveInteractiveTarget(event.target);
      if (!interactive) return;

      const now = performance.now();
      if (now - lastBurstAt < BURST_THROTTLE_MS) return;

      const point = resolveBurstOrigin(event, interactive);
      if (!point) return;

      lastBurstAt = now;

      while (layer.childElementCount >= MAX_CONCURRENT_BURSTS && layer.firstElementChild) {
        layer.firstElementChild.remove();
      }

      const root = document.documentElement;
      const isDark =
        root.getAttribute('data-theme') === 'dark' || root.classList.contains('dark');
      const isSubtlePixel = root.getAttribute('data-pixel-intensity') === 'subtle';

      const origin = document.createElement('span');
      origin.className = 'vt-burst-origin';
      origin.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;

      if (isDark) {
        buildDarkPixelParticles(origin, isSubtlePixel);
      } else {
        buildLightCrumbParticles(origin);
      }

      layer.appendChild(origin);

      const timerId = window.setTimeout(() => {
        activeTimers.delete(timerId);
        origin.remove();
      }, CLEANUP_DELAY_MS);
      activeTimers.add(timerId);
    };

    document.addEventListener('click', handleClick, { capture: true, passive: true });

    return () => {
      document.removeEventListener('click', handleClick, true);
      for (const timerId of activeTimers) {
        window.clearTimeout(timerId);
      }
      activeTimers.clear();
      layer.replaceChildren();
    };
  }, []);

  return <div ref={layerRef} aria-hidden="true" className="vt-burst-layer" />;
}
