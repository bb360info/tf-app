# Энциклопедия Прыгуна v2 — Agent Rules

## Architecture (DO NOT DEVIATE)
- **Frontend**: Next.js 15 App Router, Static Export (`output: 'export'`), TypeScript
- **Backend**: PocketBase (self-hosted, Hong Kong VPS)
- **Storage**: Cloudflare R2 via PocketBase S3 adapter
- **Offline**: IndexedDB (Dexie.js) + Smart Sync protocol
- **PWA**: Serwist (NOT next-pwa, it's deprecated)
- **i18n**: next-intl, 3 languages: RU, EN, CN
- **Validation**: Zod for all PocketBase collections
- **Video**: FFmpeg WASM (client-side compression) + MediaPipe Pose

## Key Constraints
- 🇨🇳 **China access required**: NO external CDN, NO Google Fonts via CDN, NO analytics scripts. Self-host everything.
- Google OAuth2 works only with VPN in China — Email auth is primary for CN users
- All fonts must be self-hosted in `/public/fonts/`
- PocketBase has 21 collections — see `docs/ARCHITECTURE.md` for full schema
- Static Export means NO server-side rendering, NO API routes in Next.js

## Design System
- **Style**: Athletic Minimal + Glassmorphism
- **Approach**: Mobile-first, touch-first
- **Fonts**: Inter (body) + Plus Jakarta Sans (display) + JetBrains Mono (data) — ALL self-hosted
- **Icons**: Lucide React only — NO emojis as UI icons
- **Read**: `docs/DESIGN_SYSTEM.md` before ANY UI work

## Project Structure
```
src/
  app/[locale]/        ← next-intl routing (ru/en/cn)
  components/          ← React components
  lib/
    pocketbase/        ← PocketBase SDK + collections types
    validation/        ← Zod schemas (every collection)
    readiness/         ← Readiness score (0-100)
    autofill/          ← Phase-Aware Auto-Fill + CNS checker
    mediapipe/         ← Pose Landmarker wrapper
    video/             ← FFmpeg WASM compression
    telemetry/         ← Error reporter → error_logs
    i18n/              ← Translation files
conductor/             ← Track-based task management
```

## Execution Rules
1. **Follow Conductor tracks** — see `conductor/tracks.md` for current status
2. **Never start Track N+1** until Gate N is passed (all checkboxes in `conductor/tracks/track-N/gate.md`)
3. **New feature ideas** → add to `conductor/backlog.md`, do NOT implement mid-track
4. **1 commit = 1 task** — don't mix unrelated changes

## Commands
```bash
pnpm dev          # Local dev server
pnpm build        # Static export to out/
pnpm test         # Vitest
pnpm type-check   # tsc --noEmit
pnpm lint         # ESLint
```

## Detailed Docs (read when relevant)
- `docs/ARCHITECTURE.md` — Full PocketBase schema (21 collections), indexes, API rules, sync protocol
- `docs/DESIGN_SYSTEM.md` — **READ BEFORE ANY UI WORK.** Design tokens, glassmorphism, mobile-first, accessibility, China rules
- `docs/SECURITY.md` — Auth flow, security headers, CORS, rate limiting
- `docs/PERIODIZATION.md` — Training system: seasons, phases, plans, readiness
- `conductor/tracks.md` — Current track status and gates
- `conductor/backlog.md` — Feature ideas waiting for future tracks
