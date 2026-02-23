# Track 4.14: Training System Overhaul — Implementation Plan

> Капитальная переработка тренировочной системы: создание/редактирование тренировок, логирование, индивидуализация, мультисессии.

## Предыстория

По результатам глубокого анализа coach flows и training UX выявлены критические пробелы:
- Нет поддержки нескольких тренировок в день (AM/PM)
- Две параллельные системы логирования (logs.ts vs trainingLogs.ts)
- Coach не видит тип упражнения при планировании
- Нет индивидуальной корректировки общего плана
- Атлет видит только сегодняшний день
- Нет UI для прыжков в высоту (height attempts)
- План не привязывается к группе/атлету
- Нет управления участниками группы

**Анализы:** см. `/conductor/tracks/track-4.14-training-overhaul/analysis/`

---

## Фаза 1: Data Model — PocketBase Schema + TypeScript Types
**Цель:** Расширить PB схему и TypeScript типы без ломки существующего кода.

### PB Admin: новые поля (через API + browser_subagent)

| Коллекция | Поле | Тип | Default | Required |
|-----------|------|-----|---------|----------|
| `plan_exercises` | `session` | Number | `0` | No |
| `plan_exercises` | `weight` | Number | — | No |
| `plan_exercises` | `duration` | Number | — | No |
| `plan_exercises` | `distance` | Number | — | No |
| `plan_exercises` | `rest_seconds` | Number | — | No |
| `training_plans` | `athlete_id` | Relation → athletes | — | No |
| `training_plans` | `parent_plan_id` | Relation → training_plans | — | No |
| `training_logs` | `session` | Number | `0` | No |
| `athletes` | `user_id` | Relation → users | — | No |

### PB Admin: новая коллекция `plan_assignments`

| Поле | Тип | Required |
|------|-----|----------|
| `plan_id` | Relation → training_plans | Yes |
| `athlete_id` | Relation → athletes | No |
| `group_id` | Relation → groups | No |
| `status` | Select: active, completed, cancelled | Yes (default: active) |

**API Rules:** `@request.auth.id != ""` для list/view/create/update/delete

### TypeScript changes

**`src/lib/pocketbase/types.ts`:**
```diff
 export interface PlanExercisesRecord extends BaseRecord, SoftDeletable {
     plan_id: string;
     exercise_id: string;
     order: number;
     day_of_week?: number;
+    session?: number;          // 0=AM, 1=PM, 2=extra
     sets?: number;
     reps?: string;
     intensity?: string;
+    weight?: number;           // kg — for unit_type=weight
+    duration?: number;         // seconds — for unit_type=time
+    distance?: number;         // meters — for unit_type=distance
+    rest_seconds?: number;     // rest between sets
     notes?: string;
 }

 export interface TrainingPlansRecord extends BaseRecord, SoftDeletable, Syncable {
     phase_id: string;
     week_number: number;
     status: PlanStatus;
     notes?: string;
+    athlete_id?: string;       // FK → athletes (individual override)
+    parent_plan_id?: string;   // FK → training_plans (base plan)
 }

 export interface TrainingLogsRecord extends BaseRecord, Syncable {
     athlete_id: string;
     plan_id: string;
     date: string;
+    session?: number;          // 0=AM, 1=PM
     notes?: string;
     readiness_score?: number;
 }

 export interface AthletesRecord extends BaseRecord {
     coach_id: string;
+    user_id?: string;          // FK → users (direct user link)
     name: string;
     ...
 }

 export interface SetData {
     set: number;
     reps?: number;
     weight?: number;
     time?: number;
     distance?: number;
+    height?: number;           // cm — high jump
+    result?: 'made' | 'miss';  // attempt result
     notes?: string;
 }

+export interface PlanAssignmentsRecord extends BaseRecord {
+    plan_id: string;
+    athlete_id?: string;
+    group_id?: string;
+    status: 'active' | 'completed' | 'cancelled';
+}
```

**`src/lib/pocketbase/collections.ts`:**
```diff
+    PLAN_ASSIGNMENTS: 'plan_assignments',
```

---

## Фаза 2: Multi-Session (AM/PM) + Unit-Aware Plan Editing
**Цель:** Тренер может создавать 2+ тренировки в день и видит правильный UI по типу упражнения.

### `plans.ts` changes
- `addExerciseToPlan(data)` — add `session?: number` param
- **NEW** `groupByDayAndSession(exercises)` → `Record<number, Record<number, PlanExerciseWithExpand[]>>`
- `updatePlanExercise(id, data)` — accept `weight`, `duration`, `distance`, `rest_seconds`

### `DayColumn.tsx` changes
- Group exercises by `session` (0, 1, 2...)
- Render session headers: "🌅 AM" / "🌆 PM" (i18n keys: `training.sessionAM`, `training.sessionPM`)
- Button "+ Add Session" to create PM block
- **ExerciseCard adaptive fields:**
  - Look up `unit_type` from expanded exercise
  - `weight` → `{sets}×{reps} @ __ kg` input
  - `distance` → `{sets}× __ m` input
  - `time` → `{sets}× __ sec` input
  - `reps` → `{sets}×{reps}` (unchanged)

