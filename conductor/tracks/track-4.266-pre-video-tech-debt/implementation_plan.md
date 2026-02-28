# Implementation Plan — Track 4.266: Pre-Video Tech Debt (v2 Revised)

## Цель

Устранить 8 критических долгов перед Track 5 (Video + MediaPipe). Все проблемы **подтверждены в реальном коде и схеме БД** через MCP-инспекцию коллекций `training_plans` и `exercise_adjustments`.

## Ключевые факты из инспекции (проверено MCP + code review)

| Факт | Источник |
|---|---|
| `training_plans` имеет поля `start_date` / `end_date` (type=date, optional) | MCP `view_collection` |
| `exercise_adjustments` имеет `UNIQUE INDEX (plan_exercise_id, athlete_id)` | MCP — значит batch-запрос даст ≤1 результат на пару |
| `training_plans` НЕ имеет индекса на `week_number` (только на `phase_id`) | MCP — override fix через `start_date` правильнее |
| `hooks/` содержит только `useOverrideModal.ts` — место для 3 хуков готово | Filesystem |
| Тест-инфраструктура vitest готова: `src/lib/*/\_\_tests\_\_/` | `publishPlan.test.ts` — паттерн мока pb |
| `getDayDate` дублируется: `WeekConstructor.tsx` L534 и `AthleteTrainingView.tsx` L112 | Code review |
| `getWeekStart` дублируется в `AthleteTrainingView.tsx` L102 — та же DST-уязвимость | Code review |
| `log_mode` отсутствует в `getOrCreateLog` при `handleOpenPostFactum` (L597) и нигде в `handleStartFocus` | Code review |

---

## Phase 1: Logic Fixes

> 🛠 **Скиллы агента:** `concise-planning` + `lint-and-validate` (always) + `typescript-expert`

### [1.1] log_mode 'live' в handleStartFocus

**Файл:** `AthleteTrainingView.tsx`

Найти `handleStartFocus` (L572). Перед `setFocusLogId(logId)` вызывается `getOrCreateLog` — но в текущем коде logId передаётся снаружи (из weekLogMap). Нужно:

1. Проверить сигнатуру `getOrCreateLog` в `logs.ts` — принимает ли `log_mode`
2. В `onStartWorkout` (L762): вместо передачи существующего logId — вызывать `getOrCreateLog` с `log_mode: 'live'` **до** открытия FocusCard
3. Обновить `handleStartFocus`:

```typescript
const handleStartFocus = async () => {
    if (!athleteId || !plan) return;
    try {
        const log = await getOrCreateLog(athleteId, plan.id, toLocalISODate(selectedDate), 0, 'live');
        setFocusLogId(log.id);
        setFocusIndex(0);
        setMode('focus');
    } catch (e) {
        console.error('[AthleteTrainingView] handleStartFocus failed', e);
    }
};
```

Обновить вызов в JSX (L762): `onStartWorkout={handleStartFocus}` (убрать inline логику с weekLogMap).

### [1.2] log_mode 'post_express' в handleOpenPostFactum

**Файл:** `AthleteTrainingView.tsx`, L594-603

```typescript
// БЫЛО:
const log = await getOrCreateLog(athleteId, plan.id, toLocalISODate(selectedDate), 0);
// СТАЛО:
const log = await getOrCreateLog(athleteId, plan.id, toLocalISODate(selectedDate), 0, 'post_express');
```

Проверить сигнатуру `getOrCreateLog` в `logs.ts` и добавить параметр `log_mode` если его нет.

### [1.3] getUserTimezone() в notificationPreferences.ts

**Файл:** `src/lib/pocketbase/services/notificationPreferences.ts`

```typescript
/**
 * Get user's IANA timezone from notification_preferences.
 * Falls back to Intl API if no record found.
 * Uses getPreferences() (read-only) — does NOT create a record.
 */
export async function getUserTimezone(userId: string): Promise<string> {
    const prefs = await getPreferences(userId);
    return prefs?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}
```

### [1.4] Timezone-aware в planResolution.ts

