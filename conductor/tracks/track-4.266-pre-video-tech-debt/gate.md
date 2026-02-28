# Gate — Track 4.266: Pre-Video Tech Debt & Polish (v2)

> **Цель:** Устранить критический техдолг перед Track 5 (Video + MediaPipe): типобезопасность, производительность, таймзоны, монолиты.
> **Зависимость:** Track 4.265 (Season-Level Assignment) ✅ Done
> **Детальный план:** см. `implementation_plan.md` в этой директории

---

## Phase 1: Logic Fixes — log_mode, timezone, DST

> 🛠 Skills: `typescript-expert` + `lint-and-validate` (always)

- [x] **[1.1 log_mode live]** `AthleteTrainingView.tsx` → `handleStartFocus`: рефакторить в async, добавить `getOrCreateLog(..., 'live')` и `setFocusLogId(log.id)`
- [x] **[1.2 log_mode post]** `AthleteTrainingView.tsx` → `handleOpenPostFactum` (L597): добавить 5-й аргумент `'post_express'` в `getOrCreateLog`
- [x] **[1.3 getUserTimezone]** `notificationPreferences.ts`: добавить `export async function getUserTimezone(userId: string): Promise<string>` — вызов `getPreferences()` (read-only, НЕ getOrCreate), fallback → `Intl.DateTimeFormat().resolvedOptions().timeZone`
- [x] **[1.4 planResolution tz]** `planResolution.ts → getPublishedPlanForToday`: получить userId через `pb.authStore.record?.id`, вызвать `getUserTimezone(userId)`, передать в `todayForUser(tz)`
- [x] **[1.5a DST calcWeekNumber]** `dateHelpers.ts`: добавить `diffCalendarDays(from: string, to: string): number` (T12:00Z trick); обновить `calcWeekNumber` в `planResolution.ts` чтобы использовал `diffCalendarDays`
- [x] **[1.5b DST getWeekStart + DRY]** `dateHelpers.ts`: исправить `getWeekStart()` (та же DST-уязвимость через `setDate()`); добавить `getWeekDayDate(weekStart: Date, dayIndex: number): Date`

---

## Phase 2: TypeScript Poka-Yoke

> 🛠 Skills: `typescript-expert` + `lint-and-validate` (always)

- [x] **[2.1 strict type]** `plans.ts`: заменить `PlanExerciseWithExpand = PlanExercisesRecord & RecordModel & {...}` на строгий `interface PlanExerciseStrict` (все поля явно, нет `[key: string]: any`). Тип alias `PlanExerciseWithExpand = PlanExerciseStrict` для backward-compat. `pnpm type-check` — TS должен ловить опечатки.
- [x] **[2.2 override boundary]** ⚠️ ИСПРАВЛЕН ОТ ОРИГИНАЛА: `plans.ts → createIndividualOverride`: добавить `start_date: today` при создании. `planResolution.ts → getPublishedOverrideForAthlete`: принять `today: string`, вычислить `cutoff = today - 14 days`, добавить `start_date >= {:cutoff}` в фильтр (БД имеет поле `start_date`, тип date — подтверждено). НЕ фильтровать по `week_number`.
- [x] **[2.3 N+1 batch]** `planResolution.ts → applyAdjustments`: заменить N запросов на один `getFullList` с OR-фильтром по всем `plan_exercise_id`. UNIQUE INDEX `(plan_exercise_id, athlete_id)` гарантирует ≤1 результат на пару. Проверить: skip убирает упражнение; override-поля применяются; `_adjusted: true` выставляется.

---

## Phase 3: Monolith Refactoring

> 🛠 Skills: `code-refactoring-refactor-clean` + `lint-and-validate` (always)
> ⚠️ СТРОГО итерационный: после каждого шага → `pnpm type-check && pnpm build`

- [x] **[3.1 DRY helpers]** Удалить локальные `getDayDate` (WeekConstructor L534) и `getWeekStart`/`getDayDate` (AthleteTrainingView L102-116). Импортировать `getWeekDayDate` из `dateHelpers.ts`.
- [x] **[3.2 useWeekNavigation]** `src/components/training/hooks/useWeekNavigation.ts` [NEW]: вынести из `WeekConstructor` — `weekNumber`, `handlePrevWeek`, `handleNextWeek`, `getDayDate(dayIndex)`. Интерфейс: `{ maxWeeks, startDate?, initialWeek? }`.
- [x] **[3.3 useTemplatePicker]** `src/components/training/hooks/useTemplatePicker.ts` [NEW]: вынести — `templatePanelTarget`, `showWarmupPanel`, `handleApplyTemplate`, `handleApplyWarmupToWeek`. Интерфейс: `{ plan, exercises, loadPlan }`.
- [x] **[3.4 useDayConstructor]** `src/components/training/hooks/useDayConstructor.ts` [NEW]: вынести — `activeDay`, `pickerDay`, `pickerSession`, `pickerMode`, `handleAddWarmupFromCatalog`, `handleEjectWarmup`. Интерфейс: `{ plan, loadPlan }`.
- [x] **[3.5 verify size]** `wc -l src/components/training/WeekConstructor.tsx` → **437 строк** ✅ `< 450`
- [x] **[3.6 build check]** `pnpm build` + `pnpm type-check` — **ноль ошибок** ✅

---

## Phase 4: Unit Tests

> 🛠 Skills: `unit-testing-test-generate` + `lint-and-validate` (always)
> ⚠️ [4.3] писать СТРОГО ПОСЛЕ завершения [2.3]. Паттерн мока pb — из `publishPlan.test.ts`.

- [x] **[4.1 dateHelpers.test.ts]** `src/lib/utils/__tests__/dateHelpers.test.ts` [NEW]: `diffCalendarDays` — DST boundary US (2024-03-10→11 = 1 день), EU (2024-10-27→28 = 1 день), same day = 0; `getWeekDayDate(monday, 0)` = Monday, `(monday, 6)` = Sunday; `todayForUser('Asia/Shanghai')` формат `YYYY-MM-DD`
- [x] **[4.2 planResolution.test.ts]** `src/lib/pocketbase/services/__tests__/planResolution.test.ts` [NEW]: `calcWeekNumber('2024-03-10', '2024-03-17')` → `2` (не `1`); edge-case: day=1 → week=1; day=7 → week=1; day=8 → week=2
- [x] **[4.3 applyAdjustments.test.ts]** `src/lib/pocketbase/services/__tests__/applyAdjustments.test.ts` [NEW]: `getFullList` вызван ровно 1 раз для N упражнений; `skip=true` — упражнение исключается; override-поля применяются; `_adjusted: true`; пустой массив → нет запроса к БД
- [x] **[4.4 qa script]** `scripts/qa-preview.sh` [NEW] + `"qa"`/`"qa:fast"` в `package.json`

---

## Phase 5: QA + Delivery

> 🛠 Skills: `verification-before-completion` (загрузить обязательно!)

- [x] `pnpm type-check` → ноль ошибок
- [x] `pnpm test` → все зелёные (включая 3 новых файла)
- [x] `pnpm lint` → ноль предупреждений
- [x] `pnpm build` → чистый `out/`
- [x] Ручная QA timezone: `Asia/Shanghai` в `notification_preferences` → план соответствует дате по Шанхаю
- [x] Ручная QA override boundary: создать override → `start_date` поставить 15+ дней назад через PocketBase Admin → старый override не перекрывает план
- [x] `wc -l src/components/training/WeekConstructor.tsx` → `< 450`
- [x] Обновить `CHANGELOG.md`
- [x] Написать `walkthrough.md`
