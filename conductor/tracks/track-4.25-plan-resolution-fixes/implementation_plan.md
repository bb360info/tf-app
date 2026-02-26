# Implementation Plan — Track 4.25: Plan Resolution & Assignment Fixes

## Описание проблемы

Система «Атлет видит план» (`getPublishedPlanForToday`) содержит 4 критических бага:
1. Дублирующийся `createIndividualOverride` — два несовместимых метода
2. SQL injection в group plan resolution
3. Нет фильтрации по `week_number` — атлет может получить план не той недели
4. Override не scoped по текущей фазе — стейл-данные из прошлых сезонов

Дополнительно: SRP нарушение (resolution в `logs.ts`), нет валидации при assign, assign UX не информативен.

---

## Proposed Changes

### Phase 0: Dead Code & SQL Injection

#### [MODIFY] [planAssignments.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/planAssignments.ts)

Удалить L106-165: `duplicatePlan()` и `createIndividualOverride()`. Эти функции — мёртвый код: `WeekConstructor.tsx` использует `createIndividualOverride` из `plans.ts` (который корректно ставит `parent_plan_id`). Версия в `planAssignments.ts` — устаревшая, не ставит `parent_plan_id`, из-за чего override невидим для Step 0 в resolution chain.

#### [MODIFY] [logs.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/logs.ts)

Fix L81-83: заменить строковую интерполяцию group IDs на `pb.filter()` с named параметрами:

```diff
-const groupFilter = groupIds
-    .map((id) => `group_id = "${id}"`)
-    .join(' || ');
-const groupAssign = await pb
-    .collection(Collections.PLAN_ASSIGNMENTS)
-    .getFirstListItem<RecordModel>(
-        pb.filter(`(${groupFilter}) && status = "active"`)
-    );
+// Build parameterized OR filter for each group_id
+const filters = groupIds.map((_, i) => `group_id = {:gid${i}}`);
+const params = Object.fromEntries(groupIds.map((id, i) => [`gid${i}`, id]));
+const groupAssign = await pb
+    .collection(Collections.PLAN_ASSIGNMENTS)
+    .getFirstListItem<RecordModel>(
+        pb.filter(`(${filters.join(' || ')}) && status = "active"`, params)
+    );
```

---

### Phase 1: SRP Refactor

#### [NEW] [planResolution.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/planResolution.ts)

Новый модуль — единственная точка ответственности за определение «какой план видит атлет сегодня». Перенести из `logs.ts`:

- `PLAN_EXPAND` const
- `todayISO()` → заменить на `todayForUser()`
- `getActivePlan(planId)` — private
- `getPublishedOverrideForAthlete(athleteId)` — private
- `getPublishedPlanViaAssignments(athleteId)` — private
- `getPublishedPlanForToday(athleteId)` — public export

`logs.ts` сохранит re-export для backward compatibility:
```typescript
export { getPublishedPlanForToday } from './planResolution';
```

#### [MODIFY] [AthleteDashboard.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/dashboard/AthleteDashboard.tsx)
#### [MODIFY] [AthleteTrainingView.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/AthleteTrainingView.tsx)
#### [MODIFY] [AthleteDetailClient.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/(protected)/dashboard/athlete/%5Bid%5D/AthleteDetailClient.tsx)

Update imports: `'@/lib/pocketbase/services/logs'` → `'@/lib/pocketbase/services/planResolution'`. Re-export в `logs.ts` обеспечит fallback, но прямые imports — чище.

---

### Phase 2: Resolution Logic Fixes

#### [MODIFY] [planResolution.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/planResolution.ts)

**Fix 1: Override scoping (Step 0)**

```diff
-'athlete_id = {:aid} && parent_plan_id != "" && status = "published" && deleted_at = ""'
+'athlete_id = {:aid} && parent_plan_id != "" && status = "published" && deleted_at = "" && phase_id.start_date <= {:today} && phase_id.end_date >= {:today}'
```