**Файл:** `src/lib/pocketbase/services/planResolution.ts` — функция `getPublishedPlanForToday`

```typescript
export async function getPublishedPlanForToday(athleteId: string): Promise<PlanWithExercises | null> {
    // NEW: resolve user timezone from preferences
    const { getUserTimezone } = await import('./notificationPreferences');
    const userId = pb.authStore.record?.id ?? '';
    const tz = userId ? await getUserTimezone(userId) : Intl.DateTimeFormat().resolvedOptions().timeZone;
    const today = todayForUser(tz);
    // ... остальной код без изменений
```

### [1.5] DST fix + DRY helpers

**Файл:** `src/lib/utils/dateHelpers.ts` — добавить 2 функции

```typescript
/**
 * Calendar-day difference between two YYYY-MM-DD strings.
 * T12:00:00Z trick neutralizes DST (works only with YYYY-MM-DD, NOT ISO datetime).
 */
export function diffCalendarDays(from: string, to: string): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const fromMs = new Date(`${from}T12:00:00Z`).getTime();
    const toMs   = new Date(`${to}T12:00:00Z`).getTime();
    return Math.floor((toMs - fromMs) / msPerDay);
}

/**
 * Get Date for a specific day in a week. DRY helper shared by WeekConstructor & AthleteTrainingView.
 * @param weekStart - Monday of the week
 * @param dayIndex  - 0=Mon, 6=Sun
 */
export function getWeekDayDate(weekStart: Date, dayIndex: number): Date {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + dayIndex);
    return d;
}
```

**Обновить `calcWeekNumber` в `planResolution.ts`:**

```typescript
import { diffCalendarDays } from '@/lib/utils/dateHelpers';

function calcWeekNumber(phaseStartDate: string, today: string): number {
    const diffDays = diffCalendarDays(phaseStartDate, today);
    return Math.max(1, Math.floor(diffDays / 7) + 1);
}
```

**⚠️ ДОПОЛНИТЕЛЬНАЯ ЗАДАЧА — `getWeekStart` в `dateHelpers.ts`** также DST-уязвима (L35-44). После добавления `diffCalendarDays` переписать `getWeekStart` без `setDate()` арифметики.

---

## Phase 2: TypeScript Poka-Yoke

> 🛠 **Скиллы агента:** `concise-planning` + `lint-and-validate` (always) + `typescript-expert`

### [2.1] Строгий PlanExerciseStrict interface

**Файл:** `src/lib/pocketbase/services/plans.ts`

Заменить `PlanExerciseWithExpand = PlanExercisesRecord & RecordModel & {...}` на строгий `interface PlanExerciseStrict` (перечислить ВСЕ поля явно — нет `[key: string]: any`).

```typescript
export interface PlanExerciseStrict {
    // RecordModel fields (explicit, no index signature)
    id: string;
    created: string;
    updated: string;
    collectionId: string;
    collectionName: string;
    // plan_exercises fields
    plan_id: string;
    exercise_id: string;
    day_of_week: number;
    session: number;
    block: 'main' | 'warmup';
    order: number;
    sets?: number;
    reps?: string;
    intensity?: string;
    notes?: string;
    weight?: number;
    duration?: number;
    duration_seconds?: number;
    distance?: number;
    rest_seconds?: number;
    custom_text_ru?: string;
    custom_text_en?: string;
    custom_text_cn?: string;
    source_template_id?: string;
    deleted_at?: string;
    expand?: {
        exercise_id?: ExercisesRecord & {
            id: string;
            name_ru: string; name_en: string; name_cn?: string;
            cns_cost?: number; dosage?: string;
        };
    };
    _adjusted?: boolean; // runtime flag, not from DB
}

// Backward-compat alias — не ломаем существующий код
export type PlanExerciseWithExpand = PlanExerciseStrict;
```

После замены запустить `pnpm type-check` — TS выловит все `ex.is_warmup` и подобные опечатки.

### [2.2] Override date boundary (ИСПРАВЛЕННЫЙ FIX)

