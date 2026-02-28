# Track 4.267 — Constructor Bugs: Implementation Plan (v3)

> **Ревизия**: v3 — интегрированы идеи брейншторма: branded types, unified deactivation, split getOrCreatePlan.
> **Статус**: ожидает ревью.

## Архитектурные решения (новое в v3)

### A1. Branded Types for Plan Status (Poka-Yoke)

Вместо runtime guards (`if (status === 'published') throw ...`) — **невозможность ошибки на уровне TypeScript**:

```typescript
// src/lib/pocketbase/services/plans.ts — новые типы
type DraftPlan = PlanWithExercises & { readonly status: 'draft' };
type PublishedPlan = PlanWithExercises & { readonly status: 'published' };

// Type guard
function isDraft(plan: PlanWithExercises): plan is DraftPlan {
    return plan.status === 'draft';
}

// duplicatePlanWeek compiler-safe:
async function duplicatePlanWeek(phaseId: string, from: number, to: number): Promise<DraftPlan>
// addExerciseToPlan compiler-safe:
async function addExerciseToPlan(plan: DraftPlan, ...): Promise<PlanExercise>
```

**Применяется**: Фазы 1.3, 2.2. Функции изменения плана принимают `DraftPlan`, а не generic `PlanWithExercises`.

---

### A2. Unified AssignmentLifecycleService

Deactivation logic **сейчас** разбросана по 4 файлам. Собираем в один:

```typescript
// src/lib/pocketbase/services/assignmentLifecycle.ts [NEW]
export const assignmentLifecycle = {
    /** Deactivate all active assignments for a specific plan */
    deactivateForPlan(planId: string): Promise<number>,

    /** Deactivate sibling assignments (same phase+week, different plan) */
    deactivateSiblings(planId: string, phaseId: string, weekNumber: number): Promise<number>,

    /** Deactivate ALL assignments for all plans in a season */
    deactivateForSeason(seasonId: string): Promise<number>,
};
```

**Потребители**:

- `revertToDraft()` → `assignmentLifecycle.deactivateForPlan(planId)`
- `publishPlan()` → `assignmentLifecycle.deactivateSiblings(...)`
- `clearSeasonAssignments()` → делегирует в `assignmentLifecycle.deactivateForSeason()`

**Выгода**: Единое место для тестирования, невозможно забыть deactivation.

---

### A3. Split getOrCreatePlan → getExistingPlan + ensurePlan

```typescript
// Read-only — для просмотра (WeekConstructor, PhaseCard)
getExistingPlan(phaseId: string, weekNumber: number): Promise<PlanWithExercises | null>

// Write — создаёт при необходимости (addExercise, publish)
ensurePlan(phaseId: string, weekNumber: number): Promise<DraftPlan>
```

**Потребители**:

- `usePlanData.ts` → `getExistingPlan()` (показать "empty week" если null)
- `addExerciseToPlan` → `ensurePlan()` (lazy creation)
- `duplicatePlanWeek` → `ensurePlan()` (target week)

---

## Фазы

### Фаза 1 — Критические баги (Потеря данных + Race Conditions)

> Скиллы: `error-handling-patterns`, `kaizen`, `typescript-expert`
> Приоритет: **Critical**

---

#### 1.0 [NEW] Создать `assignmentLifecycle.ts`

**Файл**: [NEW] `src/lib/pocketbase/services/assignmentLifecycle.ts`

Извлечь deactivation logic из `planAssignments.ts` и `seasons.ts` в единый сервис. 3 метода — см. A2 выше.

---

#### 1.1 `revertToDraft` — не деактивирует assignments

