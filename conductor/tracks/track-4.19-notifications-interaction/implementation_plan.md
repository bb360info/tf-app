# Implementation Plan: Track 4.19 — Coach-Athlete Interaction & Notifications

> Merged: Track 4.17 (Coach-Athlete) + Track 4.18 (Push Notifications)
> Skills used for analysis: `brainstorming`, `architecture`, `architect-review`, `database-architect`, `kaizen`, `plan-writing`, `mobile-developer`, `api-design-principles`, `api-security-best-practices`, `error-handling-patterns`, `test-driven-development`
> Architecture review: [CS] Claude Sonnet 4.6 — 3 critical fixes applied (non-blocking delivery, Custom Domain, batch push)

---

## Architecture: Non-Blocking Hybrid Push

```
[PB Hook: onAfterCreate/Update]
    ↓
  creates notification record (delivered=false)
    ↓ (non-blocking — user gets 200 OK immediately)
  
  ┌─ SSE Realtime → in-app bell update (instant, foreground)
  │
  ├─ PB Cron (every 60s) → batch collect undelivered notifications
  │    ↓
  │    $http.send() → CF Worker (push.jumpedia.app, Custom Domain)
  │    ↓
  │    CF Worker → Web Push VAPID → all device subscriptions
  │    ↓
  │    Mark delivered=true / Delete stale subs (410 Gone)
  │
  └─ BG Sync (15min polling) → China fallback (VAPID blocked by GFW)
```

### Key Difference from v1 Plan
Previous plan had **blocking** `$http.send()` inside hooks (user waits 1-3s per notification). Now hooks only write to DB → Cron handles delivery asynchronously. SSE gives instant in-app updates anyway.

## ADR Summary

| # | Decision | Chosen | Alternative | Rationale |
|---|---|---|---|---|
| ADR-1 | Backend notification engine | JS pb_hooks + CF Worker | Custom Go PB build | Don't modify PB core; CF Worker = free tier |
| ADR-2 | Coach Notes storage | `day_notes` JSON in training_plans | Separate collection | YAGNI — simpler for MVP |
| ADR-3 | Compliance calculation | Client-side service | PB SQL view | Sufficient for ~50 users |
| ADR-4 | CF Worker auth | Shared secret (Authorization header) | IP whitelist | Simpler, works across regions |
| ADR-5 | Timezone format | IANA (`Europe/Moscow`) | UTC offset (`UTC+3`) | DST-aware, `Intl.DateTimeFormat` native |
| ADR-6 | Push delivery model | Non-blocking Cron (60s batch) | Blocking $http.send() in hook | Doesn't degrade UX; batch = fewer HTTP calls; retry-safe |
| ADR-7 | CF Worker domain | Custom Domain (`push.jumpedia.app`) | `*.workers.dev` | GFW blocks `*.workers.dev`; custom domain works in China |

---

## User Review Required

> [!IMPORTANT]
> **VAPID Keys:** Generate at start of Phase 3. Store in VPS `.env`:
> ```
> VAPID_PUBLIC_KEY=...          # npx web-push generate-vapid-keys
> VAPID_PRIVATE_KEY=...
> VAPID_SUBJECT=mailto:admin@jumpedia.app
> PUSH_WORKER_URL=https://push.jumpedia.app   # Custom Domain, NOT .workers.dev!
> PUSH_WORKER_SECRET=<random-32-chars>
> ```

> [!WARNING]
> **CF Worker Custom Domain Setup (Phase 3, pre-requisite):**
> 1. In Cloudflare Dashboard → Workers → push-service → Settings → Custom Domains
> 2. Add `push.jumpedia.app`
> 3. Cloudflare auto-creates DNS CNAME record
> 4. Verify: `curl https://push.jumpedia.app/health` → 200
> This is **FREE** and required for China push delivery.

---

## Proposed Changes

### Database Layer

**New collections:**
- `push_subscriptions` (user_id FK, endpoint, p256dh, auth_key, user_agent, created)
- `notification_preferences` (user_id FK UNIQUE, push_enabled, disabled_types JSON, quiet_hours_start, quiet_hours_end, timezone IANA)

