# CODING_STANDARDS

Finding severity levels: **CRITICAL** blocks merge. **IMPORTANT** must be fixed within the same sprint. **SUGGESTION** is scheduled for later.

## 1. General Principles
- Write simple, functional, declarative code. Avoid classes.
- Work strictly within the requested module scope. Do not add unrequested features, refactors, or dependencies.
- Prioritize clarity. Remove dead code. Write comments explaining *why*, not *what* is already obvious.
- Never hallucinate APIs, database columns, or package names. Verify against the codebase or official docs first.

## 2. TypeScript
- Enable `strict: true`. Never use `any`; use `unknown` and narrow or validate with Zod.
- Always use Supabase generated types in `types/database.types.ts` for all queries and mutations. Initialize clients with `createClient<Database>()`. Use `Tables<'table_name'>`, `TablesInsert<'table_name'>`, and `TablesUpdate<'table_name'>`.
- Do not write manual database table interfaces when generated types exist. Never manually edit `database.types.ts`.
- Regenerate types after every applied migration: `supabase gen types typescript --local > types/database.types.ts` (or `--project-id <ref>` for hosted projects). Commit alongside the migration.
- Narrow `jsonb` columns (typed as `Json`) using a Zod schema before use. Never type-cast with `as`.
- Use `interface` for component props and custom object shapes. Replace `enum` with `as const` objects.
- Add explicit return types to exported functions. Declare component props as a `readonly` interface (`interface FooProps { readonly items: readonly Item[] }`). Use a non-empty tuple type (`readonly [T, ...T[]]`) when an array must never be empty (e.g., slider slides).
- Keep code valid under `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`: array and CSS Module lookups can be `undefined`, so handle that case. Never silence the compiler with `!` non-null assertions or `as` casts.
- Naming conventions: folders `kebab-case`; components `PascalCase`; hooks & utilities `camelCase`; constants `UPPER_SNAKE_CASE`; booleans prefixed with `is`, `has`, `can`.
- Use named exports for components. Use default exports only where required by Next.js (`page`, `layout`, `route`, `error`, `loading`, `not-found`).

## 3. Next.js App Router
- Never use `pages/`.
- Default to Server Components. Place `'use client'` only on the smallest leaf components that need interactivity, state, or browser APIs.
- Always `await` `params`, `searchParams`, `cookies()`, and `headers()`.
- Never use `next/dynamic` with `ssr: false` inside Server Components.
- Never fetch your own Route Handlers from Server Components. Extract shared logic into `lib/` and call it directly.
- Provide `loading.tsx` and `error.tsx` on every data-fetching route, plus `not-found.tsx`.
- Wrap slow or dynamic sections in `Suspense` with skeleton fallbacks.
- Use `next/image` for all images and `generateMetadata` for metadata.
- Use Route Handlers strictly for webhooks, external/public endpoints, and streaming.

**Server/Client boundary & hydration safety**
- A file needs `'use client'` only if it uses state, effects, refs, event handlers, or browser-only APIs (`window`, `document`, `matchMedia`, `IntersectionObserver`). Headings, copy, links, and static layout stay in the Server Component parent.
- Pass only serializable props from Server to Client Components (strings, numbers, booleans, plain objects and arrays). Never pass functions, class instances, or `Date` objects.
- Put pure logic (reducers, selectors, formatters, parsers) in a separate non-React `.ts` file next to the component so it can be unit-tested without a DOM.
- Never read `window`, `document`, `localStorage`, or `matchMedia` during render, and never call `Math.random()` or `Date.now()` during render. Read browser state with `useSyncExternalStore` and an explicit `getServerSnapshot`, or inside `useEffect`.

**Images (`next/image`)**
- With `fill`, the parent must be positioned (`relative` or `absolute`) and sized, and `sizes` is mandatory (`100vw` for full-bleed backgrounds).
- Set `priority` on exactly one image per route: the LCP element. Every other image stays lazy. Check the installed Next.js version for the current prop name (`priority` or `preload`) before writing it.
- Decorative images use `alt=""`. Mount an off-screen item (slide, tab, accordion panel) only when it is about to be shown, so users do not download unused media.

