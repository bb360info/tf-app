# [CS] 🔍 Ревью Track 4.23 — Notification System & App Badge

## Статус проекта

🔵 **Активный трек:** 4.21 (Athlete Specialization & PR)
⬜ **Track 4.23** — Pending (ещё не начат)

📐 **Plan:** ✅ Найден | 📝 **Walkthrough:** ❌ Нет

---

## 🛠 Загруженные скиллы

| Группа | Скилл |
|--------|-------|
| `always` | `concise-planning`, `lint-and-validate`, `jumpedia-design-system`, `verification-before-completion` |
| `planning` | `brainstorming`, `plan-writing`, `context-driven-development`, `conductor-validator` |
| `architecture` | `architect-review` |

---

## 📊 Анализ плана: что хорошо

1. **Структура фаз логична** — потоковая зависимость: сервис → триггеры → badge → ассет → i18n → тесты
2. **Scope грамотно ограничен** — cron-/server-триггеры и push delivery отложены в backlog
3. **Аудит-аблица в context.md** — отличная визуализация 8 типов, что реализовано и что нет
4. **Badge API feature detection** — план правильно включает `if ('setAppBadge' in navigator)` guards

---

## 🔴 Критические проблемы (ОБЯЗАТЕЛЬНО исправить)

### 1. `sendCoachNote()` использует `athleteId`, а не `user_id`

> [!CAUTION]
> В `notifications.ts:12-26` поле `user_id` заполняется значением `athleteId` (ID из коллекции **athletes**). Но в [dashboard/page.tsx:178-188](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/%28protected%29/dashboard/page.tsx#L178-L188) комментарий гласит: «athleteId here is actually the user_id from users collection». Это **конфликт**: `AthleteCard.onNotify` передаёт **athlete.id** (из athletes), а `sendCoachNote()` записывает его в `user_id`. Notification Bell фильтрует по `user_id = auth.id` (users collection). **Уведомление может НЕ доставляться если athlete.id ≠ user.id**.

**Решение:** `sendNotification()` ДОЛЖЕН принимать `user_id` из коллекции `users`. Если вызов идёт из контекста athlete record — нужно доставать `athlete.user_id` и передавать его.

---

### 2. `checkAndGrant()` вызывается на КЛИЕНТЕ — опасная архитектура для триггера

> [!WARNING]
> `checkAndGrant()` — это клиентская функция, вызываемая из `AchievementsGrid.tsx`. План предлагает добавить `sendNotification()` **внутрь** `checkAndGrant()`. Но:
> - Клиент может **изменить/отключить** этот вызов (dev tools, offline, etc.)
> - Один и тот же achievement может быть проcased **несколькими клиентами** одновременно (race condition)
> - `sendNotification()` создаёт PB record — **клиент может спамить** уведомлениями

**Решение:** Вместо вставки в `checkAndGrant()`, добавлять уведомление **после** успешного гранта. Проще: в компоненте `AchievementsGrid`, после `checkAndGrant()` вернёт `newlyEarned` — для каждого нового achievement вызвать `sendNotification()`. Это не идеально (всё ещё client-side), но изолирует логику. **Идеальный подход:** PocketBase hook на `achievements.create` → автоматический trigger. Но это server-side — отложить в backlog.

---

### 3. `publishPlan()` — нет данных об assigned athletes

> [!IMPORTANT]
> В `plans.ts:publishPlan()` (L233-266) нет логики получения assigned athletes. План предлагает вызвать `listPlanAssignments(planId)`, но эта функция **не существует** в `plans.ts`! Есть `listActivePlanAssignments` в `planAssignments.ts`. Нужно:
> 1. Импортировать правильную функцию: `import { listActivePlanAssignments } from './planAssignments'`
> 2. Для каждого assignment получить `athlete.user_id` (не `athleteId`)

---

## 🟡 Архитектурные проблемы (рекомендуется решить)

### 4. i18n в сервисном слое — неразрешённый вопрос

План признаёт проблему (строка 75 implementation_plan.md): «i18n в сервисном слое — передавать уже переведённый message из React component». Но `publishPlan()` — сервисная функция без доступа к `useTranslations()`.

**2 варианта:**
- **A) Message template key** — `sendNotification()` хранит `message_key` + `message_params` вместо готового текста. UI рендерит перевод. **Чище, будущеустойчивее, но нужна доработка NotificationBell.**
- **B) Готовый текст** — передавать translated message из React caller. **Проще, но хрупкое** — если уведомление приходит через SSE другому пользователю с другой локалью, он увидит чужой язык.

**Рекомендация:** **Вариант A** — хранить key + params. В `notifications` collection добавить `message_key` (text) и `message_params` (json). `NotificationBell` рендерит через `t(notification.message_key, notification.message_params)`. Это будущеустойчиво для push delivery.

---

### 5. `badge: "/icons/badge-72.png"` уже в `sw.ts:84`

В `sw.ts:84` уже стоит `badge: "/icons/badge-72.png"`, но файла `/public/icons/badge-72.png` **нет**. Это значит фаза 3 (создание ассета) **критическая** — сейчас push notification может показать broken badge icon.

---

### 6. `sendCoachNote()` → `sendNotification()` — backward compatibility

