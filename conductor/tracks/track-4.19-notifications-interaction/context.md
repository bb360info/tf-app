# Track 4.19: Unified Coach-Athlete Interaction & Notification Engine

## Origin
Merge of Track 4.17 (Coach-Athlete Interaction) + Track 4.18 (Push Notifications).
Deprecated sources preserved at:
- `conductor/tracks/track-4.17-deprecated-source/`
- `conductor/tracks/track-4.18-deprecated-source/`

## Analysis
Full merge analysis with 12 skills + architecture review (CS agent). Key documents:
- `gate.md` — 6 phases, ~55 tasks with Verify criteria and skill annotations
- `implementation_plan.md` — full technical plan (DB, Types, Services, Components, Hooks, CF Worker, PWA)
- `architecture_improvement_report.md` — deep review: 3 critical issues fixed, 4 medium improvements applied

## Architecture Summary (v2 — corrected)
```
PB Hook (onAfter*) → INSERT notification (delivered=false) → return 200 (non-blocking)
                          ↓
    ┌─── SSE Realtime → instant in-app bell update (foreground)
    │
    ├─── PB Cron (60s) → batch SELECT undelivered → $http.send() → CF Worker
    │       ↓                                           ↓
    │    mark delivered=true                    Web Push VAPID → all devices
    │    delete stale subs (410 Gone)
    │
    └─── BG Sync (15min polling) → China fallback (VAPID blocked by GFW)
```

### v1 → v2 Changes (Architecture Review Fixes)
1. **Non-blocking delivery:** Hooks only write to DB, Cron delivers push (was: blocking `$http.send()` in hook)
2. **Custom Domain:** `push.jumpedia.app` instead of `*.workers.dev` (GFW blocks `*.workers.dev`)
3. **Batch push:** Single HTTP to CF Worker per Cron cycle, not 1 per notification
4. **SW dedup:** `clients.matchAll()` check — skip system push if app visible (SSE handles it)
5. **New field:** `notifications.delivered` (bool) for Cron tracking
6. **3 new indexes:** `idx_notif_prefs_tz_enabled`, `idx_notifications_expires`, `idx_notifications_delivered`

**Key decisions (7 ADRs):**
1. JS pb_hooks + CF Worker — не трогаем PB binary
2. day_notes as JSON field — YAGNI
3. Compliance as client-side service — хватит для 50 юзеров
4. CF Worker auth — shared secret + rate limiting
5. IANA timezone for cron — DST-aware
6. Non-blocking Cron delivery — не блокирует UX, batch-отправка, retry-safe
7. Custom Domain for CF Worker — GFW-safe, бесплатно

## China Strategy
- Web Push VAPID blocked in mainland → BG Sync 15min polling
- CF Worker on **Custom Domain** `push.jumpedia.app` (NOT `.workers.dev` — blocked!)
- iOS requires installed PWA → A2HS prompt in Phase 4
- SSE works in China for foreground (PB Realtime over WebSocket)

## Known Bugs to Fix (Phase 1)
- **SQL injection** in `notifications.ts` — string interpolation → `pb.filter()` (4 locations)
- **N+1 markAllRead** — individual updates → custom batch endpoint `/api/custom/mark-all-read`
- **getFullList for notifications** → `getList(1, 20)` with pagination
- **Error swallowing** in NotificationBell — `catch {}` → `reportError()`
- **SSE reconnect** — no auto-reconnect → add exponential backoff
- **Stale push subscriptions** — 410 Gone not handled → auto-delete via Cron

## Environment Variables Needed
```env
VAPID_PUBLIC_KEY=...          # npx web-push generate-vapid-keys (Phase 3)
VAPID_PRIVATE_KEY=...         # npx web-push generate-vapid-keys (Phase 3)
VAPID_SUBJECT=mailto:admin@jumpedia.app
PUSH_WORKER_URL=https://push.jumpedia.app   # Custom Domain — NOT .workers.dev!
PUSH_WORKER_SECRET=...        # Random 32 chars
```

---

## For Next Agent

### Quick Start
1. Run `/switch-agent` to see current status
2. Read `gate.md` — start with Phase 1
3. Run `/auto-skills` — it will pick the right skills for each phase
4. **Phase 1 priority:** Fix SQL injection in `notifications.ts` FIRST (4 locations using string interpolation)
5. **Phase 2 rule:** TDD — write `compliance.test.ts` BEFORE `compliance.ts`
6. **Phase 3 pre-req:** Generate VAPID keys + set up CF Worker Custom Domain BEFORE writing hooks
7. **Before ANY UI work:** Run `/ui-work` workflow (reads DESIGN_SYSTEM.md + loads 3 skills)

### Architecture key points
- **Hooks are NON-BLOCKING:** they only INSERT into `notifications` table (no `$http.send()`)
- **Cron handles push delivery:** batch every 60s, single HTTP to CF Worker
- **SSE gives instant in-app updates:** PocketBase Realtime (already works)
- **CF Worker domain:** `push.jumpedia.app` (Custom Domain, GFW-safe, free)
- **SW dedup:** `clients.matchAll()` — if app visible, skip system push

### Skills per phase
| Phase | `/auto-skills` groups |
|---|---|
| 1 | `always` + `architecture` + `typescript` |
| 2 | `always` + `frontend` + `ui_design` + `testing` |
| 3 | `always` + `architecture` + `api` + `auth_security` |
| 4 | `always` + `pwa_offline` + `errors` |
| 5 | `always` + `frontend` + `ui_design` + `performance` |
| 6 | `always` + `i18n` + `accessibility` |

### Mandatory workflows
- `/ui-work` — before ALL UI/component/CSS tasks (Phases 1, 2, 4, 5)
- `/auto-skills` — before starting each phase

### Verification before completion
```bash
pnpm type-check && pnpm build && pnpm test
```
All must exit 0 before marking any phase done.