## 4. State Management
1. **Server data:** Fetch in Server Components. Mutate via Server Actions, followed by `revalidatePath` or `revalidateTag`.
2. **URL-shareable state** (category, price range, search query, active tab): Store in `searchParams`.
3. **Local UI state:** Use `useState` or `useReducer` in the smallest leaf component.
4. **Context:** Use only for cross-page global state (session, theme). Never use Context as a data cache.
- Never fetch data inside `useEffect`.
- **Realtime:** Subscribe in leaf Client Components, filter by `user_id`, enforce `{ config: { private: true } }` on private Broadcast/Presence channels (backed by RLS policies on `realtime.messages`), and always clean up/remove channels on unmount.
- Use optimistic updates only for lightweight actions (likes, mark-as-read) and always roll back on failure.

**Timers, subscriptions & effects**
- Every `setInterval`, `setTimeout`, `addEventListener`, `matchMedia` listener, observer, and realtime channel created in `useEffect` must be released in that effect's cleanup function. A missing cleanup is **CRITICAL**.
- When a transition depends on previous state, use `useReducer` with a pure reducer and dispatch from the timer. Never read state from a stale closure. Keep the dependency array complete and minimal.
- Pause timers while the tab is hidden (`visibilitychange`) and while the user has paused the content.
- Effects must survive React Strict Mode (mount, unmount, mount): at most one active timer or subscription remains after a remount.
- Sequence UI with events instead of a second timer: use `transitionend` or `animationend`, not a `setTimeout` that guesses the duration.

## 5. Supabase Auth & Client
- Use `@supabase/ssr`. Never import `@supabase/auth-helpers-nextjs` (deprecated).
- Provide two helpers: `lib/supabase/server.ts` and `lib/supabase/client.ts`.
- On the server, verify users with `supabase.auth.getUser()`. Never use `getSession()` for authorization decisions.
- Use Middleware only for session token refreshing and optimistic redirects.
- Handle expired tokens on the login page and provide a session reset mechanism.
- Ensure the `handle_new_user` trigger creates a `profiles` row for every new user. Place the trigger function in a non-exposed schema (e.g., `private`) per Section 6. Test with a fresh account.

## 6. Database & Migrations
- Modify schemas strictly via files in `supabase/migrations/`. Never edit an already-applied migration; create a new one.
- Enable RLS on every table in an exposed schema within the same migration as `CREATE TABLE`.
- Write one policy per operation. Always include the `to` clause (`authenticated` or `anon`).
- Wrap `auth.uid()` and `auth.jwt()` inside `(select ...)` for query planner caching.
- Enforce ownership in `with check` on INSERT and UPDATE. `auth.uid() is not null` is not an ownership check, and `default auth.uid()` is not protection.
- Create a matching SELECT policy for every UPDATE policy.
- Index columns filtered by RLS policies and columns used for feed filtering/sorting (e.g., `category`).
- **Feed & Ranking Algorithms:** Never sort or compute feed ranking scores on the client or in server JavaScript. Compute ranking scores (e.g., time-decay and engagement weights) directly in Postgres via Database Views, Materialized Views, or RPC functions using cursor-based pagination.
- Never use `user_metadata` for authorization. Store roles in `app_metadata`.
- Create views with `security_invoker = true` (Postgres 15+).
- `security definer` functions: keep out of exposed schemas, set `search_path = ''`, and schema-qualify all object names. Never expose as client-callable RPCs.
- Wrap mandatory atomic multi-table writes (e.g., creating a DM thread and its initial message) inside a single Postgres function and call via `supabase.rpc()`. Never run sequential separate queries in Server Actions where partial failure leaves corrupted state.
- Define RPCs with `security invoker` so RLS remains active. Validate all inputs inside the function, set `search_path = ''`, revoke `execute` from `public` and `anon`, and grant `execute` only to `authenticated`.
- If an RPC genuinely requires elevated privileges, get user confirmation first, explicitly check `auth.uid()` inside the function, and prove isolation with two-user pgTAP tests (SOP-08).
- Write two-user pgTAP tests per table and per RPC in `supabase/tests/`. Run `supabase test db`.
- Configure RLS policies, file size limits, and allowed MIME types on every Storage bucket.

