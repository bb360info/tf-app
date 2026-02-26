# Context — Track 4.23: Notification System & App Badge

## Что делаем

«Оживляем» систему уведомлений: unified notification service с message_key i18n pattern, preference enforcement, реальные триггеры для 3 из 8 типов. App icon badge для iOS/Desktop PWA. Попутно чиним SQL injection в planAssignments.ts и plans.ts.

## Зачем

1. **Спортсмен настраивает пустоту** — 8 типов уведомлений в Settings, но реально создаётся только `coach_note`
2. **Preferences не проверяются** — `sendCoachNote()` не уважает `disabled_types`
3. **i18n broken by design** — `message` хранится как raw text на языке отправителя → получатель с другой локалью видит чужой язык
4. **Badge на иконке** — отсутствует, хотя вся push-инфра есть
5. **SQL injection** — 4 raw string interpolations в planAssignments.ts, 3 в plans.ts
6. **Hardcoded debug текст** — `sendCoachNote()` в dashboard содержит `📋 Тестовое уведомление...`
7. **GroupMember interface** — не содержит `user_id` в expand typing → group notifications не скомпилируются
8. **Stale console.log** — `plans.ts:L42` содержит debug logging
9. **Re-publish guard отсутствует** — publishPlan() не проверяет `status === 'published'`

## Предпосылки

Трек 4.19 создал push-инфраструктуру: CF Worker, VAPID, Service Worker push handler, SSE realtime, NotificationBell UI, Settings UI с 8 типами. Но «последняя миля» (триггеры, preference enforcement, i18n render, badge) — не была реализована.

## Аудит: текущее состояние

| Тип | Settings UI | Trigger | Push delivery |
|-----|:-----------:|:-------:|:-------------:|
| `coach_note` | ✅ | ✅ sendCoachNote() (баг: не проверяет prefs) | ❌ |
| `plan_published` | ✅ | ❌ | ❌ |
| `checkin_reminder` | ✅ | ❌ (нужен cron) | ❌ |
| `achievement` | ✅ | ❌ | ❌ |
| `low_readiness` | ✅ | ❌ (нужен cron) | ❌ |
| `system` | ✅ | ❌ (admin) | ❌ |
| `invite_accepted` | ✅ | ❌ | ❌ |
| `competition_upcoming` | ✅ | ❌ (нужен cron) | ❌ |

## Scope

**Включено:**
- Unified `sendNotification()` + preference check + message_key pattern
- SQL injection fix в planAssignments.ts (4 queries) и plans.ts (3 queries)
- PB schema: +message_key, +message_params fields
- `GroupMember` interface fix — +`user_id` в expand
- Re-publish guard в `publishPlan()`
- Stale `console.log` cleanup
- Сохранение кастомного текста тренера в sendCoachNote()
- Triggers: `plan_published`, `achievement`, `invite_accepted`, `movedToGroup`
- NotificationBell i18n render (message_key → t())
- App icon badge (SW + React sync)
- Badge icon asset
- i18n fix для coach note
- Unit tests

**Отложено (нужен server-side/cron):**
- `checkin_reminder` — PB cron
- `low_readiness` — PB hook при checkin
- `competition_upcoming` — PB cron
- `system` — admin manual
- Push delivery через CF Worker (PB hook)
- Email delivery (email provider)
- Quiet hours server enforcement
- Group-level publish notifications (expand group → members)

## Архитектурные решения

1. **message_key pattern** — notification хранит `message_key` + `message_params`, NotificationBell рендерит через `t()` → получатель видит на СВОЁМ языке
2. **Service-layer triggers** — publishPlan и joinByInviteCode вызывают sendNotification внутри сервиса (fire-and-forget, non-blocking)
3. **Caller-level trigger для achievement** — AchievementsGrid вызывает sendNotification после checkAndGrant (не внутри), с `priority: 'low'` т.к. это self-notification (прогрев для push)
4. **Custom text preservation** — sendCoachNote хранит текст тренера в `messageParams.text`, i18n template рендерит `"Coach: {text}"`
5. **Batch throttle** — notifications в publishPlan отправляются по 5 штук (SQLite safety)
6. **Re-publish guard** — publishPlan проверяет `status === 'published'` перед повторной публикацией

## Затрагиваемые файлы (14 файлов)

| Файл | Изменение |
|------|-----------|
| `planAssignments.ts` | SQL injection fix (4 queries) |
| `plans.ts` | SQL injection fix (3 queries) + console.log cleanup + re-publish guard + notification trigger |
| `types.ts` | +message_key, +message_params |
| `notifications.ts` | +sendNotification(), refactor sendCoachNote() with custom text |
| `groups.ts` | +GroupMember.user_id + trigger in joinByInviteCode() (replace TODO) + trigger in moveAthleteToGroup() (replace TODO) |
| `AchievementsGrid.tsx` | +trigger after checkAndGrant() (priority: low) |
| `NotificationBell.tsx` | +message_key i18n render with fallback |
| `notifications/page.tsx` | +message_key render |
| `sw.ts` | +setAppBadge |
| `useNotifications.ts` | +useEffect badge sync |
| `dashboard/page.tsx` | fix handleNotify with localized default |
| `public/icons/badge-72.png` | NEW |
| `messages/{ru,en,cn}/common.json` | +notification templates (5 keys × 3 locales) |
| `notifications.test.ts` | NEW — unit tests (5 cases) |

## Зависимости

- **Track 4.22 (Invite Links)** — ✅ ЗАВЕРШЁН. `joinByInviteCode()` и `moveAthleteToGroup()` содержат TODO маркеры для 4.23. Trigger для `invite_accepted` заменяет TODO на L150-L151, `movedToGroup` заменяет TODO на L282.
- **Нет зависимости от Track 5/6** — полностью автономный.
