# Gate 4.241 — Bug Fixes & Gap Closure

> **Scope:** Закрытие багов и пропущенных функций после аудита трека 4.24
> **Estimate:** ~4-6 дней · 5 фаз
> **Source:** `bug-report.md` в этой директории
> **Audit:** rev.4 (2026-02-24) — deep code-audit 20+ файлов + исправления плана + brainstorming-анализ.
>
> **Status:** ✅ Готов к исполнению. Начинай с Phase 1.
>
> ### Обязательно перед стартом
>
> 1. Прочитать `context.md` + `implementation_plan.md` + `bug-report.md`
> 2. Запустить `/auto-skills` для подбора скиллов
> 3. **Always-скиллы** (все фазы): `concise-planning` · `lint-and-validate` · `jumpedia-design-system` · `verification-before-completion`
> 4. Статическая сборка: `output: 'export'` → все новые страницы `'use client'` + data через `useEffect`

---

## Phase 1 — Route Fixes + Data Bugs + Schema Fixes (1d)

> **Скиллы:** `systematic-debugging` + `nextjs-app-router-patterns` + `react-best-practices` + `typescript-expert`
>
> Быстрые исправления без изменения архитектуры. Все правки — в существующих файлах.

**Маршруты:**

- [x] `RecentNotifications.tsx` — исправить href `/dashboard/notifications` → `/notifications`
- [x] `TodayWorkoutCard.tsx` — изменить `/training/today` → `/training` (или создать страницу-pass-through)
- [x] `BottomTabBar.tsx` (Coach Review tab) — решить: создать заглушку-страницу `/training/review` или изменить роут
- [x] `training/review/page.tsx` — обязательно `'use client'` + data fetching через `useEffect` (static export constraint)

**Данные:**

- [x] `RecentNotifications.tsx:17` — исправить `is_read` → `read` (PB поле подтверждено через MCP)
- [x] `RecentNotifications.tsx` — заменить прямой `pb.collection()` на `listUnread()` из `notifications.ts`
- [x] `AthleteDashboard.tsx:111` — `listSeasons()` → `listSeasonsForAthlete(athleteId)`
- [x] `training/page.tsx:177` — убрать `<option value="self">` або передавать реальный coach athleteId

**🔴 NEW: TodayWorkoutCard broken schema access:**

- [x] `TodayWorkoutCard.tsx:19` — `plan.name` не существует в PB schema `training_plans` → использовать `plan.notes` или `Week ${plan.week_number}` (i18n)
- [x] `TodayWorkoutCard.tsx:20` — `plan.focus` не существует → удалить строку
- [x] `TodayWorkoutCard.tsx:23` — `plan.expand?.plan_exercises?.length` → `plan.expand?.['plan_exercises(plan_id)']?.length` (back-relation syntax)

**🔴 NEW: `todayISO()` + `weekStart` bugs (rev.4):**

- [x] `dateHelpers.ts` — добавить `getWeekStart()` функцию (возвращает понедельник недели как YYYY-MM-DD)
- [x] `AthleteDashboard.tsx:44` — удалить `todayISO()` helper; импортировать `todayForUser`, `getWeekStart` из `dateHelpers.ts`
- [x] `AthleteDashboard.tsx:89` — `getWeeklyVolumeDelta(aid, todayISO())` → `getWeeklyVolumeDelta(aid, getWeekStart())` (функция принимает Monday weekStart, не today!)

**Gate 1:** `pnpm type-check && pnpm build` → Exit 0

---

## Phase 2 — Feature Completion: Template Apply + DnD Save (1d)

> **Скиллы:** `react-best-practices` + `react-ui-patterns` + `systematic-debugging` + `api-design-principles`

**Template Apply:**

- [x] `TemplateList.tsx` — добавить prop `onApply?: (template) => void` + кнопку Apply в actions
- [x] 🆕 `TemplatePanelContent.tsx:119-128` — пробросить `onApply` в `TemplateList` (сейчас onApply принимается, но передаётся noop). Удалить TODO-комментарий
- [x] `TemplatePanelContent.tsx:110` — добавить `onClick` на кнопку "Create first template"

**DnD Reorder Save:**