**Modified collections:**
- `training_plans` += `day_notes` (JSON, nullable)
- `notifications` += `priority` (select: normal|urgent), `expires_at` (date), `delivered` (bool, default false)

**New indexes:**
- `idx_push_subs_user ON push_subscriptions(user_id)`
- `idx_logex_log ON log_exercises(log_id)` — compliance queries
- `idx_logs_coach_created ON training_logs(athlete_id, created DESC)` — activity feed
- `idx_notif_prefs_tz_enabled ON notification_preferences(timezone, push_enabled)` — Cron timezone lookups
- `idx_notifications_expires ON notifications(expires_at)` — TTL cleanup
- `idx_notifications_delivered ON notifications(delivered, created)` — Cron batch delivery

**API Rules:**

| Collection | List/View | Create | Update | Delete |
|---|---|---|---|---|
| `notifications` | `user_id = @request.auth.id` | **null** (hook only!) | `user_id = @request.auth.id` | — |
| `push_subscriptions` | `user_id = @request.auth.id` | auth required | `user_id = @request.auth.id` | `user_id = @request.auth.id` |
| `notification_preferences` | `user_id = @request.auth.id` | auth required | `user_id = @request.auth.id` | — |

---

### TypeScript Changes

**[MODIFY] `src/lib/pocketbase/types.ts`**
- `TrainingPlansRecord` += `day_notes?: Record<string, string>`
- `NotificationsRecord` += `priority?: 'normal' | 'urgent'`, `expires_at?: string`, `delivered?: boolean`
- `NotificationType` expanded to 8: +`low_readiness`, `coach_note`, `invite_accepted`, `competition_upcoming`
- New: `PushSubscriptionsRecord`, `NotificationPreferencesRecord`

**[MODIFY] `src/lib/pocketbase/services/notifications.ts`**
- Fix SQL injection: `pb.filter()` instead of string interpolation (4 locations)
- `listAll` → `getList(1, 20)` with pagination
- Add `listPaginated(userId, page, perPage)`
- Add error logging via `reportError()` instead of silent catch

**[NEW] `src/lib/pocketbase/services/compliance.ts`**
- `getWeeklyCompliance(athleteId, planId, weekStart)` — session-aware (AM/PM)
- `getExerciseComparison(planId, logId)` → `Array<{exercise, planned, actual, status}>`

**[MODIFY] `src/lib/pocketbase/services/peaking.ts`**
- `getNextCompetition(seasonId)` for CompetitionCountdown

**[NEW] `src/lib/validation/push.ts`**
- `PushSubscriptionSchema`, `NotificationPreferencesSchema` (Zod)

---

### Components (all require `/ui-work` workflow)

| Component | Phase | Type |
|---|---|---|
| CompetitionCountdown | 1 | NEW |
| AdaptationBanner | 1 | NEW |
| DayColumn (coach notes) | 2 | MODIFY |
| WeekConstructor (dayNotes state) | 2 | MODIFY |
| AthleteTrainingView (note banner) | 2 | MODIFY |
| CoachLogViewer | 2 | NEW |
| AthleteCard (compliance badge) | 2 | MODIFY |
| PushPermissionPrompt | 4 | NEW |
| iOS A2HS Prompt | 4 | NEW |
| ActivityFeed | 5 | NEW |
| NotificationBell (pagination + error logging) | 5 | MODIFY |
| `/[locale]/notifications` page | 5 | NEW |
| Notification Preferences | 5 | NEW |

---

### Backend (pb_hooks)

**[NEW] `pb_hooks/notifications.pb.js`**
- `onAfterCreate('daily_checkins')` — low readiness alert → INSERT notification (delivered=false)
- `onAfterUpdate('training_plans')` — plan published → batch INSERT notifications for all assigned athletes
- `onAfterCreate('achievements')` — coach notification → INSERT notification
- **All hooks are non-blocking:** they only write to `notifications` table, no `$http.send()`

