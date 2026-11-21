# PATTERNS

Reference code for recurring tasks. Load a section only when an SOP points to it. Sections 1–3 are verified (strict `tsc` plus browser tests). Sections 4–8 are templates with illustrative table and column names: adapt them and verify every API against the installed package versions before use.

| Section | Used by |
|---|---|
| 1. Browser-state hooks | SOP-06, SOP-19, `CODING_STANDARDS` Sections 3, 9 |
| 2. Reducer and timer effect | SOP-19, `CODING_STANDARDS` Section 4 |
| 3. Background slider: image, Ken Burns, overlay | SOP-19, SOP-14 |
| 4. Server Action with idempotency | SOP-03, `CODING_STANDARDS` Section 7 |
| 5. Form with pending state and idempotency key | SOP-03, `CODING_STANDARDS` Section 7 |
| 6. RLS migration and two-user pgTAP test | SOP-08 |
| 7. Atomic RPC | SOP-08, SOP-09, `CODING_STANDARDS` Section 6 |
| 8. Realtime subscription in a leaf component | `CODING_STANDARDS` Section 4 |

## 1. Browser-State Hooks
Read browser state without touching `window` during render. The server snapshot assumes reduced motion, so opted-out visitors never see a flash of motion and hydration never mismatches.

`hooks/use-prefers-reduced-motion.ts`
```ts
import { useSyncExternalStore } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onStoreChange: () => void): () => void {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener('change', onStoreChange);
  return () => {
    mediaQuery.removeEventListener('change', onStoreChange);
  };
}

function getSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * The server render and the hydration pass assume reduced motion. Visitors who
 * opted out therefore never see a flash of animation, and server and client
 * markup always match (no hydration warning).
 */
function getServerSnapshot(): boolean {
  return true;
}

/** Live `prefers-reduced-motion: reduce` state. Safe to call from any Client Component. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

`hooks/use-page-visibility.ts`
```ts
import { useSyncExternalStore } from 'react';

function subscribe(onStoreChange: () => void): () => void {
  document.addEventListener('visibilitychange', onStoreChange);
  return () => {
    document.removeEventListener('visibilitychange', onStoreChange);
  };
}

function getSnapshot(): boolean {
  return document.visibilityState === 'visible';
}

function getServerSnapshot(): boolean {
  return true;
}