- [x] `WeekConstructor.tsx` — найти место рендера `<DayConstructor>`, передать `onReorderDrag`
- [x] Реализовать handler в WeekConstructor: получить updates → сохранить порядок в PB

**Gate 2:** `pnpm type-check && pnpm build` → Exit 0

---

## Phase 3 — WeeklyHeatmap + StatsStrip (1.5d)

> **Скиллы:** `react-ui-patterns` + `ui-visual-validator` + `nextjs-app-router-patterns` + `sql-optimization-patterns`
> **Mandatory reads:** `docs/DESIGN_SYSTEM.md` + `src/styles/tokens.css`
>
> ⚠️ Перед UI-работой запусти `/ui-work` workflow.

**WeeklyHeatmap — переделать в реальный хитмап:**

- [x] Props: `weekLogs: DayStatus[]` где `DayStatus = 'done' | 'missed' | 'rest' | 'today' | 'future'`
- [x] 7-cell grid с правильными цветами (done=green, missed=orange, rest=gray, today=blue-border, future=dimmed)
- [x] ~~Создать `listWeekLogs`~~ — функция уже существует в `logs.ts:157` ✅ (rev.4)
- [x] Добавить `mapLogsToWeekStatus(logs, weekStart, today, plannedDays)` в `logs.ts` — конвертирует `TrainingLog[]` → `DayStatus[]`
- [x] Обновить `AthleteDashboard.tsx` — вызвать `listWeekLogs()` + `mapLogsToWeekStatus()`, передать в `<WeeklyHeatmap>`

**StatsStrip — подключить реальные метрики:**

- [x] `AthleteDashboard.tsx:135-139` — заменить Date/Volume/Competitions на реальные метрики: Volume Current + Volume Delta + PR (из `getCurrentPRs()` из `personalRecords.ts`)
- [x] Добавить `getCurrentPRs(aid)` в `Promise.all` блок loadCheckin; передавать в `<StatsStrip>` 3 метрики
- [x] **Не добавлять** отдельный вызов streak/CNS — streak уже есть в `StreakHeroCard`, CNS — в WeekConstructor toolbar (rev.4: YAGNI)

> [!NOTE]
> **Assign UX в SeasonDetail — УЖЕ РЕАЛИЗОВАН** (повторный аудит подтвердил).
> PhaseCard: badges, handleAssign, handleUnassign, plan selector, preview — всё работает.
> planAssignments.ts: duplicate check (reactivate existing) — тоже есть.
> Только smoke-тест в Phase 5 для верификации.

**Gate 3:** `pnpm type-check && pnpm build` → Exit 0

---

## Phase 4 — Security + Deprecation Fixes (1d)

> **Скиллы:** `api-security-best-practices` + `auth-implementation-patterns` + `code-refactoring-refactor-clean` + `systematic-debugging`
>
> Массовая миграция string interpolation → pb.filter() + deprecated API cleanup.
> Шаблон замены: `` filter: `athlete_id = "${id}"` `` → `filter: pb.filter('athlete_id = {:aid}', { aid: id })`

**🟠 pb.filter() migration (25 реальных мест, уточнено rev.4):**

- [x] `exercises.ts` — 5 мест (строки 38, 44, 48, 52, 56)
- [x] `achievements.ts` — 4 места (строки 188, 201, 206, 210)
- [x] `seasons.ts` — 4 места (строки 36, 40, 102, 164; L58 уже ok)
- [x] `trainingLoad.ts` — 3 места (строки 43, 52, 64)
- [x] `templates.ts` — 3 места (строки 173, 310, 349; L45,405,458 уже ok)
- [x] `snapshots.ts` — 2 места (строки 17, 38) 🆕 rev.4
- [x] `customExercises.ts` — 1 место (строка 61; L104 = hardcoded enum, не injection risk) 🆕
- [x] `readinessHistory.ts` — 1 место (строка 31)
- [x] `preferences.ts` — 1 место (строка 28) 🆕
- [x] `RecentNotifications.tsx` — 1 место (строка 17, если не исправлено в Phase 1)

**🟠 pb.authStore.model → .record (deprecated PB v0.23+):**

