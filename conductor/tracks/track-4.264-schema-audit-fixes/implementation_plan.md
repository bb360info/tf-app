# Implementation Plan — Track 4.264: Schema & Code Audit Fixes

> Трек создан по результатам аудита схем БД, API rules и pb_hooks (conversation 597e3c98).

---

## Proposed Changes

### Phase 1 — критические баги

---

#### [MODIFY] AthleteTrainingView.tsx

**Файл:** `src/components/training/AthleteTrainingView.tsx`  
**Строка:** ~559

```diff
- .filter((pe) => !pe.is_warmup)
+ .filter((pe) => pe.block !== 'warmup')
```

Поле `is_warmup` не существует в `PlanExercisesRecord`. Правильное поле — `block: 'warmup' | 'main'`.

---

#### [MODIFY] content.ts — Zod schemas

**Файл:** `src/lib/validation/content.ts`

```diff
- export const AchievementTypeSchema = z.enum([
-     'streak', 'personal_best', 'milestone', 'consistency',
- ]);
+ export const AchievementTypeSchema = z.enum([
+     'streak_3d', 'streak_7d', 'streak_30d', 'streak_100d',
+     'first_workout', 'workouts_10', 'workouts_50', 'workouts_100',
+     'first_test', 'first_pb', 'pb_5', 'all_tests',
+     'first_competition',
+ ]);
```

```diff
- export const NotificationTypeSchema = z.enum([
-     'plan_published', 'checkin_reminder', 'achievement', 'system',
- ]);
+ export const NotificationTypeSchema = z.enum([
+     'plan_published', 'checkin_reminder', 'achievement', 'system',
+     'low_readiness', 'coach_note', 'invite_accepted', 'competition_upcoming',
+ ]);
```

---

### Phase 2 — средние

---

#### [MODIFY] notifications.pb.js — plan_published hook

**Файл:** `pb_hooks/notifications.pb.js`

Дополнить хук `onRecordAfterUpdateSuccess('training_plans')` — после обхода `plan_assignments`, также обходить:

1. `season = training_phases WHERE id = plan.phase_id → seasons WHERE id = phase.season_id`
2. Уведомить `season.athlete_id → athlete → user_id` (если есть)
3. Уведомить `season.group_id → group_members → athlete → user_id`

Дедупликация: не слать дублирующее уведомление если user уже уведомлён через plan_assignments.

---

#### [MODIFY] AthleteTrainingView.tsx + i18n — StandaloneBanner

**Файл:** `src/components/training/AthleteTrainingView.tsx` строка 345

```diff
- <span>Разовая тренировка{range ? ` · ${range}` : ''}</span>
+ <span>{t('standalonePlan')}{range ? ` · ${range}` : ''}</span>
```

**Файлы локализаций:** добавить ключ `standalonePlan`:

- `messages/ru.json`: `"standalonePlan": "Разовая тренировка"`
- `messages/en.json`: `"standalonePlan": "Ad-hoc Training"`
- `messages/cn.json`: `"standalonePlan": "临时训练"`

---

### Phase 3 — низкий приоритет

---

#### [MODIFY] logs.ts — log_mode parameter

**Файл:** `src/lib/pocketbase/services/logs.ts`

```diff
export async function createTrainingLog(data: {
    athlete_id: string;
    plan_id?: string;
    date?: string;
    session?: number;
    notes?: string;
+   log_mode?: LogMode;
}): Promise<TrainingLogWithRelations>
```

Передавать `log_mode` в `.create()` payload.  
Аналогично обновить `getOrCreateLog()` — добавить опциональный `log_mode` параметр.

---

## Verification Plan

### Automated

```bash
pnpm type-check   # 0 ошибок
pnpm build        # успешный билд
pnpm lint         # 0 warnings
```

### Manual

- Focus Mode: открыть день с warmup → убедиться что warmup отсутствует в списке
- Standalone план: проверить StandaloneBanner на EN/CN локали
- Запустить Zod валидацию на тестовых данных achievement + notification
- После деплоя хука: опубликовать план → проверить что уведомление пришло атлету без plan_assignment
