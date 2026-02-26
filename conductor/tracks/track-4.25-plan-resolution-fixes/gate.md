# Gate 4.25 — Plan Resolution & Assignment Fixes

> **Цель:** Фикс критических багов в plan resolution chain (override scoping, week_number, SQL injection), удаление дублирующей override-логики, SRP рефакторинг, timezone-aware dates, UX улучшения assign flow.

## Phase 0: Dead Code & SQL Injection
**Скиллы:** `concise-planning`, `lint-and-validate`, `architect-review`

- [ ] Удалить `createIndividualOverride(sourcePlanId, athleteId, athleteName?)` из `planAssignments.ts` (L157-L165)
- [ ] Удалить `duplicatePlan(planId, newName?)` из `planAssignments.ts` (L112-L152) — используется только удаляемым `createIndividualOverride`
- [ ] SQL injection fix: `logs.ts:getPublishedPlanViaAssignments` L81-83 — string interpolation `group_id = "${id}"` → `pb.filter()` с параметрами
- [ ] Verify: `WeekConstructor.tsx` L234 — imports from `plans.ts` (correct source) — no change needed
- [ ] `pnpm type-check` → Exit 0
- [ ] `pnpm build` → Exit 0

## Phase 1: Plan Resolution SRP Refactor
**Скиллы:** `concise-planning`, `lint-and-validate`, `code-refactoring-refactor-clean`, `typescript-expert`

- [ ] Создать `src/lib/pocketbase/services/planResolution.ts` — вынести из `logs.ts`:
  - `getPublishedPlanForToday(athleteId)`
  - `getPublishedOverrideForAthlete(athleteId)` (private)
  - `getPublishedPlanViaAssignments(athleteId)` (private)
  - `getActivePlan(planId)` (private helper)
  - `todayISO()` (private)
  - `PLAN_EXPAND` (const)
- [ ] `logs.ts` — удалить перенесённые функции, добавить re-export: `export { getPublishedPlanForToday } from './planResolution'`
- [ ] Update imports: `AthleteDashboard.tsx`, `AthleteTrainingView.tsx`, `AthleteDetailClient.tsx` — `'@/lib/pocketbase/services/logs'` → `'@/lib/pocketbase/services/planResolution'`
- [ ] `pnpm type-check` → Exit 0
- [ ] `pnpm build` → Exit 0

## Phase 2: Plan Resolution Logic Fixes
**Скиллы:** `concise-planning`, `lint-and-validate`, `systematic-debugging`, `typescript-expert`

- [ ] Fix `getPublishedOverrideForAthlete()` — добавить phase/date scope: `phase_id.start_date <= today && phase_id.end_date >= today` (или join через `phase_id.season_id`)
- [ ] Fix `getPublishedPlanForToday()` Step 3 — вычислять текущий `week_number` от `phase.start_date` и фильтровать по нему
- [ ] Timezone helper: `lib/utils/dateHelpers.ts` — `todayForUser(timezone?: string): string` (return YYYY-MM-DD в timezone пользователя/группы, fallback UTC)
- [ ] Интегрировать `todayForUser()` в `planResolution.ts` — использовать timezone из user profile или group
- [ ] Unit test: `getPublishedOverrideForAthlete` — override из прошлого сезона НЕ возвращается
- [ ] Unit test: `getPublishedPlanForToday` Step 3 — возвращает план текущей недели, а не первый попавшийся
- [ ] `pnpm type-check` → Exit 0
- [ ] `pnpm test` → Pass

## Phase 3: Assignment Validation & Lifecycle
**Скиллы:** `concise-planning`, `lint-and-validate`, `architect-review`

- [ ] `planAssignments.ts:assignPlanToAthlete()` — guard: verify `plan.status === 'published'` перед созданием assignment
- [ ] `planAssignments.ts:assignPlanToGroup()` — guard: verify `plan.status === 'published'`
- [ ] `plans.ts:publishPlan()` — после публикации: auto-deactivate assignments от предыдущих планов той же фазы (status → `'inactive'`)
- [ ] `SeasonDetail.tsx:handleAssign` — показывать имя назначаемого плана (Week N) перед confirm
- [ ] `pnpm type-check` → Exit 0
- [ ] `pnpm build` → Exit 0

## Phase 4: Assign UX Improvements
**Скиллы:** `concise-planning`, `lint-and-validate`, `react-best-practices`, `jumpedia-design-system`

- [ ] `SeasonDetail.tsx:PhaseCard` — показывать список активных assignments (badge: «Assigned to: Group A, Athlete B»)
- [ ] `SeasonDetail.tsx:PhaseCard` — кнопка Unassign для каждого активного assignment
- [ ] `SeasonDetail.tsx:handleAssign` — check duplicate: если план уже назначен выбранной группе/атлету → показать warning вместо повторного назначения
- [ ] i18n ×3 (RU/EN/CN): `assignedTo`, `unassign`, `alreadyAssigned`, `planName` labels
- [ ] `pnpm type-check` → Exit 0
- [ ] `pnpm build` → Exit 0

## Phase 5: Verification
**Скиллы:** `lint-and-validate`, `verification-before-completion`

- [ ] `pnpm type-check` → Exit 0
- [ ] `pnpm build` → Exit 0
- [ ] `pnpm test` → All pass
- [ ] Manual: создать план → publish → assign группе → зайти как атлет → увидеть правильный план
- [ ] Manual: создать override → verify Step 0 > Step 2
- [ ] Manual: перейти к следующей неделе → verify week_number resolution
- [ ] Обновить CHANGELOG.md