**Файл**: [plans.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/plans.ts#L437-L441)

**Фикс**:

```diff
 export async function revertToDraft(planId: string): Promise<PlanWithExercises> {
+    const { assignmentLifecycle } = await import('./assignmentLifecycle');
+    await assignmentLifecycle.deactivateForPlan(planId);
     return pb.collection(Collections.TRAINING_PLANS).update<PlanWithExercises>(planId, {
         status: 'draft',
     });
 }
```

**Error strategy**: `deactivateForPlan` отрабатывает **до** смены статуса. При ошибке — plan НЕ переходит в draft, ошибка пробрасывается вызывающему. Telemetry через `reportError()`.

---

#### 1.2 `publishPlan` — fire-and-forget → synchronous deactivation

**Файл**: [plans.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/plans.ts#L282)

**Фикс**: Заменить `void (async () => { ... })()` на `await`:

```diff
-    // 3. Non-blocking: deactivate sibling plan assignments
-    void (async () => {
+    // 3. Blocking: deactivate sibling assignments via lifecycle service
+    try {
+        const { assignmentLifecycle } = await import('./assignmentLifecycle');
+        await assignmentLifecycle.deactivateSiblings(planId, published.phase_id, published.week_number);
-    })();
+    } catch (err) {
+        const { reportError } = await import('@/lib/telemetry/errorReporter');
+        reportError(err, { action: 'publishPlan.deactivateSiblings', planId });
+    }
```

> [!NOTE]
> Snapshot + notification остаются non-blocking — они не влияют на корректность данных.

---

#### 1.3 `duplicatePlanWeek` — guard через branded type

**Файл**: [plans.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/plans.ts#L578-L647)

**Фикс**:

1. Использовать `ensurePlan()` вместо `getOrCreatePlan()` → гарантирует `DraftPlan`
2. Если destination уже published → throw с понятным сообщением
3. Soft-delete existing exercises (не hard delete)

```typescript
export async function duplicatePlanWeek(phaseId: string, fromWeek: number, toWeek: number): Promise<DraftPlan> {
    const destPlan = await ensurePlan(phaseId, toWeek);
    // ensurePlan returns DraftPlan — published plans cause throw inside ensurePlan
    
    // Soft-delete existing exercises in destination
    await softDeletePlanExercises(destPlan.id);
    
    // Copy from source
    const sourceExercises = await listPlanExercises(/* source plan */);
    // ... copy logic
    
    return destPlan;
}
```

---

#### 1.4 `assignPlanToAthlete` — lightweight getOne

**Файл**: [planAssignments.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/planAssignments.ts#L31)

**Фикс**: `getPlan()` (expand exercises) → `getOne(planId, { fields: 'id,status' })`. Экономия: 1 HTTP expand + JSON parsing на каждый вызов.

---

### Фаза 2 — Средние баги (UX + Consistency)

> Скиллы: `react-patterns` (для usePlanData), `kaizen` (JIT)

---

#### 2.1 `onBack` из WeekConstructor — `loadSeason()`

**Файл**: [SeasonDetail.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/SeasonDetail.tsx#L173-L176)

```diff
 onBack={() => {
     setViewMode('week');
     setSelectedPhase(null);
+    void loadSeason();
 }}
```

Аналогично для MultiWeekView `onBack` (L154-157).

---

#### 2.2 Split `getOrCreatePlan` → `getExistingPlan` + `ensurePlan`

**Файлы**:

- [plans.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/plans.ts#L94-L111) — добавить новые функции
- [usePlanData.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/hooks/usePlanData.ts) — использовать `getExistingPlan()`
- WeekConstructor — показать "empty week" UI если plan === null

> [!IMPORTANT]
> Это самый сложный рефакторинг в треке. WeekConstructor должен корректно работать с `null` планом и создавать его lazy при первом действии пользователя.

---

#### 2.3 Timezone fixes

**Файлы**:

- `SeasonWizard.tsx` L197: `new Date(startDate).toISOString()` → `${startDate}T12:00:00.000Z`
- `SeasonDetail.tsx` `getPhaseWeeks()`: использовать `dateHelpers`
- `usePlanData.ts` L70-75: заменить ручной weekStart расчёт на `dateHelpers`
- `seasons.ts` `validatePhasesCoverage` L375: нормализовать строки дат перед сравнением

---

#### 2.4 QuickWorkout standalone mode

**Файл**: [QuickWorkout.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/QuickWorkout.tsx#L242)

При отсутствии сезона — создать standalone план через `createPlan({ plan_type: 'standalone', ... })`.

---

### Фаза 3 — UX Improvements

> Скиллы: `architect-review`, `react-patterns`

- **3.1** Inline season editing (name, dates) в SeasonDetail
- **3.2** Warmup template selector per day в WeekConstructor
- **3.3** ExerciseAdjustmentEditor для individual dosing

---

### Фаза 4 — Tests

> Скиллы: `unit-testing-test-generate`

| Тест | Покрывает |
|---|---|
| `assignmentLifecycle.test.ts` | Все 3 метода unified service |
| `revertToDraft.test.ts` | deactivation + status change |
| `duplicatePlanWeek.test.ts` | Guard для published, soft delete |
| `assignOptimized.test.ts` | Lightweight getOne вместо getPlan |
| Update `publishPlan.test.ts` | Убрать `setTimeout` (sync deactivation) |
| Update `autoAssignment.test.ts` | Аналогичный фикс |

---

### Фаза 5 — QA + Delivery

> Скиллы: `code-review-checklist`, `conductor-validator`

#### Automated

```bash
pnpm type-check && pnpm test && pnpm build && pnpm lint
```

#### Manual QA (расширенный)

1. Revert-to-draft → assignments деактивированы
2. Duplicate в published week → ошибка
3. Back navigation → dots/progress обновились
4. Quick workout без сезона → standalone success
5. Timezone: создать сезон → даты не сдвинулись
6. **[NEW]** Concurrent publish → idempotency
7. **[NEW]** Participant change mid-session → assignments корректны
8. **[NEW]** Large group (10+) assignment → замерить время

#### Documentation

- `gate.md`, `CHANGELOG.md`, `walkthrough.md`

---

## Файлы

| Файл | Действие | Фаза |
|---|---|---|
| `services/assignmentLifecycle.ts` | **NEW** | 1.0 |
| `services/plans.ts` | MODIFY | 1.1, 1.2, 1.3, 2.2 |
| `services/planAssignments.ts` | MODIFY | 1.4 |
| `components/training/SeasonDetail.tsx` | MODIFY | 2.1, 3.1 |
| `components/training/hooks/usePlanData.ts` | MODIFY | 2.2, 2.3 |
| `components/training/SeasonWizard.tsx` | MODIFY | 2.3 |
| `components/training/QuickWorkout.tsx` | MODIFY | 2.4 |
| `services/seasons.ts` | MODIFY | 2.3 |
| `components/training/ExerciseAdjustmentEditor.tsx` | **NEW** | 3.3 |
| `__tests__/assignmentLifecycle.test.ts` | **NEW** | 4 |
| `__tests__/revertToDraft.test.ts` | **NEW** | 4 |
| `__tests__/duplicatePlanWeek.test.ts` | **NEW** | 4 |
| `__tests__/assignOptimized.test.ts` | **NEW** | 4 |
| `__tests__/publishPlan.test.ts` | MODIFY | 4 |
| i18n files | MODIFY | 3.1, 3.3 |

## Скиллы по фазам

| Фаза | Скиллы |
|---|---|
| 1 (critical) | `concise-planning` + `error-handling-patterns` + `kaizen` + `typescript-expert` |
| 2 (medium) | + `react-patterns` |
| 3 (UX) | + `architect-review` |
| 4 (tests) | + `unit-testing-test-generate` |
| 5 (delivery) | + `code-review-checklist` + `conductor-validator` |
