# PugBuild app

Worker app for PugBuild: tap to clock in, tap to clock out, see your week and your pay. Built with Expo (SDK 58), Expo Router, Reanimated 4 and React Query, talking to the PugBuild web API (`/api/v1`).

Branches follow the web repo: `main` is what ships, `development` is daily work.

## Run it on a phone (Expo Go)

1. Install **Expo Go** on the iPhone.
2. Point the app at an API. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`:
   - the development preview (seeded demo data, fixed login code `123456`), or
   - the Mac running the web app locally, using its LAN IP (`http://192.168.x.x:3002`) — `localhost` on the phone is the phone itself.
3. Start the dev server and scan the QR code with the camera:

```bash
pnpm install
pnpm start
```

`pnpm ios` opens the iOS Simulator instead (Expo Go is installed automatically).

Demo logins on the preview: worker **(978) 555-0111**, code **123456**. Rafael **(978) 555-0117** goes through the first-login consent screen.

If the preview deployment is protected by Vercel Authentication, either disable protection for previews (Vercel → Project → Settings → Deployment Protection) or generate a *Protection Bypass for Automation* secret and set it as `EXPO_PUBLIC_VERCEL_BYPASS` in `.env`; the client sends it as the `x-vercel-protection-bypass` header.

## What's inside

```
src/
  app/                 Expo Router screens
    _layout.tsx        fonts, providers, session gate (redirects by session state)
    login/             phone → 6-digit code (auto-submit, resend)
    welcome.tsx        first-login consent (terms, location, SMS)
    select-company.tsx when a phone belongs to more than one company
    (tabs)/            Clock · Week · Pay · Sites · Profile
  features/
    session/           session provider (cookie session probe via /api/v1/me), language switch
    worker/            home + working views, ring timer, nearby site, payment card, offline sync
  components/ui/       Outfit text, pill button, card, chip, sheet, toast, week strip, ring timer, tab bar
  components/brand/    the pug mark (react-native-svg)
  lib/
    api.ts             typed client; unwraps the { ok, data } envelope, maps errors, 15s timeout
    api-types.ts       DTO shapes from the web contract
    time.ts            lunch rule (same as the server, for the live counter)
    week-helpers.ts    week strip + day bars from the server's week payload
    offline-queue.ts   punches tapped without signal, replayed in order with a clientId
    format.ts          minutes, money, phones, dates
    i18n.ts            EN / PT / ES, same JSON messages as the web
  messages/            copies of the web's messages/{en,pt,es}/{common,auth,worker,nav,errors}.json
  theme/tokens.ts      colours, radii, fonts (mirrors the web's @theme)
scripts/make-icons.mjs renders icon/splash/favicon from the brand paths (uses sharp from ../pugbuild-web)
```

How it behaves:

- **Session**: the same `pb_session` cookie the web uses. The app probes `/api/v1/me` on launch; `unauthorized` → login, `consent_required` → welcome, otherwise the tabs.
- **Clock-in**: GPS is read while the Clock tab is open and sent with the punch. The nearest active site and distance are computed on the phone from `/api/v1/sites`; the server decides what gets recorded.
- **Timer**: the server's `clockIn.at` drives the ring; lunch is deducted the same way the server does it, so the number matches at clock-out.
- **Offline**: a punch that fails with a network error is queued in AsyncStorage (one per kind) and replayed when NetInfo reports the connection is back. Each punch carries a `clientId`, so a retry never doubles it.
- **Language**: picked on the login or profile screen, persisted on the device, independent of the account locale.

## Scripts

```bash
pnpm start        # dev server (QR code for Expo Go)
pnpm ios          # iOS Simulator
pnpm lint         # eslint (expo config)
pnpm typecheck    # tsc --noEmit
pnpm test         # jest: formatters, lunch rule, offline queue, week helpers, geo
pnpm check        # all three
pnpm doctor       # expo-doctor
pnpm icons        # regenerate assets/ from the brand mark
```

## Building for the stores

Native projects are generated on demand (`npx expo prebuild`), never committed. Bundle ids: `com.pugbuild.app` on both platforms. Use EAS (`npx eas-cli build`) when it's time to ship.