## 7. Server Actions, APIs & Form Submissions
- Mandatory execution order: authenticate (`getUser()`), validate input with Zod (`safeParse`), perform database operation, `revalidatePath`, return structured result:
```ts
type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
```
- Return generic error messages to the client. Never leak raw database errors or stack traces.
- Handle all errors fail-secure.
- Apply rate limiting on login, post creation, comments, and DMs.
- Disable submit buttons during active mutations (`disabled` via `useFormStatus` or `useActionState` pending state) and show a loading indicator. For optimistic toggles (like, mark-as-read), ignore duplicate taps while in-flight.
- Never rely on disabled buttons alone. Prevent double-submits and race conditions on the server: send a client-generated UUID `idempotency_key` (created per form render) and enforce a `UNIQUE` constraint on row-creating mutations (posts, comments, messages, orders). Treat conflict as an idempotent success, not an error.
- For one-per-user relationships (likes, follows, bookmarks), add a composite unique constraint (e.g., `post_id, user_id`) and use `insert ... on conflict do nothing`.
- For concurrent updates (stock counts, counters, LFG slots), use conditional updates or atomic Postgres functions—never read-then-write in Server Actions.

## 8. Security
- Store secrets in `.env.local` and never commit them. Only expose public values prefixed with `NEXT_PUBLIC_`. Keep `service_role` strictly on the server.
- Never construct SQL via string concatenation. Use parameterized queries or the Supabase SDK.
- Never render user input with `dangerouslySetInnerHTML`. Sanitize post and comment text.
- Validate file uploads on the server or via Storage policies, not just on the client: MIME type, file extension, and max size (`15MB–30MB` for videos). Client-side image compression is only for bandwidth savings.
- Configure security headers. Disable debug flags in production. Never log PII.
- Run `npm audit`, commit lockfiles, and review every new dependency.
- Treat OWASP A01 (Broken Access Control), A05 (Injection), and A10 (Improper Error Handling) as mandatory checks on every review.

## 9. UI, Accessibility & Performance
**Accessibility (WCAG 2.2 AA)**
- Maintain text contrast of at least 4.5:1 (3:1 for large text). Never use color alone to convey meaning.
- Ensure all interactive controls are keyboard-navigable with visible focus rings.
- Provide descriptive `alt` text for meaningful images and `alt=""` for decorative images. Provide visible labels on all inputs and accessible names on icon-only buttons.
- Enforce touch targets of at least `44x44px` with `8px` minimum spacing.
- Respect `prefers-reduced-motion`.

**Layout**
- Design mobile-first. Test at `360px`, `414px`, `768px`, `1024px`, and `1440px`.
- Limit bottom navigation to a maximum of 5 items. Account for `env(safe-area-inset-*)`.
- Implement all UI states: default, hover, focus, disabled, loading (skeletons), error, and empty.

**Overlays (Replacing Modals)**
Choose contextual overlays based on viewport and intent. Mobile means `< 768px` (test at `360–414px`).
- **Bottom Sheet:** Mandatory on mobile for filters, action menus, and short selections. Include a drag handle and explicit close button; never rely on swipe gestures alone.
- **Side Drawer:** Mandatory on desktop and dashboards for edit forms and detail panels. On mobile, render the same content as a full page or Bottom Sheet.
- **Anchored Popover:** Mandatory for brief info, undoable quick confirmations, and compact trigger-attached menus (e.g., notifications, share menu). Fall back to a Bottom Sheet on mobile if content overflows.
- Centered screen modals are strictly forbidden except for two interruptions: media lightboxes and permanent destructive action confirmations.
- All overlays must: return focus to the trigger on close, trap focus while open, close on `Esc`, lock background scroll (Bottom Sheet and Side Drawer), include proper ARIA roles/labels, and respect `prefers-reduced-motion`.

