# Track 4.264 — Context: Schema & Code Audit Fixes

## Источник

Аудит проведён в conversation `597e3c98` после завершения трека 4.263 (Schema Decoupling).  
Полный отчёт: `brain/597e3c98-.../db_schema_audit.md`

---

## Проблемы

### 🔴 #1 — `pe.is_warmup` (критический баг UI)

**Файл:** `src/components/training/AthleteTrainingView.tsx` строка 559  
**Баг:** Фильтрация warmup-упражнений использует несуществующее поле `pe.is_warmup`.  
В схеме `PlanExercisesRecord` нет такого поля — есть только `block: 'warmup' | 'main'`.  
**Результат:** warmup-упражнения тихо попадают в Focus Mode и Quick Edit.

**Фикс:**

```ts
// ❌ Текущий (сломан):
.filter((pe) => !pe.is_warmup)

// ✅ Правильный:
.filter((pe) => pe.block !== 'warmup')
```

---

### 🔴 #2 — `AchievementTypeSchema` устарел

**Файл:** `src/lib/validation/content.ts` строки 123–128  
**Баг:** Zod-схема содержит 4 устаревших generic значения вместо 13 конкретных типов из `types.ts`.

```ts
// ❌ Текущий в content.ts:
z.enum(['streak', 'personal_best', 'milestone', 'consistency'])

// ✅ Нужно (согласно types.ts):
z.enum([
    'streak_3d', 'streak_7d', 'streak_30d', 'streak_100d',
    'first_workout', 'workouts_10', 'workouts_50', 'workouts_100',
    'first_test', 'first_pb', 'pb_5', 'all_tests',
    'first_competition',
])
```

---

### 🔴 #3 — `NotificationTypeSchema` неполный

**Файл:** `src/lib/validation/content.ts` строки 140–145  
**Баг:** 4 типа вместо 8. Пропущены: `low_readiness`, `coach_note`, `invite_accepted`, `competition_upcoming`.

```ts
// ❌ Текущий:
z.enum(['plan_published', 'checkin_reminder', 'achievement', 'system'])

// ✅ Нужно:
z.enum([
    'plan_published', 'checkin_reminder', 'achievement', 'system',
    'low_readiness', 'coach_note', 'invite_accepted', 'competition_upcoming',
])
```

---

### 🟡 #4 — `plan_published` хук не покрывает Season Membership

**Файл:** `pb_hooks/notifications.pb.js` строка 89–103  
**Баг:** Уведомление о `plan_published` уходит только атлетам с `plan_assignments`.  
По ADR-3 (4.263) `plan_assignments` опциональный — атлеты нового сезона не получат уведомление.  
**Фикс:** добавить пути через `season.athlete_id` и `season.group_id.group_members`.

---

### 🟡 #5 — `StandaloneBanner` без i18n

**Файл:** `src/components/training/AthleteTrainingView.tsx` строка 345  
**Баг:** Текст „Разовая тренировка" hardcoded на RU.  
**Фикс:** использовать `t('standalonePlan')` + добавить ключ в все 3 локали.

---

### 🟢 #6 — `log_mode` не проставляется

**Файл:** `src/lib/pocketbase/services/logs.ts`  
**Баг:** Поле `log_mode` (тип `LogMode`) не передаётся при создании логов ни в `getOrCreateLog`, ни в `createTrainingLog`.  
**Фикс:** принять `log_mode` как опциональный параметр и передавать в PB.

---

## Что проверено и корректно ✅

- Live БД `competitions`: owner_type required, athlete_id/group_id optional — полное соответствие ADR-1
- Live БД `training_plans`: plan_type required, phase_id/week_number optional, start/end_date — ADR-2 ✅
- Live БД `exercise_adjustments`: все 12 полей, API rules `athlete_id.user_id || coach_id` — ✅
- `ownership_integrity.pb.js`: validateOwnership на create+update — ✅
- `planResolution.ts`: 5-шаговая цепочка + applyAdjustments вызывается в ATV — ✅
- `competitions.ts`: OR-фильтр (прямой владелец ∪ участник) — ✅
- TS types.ts: все интерфейсы актуальны — ✅
- Zod `training.ts`: TrainingPlansSchema, CompetitionsSchema актуальны — ✅
- `push-delivery.pb.js`: i18n, quiet hours, stale sub cleanup — ✅