Это гарантирует, что override из прошлого сезона/фазы не перекроет текущий план.

**Fix 2: Week number в Step 3 (season fallback)**

Вычислять текущую неделю фазы:
```typescript
const phaseStart = new Date(phase.start_date);
const now = new Date(today);
const daysSinceStart = Math.floor((now.getTime() - phaseStart.getTime()) / (86400 * 1000));
const currentWeek = Math.floor(daysSinceStart / 7) + 1;

const plans = await pb.collection(Collections.TRAINING_PLANS).getFullList<PlanWithExercises>({
    filter: pb.filter(
        'phase_id = {:pid} && week_number = {:week} && status = "published" && deleted_at = "" && parent_plan_id = ""',
        { pid: phase.id, week: currentWeek }
    ),
    expand: PLAN_EXPAND,
});
```

Fallback: если нет плана для текущей недели → вернуть последний published план фазы (sort `-week_number`).

#### [NEW] [dateHelpers.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/utils/dateHelpers.ts)

```typescript
/**
 * Get today's date (YYYY-MM-DD) in the user's timezone.
 * Falls back to UTC if timezone is invalid or not provided.
 */
export function todayForUser(timezone?: string): string {
    if (!timezone) return new Date().toISOString().split('T')[0];
    try {
        return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
    } catch {
        return new Date().toISOString().split('T')[0];
    }
}
```

`en-CA` locale returns YYYY-MM-DD format natively — no need for manual formatting.

---

### Phase 3: Assignment Validation & Lifecycle

#### [MODIFY] [planAssignments.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/planAssignments.ts)

Add validation guard in `assignPlanToAthlete()` and `assignPlanToGroup()`:
```typescript
// Guard: only published plans can be assigned
const plan = await pb.collection(Collections.TRAINING_PLANS).getOne(planId, { fields: 'status' });
if (plan.status !== 'published') {
    throw new Error('assign.onlyPublished');
}
```

#### [MODIFY] [plans.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/plans.ts)

After `publishPlan()` status update — deactivate stale assignments:
```typescript
// Auto-deactivate assignments from older plans in the same phase
const olderPlans = await pb.collection(Collections.TRAINING_PLANS).getFullList({
    filter: pb.filter(
        'phase_id = {:pid} && id != {:currentId} && deleted_at = ""',
        { pid: originalPlan.phase_id, currentId: planId }
    ),
    fields: 'id',
});
for (const oldPlan of olderPlans) {
    const assignments = await pb.collection(Collections.PLAN_ASSIGNMENTS).getFullList({
        filter: pb.filter('plan_id = {:pid} && status = "active"', { pid: oldPlan.id }),
        fields: 'id',
    });
    for (const a of assignments) {
        await pb.collection(Collections.PLAN_ASSIGNMENTS).update(a.id, { status: 'inactive' });
    }
}
```

---

### Phase 4: Assign UX

#### [MODIFY] [SeasonDetail.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/SeasonDetail.tsx)

1. **Active assignments display**: При render `PhaseCard` — загружать `listActivePlanAssignments()` для published планов фазы → показывать список: «Group A, Athlete B»
2. **Unassign button**: Для каждого assignment — кнопка × → `unassignPlan(assignmentId)`
3. **Duplicate check**: В `handleAssign` — проверять существующие assignments перед созданием
4. **Plan name preview**: Показывать «Assigning: Week N» перед confirm

---

## Verification Plan

### Automated Tests
- `pnpm type-check` — TypeScript compilation
- `pnpm build` — Static export
- `pnpm test` — Unit tests (новые + существующие)

### Manual Verification
- Создать план → publish → assign группе → войти как атлет → увидеть правильный план
- Создать override → verify Step 0 приоритет > Step 2
- Перейти к Week 2 (изменить системную дату) → verify resolution возвращает Week 2
- Создать override в прошлом сезоне → verify он НЕ отображается в текущем
- Assign → Unassign → verify атлет больше не видит план
- Publish новый план → verify старые assignments auto-deactivated
