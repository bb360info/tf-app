# Bug Report — Track 4.24 Audit (2026-02-24, rev.2)

**Источник:** глубокий аудит реализации трека 4.24 по реальному коду + PocketBase MCP schema verification.
**Статус проверок:** `pnpm lint` ❌ · `pnpm type-check` ✅ · `pnpm test` ✅ · `pnpm build` ✅
**Rev.2:** Повторный аудит — 3 ложных бага исправлены, 9 новых обнаружены.

---

## 🔴 CRITICAL — Нерабочие маршруты

### 1. `/training/review` → 404 (Coach Review Tab)

- **Файл:** `src/components/shared/BottomTabBar.tsx:35`
- **Код:** `COACH_TABS` → `{ key: 'review', path: '/training/review', ... }`
- **Факт:** страница `src/app/[locale]/(protected)/training/review/` **не существует**.
- **Последствие:** тренер нажимает Review → 404. Основной coach workflow сломан.

### 2. `/training/today` → 404 (Start Workout CTA)

- **Файл:** `src/components/dashboard/athlete/TodayWorkoutCard.tsx:26`
- **Код:** `<Link href="/training/today">Start Workout</Link>`
- **Факт:** страницы `/training/today` нет.

### 3. `/dashboard/notifications` → 404 (View all)

- **Файл:** `src/components/dashboard/athlete/RecentNotifications.tsx:34`
- **Код:** `<Link href="/dashboard/notifications">View all</Link>`
- **Факт:** реальный маршрут — `/notifications`.

---

## 🔴 CRITICAL — Объявлено, но не реализовано

### 4. Template Panel — Apply кнопка отсутствует в TemplateList ⚠️ УТОЧНЕНО

- **Верно:** `TemplatePanel.tsx` → `TemplatePanelContent.tsx` цепочка onApply **работает**
- **Баг:** `TemplateList.tsx` — нет prop `onApply`, нет кнопки Apply (только Copy/Edit/Delete)
- **Последствие:** Apply не доступен конечному пользователю

### 5. Drag-and-drop reorder — не сохраняется

- **Файлы:**
  - `DayConstructor.tsx:37` — prop `onReorderDrag?: (updates: {id, order}[]) => void`
  - `DayConstructor.tsx:126-144` — `handleDragEnd` вызывает `onReorderDrag(updates)`
  - `WeekConstructor.tsx` — grep по `onReorderDrag` → **0 результатов** (prop не передаётся)
- **Последствие:** пользователь перетаскивает упражнения — визуально работает, в БД не сохраняется.

### ~~6. Assign UX в SeasonDetail — ЛОЖНЫЙ БАГ~~ ❌ УДАЛЁН

> **Повторный аудит (rev.2):** `SeasonDetail.tsx` содержит полную реализацию Assign UX:
>
> - `PhaseCard` (355-666): handleAssign, handleUnassign, badges, plan selector, preview
> - `planAssignments.ts`: duplicate check (reactivate existing) уже есть
> - Этот пункт **ошибочен** в оригинальном отчёте.

---

## 🔴 NEW — Обращение к несуществующим полям PB schema

### NEW-1. TodayWorkoutCard — обращается к несуществующим полям

- **Файл:** `src/components/dashboard/athlete/TodayWorkoutCard.tsx`
- **PB schema `training_plans`:** поля `name` и `focus` **не существуют** (подтверждено через PB MCP)
- **Строки:**
  - L19: `plan.name` → undefined (fallback "Today's Workout" всегда срабатывает)
  - L20: `plan.focus` → undefined (никогда не рендерится)
  - L23: `plan.expand?.plan_exercises?.length` — неверный expand path, должен быть `plan.expand?.['plan_exercises(plan_id)']?.length`
- **Последствие:** всегда отображается "Today's Workout", "0 blocks planned"

---

## 🟠 HIGH — Логические ошибки данных

### 7. `self` в фильтре сезонов

- **Файл:** `src/app/[locale]/(protected)/training/page.tsx:177`
- **Код:** `<option value="self">` → `listSeasons("self")` → PocketBase не находит ничего

### 8. `is_read` vs `read` — неверное поле

- **Файл:** `src/components/dashboard/athlete/RecentNotifications.tsx:17`
- **Код:** `filter: '... && is_read = false'`
- **PB MCP:** поле называется `read` (boolean), не `is_read`

### 8a. RecentNotifications — не использует сервис

- Прямой `pb.collection().getList()` вместо `listUnread()` из `notifications.ts`.

### 9. `listSeasons()` в athlete context — неверный фильтр

- **Файл:** `src/components/dashboard/AthleteDashboard.tsx:111`
- **Нужно:** `listSeasonsForAthlete(athleteId)`

### 10. WeeklyHeatmap — **не хитмап, а volume delta card**

- **Gate:** «7-cell heatmap, 5 states»
- **Факт:** `WeeklyHeatmap.tsx` (37 LOC) — показывает `current`, `previous`, `delta`.

### 11. StatsStrip — неверные метрики

- **AthleteDashboard.tsx:135-139:** передаёт Date/Volume/Competitions вместо PR/Streak/CNS%/VolumeDelta

### NEW-2. `todayISO()` — UTC вместо timezone-aware

- **Файл:** `AthleteDashboard.tsx:44-46`
- **Код:** `new Date().toISOString().slice(0, 10)` — UTC дата
- **Нужно:** `todayForUser()` из `dateHelpers.ts` (уже есть в проекте, Phase 3 добавил)
- **Последствие:** для UTC+8 (Китай) дата может отличаться на ±1 день

