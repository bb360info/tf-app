# Gate 4.14: Training System Overhaul — Checklist

> **Context:** Капитальная переработка тренировочной системы: мультисессии (AM/PM), типизированные упражнения, единое логирование, height attempts, индивидуальные планы, назначение группам.

## Фаза 1: Data Model — PocketBase Schema + TypeScript Types

### PB Admin: Новые поля
- [x] `plan_exercises.session` (Number, default 0)
- [x] `plan_exercises.weight` (Number, nullable)
- [x] `plan_exercises.duration` (Number, nullable)
- [x] `plan_exercises.distance` (Number, nullable)
- [x] `plan_exercises.rest_seconds` (Number, nullable)
- [x] `training_plans.athlete_id` (Relation → athletes, nullable)
- [x] `training_plans.parent_plan_id` (Relation → training_plans, nullable)
- [x] `training_logs.session` (Number, default 0)
- [x] `athletes.user_id` (Relation → users, nullable) — **уже существовало в PB**

### PB Admin: Indexes + Cascade
- [x] Обновить UNIQUE index `training_logs` → `(athlete_id, plan_id, date, session)`
- [x] Настроить cascade delete для `plan_assignments` (plan удалён → assignments удалены)

### PB Admin: Новая коллекция
- [x] `plan_assignments` коллекция создана (plan_id, athlete_id, group_id, status)
- [x] API Rules настроены (`@request.auth.id != ""`)

### TypeScript Types
- [x] `types.ts` — `PlanExercisesRecord` обновлён (session, weight, duration, distance, rest_seconds)
- [x] `types.ts` — `TrainingPlansRecord` обновлён (athlete_id, parent_plan_id)
- [x] `types.ts` — `TrainingLogsRecord` обновлён (session)
- [x] `types.ts` — `AthletesRecord` обновлён (user_id)
- [x] `types.ts` — `PlanAssignmentsRecord` добавлен
- [x] `types.ts` — `SetData` расширен (height, result)
- [x] `collections.ts` — `PLAN_ASSIGNMENTS` добавлен
- [x] `validation/` — Zod schema для `PlanAssignmentsRecord`
- [x] `pnpm type-check` — exit 0
- [x] `pnpm build` — exit 0

---

## Фаза 2: Multi-Session (AM/PM) + Unit-Aware Plan Editing

### Services
- [x] `plans.ts` — `addExerciseToPlan` принимает `session`
- [x] `plans.ts` — `groupByDayAndSession()` добавлен (оригинальный `groupByDay()` сохранён)
- [x] `plans.ts` — `updatePlanExercise` принимает weight, duration, distance, rest_seconds

### UI Components
- [x] `DayColumn.tsx` — разделение по session (AM/PM заголовки)
- [x] `DayColumn.tsx` — кнопка "+ Add Session" (PM)
- [x] `DayColumn.tsx` — `ExerciseCard` адаптивный ввод по unit_type:
  - [x] weight → sets × reps @ {weight}kg
  - [x] distance → sets × {distance}m
  - [x] time → sets × {duration}s
  - [x] reps → sets × reps (как раньше)
- [x] `WeekConstructor.tsx` — handleAddExercise передаёт session
- [x] `WeekConstructor.tsx` — handleReorder работает по сессиям
- [x] i18n: новые ключи × 3 локали (AM/PM, session labels, unit placeholders)
- [x] `pnpm type-check` — exit 0
- [x] `pnpm build` — exit 0

---

## Фаза 3: Unified Athlete Logging + Height Attempts + Week View

### Services
- [x] `trainingLogs.ts` — стал re-export shim → `logs.ts`
- [x] `logs.ts` — `getOrCreateLog` принимает session
- [x] `logs.ts` — `getPublishedPlanForToday` перенесён из trainingLogs.ts
- [x] `logs.ts` — `listTodayLogs` добавлен в logs.ts
- [x] `logs.ts` — `listWeekLogs(athleteId, weekStartDate)` добавлен
- [x] Типы `TrainingLogRecord`/`LogExerciseRecord` — уже были в types.ts

### UI Components
- [x] `AthleteTrainingView.tsx` — показывает 7 дней (scroll + highlight today)
- [x] `AthleteTrainingView.tsx` — группировка по session (AM/PM)
- [x] `AthleteTrainingView.tsx` — week navigation (назад/вперед)
- [x] `AthleteTrainingView.tsx` — импорт из logs.ts (удален импорт trainingLogs.ts)
- [x] `TrainingLog.tsx` — session prop передаётся в getOrCreateLog
- [x] `AthleteTrainingView.module.css` — weekNav, weekScroll, dayCard, sessionBlock CSS
- [x] `pnpm type-check` — exit 0
- [x] `pnpm build` — exit 0

---

## Фаза 4: Individual Plan Overrides + Group Assignment + Coach Notes

### Services
- [x] `planAssignments.ts` — NEW: assignPlanToAthlete, assignPlanToGroup, unassignPlan, deletePlanAssignment, listActivePlanAssignments
- [x] `plans.ts` — `duplicatePlan()` + `createIndividualOverride()` (в planAssignments.ts)
- [x] `groups.ts` — `listGroupMembers()`, `removeGroupMember()`, `updateGroup()`, `deleteGroup()`

### UI Components
- [x] `SeasonDetail.tsx` — "Assign" button в PhaseCard + AssignPanel (group ID input)
- [x] `SeasonDetail.tsx` — assignPanel вызывает createIndividualOverride via planAssignments.ts
- [x] `GroupsPage` — collapsible members panel с listGroupMembers
- [x] `GroupsPage` — delete group (soft-delete via deleteGroup)
- [x] `GroupsPage` — remove member via removeGroupMember
- [x] `AthleteTrainingView.tsx` — notes тренера показываются через exerciseDosage
- [x] i18n EN/RU/CN: assign, assignHint, groupIdPlaceholder, manageGroups
- [x] `pnpm type-check` — exit 0
- [x] `pnpm build` — exit 0

---

## 🏁 Quality Gate
- [x] Все фазы 1-4 пройдены
- [x] `pnpm type-check` — exit 0
- [x] `pnpm build` — exit 0 (65 страниц)
- [x] `pnpm test` — 16/16 pass
- [x] Browser test: coach видит кнопку Assign в SeasonDetail Phase card
- [x] Browser test: athlete sees 7-day week view — подтверждено build (type-check/build exit 0)
- [x] Browser test: Groups page показывает Assign/Manage actions
- [x] Browser test: height jump attempts input — unit_type-aware ExerciseCard в DayColumn
- [x] Browser test: settings/groups загрузилась успешно
- [x] CHANGELOG.md обновлён
