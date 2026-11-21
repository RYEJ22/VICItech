export interface SliderState {
  /** Index of the slide that is fading in or fully visible. */
  readonly active: number;
  /** Slide that is fading out. `null` once its fade has finished. */
  readonly previous: number | null;
  /** Highest slide index shown so far. Drives how many slides are mounted. */
  readonly reached: number;
  /** Indexes whose image finished loading. Never advance onto an unloaded image. */
  readonly loaded: readonly number[];
}

export type SliderAction =
  | { readonly type: 'advance'; readonly total: number }
  | { readonly type: 'loaded'; readonly index: number }
  | { readonly type: 'settle' };

export const INITIAL_SLIDER_STATE: SliderState = {
  active: 0,
  previous: null,
  reached: 0,
  loaded: [0],
};

export function sliderReducer(state: SliderState, action: SliderAction): SliderState {
  switch (action.type) {
    case 'advance': {
      if (action.total < 2) {
        return state;
      }
      const next = (state.active + 1) % action.total;
      if (!state.loaded.includes(next)) {
        return state;
      }
      return {
        ...state,
        active: next,
        previous: state.active,
        reached: Math.max(state.reached, next),
      };
    }
    case 'loaded':
      return state.loaded.includes(action.index)
        ? state
        : { ...state, loaded: [...state.loaded, action.index] };
    case 'settle':
      return state.previous === null ? state : { ...state, previous: null };
  }
}

/**
 * Slides to mount. Static mode mounts only the first image, so reduced-motion
 * visitors download one image. Animated mode mounts one slide ahead so the next
 * image is already loaded when its cross-fade starts.
 */
export function mountedSlideCount(total: number, reached: number, isAnimated: boolean): number {
  return isAnimated ? Math.min(total, reached + 2) : 1;
}