> [!IMPORTANT]
> Оригинальный план [2.2] предлагал фильтр по `week_number` — это НЕВЕРНО для override.
>
> **Правильное решение:** В схеме БД уже есть `start_date` у `training_plans` (подтверждено MCP). Устанавливать `start_date` при создании override = дата публикации. Тогда `getPublishedOverrideForAthlete` фильтрует по cutoff (14 дней).

**Изменить `createIndividualOverride` в `plans.ts`** — добавить `start_date`:

```typescript
const overridePlan = await pb.collection(Collections.TRAINING_PLANS).create<TrainingPlansRecord>({
    // ... existing fields ...
    parent_plan_id: planId,
    athlete_id: athleteId,
    start_date: new Date().toISOString().split('T')[0], // ← NEW
});
```

**Изменить `getPublishedOverrideForAthlete`** — принять `today`, фильтровать по cutoff:

```typescript
async function getPublishedOverrideForAthlete(
    athleteId: string,
    today: string  // ← NEW parameter
): Promise<PlanWithExercises | null> {
    const d = new Date(`${today}T12:00:00Z`);
    d.setDate(d.getDate() - 14); // 14-day window
    const cutoff = d.toISOString().split('T')[0];

    try {
        return await pb.collection(Collections.TRAINING_PLANS)
            .getFirstListItem<PlanWithExercises>(
                pb.filter(
                    'athlete_id = {:aid} && plan_type = "override" && parent_plan_id != "" && status = "published" && deleted_at = "" && start_date >= {:cutoff}',
                    { aid: athleteId, cutoff }
                ),
                { expand: PLAN_EXPAND, sort: '-start_date' }
            );
    } catch { return null; }
}
```

Обновить вызов: `const override = await getPublishedOverrideForAthlete(athleteId, today);`

### [2.3] N+1 → batch в applyAdjustments (зависит от завершения [2.1]!)

**Файл:** `src/lib/pocketbase/services/planResolution.ts`

`exercise_adjustments` имеет `UNIQUE INDEX (plan_exercise_id, athlete_id)` — 1 результат на пару гарантирован.

```typescript
export async function applyAdjustments(
    exercises: PlanExercisesRecord[],
    athleteId: string
): Promise<PlanExerciseStrict[]> {
    if (!exercises.length) return [];

    // Single batch request instead of N requests
    const ids = exercises.map(ex => `"${ex.id}"`).join(',');
    let adjustments: (ExerciseAdjustmentsRecord & RecordModel)[] = [];
    try {
        adjustments = await pb
            .collection(Collections.EXERCISE_ADJUSTMENTS)
            .getFullList<ExerciseAdjustmentsRecord & RecordModel>({
                filter: pb.filter(
                    `athlete_id = {:aid} && deleted_at = "" && plan_exercise_id ?= any([${ids}])`,
                    { aid: athleteId }
                ),
            });
    } catch { return exercises as PlanExerciseStrict[]; }

    if (!adjustments.length) return exercises as PlanExerciseStrict[];

    const adjMap = new Map(adjustments.map(a => [a.plan_exercise_id, a]));
    return exercises
        .filter(ex => !adjMap.get(ex.id)?.skip)
        .map((ex): PlanExerciseStrict => {
            const adj = adjMap.get(ex.id);
            if (!adj) return ex as PlanExerciseStrict;
            return { ...ex, sets: adj.sets ?? ex.sets, reps: adj.reps ?? ex.reps,
                intensity: adj.intensity ?? ex.intensity, weight: adj.weight ?? ex.weight,
                duration: adj.duration ?? ex.duration, distance: adj.distance ?? ex.distance,
                rest_seconds: adj.rest_seconds ?? ex.rest_seconds, notes: adj.notes ?? ex.notes,
                _adjusted: true } as PlanExerciseStrict;
        });
}
```

> [!NOTE]
> PocketBase filter синтаксис для массива: `plan_exercise_id ?= any([id1,id2,...])`. Безопасен до ~50 упражнений (стандартный план 10-20). Если массив > 40: разбить на чанки по 40.

