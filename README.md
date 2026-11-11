# ViciTech: integrated app (Next.js, App Router)

One shell, seven modules, one URL hash per view. Catalogs and several modules use sample data; account orders are fetched from Supabase for the signed-in user.

## Folder layout

```
app/page.jsx                              renders <ViciTechApp />
components/vicitech/ViciTechApp.jsx       master shell (navbar, tabs, home, palette, footer, routing)
components/vicitech/CyberSuite.tsx         animated QC, compatibility builder, toast, community preview
components/vicitech/CyberUI.tsx            themed motion buttons, QC badges and notification toast
components/vicitech/SpotlightCard.tsx      theme-aware pointer spotlight card
components/vicitech/ThemeToggle.tsx        animated dark/light mode switch
components/vicitech/CheckoutModal.jsx      authenticated order review and Supabase checkout
components/vicitech/modules/
  HardwareLibrary.jsx      phones, laptops, PC components, accessories + comparison drawer
  UpgradeAnalyzer.jsx      max RAM, NVMe/SATA slots, upgrade score and planner
  PresetBuilder.jsx        B2S / B2B / B2C configurator with live price and wattage
  TradeInPortal.jsx        buyback valuation form + certified refurbished gallery
  IotQcEngine.jsx          serial lookup, live telemetry, 15-point QC, certificate
  BottleneckAnalyzer.jsx   CPU + GPU + RAM + workload pairing and rebalancing advice
  VersusArena.jsx          head-to-head comparison with a verdict
  AccountDashboard.jsx     orders, trade-ins, presets, certificate vault, settings (3 roles)
  CommunityHub.jsx         build showcases, guides and Q&A feed
```

## Setup

```bash
npx create-next-app@latest vicitech --app --tailwind --no-typescript
cd vicitech && npm i lucide-react framer-motion @supabase/supabase-js @supabase/ssr
# copy app/page.jsx and components/ over the generated files
```

Run `npm run dev` for local development, or `npm run build` followed by `npm start` for production.
The app requires a Next.js server runtime for its Supabase OAuth callback; static export is not supported.

The ViciTech home dashboard includes an animated QC and hardware compatibility suite. QC test profiles
in this suite are explicitly simulated. To enable account-owned report saving, run
`supabase/qc_test_reports.sql` in the Supabase SQL Editor; row-level security limits reports to their owner.
The shared root theme provider defaults to Dark Cyber and the QC dashboard is also available at `/qc-panel`.

Tailwind must be v3.1 or newer (the shell uses arbitrary variants such as `[&>div>header]:hidden`).
Make sure `tailwind.config.js` scans the components:

```js
content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"]
```

`ViciTechApp.jsx` starts with `"use client"`, so every module it imports runs on the client.

