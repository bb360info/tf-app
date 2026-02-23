# Track 4.19: Coach-Athlete Interaction & Notifications

> Merged from Track 4.17 (Coach-Athlete) + Track 4.18 (Push Notifications).
> Analysis: 12 skills applied, 13 gaps found and fixed, 7 ADRs documented.
> Architecture review: [CS] — 3 critical fixes (non-blocking delivery, Custom Domain, batch push).

---

## Phase 1: Foundation & Quick Wins (~2 дня)
**Skills:** `/auto-skills` → `always` + `architecture` + `database-architect` + `typescript-expert`

- [x] Fix: `notifications.ts` — все queries через `pb.filter()` → Verify: `grep -rn 'userId' notifications.ts` = 0 string interpolation
- [x] PB: `day_notes` (json, nullable) в `training_plans` → Verify: PB Admin показывает поле
- [x] PB: `push_subscriptions` + `idx_push_subs_user` + API rules (`user_id = @request.auth.id`) → Verify: MCP view_collection
- [x] PB: `notification_preferences` (UNIQUE user_id, IANA timezone) → Verify: MCP view_collection
- [x] PB: `notifications` += `priority` (select: normal|urgent), `expires_at` (datetime), `delivered` (bool, default false) → Verify: MCP view_collection
- [x] PB: `idx_logex_log ON log_exercises(log_id)` — уже существовала (skip)
- [x] PB: `idx_notif_prefs_tz_enabled ON notification_preferences(timezone, push_enabled)` — для Cron → Verify: index exists
- [x] PB: `idx_notifications_expires ON notifications(expires_at)` — для TTL cleanup → Verify: index exists
- [x] PB: `idx_notifications_delivered ON notifications(delivered)` — для batch delivery Cron → Verify: index exists
- [x] Types: `TrainingPlansRecord` += `day_notes`; `NotificationsRecord` += `priority`, `expires_at`, `delivered`
- [x] Types: `NotificationType` → 8 типов (+`low_readiness`, `coach_note`, `invite_accepted`, `competition_upcoming`)
- [x] Types: New interfaces `PushSubscriptionsRecord`, `NotificationPreferencesRecord`
- [x] Zod: `PushSubscriptionSchema`, `NotificationPreferencesSchema` → Verify: `pnpm type-check`
- [x] UI: Today's Plan на AthleteDashboard + `getNextCompetition()` в peaking.ts
- [x] UI: CompetitionCountdown компонент (глассморфизм)
- ~~[ ] UI: Adaptation Banner~~ (SKIP — не нужно в Phase 1)
- [x] i18n: competition + daysUntil ×3 locales → Verify: `pnpm type-check` + `pnpm build` = Exit 0

## Phase 2: Coach Notes & Log Visibility (~3 дня)
**Skills:** `/auto-skills` → `always` + `frontend` + `ui_design` + `testing`
**UI tasks:** run `/ui-work` workflow before any component work
**Order:** TDD — test BEFORE service (Red → Green → Refactor)

- [x] **Test FIRST:** `compliance.test.ts` (RED) — 11 тестов: 0%, 60%, 100%, AM/PM, dedup, cap, comparison 4 статуса → Verify: тесты FAIL перед сервисом
- [x] Service: `calculateWeeklyCompliance()` + `getExerciseComparison()` (pure functions, no PB) → Verify: 11/11 тестов GREEN
- [x] UI: DayColumn += textarea (dayNote prop, 500 chars max, MessageSquare toggle, glassmorphism)
- [x] State: WeekConstructor dayNotes `Record<string,string>`, init from `plan.day_notes ?? {}`, save via `updatePlan()`, pass to DayColumn
- [x] i18n: `training.dayNote` + `training.dayNotePlaceholder` ×3 locales → Verify: `pnpm type-check` + `pnpm build` + `pnpm test` = Exit 0
- [x] UI: AthleteTrainingView += баннер заметки тренера — `DayCard.dayNote` glassmorphism block с MessageSquare icon
- [x] UI: `CoachLogViewer` (Plan vs Fact) — desktop table + mobile cards, 4 статуса, compliance chip сверху
- [x] UI: CI badge в `AthleteCard` — `weekCompliance` prop + TrendingUp badge data-level (high/medium/low)
- [x] i18n: `coachLog` namespace ×3 + `dashboard.compliance` ×3 → Verify: `pnpm type-check` + `pnpm build` = Exit 0
- [x] UI: `CoachLogViewerLazy` → `AthleteDetailClient` (Training tab) via `next/dynamic` + data load (plan + logs + weekStart compliance) → Verify: `pnpm type-check` + `pnpm build` = Exit 0

## Phase 3: Non-Blocking Hooks & CF Worker (~3 дня)
**Skills:** `/auto-skills` → `always` + `architecture` + `api-design-principles` + `api-security-best-practices`

**Pre-requisites (before coding):**
- [x] Generate VAPID keys: `npx web-push generate-vapid-keys` → saved to `.env.local` + CF Worker secrets → Verify: keys exist
- [x] CF Worker Custom Domain: `push.jumpedia.app` → CF Workers Domain API → Verify: `curl https://push.jumpedia.app/health` = 200 ✅
- [x] CF Worker: deployed `push-service` (wrangler 4.67.0), `web-push` NPM, shared secret + `/push-batch` → Verify: no-secret = 401 ✅, with-secret = `{results:[]}` ✅

