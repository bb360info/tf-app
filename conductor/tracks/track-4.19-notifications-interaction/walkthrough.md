# Walkthrough: Track 4.19 — Notifications & Interaction (Phases 4–6)

> **Дата:** 2026-02-22  
> **Статус:** ✅ Завершено  
> **Верификация:** `pnpm lint` 0 errors · `pnpm type-check` Exit 0 · `pnpm build` Exit 0 · `china-audit.sh` PASS

---

## Phase 4: Push Notifications & Hooks

### Block E — `markAllRead` N+1 → O(1)

**Файл:** `src/lib/pocketbase/services/notifications.ts`

```diff
- // N+1: отдельный PATCH на каждую запись
+ // Один POST на кастомный endpoint
+ await fetch(`${pb.baseUrl}/api/custom/mark-all-read`, {
+     method: 'POST',
+     headers: { Authorization: pb.authStore.token },
+ });
```

`NotificationBell.tsx` — убраны аргументы из вызова `markAllRead()`.

---

### Block A — Service Worker Push Handler

**Файл:** `src/app/sw.ts`

| Фича | Реализация |
|------|-----------|
| Foreground dedup | `seenPushIds: Set<string>` + `clients.matchAll()` |
| Background OS notification | `registration.showNotification()` |
| `notificationclick` | Navigate to `data.link` или focus существующего окна |
| `SW_UPDATED` | `postMessage` всем клиентам при `activate` |

---

### Block B — `usePushSubscription` Hook

**Файл:** `src/lib/hooks/usePushSubscription.ts`

```typescript
type PushStatus = 'idle' | 'unsupported' | 'denied' | 'declined' | 'subscribed' | 'unsubscribed'
```

- Permission request → VAPID subscribe → save в PocketBase
- 30-дневный grace period при `decline()`
- Не показывает prompt при `denied` или активной подписке

---

### Block C — `useNotifications` Hook

**Файл:** `src/lib/hooks/useNotifications.ts`

| Механизм | Логика |
|---------|--------|
| SSE (PocketBase realtime) | Primary канал для real-time bell |
| Exponential backoff | 1s → 2s → 4s → ... → 60s при ошибках |
| `navigator.onLine` | Авто-переподключение SSE при восстановлении сети |
| BG Sync polling (15 мин) | Fallback для CN / нестабильных соединений |
| `seenIds: Set<string>` | Дедупликация между SSE и polling (BUG-6 fix) |
| `SW_UPDATED` message | Рестарт SSE при активации нового SW (BUG-1 fix) |

---

### Block D — `PushPermissionPrompt` Component

**Файлы:** `PushPermissionPrompt.tsx` + `.module.css`

- **iOS Safari** (non-standalone) → A2HS prompt (Share → Add to Home Screen)
- **Другие браузеры** → push permission после 3+ визитов
- Glassmorphism bottom sheet, mobile-first
- Никогда не показывает при `denied` / grace period / уже подписан

---

## Phase 5: Notification Center UI

### NotificationBell — Upgrade

**Файл:** `src/components/shared/NotificationBell.tsx`

- `getList(1, 20)` → `totalItems` badge (показывает реальное число)
- `reportError()` вместо silent catch
- Кнопка "Show all" → `/[locale]/notifications`

---

### ActivityFeed Component

**Файл:** `src/components/notifications/ActivityFeed.tsx` + CSS

- Shimmer skeleton (3 строки) пока данные загружаются
- `content-visibility: auto` + `containIntrinsicSize` (CLS fix)
- Glassmorphism items, относительное время (`2m`, `3h`, `1d`)
- Empty state с Lucide `Bell` icon

---

### /notifications Страница

**Файлы:** `src/app/[locale]/(protected)/notifications/`
- `page.tsx` — Server Component, i18n labels
- `NotificationsClientPage.tsx` — Client Component
- `NotificationsClientPage.module.css`

| Фича | Реализация |
|------|-----------|
| Type filter chips | `role="tablist"` + `role="tab"` ARIA, 9 типов |
| Mark-read per item | Оптимистичное UI обновление |
| `content-visibility: auto` | CLS оптимизация списка |
| Pagination | `getList(1, 50)` |

---

### NotificationPreferences Component