Рефакторинг `sendCoachNote(athleteId, message, link?)` → враппер `sendNotification({userId, type: 'coach_note', ...})` — правильный подход. Но при этом **сигнатура `sendCoachNote` не меняется** — значит баг из пункта 1 (athlete.id vs user.id) **сохранится**. Нужно одновременно с рефакторингом исправить caller в `dashboard/page.tsx` чтобы передавать `athlete.user_id`.

---

## 💡 Брейншторм: что можно улучшить

### 7. Notification message template system (вместо raw text)

```typescript
// Предложение: расширить notifications collection
interface NotificationsRecord {
    user_id: string;
    type: NotificationType;
    message_key: string;      // 'notifications.planPublished'
    message_params: object;   // { week: 3, coachName: 'Petrov' }
    message: string;          // fallback pre-rendered text
    read: boolean;
    link: string;
    priority: NotificationPriority;
}
```

Это решает:
- ✅ i18n на стороне получателя
- ✅ Совместимость с push delivery (CF Worker может рендерить на нужном языке)
- ✅ Backward compatible (message как fallback)

---

### 8. Batch notification creation (performance)

`publishPlan()` может назначить 20+ athletes. Текущий план — цикл `for...of` с sequential `sendNotification()`. Это N+1 PB API calls.

**Рекомендация:** Использовать PB batch API или хотя бы `Promise.all()` с throttle (batch по 5, как уже сделано в templates). Пример:

```typescript
// Batch по 5 — SQLite safety
const chunks = chunkArray(athletes, 5);
for (const chunk of chunks) {
    await Promise.all(chunk.map(a => sendNotification({...})));
}
```

---

### 9. Dedup guard в `sendNotification()`

Если `checkAndGrant()` вызывается дважды (race condition), может создалось 2 уведомления. Добавить **idempotency** через `requestKey` или проверку «уведомление такого типа для этого пользователя уже создано в последние 60 секунд».

---

### 10. App Badge — `clearAppBadge()` при mark-all-read

`useNotifications.ts` — план добавляет `useEffect` на `unreadCount`, но `clearAll()` уже обнуляет count. Нужно убедиться что `clearAppBadge()` вызывается **также** из `markAllRead()`, а не только из `useEffect`:

```typescript
const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    // Badge sync happens via useEffect on unreadCount — OK
}, []);
```

Это уже будет работать через `useEffect`, так что это OK. Но нужно учесть **edge case**: вкладка закрыта → SW получает push → badge увеличивается → пользователь **открывает** приложение → `loadInitial()` загружает 0 unread → но badge **не обновится** пока `useEffect` не сработает. Решение: добавить `clearAppBadge()` в `loadInitial()` при `unreadCount === 0`.

---

## 📋 Сводка рекомендаций по приоритету

| # | Проблема | Критичность | Фаза |
|---|----------|-------------|------|
| 1 | `user_id` vs `athlete.id` в sendCoachNote | 🔴 Critical | Phase 0 |
| 2 | checkAndGrant на клиенте + notification spam risk | 🟡 Architecture | Phase 1 |
| 3 | `listPlanAssignments` — несуществующая функция | 🔴 Blocker | Phase 1 |
| 4 | i18n message_key system vs raw text | 🟡 Future-proof | Phase 0 |
| 5 | badge-72.png отсутствует (SW уже ссылается) | 🔴 Bug (сейчас) | Phase 3 |
| 6 | sendCoachNote backward compat fix | 🟡 Must fix with Phase 0 | Phase 0 |
| 7 | Notification template system | 💡 Enhancement | Phase 0 |
| 8 | Batch notification creation | 💡 Performance | Phase 1 |
| 9 | Dedup guard в sendNotification | 💡 Reliability | Phase 0 |
| 10 | clearAppBadge edge case | 💡 UX | Phase 2 |

---

## ✅ Что уже хорошо и не нужно менять

- `sw.ts` push handler — отличная архитектура (foreground dedup, postMessage, background notification)
- `useNotifications.ts` — SSE + BG Sync + exponential backoff — production-ready
- `notificationPreferences.ts` — upsert pattern, disabled_types массив — готов к использованию
- Badge path в manifest.json уже подготовлен
- Scope трека ограничен правильно — server-side отложен

---

## 🎯 Рекомендуемый обновлённый план

### Phase 0 (обновлённый): Unified Notification Service

1. **`sendNotification()` с `message_key` + `message_params`** (или минимум raw message)
2. **Fix `user_id` contract** — ВСЕГДА принимать `user_id` из `users` collection, не `athlete.id`
3. **Refactor `sendCoachNote()`** — внутри resolveить `athlete.user_id` если передан `athleteId` из athletes
4. **Fix `dashboard/page.tsx:handleNotify`** — передавать `athlete.user_id` вместо `athlete.id`
5. **Dedup guard** — optional idempotency (проверка за последние 60 секунд)

### Phase 1 (обновлённый): Notification Triggers

1. **`publishPlan()`** — import `listActivePlanAssignments` из `planAssignments.ts`, для каждого assigned athlete с `user_id` → `sendNotification()`
2. **`checkAndGrant()`** — НЕ трогать сервисную функцию. Вместо этого в `AchievementsGrid.tsx` (caller), после `result.newlyEarned.length > 0` → вызвать `sendNotification()` для каждого нового achievement
3. **`joinByInviteCode()`** — добавить trigger `sendNotification()` для coach (group.coach_id)
4. **i18n templates** × 3 locale files

### Phases 2-5: без изменений (уже OK)
