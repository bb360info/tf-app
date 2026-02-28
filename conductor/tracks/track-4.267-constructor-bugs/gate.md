# Track 4.267 — Constructor Bugs

## Gate Checklist

### Phase 1 — Critical Bugs (Data Loss + Race Conditions) ✅
>
> Скиллы: `error-handling-patterns`, `kaizen`, `typescript-expert`

- [x] 1.0 Create `assignmentLifecycle.ts` — unified deactivation service
- [x] 1.1 `revertToDraft()` uses `assignmentLifecycle.deactivateForPlan()`
- [x] 1.2 `publishPlan()` sibling deactivation is synchronous + telemetry
- [x] 1.3 `duplicatePlanWeek()` guards against published destination plans
- [x] 1.4 `assignPlanToAthlete()` + `assignPlanToGroup()` lightweight `getOne`
- [x] Bonus: `clearSeasonAssignments()` delegates to lifecycle service
- [x] Bonus: `publishPlan.test.ts` updated for lifecycle service pattern

### Phase 2 — Medium Bugs (UX + Consistency)
>
> Скиллы: + `react-patterns`

- [x] 2.1 `onBack` from WeekConstructor/MultiWeekView calls `loadSeason()`
- [x] 2.2 Split `getOrCreatePlan` → `getExistingPlan` + `ensurePlan` + empty week UI
- [x] 2.3 Timezone fixes (SeasonWizard handleSave + phases, usePlanData weekStart)
- [x] 2.4 QuickWorkout standalone mode (no season required)

### Phase 3 — UX Improvements
>
> Скиллы: + `architect-review`

- [x] 3.1 Inline season editing (name, dates)
- [x] 3.2 Warmup template selector per day in WeekConstructor
- [x] 3.3 ExerciseAdjustmentEditor UI for individual dosing
  - [x] 3.3a ExerciseAdjustmentPanel.tsx (overlay form) ✅
  - [x] 3.3b UserCog button in ExerciseRow → DayConstructor → WeekConstructor ✅

### Phase 4 — Tests
>
> Скиллы: + `unit-testing-test-generate`

- [x] 4.1 New: `assignmentLifecycle.test.ts`
- [x] 4.2 New: `revertToDraft.test.ts`
- [x] 4.3 New: `duplicatePlanWeek.test.ts`
- [x] 4.4 New: `assignOptimized.test.ts`
- [x] 4.5 Update `publishPlan.test.ts` (done with Phase 1)

### Phase 5 — QA + Delivery
>
> Скиллы: + `code-review-checklist`, `conductor-validator`

- [x] 5.1 `pnpm type-check` ✅
- [x] 5.2 `pnpm test` ✅ (131/131)
- [x] 5.3 `pnpm build` ✅
- [ ] 5.4 Manual QA (8 scenarios)
- [x] 5.5 Update CHANGELOG.md
- [x] 5.6 Write walkthrough.md ✅

## Goals

- Устранить все баги потери данных через unified `AssignmentLifecycleService`
- Использовать branded types (`DraftPlan` / `PublishedPlan`) для Poka-Yoke
- Split `getOrCreatePlan` для устранения мусорных drafts
- Улучшить UX: inline editing, warmup per day, individual dosing
- Добавить standalone Quick Workouts
- Покрыть фиксы unit-тестами
- Error telemetry через `@/lib/telemetry/`
