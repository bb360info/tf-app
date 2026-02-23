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

## Language Policy
- **Communication**: All agents MUST communicate with the USER in **Russian**.
- **Artifacts**: All `implementation_plan.md` and `walkthrough.md` artifacts MUST be written in **Russian**.
- **Documentation**: Technical documentation, code comments, and architecture docs REMAIN in **English**.

## Key Constraints
- 🇨🇳 **China access required**: NO external CDN, NO Google Fonts via CDN, NO analytics scripts. Self-host everything.
- Google OAuth2 works only with VPN in China — Email auth is primary for CN users
- All fonts must be self-hosted in `/public/fonts/`
- PocketBase has 21 collections — see `docs/ARCHITECTURE.md` for full schema
- Static Export means NO server-side rendering, NO API routes in Next.js

## PocketBase Admin Access
- **Admin Panel URL:** `https://jumpedia.app/_/`
- **Credentials:** stored in `.env.local` as `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD`
- **When needed:** schema changes (add fields, collections), cascade delete rules, index creation
- **How to authenticate via API** (for scripts/agents):
  ```bash
  # Get admin token (PocketBase v0.23+ uses _superusers, not /api/admins/)
  TOKEN=$(curl -s -X POST https://jumpedia.app/api/collections/_superusers/auth-with-password \
    -H "Content-Type: application/json" \
    -d "{\"identity\":\"$PB_ADMIN_EMAIL\",\"password\":\"$PB_ADMIN_PASSWORD\"}" | jq -r '.token')
  
  # Use token for schema changes
  curl -X PATCH https://jumpedia.app/api/collections/seasons \
    -H "Authorization: $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{...schema patch...}'
  ```
- **Browser:** agents can use `browser_subagent` to open `https://jumpedia.app/_/` and log in with above credentials when API is insufficient

## Design System (MANDATORY — violation = defect)
- **Iron Law**: EVERY visual decision comes from `docs/DESIGN_SYSTEM.md` → `src/styles/tokens.css`
- **Auto-loaded**: `jumpedia-design-system` + `verification-before-completion` discipline skills (via `always` group)
- **Source of truth**: `src/styles/tokens.css` for CSS var names, `docs/DESIGN_SYSTEM.md` for guidelines
- **CSS**: Vanilla CSS with CSS Modules (`.module.css`) — **NO Tailwind, NEVER**
- **Style**: Athletic Minimal + Glassmorphism — `var(--glass-bg)`, `var(--glass-blur)` etc.
- **Icons**: Lucide React only — **NO emojis as UI icons**
- **Approach**: Mobile-first (375px base) + touch-first (44×44px min touch targets)
- **Fonts**: Inter (body) + Plus Jakarta Sans (display) + JetBrains Mono (data) — ALL self-hosted
- **Before UI work**: Run `/ui-work` workflow — reads DESIGN_SYSTEM.md + tokens.css + 3 skills
- **NEVER load skills**: `frontend-design` (breaks Inter), `tailwind-design-system` (wrong stack), `web-artifacts-builder`
- **Pre-delivery**: Pass all checklist items from `jumpedia-design-system` SKILL.md

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
5. **Update `CHANGELOG.md`** after completing a task — use Added/Changed/Fixed/Removed format
6. **Verification Iron Law**: NEVER claim "done", "fixed", "works" without running `pnpm test` / `pnpm build` / `pnpm type-check` and showing output
7. **Model self-identification**: When running `/switch-agent`, the FIRST line of the report MUST start with your model code in brackets: `[G1H]`, `[G1L]`, `[G3H]`, `[G3L]`, `[GF]`, `[CS]`, `[CO]`, or `[??]`. See model code table in `switch-agent.md` step 0.

## Track Artifacts (Обязательные)
Для каждого активного трека в `conductor/tracks/track-N-<slug>/` должны быть:
1. `gate.md` — чеклист задач (source of truth для статуса).
2. `context.md` — контекст задачи (что делаем, зачем, какие файлы затрагивает).
3. `implementation_plan.md` — технический план (пишет агент-планировщик/Thinking модель).
4. `walkthrough.md` — финальный отчёт о проделанной работе (пишет агент-исполнитель).
**Rule:** Следующий трек НЕ НАЧИНАЕТСЯ, пока все 4 файла не будут завершены.

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

## Available Workflows
- `/switch-agent` — **Run when starting new chat / switching agents** — reads current track gate, reports status and next task
- `/auto-skills` — Select skills for any task from project_skills.json
- `/ui-work` — Mandatory before any UI/CSS/component work
- `/qa` — Browser smoke test with `browser_subagent` before deploy
- `/review` — Code review checklist before commit (design tokens, i18n, lint)
- `/debt` — Tech debt scanner (`any` types, TODO/FIXME, long files)
- `/deploy` — Deploy static build to VPS via rsync
- `/dev` — Restart local Next.js dev server
