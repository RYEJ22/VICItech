const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
let transitionPending = false;

export interface RouteClickEventLike {
  readonly defaultPrevented: boolean;
  readonly button: number;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
}

function getStartViewTransition(doc: Document): ((callback: () => void) => unknown) | null {
  const candidate = Reflect.get(doc, 'startViewTransition');
  if (typeof candidate !== 'function') return null;
  return (callback: () => void) => Reflect.apply(candidate, doc, [callback]);
}

export function canUseViewTransition(): boolean {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false;
  if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return false;
  return getStartViewTransition(document) !== null;
}

export function startRouteTransition(navigate: () => void): void {
  if (typeof document === 'undefined') {
    navigate();
    return;
  }

  if (typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches) {
    navigate();
    return;
  }

  const startTransition = getStartViewTransition(document);
  if (!startTransition || transitionPending) {
    navigate();
    return;
  }

  try {
    const transition = startTransition(() => {
      navigate();
    });
    transitionPending = true;
    const finished = transition && typeof transition === 'object' ? Reflect.get(transition, 'finished') : null;
    const ready = transition && typeof transition === 'object' ? Reflect.get(transition, 'ready') : null;
    if (ready && typeof Reflect.get(ready, 'catch') === 'function') {
      void Promise.resolve(ready).catch(() => undefined);
    }
    if (finished && typeof Reflect.get(finished, 'finally') === 'function') {
      void Promise.resolve(finished).catch(() => undefined).finally(() => { transitionPending = false; });
    } else {
      transitionPending = false;
    }
  } catch {
    transitionPending = false;
    navigate();
  }
}

export function shouldInterceptRouteLink(
  event: RouteClickEventLike,
  href: string,
  currentPathname: string | null,
): boolean {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return false;
  }

  const baseHref = href.split('?')[0]?.split('#')[0] ?? href;
  if (!baseHref || baseHref === currentPathname) {
    return false;
  }

  return canUseViewTransition();
}