---

## Phase 3: Monolith Refactoring

> 🛠 **Скиллы агента:** `concise-planning` + `lint-and-validate` (always) + `code-refactoring-refactor-clean` + `react-patterns`

> [!CAUTION]
> Рефакторинг СТРОГО ИТЕРАЦИОННЫЙ: [3.1] → type-check → [3.2] → type-check+build → [3.3] → type-check+build → [3.4] → type-check+build → [3.5] verify size. НЕ делать все шаги сразу.

### [3.1] DRY: удалить дублирующие getDayDate / getWeekStart

- `WeekConstructor.tsx` L534-545: заменить локальную `getDayDate` на `getWeekDayDate` из `dateHelpers.ts`
- `AthleteTrainingView.tsx` L102-116: удалить локальные `getWeekStart` и `getDayDate`, использовать `getWeekDayDate`

### [3.2] Хук useWeekNavigation.ts [NEW]

**Файл:** `src/components/training/hooks/useWeekNavigation.ts`

Перенести из `WeekConstructor.tsx`:

- `useState(weekNumber)` + инициализатор с `initialWeek`
- `handlePrevWeek`, `handleNextWeek`
- `getDayDate` (переписанная через `getWeekDayDate`)

Interface:

```typescript
interface UseWeekNavigationOptions {
    maxWeeks: number;
    startDate?: string;
    initialWeek?: number;
}
// Returns: { weekNumber, handlePrevWeek, handleNextWeek, getDayDate }
```

После создания → убрать из `WeekConstructor.tsx` эти 3 state/handler → импортировать хук.
`pnpm type-check && pnpm build` → ноль ошибок.

### [3.3] Хук useTemplatePicker.ts [NEW]

**Файл:** `src/components/training/hooks/useTemplatePicker.ts`

Перенести из `WeekConstructor.tsx`:

- `templatePanelTarget` state
- `showWarmupPanel` state
- `handleApplyTemplate`
- `handleApplyWarmupToWeek`

Зависимости принимаются как параметры: `plan`, `exercises`, `loadPlan`.

`pnpm type-check && pnpm build` → ноль ошибок.

### [3.4] Хук useDayConstructor.ts [NEW]

**Файл:** `src/components/training/hooks/useDayConstructor.ts`

Перенести из `WeekConstructor.tsx`:

- `activeDay`, `setActiveDay`
- `pickerDay`, `pickerSession`, `pickerMode`
- `handleAddWarmupFromCatalog`
- `handleEjectWarmup`

`pnpm type-check && pnpm build` → ноль ошибок.

### [3.5] Проверить размер

```bash
wc -l "src/components/training/WeekConstructor.tsx"
# Цель: < 450 строк
```

---

## Phase 4: Unit Tests

> 🛠 **Скиллы агента:** `concise-planning` + `lint-and-validate` (always) + `unit-testing-test-generate`

> [!NOTE]
> Паттерн мока pb — из `src/lib/pocketbase/services/__tests__/publishPlan.test.ts`. Тесты [4.3] писать **строго после** [2.3].

### [4.1] dateHelpers.test.ts [NEW]

**Файл:** `src/lib/utils/__tests__/dateHelpers.test.ts`

Покрыть:

- `diffCalendarDays('2024-03-10', '2024-03-11')` → `1` (US DST spring-forward)
- `diffCalendarDays('2024-10-27', '2024-10-28')` → `1` (EU DST fall-back)  
- `diffCalendarDays('2024-01-01', '2024-01-01')` → `0`
- `getWeekDayDate(monday, 0)` → Monday
- `getWeekDayDate(monday, 6)` → Sunday (+6 дней)
- `todayForUser('Asia/Shanghai')` → формат `YYYY-MM-DD`

```bash
pnpm test src/lib/utils/__tests__/dateHelpers.test.ts
```

### [4.2] planResolution.test.ts [NEW]

**Файл:** `src/lib/pocketbase/services/__tests__/planResolution.test.ts`

Покрыть `calcWeekNumber`:

- `('2024-03-10', '2024-03-17')` → `2` (критично: US DST 10 марта 2024, не должна вернуть 1)
- `('2024-01-01', '2024-01-01')` → `1`
- `('2024-01-01', '2024-01-08')` → `2`
- `('2024-01-01', '2024-01-07')` → `1` (6 дней = всё ещё неделя 1)

```bash
pnpm test src/lib/pocketbase/services/__tests__/planResolution.test.ts
```

### [4.3] applyAdjustments.test.ts [NEW] (зависит от [2.3])

**Файл:** `src/lib/pocketbase/services/__tests__/applyAdjustments.test.ts`

Покрыть:

- `getFullList` вызван ровно 1 раз для N упражнений
- Упражнение с `skip=true` исключается
- Поля из adjustment применяются поверх оригинала
- `_adjusted: true` выставляется
- При пустом массиве — `getFullList` НЕ вызывается

```bash
pnpm test src/lib/pocketbase/services/__tests__/applyAdjustments.test.ts
```

### [4.4] QA скрипт [NEW]

**Файл:** `scripts/qa-preview.sh`

```bash
#!/usr/bin/env bash
set -e
PORT=4173
lsof -ti :$PORT | xargs kill -9 2>/dev/null || true
if [[ "$1" != "--skip-build" ]]; then pnpm build; fi
pnpm preview --port $PORT --strictPort
```

`package.json` добавить: `"qa": "bash scripts/qa-preview.sh"`, `"qa:fast": "bash scripts/qa-preview.sh --skip-build"`

---

## Phase 5: Верификация и Delivery

> 🛠 **Скиллы агента:** `verification-before-completion` (загрузить обязательно!)

### Автоматические проверки (запускать в этом порядке)

```bash
pnpm type-check   # → ноль ошибок (PlanExerciseStrict поймает опечатки)
pnpm test         # → все тесты зелёные
pnpm lint         # → ноль предупреждений  
pnpm build        # → чистый out/
```

### Ручная QA — timezone

1. В PocketBase Admin → `notification_preferences` → установить timezone `Asia/Shanghai` для тестового атлета
2. Открыть `AthleteTrainingView` → проверить что план соответствует дате по Шанхаю (не UTC)
3. Повторить для `America/New_York`

### Ручная QA — override boundary

1. Создать override через WeekConstructor → "Create Override"
2. Вручную изменить `start_date` созданного override на дату `> 14 дней назад` через PocketBase Admin (`https://jumpedia.app/_/`)
3. Перезагрузить `AthleteTrainingView` → старый override **не должен** перекрывать актуальный план

### Delivery

```bash
wc -l "src/components/training/WeekConstructor.tsx"  # < 450
```

- [ ] Обновить `CHANGELOG.md`
- [ ] Написать `walkthrough.md`
- [ ] Обновить `conductor/tracks.md` → ✅

---

## Таблица файлов

| Файл | Тип |
|------|-----|
| `src/lib/utils/dateHelpers.ts` | MODIFY |
| `src/lib/pocketbase/services/notificationPreferences.ts` | MODIFY |
| `src/lib/pocketbase/services/planResolution.ts` | MODIFY |
| `src/lib/pocketbase/services/plans.ts` | MODIFY |
| `src/components/training/AthleteTrainingView.tsx` | MODIFY |
| `src/components/training/WeekConstructor.tsx` | MODIFY |
| `src/components/training/hooks/useWeekNavigation.ts` | **NEW** |
| `src/components/training/hooks/useTemplatePicker.ts` | **NEW** |
| `src/components/training/hooks/useDayConstructor.ts` | **NEW** |
| `src/lib/utils/__tests__/dateHelpers.test.ts` | **NEW** |
| `src/lib/pocketbase/services/__tests__/planResolution.test.ts` | **NEW** |
| `src/lib/pocketbase/services/__tests__/applyAdjustments.test.ts` | **NEW** |
| `scripts/qa-preview.sh` | **NEW** |
| `package.json` | MODIFY |
| `CHANGELOG.md` | MODIFY |