- [x] `seasons.ts:33`
- [x] `athletes.ts:28, 49, 70`
- [x] `preferences.ts:22, 37`
- [x] `QuickWorkout.tsx:209` — убрать fallback `|| pb.authStore.model?.id`
- [x] `WeekConstructor.tsx:296` — убрать fallback `|| pb.authStore.model?.id` (в `handleSaveAsTemplate`)

**PB unique index (через PB API — GUI не поддерживает partial WHERE):**

- [x] `plan_assignments` — добавить partial unique index:

  ```sql
  CREATE UNIQUE INDEX idx_unique_active_assign_athlete
    ON plan_assignments (plan_id, athlete_id) WHERE status = 'active' AND athlete_id != '';
  CREATE UNIQUE INDEX idx_unique_active_assign_group
    ON plan_assignments (plan_id, group_id) WHERE status = 'active' AND group_id != '';
  ```

- [x] `plan_assignments` — composite index для частого запроса:

  ```sql
  CREATE INDEX idx_pa_plan_status ON plan_assignments (plan_id, status)
  ```

  > ⚠️ PB API заменяет весь массив indexes — передавать ВСЕ 3 существующих + 3 новых.

**Gate 4:** `pnpm type-check && pnpm build` → Exit 0

---

## Phase 5 — i18n + Coach Stubs + Lint + QA (1.5d)

> **Скиллы:** `i18n-localization` + `react-best-practices` + `e2e-testing-patterns` + `deployment-engineer`
> Smoke tests выполнять через `/qa` workflow с `browser_subagent`. Рекомендуется использовать `pnpm preview` вместо `dev` сервера для соответствия static export.

**i18n:**

- [/] Добавить ключи во все 3 локали (ru/en/cn) для:
  - TodayWorkoutCard: restDay, noWorkout, todaysWorkout, startWorkout, blocksPlanned
  - RecentNotifications: recent
  - WeeklyHeatmap: weeklyVolume, setsThisWeek, lastWeek (если всё ещё актуально)
  - NEW: TeamAlerts: attentionNeeded
  - NEW: AthleteDashboard: pullToRefresh, refreshing
  - PendingReviews, TrainingToday (если остаются)

**Coach Stubs (минимальная реализация):**

- [x] `PendingReviews.tsx` — подключить `countUnread()` или список логов на ревью
- [x] `TrainingToday.tsx` — подключить список активных планов сегодня
- [x] 🆕 `BottomTabBar.tsx` — заменить `next/link` → `@/i18n/navigation` Link (двойной locale prefix)
- [x] `BottomTabBar.tsx` — `unreviewedCount` из реального API (countUnread)
- [x] **UI Check:** Проверить, чтобы заглушки (Stubs) выглядели аккуратно и консистентно со всем приложением.

**Lint:**

- [x] Исправить все ошибки и предупреждения ESLint, обнаруженные в проекте (включая `useNotifications.ts`, `test_pb.js` и другие).
- [x] `scripts/clear_pb.ts`, `scripts/clear_users.ts`, `scripts/test_users.ts` — исправить `no-explicit-any`

**QA Smoke Tests:**

- [x] 1. Coach Review Tab — работает без 404
- [x] 2. Start Workout — работает без 404
- [x] 3. View all notifications — правильный маршрут
- [x] 4. WeeklyHeatmap — 7 ячеек, 5 состояний
- [x] 5. StatsStrip — PR/Streak/CNS%/Volume
- [x] 6. Template Panel: Apply работает
- [x] 7. DnD reorder — порядок сохраняется в БД
- [x] 8. Assign UX: badges на PhaseCard, Unassign работает (верификация существующего кода)
- [x] 9. RecentNotifications — показывает реальные уведомления
- [x] 10. TodayWorkoutCard — отображает plan week number и exercise count

**Final:**

- [x] `pnpm lint` → Exit 0
- [x] `pnpm type-check` → Exit 0
- [x] `pnpm build` → Exit 0
- [x] `pnpm test` → Exit 0
- [x] CHANGELOG.md updated
- [x] walkthrough.md finalized

**Gate 5 (Track Complete):** Все 10 smoke tests pass. Build + lint clean.
