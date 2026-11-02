# ViciTech: integrated app (Next.js, App Router)

One shell, seven modules, one URL hash per view. Everything runs on sample data.

## Folder layout

```
app/page.jsx                              renders <ViciTechApp />
components/vicitech/ViciTechApp.jsx       master shell (navbar, tabs, home, palette, footer, routing)
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
cd vicitech && npm i lucide-react
# copy app/page.jsx and components/ over the generated files
```

Tailwind must be v3.1 or newer (the shell uses arbitrary variants such as `[&>div>header]:hidden`).
Make sure `tailwind.config.js` scans the components:

```js
content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"]
```

`ViciTechApp.jsx` starts with `"use client"`, so every module it imports runs on the client.

## Supabase checkout

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`, enable the GitHub
provider in Supabase Authentication, and allow the app URL in Supabase's redirect URL settings. Register
Supabase's GitHub callback URL with the GitHub OAuth app. Run `supabase/schema.sql` to create/update the
orders table, including its JSONB build summary.

The Preset Builder hands the selected parts, pricing and specs to the shell-owned checkout modal. A user
must sign in with GitHub before an order is submitted; the pending build is retained across the OAuth
redirect. Supabase errors are shown in checkout rather than being reported as successful local orders.

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

- Supabase queries and the MQTT stream (the QC lookup, telemetry and status badges are simulated).
- Preset Builder does not yet receive parts from the Bottleneck Analyzer, Versus Arena or Library. Those hand-offs
  only navigate to it and show a message.
- Quote requests, API key storage, trade-in offers and community posts live in component state.
- Prices, specs, scores and account data are samples. Check specs against datasheets before relying on them.

## What was tested

The compiled app ran in headless Chromium (Playwright) without Tailwind CSS: all eight tabs, state kept across tab
switches, the Library to Upgrade Analyzer to Bottleneck chain, the global role switch, the command palette, hash
deep links and the back button, the QC lookup, the Versus verdict, API key generation, and the mobile drawer. 36 checks
passed with no console errors or warnings. Visual styling was not inspected.