**Файлы:** `src/components/notifications/NotificationPreferences.tsx` + CSS

| Фича | Реализация |
|------|-----------|
| Push / Email toggles | `role="switch"` ARIA |
| Per-type toggles | 6 типов, оптимистичный UI + revert on error |
| Quiet Hours | `<input type="time">` с `id`+`htmlFor` (WCAG) |
| Timezone | IANA select, 10 common TZ |
| Debounce save | 500ms после последнего изменения |
| Skeleton | shimmer animation |
| Data service | `notificationPreferences.ts` — upsert getOrCreate |

---

### i18n — `notifications` namespace ×3

**Файлы:** `messages/{ru,en,cn}/common.json`

```json
{
  "notifications": {
    "title": "...",
    "types": {
      "all": "...", "plan_published": "...", "checkin_reminder": "...",
      "achievement": "...", "low_readiness": "...", "coach_note": "...",
      "invite_accepted": "...", "competition_upcoming": "...", "system": "..."
    },
    "quietHours": { "title": "...", "from": "...", "to": "...", "timezone": "..." },
    "push": { "enabled": "...", "disable": "..." },
    "email": { "enabled": "...", "disable": "..." }
  }
}
```

---

## Phase 6: Compliance & Polish

### ESLint — 2 ошибки исправлены

| Файл | Ошибка | Решение |
|------|--------|---------|
| `PushPermissionPrompt.tsx` | `setState×2` в effect | → single state `promptType: null\|'push'\|'ios_a2hs'` |
| `NotificationPreferences.tsx` | setState в `.finally()` | → explicit async IIFE + cancelled flag |

`pnpm lint` → **0 errors** ✅

---

### WCAG 2.2 AA — 3 исправления

| BUG | Критерий | Решение |
|-----|----------|---------|
| BUG-4 | 3.3.2 Labels (Level A) | `id`+`htmlFor` на time inputs и select в `NotificationPreferences` |
| BUG-5 | 4.1.3 Status Messages | `role="alert" aria-live="assertive"` для ошибки подписки в `PushPermissionPrompt` |
| BUG-8 | 2.2.2 Pause/Stop (Level A) | `@media (prefers-reduced-motion: reduce)` в 3 CSS файлах |

---

### china-audit.sh

```
✅ Self-hosted fonts: 14 woff2 files
✅ next.config clean
✅ PASS: No blocked external resources found.
   Platform is China-accessible.
```

---

## Итоговая верификация

```
pnpm lint       → 0 errors, 14 warnings   ✅
pnpm type-check → Exit 0                  ✅
pnpm build      → Exit 0 (Static Export)  ✅
china-audit.sh  → PASS                    ✅
```

---

## Созданные/изменённые файлы

| Файл | Действие |
|------|---------|
| `src/app/sw.ts` | MODIFY: push handler, notificationclick, SW_UPDATED |
| `src/lib/hooks/usePushSubscription.ts` | NEW |
| `src/lib/hooks/useNotifications.ts` | NEW |
| `src/lib/pocketbase/services/notifications.ts` | MODIFY: markAllRead O(1), listUnread→getList |
| `src/lib/pocketbase/services/notificationPreferences.ts` | NEW |
| `src/components/notifications/PushPermissionPrompt.tsx` | NEW |
| `src/components/notifications/PushPermissionPrompt.module.css` | NEW |
| `src/components/notifications/ActivityFeed.tsx` | NEW |
| `src/components/notifications/ActivityFeed.module.css` | NEW |
| `src/components/notifications/NotificationPreferences.tsx` | NEW |
| `src/components/notifications/NotificationPreferences.module.css` | NEW |
| `src/components/shared/NotificationBell.tsx` | MODIFY: pagination + reportError + "Show all" |
| `src/app/[locale]/(protected)/notifications/page.tsx` | NEW |
| `src/app/[locale]/(protected)/notifications/NotificationsClientPage.tsx` | NEW |
| `src/app/[locale]/(protected)/notifications/NotificationsClientPage.module.css` | NEW |
| `messages/{ru,en,cn}/common.json` | MODIFY: notifications namespace |
| `CHANGELOG.md` | MODIFY |
| `conductor/tracks/track-4.19-notifications-interaction/gate.md` | MODIFY: Phases 4-6 ✅ |