**Motion & Auto-Advancing Content**
- Content that moves, scrolls, or changes automatically for more than 5 seconds (carousels, sliders, Ken Burns, marquees) MUST provide a visible pause/play control: `44x44px` target, accessible name, visible focus ring (WCAG 2.2.2).
- Honor `prefers-reduced-motion` in both layers: CSS (`@media (prefers-reduced-motion: reduce)` disables the animation) and JS (`usePrefersReducedMotion`). In reduced motion, show a static first frame, start no timers, and load no extra images.
- Server render and hydration assume reduced motion (`getServerSnapshot` returns `true`). Visitors who opted out never see a flash of motion, and server and client markup always match.
- Animate only `transform` and `opacity`. Add `will-change: transform` only while the animation runs. Keep zoom effects at scale 1.15 or lower, cross-fades between 1.2 and 2 s, and slide dwell between 6 and 8 s. Never exceed 3 flashes per second (WCAG 2.3.1).
- Never advance to a slide whose image has not finished loading.

**Text Over Imagery**
- Text placed over a photo must keep 4.5:1 contrast (3:1 for large text) against the worst-case photo pixel (pure black), not the average. Achieve it with an overlay whose opacity stops you computed and documented in the CSS.
- Verify the overlay at 360, 768, 1024, 1440, and 1920px, because the copy width and its position over the photo change with the layout.
- If the subject of the photo sits under the copy, move it with `object-position` instead of raising the overlay opacity.

**Tokens & Icons**
- Use semantic tokens from `DESIGN.md`. Never hardcode hex colors, pixel dimensions, or animation durations in JSX. Until `DESIGN.md` defines a token, declare it once as a CSS custom property at the component root (or a named constant for durations) with a comment naming the intended token, and reference it by name everywhere else.
- Styling split: Tailwind utilities for layout, spacing, and type scale. A co-located CSS Module (`*.module.css`) for keyframes, gradients, and anything driven by custom properties. Inline `style` only for per-item values (`transformOrigin`, `objectPosition`) and CSS custom properties. Type custom-property objects as `CSSProperties & Record<`--${string}`, string | number>` instead of casting.
- Never repeat raw hex or Tailwind palette colors (for example `text-neutral-900`) in JSX when a token exists.
- Use a single icon library (`Lucide React`), consistent stroke width, and consistent style per hierarchy level. Never use emojis or Unicode glyphs (including "✓") as UI icons. Use official brand assets only.

**Performance**
- Target LCP < 2.5s, INP < 200ms, CLS < 0.1.
- Reserve aspect ratios/dimensions for all images and videos. Use WebP/AVIF. Lazy-load below the fold; apply `priority` only to the LCP hero image.
- Use pagination or infinite scroll for feeds.
- Dynamically import non-critical components. Animate `transform` and `opacity` only, never `width` or `height`.

## 10. Anti-Slop Design & Copy
**Design — Never Use:**
- Gradient text; nested cards; uniform grids of equal-sized icon+title+text cards as page structure; fake hero-metric blocks (giant numbers + labels); kickers/eyebrows above headings; unmeaningful section numbers (`01/02/03`).
- Colored left/right borders > 1px on cards or callouts; hard offset shadows outside neobrutalist themes; decorative glassmorphism/blur; centered modals for non-interruptive tasks.
- System display fonts (`Impact`, `Arial Black`); monospace used as a "tech costume"; muted gray text on colored surfaces.
- Keep body copy line length between 65–75 characters and apply `text-wrap: balance` on headings.

**Copy — Never:**
- Fabricate claims, statistics, testimonials, prices, or hardware specifications. Ask first.
- Use AI writing tropes: empty affirmations, forced tricolons, excessive em-dashes, inflated superlatives, repetitive summary conclusions, or conversational filler ("Sure!", "Hope this helps").
- Label buttons with specific actions. Write error messages stating both the issue and how to recover.
- Write UI copy in natural, clean Indonesian while keeping standard hardware/tech terms (`GPU`, `RAM`, `FPS`, `Telemetry`) untranslated.

