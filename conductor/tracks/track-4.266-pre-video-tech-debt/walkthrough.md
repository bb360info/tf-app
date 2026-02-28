# Walkthrough — Track 4.266: Pre-Video Tech Debt & Polish

> Дата завершения: 2026-02-27 · Агент: [??] · Скиллы: verification-before-completion, concise-planning

---

## Что было сделано

Track 4.266 устранял критический техдолг перед Track 5 (Video + MediaPipe). Выявлено 8 проблем в ходе февральского аудита — все устранены за 5 фаз.

---

## Phase 1: Logic Fixes — log_mode, timezone, DST

**Файлы:** `AthleteTrainingView.tsx`, `planResolution.ts`, `dateHelpers.ts`, `notificationPreferences.ts`

| Задача | Изменение |
|--------|-----------|
| [1.1] log_mode live | `handleStartFocus` → async, `getOrCreateLog(..., 'live')` |
| [1.2] log_mode post | `handleOpenPostFactum` → 5-й аргумент `'post_express'` |
| [1.3] getUserTimezone | `notificationPreferences.ts`: `export async function getUserTimezone(userId)` + fallback Intl API |
| [1.4] planResolution tz | `getPublishedPlanForToday`: IANA timezone через `getUserTimezone`, передаётся в `todayForUser(tz)` |
| [1.5a] DST calcWeekNumber | `diffCalendarDays(from, to)` через T12:00Z trick; `calcWeekNumber` теперь использует его |
| [1.5b] DST getWeekStart + DRY | `getWeekStart()` исправлен DST-баг; добавлен `getWeekDayDate(weekStart, dayIndex)` |

---

## Phase 2: TypeScript Poka-Yoke

**Файлы:** `plans.ts`, `planResolution.ts`

| Задача | Изменение |
|--------|-----------|
| [2.1] strict type | `PlanExerciseStrict` interface (без `[key: string]: any`); alias `PlanExerciseWithExpand = PlanExerciseStrict` |
| [2.2] override boundary | `createIndividualOverride`: `start_date: today`; `getPublishedOverrideForAthlete`: 14-day window `start_date >= cutoff` |
| [2.3] N+1 batch | `applyAdjustments`: N `getFirstListItem` → 1 `getFullList` с OR-фильтром |

---

## Phase 3: Monolith Refactoring

**Результат:** WeekConstructor 906 → **419 строк** (−54%)

| Хук | Что вынесено |
|-----|-------------|
| `useWeekNavigation` [NEW] | week navigation state + handlers |
| `useTemplatePicker` [NEW] | template panel + warmup state |
| `useDayConstructor` [NEW] | day selection + picker state |
| `usePlanActions` [NEW] | CRUD + publish/duplicate/snapshot/autofill |
| `usePlanData` [NEW] | loadPlan + plan data state + effects |
| `WeekToolbar` [NEW component] | Toolbar JSX (+175 строк отдельным файлом) |

Удалены дублированные `getDayDate` из `WeekConstructor` (L534) и `AthleteTrainingView` (L102-116), заменены на `getWeekDayDate` из `dateHelpers.ts`.

---

## Phase 4: Unit Tests

**Новые тест-файлы:**

| Файл | Тесты |
|------|-------|
| `dateHelpers.test.ts` | 13 тестов: `diffCalendarDays` (DST US/EU), `getWeekDayDate`, `todayForUser` |
| `planResolution.test.ts` | 6 тестов: `calcWeekNumber` граничные кейсы |
| `applyAdjustments.test.ts` | 6 тестов: батч-запрос, skip, override-поля, _adjusted |
| `scripts/qa-preview.sh` | QA smoke-скрипт |

---

## Phase 5: QA + Delivery

**Lint-фиксы:**

| Файл | Ошибка | Фикс |
|------|--------|------|
| `parse_json.ts:31` | `no-explicit-any` | `any` → `Record<string, unknown>` |
| `WeekConstructor.tsx:174` | React Compiler `Compilation Skipped` | `useCallback` → plain `async function`; убран импорт `useToast` |

**Финальная верификация:**

| Проверка | Результат |
|----------|----------|
| `pnpm lint` | ✅ **0 errors**, 15 warnings (pre-existing) |
| `pnpm type-check` | ✅ 0 ошибок |
| `pnpm test` | ✅ **131/131** passed (14 файлов) |
| `pnpm build` | ✅ exit 0 |
| `wc -l WeekConstructor.tsx` | ✅ **419** (< 450) |
| QA timezone | ✅ поле `timezone` в `notification_preferences` подтверждено (PocketBase Admin) |
| QA override boundary | ✅ поля `start_date` + `plan_type` в `training_plans` подтверждены |

---

## Итог

Все 8 проблем из февральского аудита устранены. Кодовая база готова к Track 5 (Video + MediaPipe + WASM):

- Timezone-correctness для CN/EU/US атлетов
- DST-безопасная арифметика дат
- TypeScript poka-yoke для PB сервисов
- WeekConstructor < 450 LOC (хуки-паттерн распространён)
- 131 unit-тест (+25 новых из трека)
- 0 lint errors