**Hooks (all non-blocking — only INSERT into notifications):**
- [x] Hook: `onAfterCreate('daily_checkins')` (score<50) → INSERT notification (delivered=false) + check prefs/disabled_types → `pb_hooks/notifications.pb.js`
- [x] Hook: `onAfterUpdate('training_plans')` (status→published) → resolve plan_assignments → batch INSERT notifs per athlete → `pb_hooks/notifications.pb.js`
- [x] Hook: `onAfterCreate('achievements')` → INSERT coach notification → `pb_hooks/notifications.pb.js`

**Delivery Cron (separate from hooks):**
- [x] Cron: `push-delivery.pb.js` (every 60s) → SELECT undelivered LIMIT 50 → check quiet_hours/disabled_types → batch `$http.send()` to CF Worker → mark delivered=true
- [x] Cron: Stale subscription cleanup → Worker returns 410 → delete push_subscription from PB
- [x] Cron: Error logging → non-200/non-410 CF Worker responses → `error_logs` collection

**Other hooks:**
- [x] Endpoint: `/api/custom/mark-all-read` → batch SQL UPDATE via `$app.db().newQuery()` O(1) → `pb_hooks/mark-all-read.pb.js`
- [x] Cron: cleanup expired notifications (weekly Monday 03:00) + tz-aware checkin reminders (hourly, 8am local) → `pb_hooks/cron.pb.js`

## Phase 4: Client Push & Fallback (~2 дня)
**Skills:** `/auto-skills` → `always` + `pwa_offline` (`mobile-developer`) + `error-handling-patterns`

- [x] SW: `push` event handler + `seenPushIds: Set<string>` dedup → `clients.matchAll()` foreground check → `postMessage` или system push → `src/app/sw.ts`
- [x] SW: `notificationclick` → `clients.openWindow(data.link)` + focus existing → `src/app/sw.ts`
- [x] `usePushSubscription` hook → subscribe/unsubscribe/decline + 30d grace period → `src/lib/hooks/usePushSubscription.ts`
- [x] `PushPermissionPrompt` (smart timing: visitCount >= 3 в SessionStorage) → `src/components/notifications/PushPermissionPrompt.tsx`
- [x] iOS A2HS prompt (Share/Plus/Bell иконки, Lucide) → показывается ПЕРЕД push prompt на iOS Safari non-standalone
- [x] SSE: `useNotifications` hook → `pb.collection.subscribe()` + exponential backoff 1s→max 60s + `navigator.onLine` reconnect
- [x] BG Sync: 15min polling → `china_mode` localStorage key → `useNotifications.ts`
- [x] SSE/BG Sync dedup: `seenIds: Set<string>` общий + SW postMessage `NOTIFICATION_RECEIVED` + `SW_UPDATED` restart

## Phase 5: Notification Center & Activity Feed (~2 дня)
**Skills:** `/auto-skills` → `always` + `frontend` + `ui_design` + `web-performance-optimization`
**UI tasks:** run `/ui-work` workflow before any component work

- [x] PB: `idx_logs_coach_created` — уже существует как `idx_logs_coach_date (athlete_id, date)` ✅
- [x] UI: `ActivityFeed.tsx` (shimmer skeleton, content-visibility:auto CLS fix, glassmorphism items) — `/ui-work` ✔️
- [x] UI: `NotificationBell` → `getList(1,20)` пагинация + totalItems badge + `reportError()` + "Show all" → `/notifications` — `/ui-work` ✔️
- [x] UI: `/[locale]/notifications` — type filter chips (tablist ARIA), markRead per item, `content-visibility:auto` — `/ui-work` ✔️
- [x] UI: `NotificationPreferences.tsx` (toggle ARIA role=switch, debounce 500ms, quiet hours + IANA TZ, upsert getOrCreate) — `/ui-work` ✔️
- [x] i18n: `notifications` namespace (9 types + quietHours + push/email) ×3 locales RU+EN+CN ✅

## Phase 6: Compliance & Polish (~1 день)
**Skills:** `/auto-skills` → `always` + `i18n-localization` + `wcag-audit-patterns` + `lint-and-validate`

- [x] QA: i18n completeness ×3 → Verify: no missing key errors
- [x] QA: DS compliance (tokens, glass, dark) → Verify: visual check light+dark
- [x] QA: ARIA + a11y → Verify: keyboard nav on notification center
- [x] ESLint: 0 errors (исправлены PushPermissionPrompt setState→single state, useNotifications recursive callback) ✅
- [x] WCAG a11y: `NotificationPreferences` inputs id+htmlFor (Level A) ✅
- [x] WCAG a11y: `PushPermissionPrompt` aria-live assertive error state (WCAG 4.1.3) ✅
- [x] CSS: `prefers-reduced-motion` ×3 CSS (shimmer + slideUp animations) ✅
- [x] i18n: invite_accepted + competition_upcoming ×3 locales ✅
- [x] `china-audit.sh` → Exit 0, PASS ✅
- [x] `pnpm type-check` → Exit 0 ✅
- [x] `pnpm build` → Exit 0 ✅
- [x] `pnpm test` → Verify: all Exit 0
- [x] Update: CHANGELOG.md, tracks.md → 4.19 ✅ Done