**[NEW] `pb_hooks/push-delivery.pb.js`**
- Cron (every 60s): SELECT notifications WHERE delivered=false → batch payload → single `$http.send()` to CF Worker
- CF Worker response: 200 → mark delivered=true; 410 Gone → delete stale push_subscription
- Non-200/non-410 responses → log to `error_logs` collection
- Rate: ~3 notifications/minute max at 50 users → 1 HTTP call per minute to CF Worker

**[NEW] `pb_hooks/cron.pb.js`**
- Weekly cleanup of expired notifications (`expires_at < now`)
- Daily timezone-aware checkin reminders (uses `idx_notif_prefs_tz_enabled` index)

**[NEW] `pb_hooks/mark-all-read.pb.js`**
- Custom endpoint `/api/custom/mark-all-read` (batch SQL via `dbx.Params`)

---

### Serverless (Cloudflare Worker)

**[NEW] CF Worker: push-service**
- **Domain:** `push.jumpedia.app` (Custom Domain, NOT `.workers.dev`)
- `web-push` NPM package
- Shared secret auth (`PUSH_WORKER_SECRET`)
- **Batch endpoint:** accepts array of notifications with subscriptions
- Rate limiting (10 req/sec per IP, in-memory Map)
- Returns per-subscription status: 200 (sent) / 410 (stale) / 500 (error)

```
POST https://push.jumpedia.app/push-batch
Authorization: Bearer <PUSH_WORKER_SECRET>
Content-Type: application/json

{
  "notifications": [
    {
      "payload": { "title": "...", "body": "...", "link": "/..." },
      "subscriptions": [
        { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } }
      ]
    }
  ]
}
```

---

### PWA / Service Worker

**[MODIFY] Service Worker (Serwist)**
- `push` event handler with **foreground dedup:**
  ```javascript
  self.addEventListener('push', async (event) => {
    const data = event.data?.json();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const isVisible = clients.some(c => c.visibilityState === 'visible');
    
    if (isVisible) {
      // SSE already delivered → update badge via postMessage, skip system push
      clients.forEach(c => c.postMessage({ type: 'NOTIFICATION_RECEIVED', ...data }));
      return;
    }
    
    // App in background → show system notification
    event.waitUntil(self.registration.showNotification(data.title, { ... }));
  });
  ```
- `notificationclick` → navigate to notification link

**[NEW] `src/lib/hooks/usePushSubscription.ts`**
- Subscribe/unsubscribe → save to PB push_subscriptions
- Handle permission denied gracefully

---

## Skills Per Phase

| Phase | `/auto-skills` groups | Additional workflows |
|---|---|---|
| 1: Foundation | `always` + `architecture` + `typescript` | — |
| 2: Coach Notes | `always` + `frontend` + `ui_design` + `testing` | **`/ui-work`** for all UI tasks |
| 3: JS Hooks + CF Worker | `always` + `architecture` + `api` + `auth_security` | CF Worker Custom Domain setup |
| 4: Client Push | `always` + `pwa_offline` + `errors` | **`/ui-work`** for prompts |
| 5: UI Center | `always` + `frontend` + `ui_design` + `performance` | **`/ui-work`** for all UI tasks |
| 6: Polish | `always` + `i18n` + `accessibility` + `testing` | — |

---

## Verification Plan

### Automated
- `pnpm type-check` — Exit 0
- `pnpm build` — Exit 0
- `pnpm test` — compliance.test.ts passes
- `china-audit.sh` — Exit 0

### Manual
- SQL injection grep: `grep -rn 'userId' notifications.ts` = 0 string interpolation
- CF Worker on Custom Domain: `curl https://push.jumpedia.app/health` → 200
- CF Worker auth: `curl https://push.jumpedia.app/push-batch` without secret → 401
- Push flow: create checkin with score<50 → notification appears within 60s
- iOS: A2HS prompt shows on Safari
- SSE: real-time bell update when notification created (instant, without waiting for Cron)
- China fallback: disable VAPID → BG Sync delivers notifications via polling
- Multi-device: 2 browsers subscribed → both get push
- SW dedup: with app visible → no system push (SSE handles it)
- Batch push: publish plan for group → single HTTP to CF Worker, all athletes notified