/** `true` while the tab is visible. Use it to pause timers and animations in background tabs. */
export function usePageVisibility(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

## 2. Reducer and Timer Effect
Pure reducer in its own file (unit-testable without a DOM). The timer only dispatches; it never reads state from a closure.

`components/features/hero/hero-slider-state.ts`
```ts
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
```

Timer effect with cleanup. It stops for a user pause, a hidden tab, reduced motion, and unmount, and it survives Strict Mode with exactly one live interval.
```tsx
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
```

## 3. Background Slider: Image, Ken Burns, Overlay
Image (`fill` inside an absolutely positioned wrapper; only the first image has `priority`; decorative `alt=""`):
```tsx
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
```

Ken Burns and cross-fade in a CSS Module. Only `transform` and `opacity` animate. The zoom lasts interval plus fade, so the outgoing slide keeps zooming while it fades out. Durations come from one JS constant passed in as custom properties (`--hero-fade-ms`, `--hero-zoom-ms`, `--hero-zoom-scale`).
```css
.zoomRunning {
  will-change: transform;
  animation: heroKenBurns var(--hero-zoom-ms, 8600ms) linear both;
}

.root[data-paused='true'] .zoomRunning {
  animation-play-state: paused;
}

@keyframes heroKenBurns {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(var(--hero-zoom-scale, 1.12));
  }
}
```

Light editorial overlay with documented opacity stops (worst-case contrast measured against a pure black photo pixel):
```css
/*
 * Light editorial overlay. Below 64rem the copy spans the full width, so the
 * wash is uniform. From 64rem the copy sits on the left and the photo opens up
 * on the right. Opacity stops are chosen so body copy keeps at least 4.5:1
 * contrast even over a pure black photo pixel.
 */
.overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background: rgb(var(--hero-surface) / 0.8);
}

@media (min-width: 64rem) {
  .overlay {
    background: linear-gradient(
      to right,
      rgb(var(--hero-surface) / 0.9) 0%,
      rgb(var(--hero-surface) / 0.8) 70%,
      rgb(var(--hero-surface) / 0.15) 100%
    );
  }
}
```

Full working files: `components/features/hero/` (`hero.tsx`, `hero-slider.tsx`, `hero-slider-state.ts`, `hero-content.ts`, `hero.module.css`, `hero-slider.module.css`) plus the two hooks above.

## 4. Server Action with Idempotency
Order is fixed: authenticate, validate, write, revalidate, return a structured result. A duplicate submit hits the unique key and counts as success.
```ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const createPostSchema = z.object({
  idempotencyKey: z.string().uuid(),
  category: z.enum(['hardware', 'gaming', 'dev', 'creative', 'meme']),
  body: z.string().trim().min(1).max(2000),
});

export async function createPost(
  _previous: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Sesi berakhir. Silakan masuk lagi.' };
  }

  const parsed = createPostSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: 'Data tidak valid. Periksa kembali isian Anda.' };
  }

  const { error } = await supabase.from('community_posts').insert({
    user_id: user.id,
    idempotency_key: parsed.data.idempotencyKey,
    category: parsed.data.category,
    body: parsed.data.body,
  });

  // 23505 = unique_violation on idempotency_key: this exact submit already succeeded.
  if (error && error.code !== '23505') {
    return { success: false, error: 'Gagal menyimpan. Coba lagi.' };
  }

  revalidatePath('/community');
  return { success: true, data: undefined };
}
```

## 5. Form with Pending State and Idempotency Key
Generate the key after mount, never during render: `crypto.randomUUID()` in a state initializer would differ between server and client and cause a hydration mismatch. The submit button stays disabled until the key exists and while the action runs.
```tsx
'use client';

import { useActionState, useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import { createPost } from './actions';

export function CreatePostForm(): ReactElement {
  const [state, formAction, isPending] = useActionState(createPost, null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, []);

  // A successful submit consumes the key; mint a fresh one for the next post.
  useEffect(() => {
    if (state?.success) {
      setIdempotencyKey(crypto.randomUUID());
    }
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey ?? ''} />
      {/* category select and body textarea with visible labels */}
      <button type="submit" disabled={isPending || idempotencyKey === null}>
        {isPending ? 'Memposting…' : 'Posting'}
      </button>
      {state && !state.success ? <p role="alert">{state.error}</p> : null}
    </form>
  );
}
```

## 6. RLS Migration and Two-User pgTAP Test
One policy per operation, `to` on every policy, `(select auth.uid())`, and ownership enforced in `with check`.
```sql
-- supabase/migrations/<timestamp>_create_community_posts.sql
create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  idempotency_key uuid not null unique,
  category text not null check (category in ('hardware', 'gaming', 'dev', 'creative', 'meme')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.community_posts enable row level security;

create index community_posts_user_id_idx on public.community_posts (user_id);
create index community_posts_category_created_idx on public.community_posts (category, created_at desc);

create policy "community_posts_select_public" on public.community_posts
  for select to anon, authenticated using (true);

create policy "community_posts_insert_owner" on public.community_posts
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "community_posts_update_owner" on public.community_posts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "community_posts_delete_owner" on public.community_posts
  for delete to authenticated using ((select auth.uid()) = user_id);
```

Two-user test. It assumes the `basejump-supabase_test_helpers` helpers (`tests.create_supabase_user`, `tests.authenticate_as`, `tests.get_supabase_uid`, `tests.clear_authentication`); adapt the calls if your project authenticates test users another way.
```sql
-- supabase/tests/community_posts_rls.test.sql
begin;
select plan(4);

select tests.create_supabase_user('alice');
select tests.create_supabase_user('bob');

select tests.authenticate_as('alice');
select lives_ok(
  $$insert into public.community_posts (user_id, idempotency_key, category, body)
    values (tests.get_supabase_uid('alice'), gen_random_uuid(), 'gaming', 'halo')$$,
  'owner can insert'
);
select throws_ok(
  $$insert into public.community_posts (user_id, idempotency_key, category, body)
    values (tests.get_supabase_uid('bob'), gen_random_uuid(), 'gaming', 'palsu')$$,
  '42501', null, 'cannot insert on behalf of another user'
);

select tests.authenticate_as('bob');
update public.community_posts set body = 'dibajak' where user_id = tests.get_supabase_uid('alice');
delete from public.community_posts where user_id = tests.get_supabase_uid('alice');

select tests.clear_authentication();
select is(
  (select body from public.community_posts where user_id = tests.get_supabase_uid('alice')),
  'halo', 'other user can neither update nor delete the post'
);
select is(
  (select count(*) from public.community_posts where user_id = tests.get_supabase_uid('alice')),
  1::bigint, 'post still exists'
);

select * from finish();
rollback;
```

## 7. Atomic RPC
Cross-table writes that must succeed or fail together live in one function. `security invoker` keeps RLS active; the function validates its inputs and is callable only by signed-in users. Table and column names are illustrative.
```sql
create or replace function public.start_dm_thread(p_other_user uuid, p_first_message text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_thread_id uuid;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_other_user = v_me then
    raise exception 'cannot message yourself' using errcode = '22023';
  end if;
  if char_length(btrim(p_first_message)) not between 1 and 2000 then
    raise exception 'invalid message' using errcode = '22023';
  end if;

  insert into public.dm_threads (user_a, user_b)
  values (least(v_me, p_other_user), greatest(v_me, p_other_user))
  on conflict (user_a, user_b) do update set updated_at = now()
  returning id into v_thread_id;

  insert into public.messages (thread_id, sender_id, body)
  values (v_thread_id, v_me, btrim(p_first_message));

  return v_thread_id;
end;
$$;

revoke execute on function public.start_dm_thread(uuid, text) from public, anon;
grant execute on function public.start_dm_thread(uuid, text) to authenticated;
```
Call it from a Server Action after `getUser()` and Zod validation. Test that another user cannot call it on the owner's behalf and that a failure in the second insert rolls back the first (SOP-08).
```ts
const { data: threadId, error } = await supabase.rpc('start_dm_thread', {
  p_other_user: parsed.data.otherUserId,
  p_first_message: parsed.data.message,
});
```

## 8. Realtime Subscription in a Leaf Component
RLS decides who may receive rows; the `filter` only narrows the stream. Narrow the payload with Zod instead of casting, keep the latest callback in a ref so the channel is not recreated on every render, and remove the channel on cleanup.
```tsx
'use client';

import { useEffect, useRef } from 'react';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/client';

const notificationSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  type: z.enum(['like', 'comment', 'dm', 'system']),
  entity_id: z.string().nullable(),
  is_read: z.boolean(),
  created_at: z.string(),
});
type NotificationRow = z.infer<typeof notificationSchema>;

export function useNotificationStream(
  userId: string,
  onInsert: (row: NotificationRow) => void,
): void {
  const onInsertRef = useRef(onInsert);
  useEffect(() => {
    onInsertRef.current = onInsert;
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const parsed = notificationSchema.safeParse(payload.new);
          if (parsed.success) {
            onInsertRef.current(parsed.data);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
```
