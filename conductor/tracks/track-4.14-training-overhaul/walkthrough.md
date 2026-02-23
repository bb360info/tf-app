# Track 4.14 — Training System Overhaul: Walkthrough

## Результат

Track 4.14 завершён. Четыре фазы полностью реализованы, все автотесты и build прошли.

## Что изменилось

### Фаза 1: Data Model (PocketBase Schema + TypeScript Types)
- `TrainingLogsRecord` с полем `session` (0=AM, 1=PM)
- `PlanExercisesRecord` с `weight`, `duration`, `distance`, `rest_seconds`, `session`, `unit_type`
- `PlanAssignmentsRecord` — новая коллекция
- Все типы в `types.ts`

### Фаза 2: Multi-Session AM/PM + Unit-Aware Plan Editing
- **`plans.ts`**: `addExerciseToPlan(session)`, `groupByDayAndSession()`, `updatePlanExercise` с unit fields
- **`DayColumn.tsx`**: AM/PM заголовки (☀ УТ / 🌙 ВТ), кнопка «+ ВТ», unit-aware ExerciseCard:
  - `weight` → `3×8 @60kg`
  - `distance` → `3×100m`
  - `time` → `3×30s`
  - `reps` → `3×8 @80%`
- **`WeekConstructor.tsx`**: `pickerSession` state, `handleAddExercise` передаёт session

### Фаза 3: Unified Athlete Logging + 7-Day Week View
- **`logs.ts`**: единый unified модуль — `getPublishedPlanForToday`, `listTodayLogs`, `createTrainingLog`, `listWeekLogs`, `getOrCreateLog(session)`
- **`trainingLogs.ts`** → re-export shim (backward-compatible)
- **`AthleteTrainingView.tsx`**: 7-day scroll view, week navigation (← →), AM/PM session группировка, weekly log map
- **`TrainingLog.tsx`**: `session` prop → `getOrCreateLog`

### Фаза 4: Plan Assignments + Group Members UI
- **`planAssignments.ts`**: `assignPlanToAthlete`, `assignPlanToGroup`, `duplicatePlan`, `createIndividualOverride`
- **`groups.ts`**: `listGroupMembers`, `removeGroupMember`, `updateGroup`, `deleteGroup`
- **`SeasonDetail.tsx`**: кнопка «Assign» в PhaseCard → AssignPanel
- **`GroupsPage`**: collapsible members panel, delete group, remove member

## Верификация

| Проверка | Результат |
|----------|-----------|
| `pnpm type-check` | ✅ exit 0 |
| `pnpm build` | ✅ exit 0 (65 страниц) |
| `pnpm test` | ✅ 16/16 pass |
| Браузер: /ru/training | ✅ Загружается, Assign кнопки видны |
| Браузер: /ru/settings/groups | ✅ Загружается, members/delete UI |

## Скриншот
![Groups Page QA](/Users/bogdan/.gemini/antigravity/brain/9e2e5385-59fd-4d89-9194-c099efda1de6/groups_page_with_member_ui_1771690968870.png)

## Видео QA
![Browser QA Recording](/Users/bogdan/.gemini/antigravity/brain/9e2e5385-59fd-4d89-9194-c099efda1de6/qa_track_414_browser_1771690938669.webp)