---

## 🟠 NEW — Security: String Interpolation (35+ мест)

### NEW-3. Строковая интерполяция в PB filter вместо pb.filter()

Оригинальный отчёт указывал только `seasons.ts:36`. Реальный масштаб — **25 мест в 10 файлах** (rev.4):

| Файл | Кол-во мест | Строки |
|------|------------|--------|
| `exercises.ts` | 5 | 38, 44, 48, 52, 56 |
| `achievements.ts` | 4 | 188, 201, 206, 210 |
| `seasons.ts` | 4 | 36, 40, 102, 164 |
| `trainingLoad.ts` | 3 | 43, 52, 64 |
| `templates.ts` | 3 | 173, 310, 349 |
| `snapshots.ts` | 2 | 17, 38 🆕 rev.4 |
| `customExercises.ts` | 1 | 61 (L104 = hardcoded enum) |
| `readinessHistory.ts` | 1 | 31 |
| `preferences.ts` | 1 | 28 |

> ~~`testResults.ts`~~ — ❌ удалён (ложный позитив: L132-133 — конструкция переменных, сами запросы уже используют `pb.filter()`).

### NEW-4. `pb.authStore.model` deprecated (PB v0.23+)

5 файлов используют deprecated API:

| Файл | Строки |
|------|--------|
| `seasons.ts` | 33 |
| `athletes.ts` | 28, 49, 70 |
| `preferences.ts` | 22, 37 |
| `QuickWorkout.tsx` | 209 (fallback) |
| `WeekConstructor.tsx` | 296 (fallback) |

---

## 🟡 MEDIUM

### 12. Hardcoded EN строки (i18n gap) — расширенный список

| Компонент | Строки |
|---|---|
| `PendingReviews.tsx:6-7` | "Pending Reviews", "All athletes' logs are reviewed..." |
| `TrainingToday.tsx:6-7` | "Training Today", "Quick overview..." |
| `TodayWorkoutCard.tsx:10,11,19,23,28` | "Rest Day", "No workout scheduled...", "Today's Workout", "blocks planned.", "Start Workout" |
| `RecentNotifications.tsx:33` | "Recent" |
| `WeeklyHeatmap.tsx:18,27,31` | "Weekly Volume", "sets this week", "last week" |
| `AthleteDashboard.tsx:157-158` | "Pull down to refresh...", "Refreshing..." |
| **NEW:** `TeamAlerts.tsx:15` | "Attention Needed" |

### 13. PendingReviews / TrainingToday — полные заглушки

- Оба — статичный текст, нет данных из PB.
- `BottomTabBar.tsx:47` — `unreviewedCount = 0` захардкожен.

### 14. "Create first template" — без `onClick`

- **Файл:** `TemplatePanelContent.tsx:110-113`

### 15. `getTeamReadinessAlerts` — не покрывает «missed >2 days»

- **Gate:** «readiness <40 **ИЛИ** missed >2 consecutive days»
- **Факт:** `readiness.ts:104-115` — только readiness ≤40 сегодня.

### 16. Нет DB unique constraint на активные `plan_assignments`

- Индексы по `plan`, `athlete`, `group` — не уникальные.
- Дубликат-чек есть на уровне кода (planAssignments.ts), но race condition возможен.
- **Решение:** partial unique index в PB.

### 17. `pnpm lint` FAIL

- `scripts/clear_pb.ts:75`, `scripts/clear_users.ts:19`, `scripts/test_users.ts:13`
- `no-explicit-any`.

### NEW-5. `plan_assignments` — отсутствует composite index

- Частый запрос: `plan_id = X AND status = "active"`
- Текущий index: только `plan_id` — status фильтруется в памяти
- **Решение:** `CREATE INDEX idx_pa_plan_status ON plan_assignments (plan_id, status)`

---

## 🔵 LOW

### 18. Emoji в UI — requires manual check

- Финальный код в TemplatePanelContent использует текст, не emoji.

### 19. Строковая интерполяция в seasons.ts — **поглощён в NEW-3**

- Оставлен для обратной совместимости с нумерацией.

### NEW-6. Coach Dashboard inline (390 LOC)

- `dashboard/page.tsx` — coach branch встроен inline. Рефакторинг в `CoachDashboard.tsx` улучшит maintainability.
- **Приоритет:** низкий, не блокирует функциональность.

---

## Сводная таблица (rev.2)

| # | Severity | Статус | Тип |
|---|----------|--------|-----|
| 1-3 | 🔴 CRITICAL | Подтверждены | Broken routes |
| 4-5 | 🔴 CRITICAL | Подтверждены (с уточнением) | Not implemented |
| ~~6~~ | ~~🔴~~ | ❌ ЛОЖНЫЙ | ~~Not implemented~~ → уже реализовано |
| NEW-1 | 🔴 CRITICAL | **НОВЫЙ** | Schema mismatch |
| 7-11 | 🟠 HIGH | Подтверждены | Logic bugs |
| NEW-2 | 🟠 HIGH | **НОВЫЙ** | Timezone bug |
| NEW-3 | 🟠 HIGH | **НОВЫЙ** | Security (35+ мест) |
| NEW-4 | 🟠 HIGH | **НОВЫЙ** | Deprecated API |
| 12-17 | 🟡 MEDIUM | Подтверждены | Quality gaps |
| NEW-5 | 🟡 MEDIUM | **НОВЫЙ** | Missing index |
| 18-19, NEW-6 | 🔵 LOW | Мелочи | Style/refactor |