## Supabase checkout

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`, enable the GitHub
provider and Email provider in Supabase Authentication, and allow your app URL plus
`http://localhost:3000/auth/callback` in Supabase's redirect URL settings. Register Supabase's GitHub
callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`) with the GitHub OAuth app. The
navbar supports GitHub OAuth and email/password sign-in and registration; email registration may require
confirmation depending on your Supabase Auth settings. OAuth and email confirmation codes are exchanged
by `app/auth/callback/route.js` and stored in secure Supabase SSR cookies.

Run `supabase/schema.sql` to create/update the orders table, including its unique order number and JSONB
build summary, public authenticated member profiles, private owner-scoped presets, shared-build
statistics, direct messages, and the append-only `telemetry_logs` table. The schema enables Realtime
for telemetry and direct messages, restricts message access to conversation participants, and restricts
telemetry writes and all-order access to trusted admins. Account Settings saves username, full name,
avatar URL, and bio to the profile row and Supabase Auth user metadata. Account orders and presets are
fetched only after sign-in and scoped to the current user's ID.

Authenticated members can view `/profile/[username]`, see recent shared-build activity, and start a
private conversation from the public profile. Owners can also see their saved preset details on their
own profile; other users only see the count, preserving preset privacy. The `/messages` inbox supports
recent conversations, unread badges, message read receipts, and live inserts through Supabase Realtime.
Community member names and avatars link to their corresponding public profile routes. Profile statistics
are returned by a count-only RPC.

The authenticated Preset Builder submits orders through `/api/orders`; server-side pricing, component
compatibility, build balance score, ownership, and unique `VT-PO-YYYY-NNNN` order IDs are validated
before insertion. The unified `/qc-panel` includes simulated component diagnostics, a compatibility builder, and a
customer tracker that displays actual order/QC data and subscribes to telemetry. The protected
control portal at `/admin/iot-qc` registers queued orders for QC and receives
live telemetry; its simulation action is explicitly labeled as simulated and never presented as a
physical ESP32 reading. Admin actions require a signed-in user whose trusted `app_metadata.role` is
`admin`.

The home dashboard's interactive QC report suite stores only authenticated users' reports in
`qc_test_reports`. Apply `supabase/qc_test_reports.sql` before using its save action.

## Admin workspace and roles

The `/admin` and `/admin/iot-qc` routes are protected by `middleware.js`; unauthenticated and non-admin
users are redirected to `/admin/login`. Admin sign-in uses Supabase email/password authentication.
Authorization checks the trusted `app_metadata.role` claim returned by `auth.getUser()` and requires
the exact value `admin`. Assign this claim only through the Supabase Dashboard or a trusted server using
the Supabase Admin API/service-role key. Never grant admin access from `user_metadata`, browser code,
or a client-controlled role selector. The service-role key must remain server-side and must not use a
`NEXT_PUBLIC_` environment variable.

For ESP32 ingestion, configure server-only `SUPABASE_SERVICE_ROLE_KEY` and `IOT_INGEST_TOKEN`.
Devices POST validated sensor payloads to `/api/iot/telemetry` with
`Authorization: Bearer <IOT_INGEST_TOKEN>`; never expose either secret to browser code or commit it.
The endpoint accepts telemetry only for registered QC units and streams inserted readings to both
tracking views through Supabase Realtime.

The client navbar exposes the separate Admin Workspace link only when the signed-in user has the same
`app_metadata.role` claim. Middleware remains the enforcement boundary; hiding the link is only navigation.

The Preset Builder hands the selected parts, pricing and specs to the shell-owned checkout modal. A user
must sign in before an order is submitted; the pending build is retained across the OAuth redirect.
Supabase errors are shown in checkout rather than being reported as successful local orders.

## Routes (URL hash)

`#home` `#library` `#library/upgrade` `#builder` `#tradein` `#qc` `#bottleneck` `#versus` `#account` `#account/community`

The back button, deep links and the Ctrl/Cmd + K palette all use the same navigate function.

## How the pieces fit

- **Keep-alive:** a module mounts the first time it is opened and is only hidden afterwards, so a half-finished
  preset, comparison or analyzer setup survives tab switches.
- **One set of chrome:** each module still renders its own header and footer so it works standalone. The shell hides
  them (`Chromeless`) and moves sticky offsets below its own bars.
- **Global role:** the role menu in the navbar (B2C, B2B, B2S) drives the home greeting, the "Recommended" cards,
  the notifications and `AccountDashboard` (controlled through `role` and `onRoleChange`).
- **Hand-offs:** Library cards open the Upgrade Analyzer, the analyzer links to the Bottleneck Analyzer, and the
  Account dashboard links to the Preset Builder and Trade-In portal.

## Props

| Component | Props |
| --- | --- |
| `ViciTechApp` | `components` (override any of `catalog, upgrade, builder, tradein, qc, bottleneck, versus, account, community`), `initialRole`, `onSignOut` |
| `HardwareLibrary` | `onOpenBuilder(items)`, `onCheckUpgrade(deviceId)` |
| `UpgradeAnalyzer` | `deviceId`, `onDeviceChange(id)`, `onNavigate(moduleId)` |
| `BottleneckAnalyzer` | `onSwapToPreset(parts)` |
| `VersusArena` | `onDeployToPreset(item)`, `onRequestQuote(item)` |
| `AccountDashboard` | `role`, `onRoleChange(role)`, `initialRole`, `onNavigate`, `onReconfigure(preset)`, `onSignOut` |

Lazy loading: `<ViciTechApp components={{ qc: dynamic(() => import("./modules/IotQcEngine")) }} />`.

## Still to wire to a real backend

- MQTT transport and device provisioning (ESP32 devices can post through the token-protected telemetry
  endpoint; admin-generated simulation payloads are persisted and clearly identified).
- Preset Builder does not yet receive parts from the Bottleneck Analyzer, Versus Arena or Library. Those hand-offs
  only navigate to it and show a message.
- Quote requests, API key storage, trade-in offers and community posts live in component state.
- Prices, specs, scores and account data are samples. Check specs against datasheets before relying on them.

## What was tested

The compiled app ran in headless Chromium (Playwright) without Tailwind CSS: all eight tabs, state kept across tab
switches, the Library to Upgrade Analyzer to Bottleneck chain, the global role switch, the command palette, hash
deep links and the back button, the QC lookup, the Versus verdict, API key generation, and the mobile drawer. 36 checks
passed with no console errors or warnings. Visual styling was not inspected.