### `WeekConstructor.tsx` changes
- Pass `session` to ExercisePicker
- `handleAddExercise` stores session on exercise
- CNS display: per-session subtotals + daily total

### i18n (3 locales × ~8 keys)
`training.sessionAM`, `training.sessionPM`, `training.addSession`, `training.weightKg`, `training.distanceM`, `training.durationSec`, `training.restBetween`, `training.sessionTotal`

---

## Фаза 3: Unified Athlete Logging + Height Attempts + Week View
**Цель:** Атлет видит всю неделю, вводит данные через rich SetsInput, включая прыжки.

### DELETE `trainingLogs.ts`
Все функции переносятся в `logs.ts`. Импорты обновляются в `AthleteTrainingView.tsx`.

### `logs.ts` changes
- `getOrCreateLog(athleteId, planId, dateStr, session?)` — add session to constraint
- **MOVE** `getPublishedPlanForToday()` from deleted trainingLogs.ts
- **NEW** `listWeekLogs(athleteId, weekStartDate)` — logs for 7 days

### `AthleteTrainingView.tsx` — major refactor
- Show **7 days** (horizontal tabs or scroll), highlight today
- Group exercises by session (AM/PM blocks)
- Replace simplified `ExerciseItem` stepper with full `SetsInput` from `TrainingLog.tsx`
- On save → call `batchSaveLogExercises` (from logs.ts)

### `TrainingLog.tsx` — height branch
```typescript
// Add to SetsInput when unitType === 'height':
// UI: list of attempts { height: __ cm, result: ✅made / ❌miss }
// + "Add Attempt" button
// buildSetsData → SetData[] with height + result fields
```

### i18n (~10 keys)
`training.log.height`, `training.log.attempt`, `training.log.made`, `training.log.miss`, `training.log.addAttempt`, `training.weekView`, `training.today`, etc.

---

## Фаза 4: Individual Plan Overrides + Group Assignment + Coach Notes
**Цель:** Индивидуализация планов — тренер адаптирует общий план под атлета.

### NEW `planAssignments.ts`
```typescript
assignPlanToAthlete(planId, athleteId): Promise<PlanAssignmentsRecord>
assignPlanToGroup(planId, groupId): Promise<PlanAssignmentsRecord[]>  // creates per-member
getAssignmentsForPlan(planId): Promise<PlanAssignmentsRecord[]>
getAssignedPlanForAthlete(athleteId, phaseId): Promise<TrainingPlansRecord | null>
unassignPlan(assignmentId): Promise<void>
```

### `plans.ts` additions
```typescript
duplicatePlan(planId, overrides?): Promise<PlanWithExercises>  // deep copy
createIndividualOverride(basePlanId, athleteId): Promise<PlanWithExercises>  // copy + set parent_plan_id + athlete_id
```

### `groups.ts` additions
```typescript
listGroupMembers(groupId): Promise<AthleteRecord[]>
removeGroupMember(groupId, athleteId): Promise<void>
updateGroup(groupId, data: { name?: string }): Promise<GroupWithRelations>
deleteGroup(groupId): Promise<void>
```

### UI changes
- **`SeasonDetail.tsx`** — "Assigned to" label + "Assign" button → modal for selecting athlete/group, "Customize for..." → create override
- **`GroupsPage`** — expandable group card showing member list, edit/delete group, remove member
- **`AthleteTrainingView.tsx`** — Show `notes` from plan_exercises to athlete

---

## Файлы, затронутые по фазам

| Фаза | Файлы | Тип |
|------|-------|-----|
| 1 | `types.ts`, `collections.ts`, PB Admin | Schema |
| 2 | `plans.ts`, `DayColumn.tsx`, `WeekConstructor.tsx`, i18n | UI + Service |
| 3 | `AthleteTrainingView.tsx`, `TrainingLog.tsx`, `logs.ts`, ~~`trainingLogs.ts`~~ | Refactor |
| 4 | `planAssignments.ts` (NEW), `plans.ts`, `groups.ts`, `SeasonDetail.tsx`, `GroupsPage` | Features |

## Future-Proofing

| Решение | Защита |
|---------|--------|
| `session` as number, not enum | 3+ sessions possible later |
| `parent_plan_id` FK chain | Trackable diff between base and override |
| `plan_assignments` separate collection | Reusable, historical |
| `SetData.height + result` | Ready for biomechanics tracker |
| `user_id` on athletes | Eliminates `getSelfAthleteId` workarounds |

## Verification

```bash
pnpm type-check && pnpm build && pnpm test && pnpm lint
```

Browser tests after each phase (see gate.md for checklist).
