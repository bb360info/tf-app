# Walkthrough — Track 4.264: Schema & Code Audit Fixes

## Phase 1 — Критические баги
>
> Дата: 2026-02-27 · Агент: [CS]

### Что сделано

- `AthleteTrainingView.tsx` L570: заменён несуществующий `pe.is_warmup` на корректный `pe.block !== 'warmup'` — warmup-упражнения теперь не попадают в Focus Mode и QuickEdit
- `content.ts` `AchievementTypeSchema`: обновлён с 4 generic типов на 13 конкретных (`streak_3d`, `streak_7d`, …, `first_competition`)
- `content.ts` `NotificationTypeSchema`: обновлён с 4 на 8 типов (+`low_readiness`, `coach_note`, `invite_accepted`, `competition_upcoming`)
- `content.ts` `NotificationsSchema`: расширен полями `message_key`, `message_params`, `priority`, `expires_at`, `delivered`

### Файлы изменены

| Файл | Изменение |
|------|-----------|
| `src/components/training/AthleteTrainingView.tsx` | L570: `is_warmup` → `block !== 'warmup'` |
| `src/lib/validation/content.ts` | AchievementTypeSchema (13), NotificationTypeSchema (8), NotificationsSchema (+5 полей) |

### Верификация

- `pnpm type-check` → ✅ (0 ошибок)
- `pnpm build` → ✅ exit 0
- `pnpm lint` → ✅ 0 errors

---

## Phase 2 — Уведомления + i18n
>
> Дата: 2026-02-27 · Агент: [CS]

### Что сделано

- Удалён серверный хук `plan_published` из `notifications.pb.js` (83 строки) — он дублировал клиентскую логику в `plans.ts`, атлеты получали 2 одинаковых уведомления
- `plans.ts` `publishPlan()`: добавлен блок 4b — season membership: при публикации плана обходим `training_phases → seasons → athlete_id / group_id` и добавляем атлетов. Дедупликация через `Set<userId>`
- `AthleteTrainingView.tsx` `StandaloneBanner`: добавлен `useTranslations('training')`, replaced хардкодный "Разовая тренировка" на `t('standalonePlan'...)`
- `messages/ru/common.json` + `en/common.json` + `cn/common.json`: добавлен ключ `standalonePlan` в секцию `training`

### Файлы изменены

| Файл | Изменение |
|------|-----------|
| `pb_hooks/notifications.pb.js` | Удалён хук plan_published (строки 76-157) |
| `src/lib/pocketbase/services/plans.ts` | publishPlan(): блок 4b season membership + Set dedup |
| `src/components/training/AthleteTrainingView.tsx` | StandaloneBanner: useTranslations + t('standalonePlan') |
| `messages/ru/common.json` | standalonePlan: "Разовая тренировка" |
| `messages/en/common.json` | standalonePlan: "Ad-hoc Training" |
| `messages/cn/common.json` | standalonePlan: "临时训练" |

### Заметки для следующего агента

- `notifications.pb.js` должен быть задеплоен с `--delete` в rsync, чтобы удалённый хук реально исчез с сервера. Рестарт PocketBase обязателен (`systemctl restart pocketbase`)
- Текущий rsync уже запущен в терминале пользователя

---

## Phase 3 — Низкий приоритет
>
> Дата: 2026-02-27 · Агент: [CS]

### Что сделано

- `logs.ts` `getOrCreateLog()`: добавлен параметр `logMode?: LogMode` — при создании нового лога (404 → create) он проставляется в `log_mode`
- `logs.ts` `createTrainingLog()`: добавлен `log_mode?: LogMode` в тип данных (прокидывается через `...data`)

### Файлы изменены

| Файл | Изменение |
|------|-----------|
| `src/lib/pocketbase/services/logs.ts` | getOrCreateLog() + logMode param; createTrainingLog() + log_mode field |

### Заметки для следующего агента

- `log_mode` API добавлен, но вызывающий код (AthleteTrainingView.tsx: handleOpenPostFactum, handleStartFocus) ещё не передаёт нужные значения (`'post_express'`, `'live'`). Это следующий шаг в UX-редизайне.

---

## Phase 4 — QA + Деплой
>
> Дата: 2026-02-27 · Агент: [CS]

### Верификация

- `pnpm type-check` → ✅ exit 0 (0 ошибок)
- `pnpm build` → ✅ exit 0 (static export, все 3 локали, все маршруты)
- `pnpm lint` → ✅ exit 0 (0 errors, 15 pre-existing warnings — не наши)

### Kaizen

- **ОБНАРУЖЕННЫЙ КОНФЛИКТ (ТОЛЬКО В ЭТОМ ТРЕКЕ):** функция `publishPlan()` в `plans.ts` и хук `notifications.pb.js` отправляли одинаковые уведомления `plan_published`. Это не было зафиксировано в audit. Устранено удалением хука.
- **TypeScript не поймал `is_warmup`** — потому что `PlanExerciseWithExpand extends RecordModel`, а `RecordModel` имеет `[key: string]: any`. Стоит добавить stricter типы для plan exercises в следующем рефакторинге.
- **`log_mode` на вызывающей стороне** — следующий агент в UX-редизайне должен передавать `'live'` в `handleStartFocus` и `'post_express'` в `handleOpenPostFactum`.