## 11. Git & Code Review
- Follow Conventional Commits: `type(scope): description` (`feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`). Mark breaking changes with `!` or `BREAKING CHANGE:`.
- Use one branch/PR per module and one logical change per commit.
- Never commit secrets, `.env*`, or build artifacts.
- Before merging: lint, typecheck, and all tests (including pgTAP) must pass, and the module's Definition of Done must be satisfied.

## 12. Strict Prohibitions
1. Never use `getSession()` for server-side authorization.
2. Never import `@supabase/auth-helpers-nextjs`.
3. Never create tables without RLS, and never disable RLS to "fix" errors.
4. Never write RLS policies without `to`, or check ownership via `auth.uid() is not null`.
5. Never alter RLS policies merely to make failing tests pass. Report failing assertions.
6. Never expose `service_role` or secret keys in client code or `NEXT_PUBLIC_` env vars.
7. Never access `params` or `searchParams` synchronously.
8. Never rely on Middleware as the sole access-control boundary.
9. Never use `any` or `enum`.
10. Never fetch data in `useEffect` or fetch your own Route Handlers from Server Components.
11. Never use `dangerouslySetInnerHTML` with user input or build SQL via string concatenation.
12. Never edit already-applied migrations.
13. Never add out-of-scope dependencies or features without permission.
14. Never hardcode colors, dimensions, or durations in JSX (declare named tokens as described in Section 9), and never use emojis as UI icons.
15. Never fabricate claims, metrics, data, or APIs.
16. Never suppress errors (`@ts-ignore`, empty `catch` blocks) as a fix.
17. Never write manual database table interfaces or manually edit `database.types.ts`.
18. Never run sequential separate queries for atomic multi-table writes.
19. Never leave submit buttons enabled during mutations or rely on UI disabling without server-side idempotency/unique constraints.
20. Never use centered modals outside the two exceptions in Section 9.
21. Never leave a timer, listener, observer, or subscription without a cleanup.
22. Never read `window`, `document`, or `matchMedia` during render, or mirror a browser value into state with `useEffect` when `useSyncExternalStore` can read it.
23. Never ship content that moves automatically for more than 5 seconds without a pause control, or ignore `prefers-reduced-motion`.
24. Never mark more than one image per route as LCP `priority`, or put `priority` on below-the-fold images.
25. Never use `!` non-null assertions or `as` casts to silence type errors.
26. Never animate layout properties (`width`, `height`, `top`, `left`, `margin`) or apply large `filter: blur` areas.

## 13. File & Component Structure
```
components/features/<feature>/
  <feature>.tsx                 # Server Component: layout, copy, CTAs
  <feature>-<widget>.tsx        # leaf Client Component ('use client')
  <feature>-<widget>-state.ts   # pure reducer and selectors, no React imports
  <feature>-content.ts          # typed content constants (copy, links, asset lists)
  <feature>.module.css          # keyframes, gradients, token mapping
hooks/use-<name>.ts             # reusable browser-state hooks
```
- One exported component per file. File names are the kebab-case of the component name.
- Keep copy and asset lists in `*-content.ts`. Components take them as optional props that default to those constants, so they stay testable and reusable.
- Reference implementations of recurring patterns live in `docs/ai/PATTERNS.md`. Reuse them before inventing a new approach.

## 14. Testing & Verification
- Unit-test pure logic (reducers, selectors, parsers). Browser-test behavior that depends on timers or media queries: fake clock, emulated `prefers-reduced-motion` at load and at runtime, hidden tab, Strict Mode, and unmount.
- A change is done only when `tsc --noEmit` is clean, lint is clean, tests pass, and the dev build logs zero console warnings or errors (including hydration warnings).
- Measure or compute every claim you make (contrast ratios, CLS, LCP, bundle size). Never assert them from intuition.
- Mutation sanity: after writing a test for a cleanup or guard, remove the guarded code once and confirm the test fails. A test that cannot fail is not a test.
- State explicitly what you could not verify (for example, packages that are not installed in your environment).
