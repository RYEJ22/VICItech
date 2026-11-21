# ViciTech Hero Slider

Drop-in files. Unzip at the project root so the paths match:

```
components/features/hero/hero.tsx                 Server Component (copy, CTAs, overlay)
components/features/hero/hero-slider.tsx          leaf Client Component ('use client')
components/features/hero/hero-slider-state.ts     pure reducer (no React)
components/features/hero/hero-content.ts          typed slides and copy
components/features/hero/hero.module.css          token mapping, overlay, CTA styles
components/features/hero/hero-slider.module.css   Ken Burns, cross-fade, pause button
hooks/use-prefers-reduced-motion.ts
hooks/use-page-visibility.ts
```

Use it:

```tsx
// app/page.tsx
import { Hero } from '@/components/features/hero/hero';

export default function HomePage() {
  return (
    <main>
      <Hero />
    </main>
  );
}
```

## Before you ship

- Put the four images in `public/images/hero/` (`pc-rig.jpg`, `thermal-paste.jpg`, `repair-tech.jpg`, `code-screen.jpg`). Use full-bleed images of about 1920px width.
- Confirm `lucide-react` is installed and the `@/*` alias points to the project root.
- Check your Next.js version: if it names the LCP prop `preload` instead of `priority`, change `priority={index === 0}` in `hero-slider.tsx`.
- Confirm the route names in `hero-content.ts` (`/register`, `/market`). `/market` does not exist until Phase 3: point it to a placeholder or relabel it "Segera hadir".
- Colors are CSS custom properties at the top of `hero.module.css` (Warm Alabaster surface, ink, tech orange). Map them to `DESIGN.md` tokens when they exist. The headline reads `--font-serif` if you define it with `next/font`.
- Motion constants (`DEFAULT_HERO_MOTION` in `hero-slider.tsx`): 7000 ms dwell, 1600 ms fade, zoom to 1.12. Keep dwell between 6000 and 8000 ms.

## Behavior

- Server render and reduced motion: one static first image, no timers, no extra downloads.
- Motion allowed: first image `priority`, the next slide mounts one step ahead and the slider only advances onto an image that has loaded.
- Only `transform` and `opacity` animate. The outgoing slide keeps zooming while it fades.
- A 44x44px pause/play button is rendered when motion is on (WCAG 2.2.2). The timer also stops while the tab is hidden.
- The slider layer is `aria-hidden` and images use `alt=""` because they are decorative.

## Verified in the sandbox

- `tsc` strict (TypeScript 6.0.3, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`): clean. Caveat: `react`, `next`, and `lucide-react` types were hand-written stubs because those packages are not installed here, so re-run `tsc` in your project.
- 16 of 16 Chromium tests (React 19 development build, zero console warnings or errors): SSR markup, hydration, Ken Burns scale growing, advance every 7 s, wrap-around, previous slide settling, pause and resume, hidden tab, reduced motion at load and at runtime, one interval under Strict Mode, zero after unmount, CLS below 0.1, no horizontal overflow at 360, 414, 768, 1440px, layering, and the reducer guards.
- Mutation checks: removing `clearInterval`, ignoring reduced motion, or marking every image `priority` each makes a test fail.
- Contrast (computed against a pure black photo pixel): description and headline at least 8.9:1 from 360 to 2560px; dark ink on the orange CTA 5.0:1.

## Not verified

- Real `next/image` behavior, real Tailwind output (the test used a small stand-in stylesheet), and real photos. Run Lighthouse on mobile and check LCP and CLS with your actual images.
