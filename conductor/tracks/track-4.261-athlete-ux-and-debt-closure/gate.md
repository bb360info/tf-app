# Gate 4.261: Athlete UX Overhaul + Tech Debt Closure

## 🎯 Цели трека

1. **Полностью закрыть Gate 4.242** (Phase 1 остатки + Phase 2 + Phase 3 + Phase 4).
2. Сделать страницу тренировки атлета понятной и живой: Hero Banner с контекстом фазы, прогрессом сезона и ближайшим стартом.
3. Исправить UX страницы тренировки (все 7 дней, статус дней, empty states).
4. Закрыть технический долг: ScoreCard EN-хардкод, UTC Drift в `deleted_at`, рефакторинг WeekConstructor, Weekly Status Map.
5. Финализировать UX групп: кнопка «Управление группой», кнопка «+ Создать план для группы».

> Дата создания: 2026-02-25. Аудит по реальному коду + БД PocketBase.  
> `[x]` — реально реализовано. `[ ]` — нужно сделать.

---

## Phase 1: Быстрые Правки (P0 — атлет видит мусор)

**Skills:** `concise-planning`, `lint-and-validate`, `react-patterns`, `react-ui-patterns`, `typescript-expert`  
**Workflow:** `/ui-work` перед UI-правками.

- [ ] **Удалить `AthleteSeasonsList`**: Убрать `<AthleteSeasonsList>` из `training/page.tsx`. Удалить файлы `AthleteSeasonsList.tsx` + `AthleteSeasonsList.module.css`.
- [ ] **Переименовать заголовок**: Изменить `training.title` с "Training Seasons" → "My Training" / "Мои тренировки" / "我的训练" (RU/EN/CN `messages`).
- [ ] **QuickWorkout check**: Отметить `[x]` в gate 4.242 — `QuickWorkout.tsx` уже реализует все 3 опции (Save to Library, Assign Athlete, Assign Group) с конфликт-диалогом и Toast. Задача была выполнена ранее.
- [ ] **ScoreCard i18n**: Заменить 4 хардкодных EN-строки в `ScoreCard.tsx` на `useTranslations('dashboard')`. Добавить ключи `readiness.prime`, `readiness.normal`, `readiness.fatigued`, `readiness.noCheckin` в RU/EN/CN.
- [ ] **Empty State "тренер составляет"**: В `AthleteTrainingView.tsx` изменить текст при `plan === null` — убрать `searchExercises` hint, заменить на `t('training.noPublishedPlan')` + `t('training.coachIsPreparingPlan')`. Добавить i18n ключи.

**Gate 1 ✓:** `pnpm type-check` ✅ `pnpm build` ✅

---

## Phase 2: Athlete Context Banner (Hero-блок)

**Skills:** `concise-planning`, `lint-and-validate`, `react-patterns`, `react-ui-patterns`, `typescript-expert`  
**Workflow:** `/ui-work` (design-system/tokens) обязателен.

- [ ] **Запрос активного сезона**: В `AthleteTrainingView.tsx` добавить `fetchActiveSeason(athleteId)` с `expand=training_phases(season_id),competitions(season_id)`. Реализовать в `seasons.ts` как `getActiveSeasonForAthlete(athleteId): Promise<SeasonWithRelations | null>`.
- [ ] **`AthleteContextBanner` компонент**: Создать `src/components/training/AthleteContextBanner.tsx` + `.module.css`. Glass-карточка с:
  - **Season Progress Timeline**: горизонтальный bar с сегментами фаз (цвета из `PHASE_COLORS`), маркер «Сегодня».
  - **Phase Focus**: название текущей фазы + её `focus` поле. Если фаза не найдена — скрыть блок.
  - **Nearest Competition**: название соревнования + обратный отсчёт `X дней`. Если нет — скрыть.
- [ ] **Интеграция**: Вставить `<AthleteContextBanner>` в `AthleteTrainingView.tsx` над week-nav'ом. Передать `season`, `today`.
- [ ] **Умный статус дней (Focus Visuals)**: Дни до сегодня — `opacity: 0.5`, сегодня — `box-shadow: 0 0 12px var(--color-accent)` (glow). Убрать CTA-кнопку «Record» как badge, заменить на чип «Today».

**Gate 2 ✓:** Визуальный QA в браузере + `pnpm type-check` ✅ `pnpm build` ✅

---

## Phase 3: All-7-Days + Progress Indicators

**Skills:** `concise-planning`, `lint-and-validate`, `react-patterns`, `react-ui-patterns`, `typescript-expert`

- [ ] **Показывать все 7 дней**: В `AthleteTrainingView.tsx` изменить `activeDays` — убрать фильтр `filter(d => sessions.length > 0)`. Всегда рендерить `Array.from({length:7}, (_, d) => d)`. Для дней без упражнений показывать RestDayCard с Lucide `Moon` иконкой и i18n ключом `training.restDay`.
- [ ] **Circular Progress "N/M done"**: В DayCard добавить индикатор выполнения. Считать `loggedCount` из `training_log_exercises` где `skipped=false`. Показывать `loggedCount/total` в шапке дня (текстом, не SVG — YAGNI).
- [ ] **Draft Empty State для тренера**: В `WeekConstructor.tsx` WeekSummary — добавить визуальный индикатор `draft` vs `published` более явно (плашка «Черновик — атлеты не видят»).

**Gate 3 ✓:** `pnpm type-check` ✅ `pnpm build` ✅

---

## Phase 4: UX Групп + Weekly Status Map

**Skills:** `concise-planning`, `lint-and-validate`, `react-patterns`, `react-ui-patterns`, `typescript-expert`

- [ ] **Управление группами (`groups/page.tsx`)**: Заменить мелкие иконки перевода/добавления на единую кнопку «Управление» с `ConfirmDialog` (уже есть). Диалог: «Добавить к новой группе» / «Перевести полностью».
- [ ] **Кнопка «+ Создать план для группы»** (`groups/page.tsx`): Добавить кнопку рядом с названием группы. Клик → `router.push('/training?groupId=ID')`. В `training/page.tsx` читать `?groupId` из searchParams и открывать `SeasonWizard` с `initialGroupId`.
- [ ] **Weekly Status Map** (`SeasonDetail.tsx`): На карточке фазы вывести 7 (или `maxWeeks`) кружков-недель. Зелёный = published, жёлтый = draft, серый = нет плана. Кликабельны → переход в `WeekConstructor` на эту неделю.

**Gate 4 ✓:** `pnpm type-check` ✅ `pnpm build` ✅

---

## Phase 5: Tech Debt Zero

**Skills:** `concise-planning`, `lint-and-validate`, `code-refactoring-refactor-clean`, `architect-review`, `typescript-expert`

- [ ] **UTC Drift (date fields)**: В сервисах `seasons.ts`, `athletes.ts`, `customExercises.ts`, `groups.ts`, `templates.ts`, `plans.ts`, `competitionParticipants.ts` — заменить `new Date().toISOString()` на `new Date().toISOString()` для timestamp полей (`deleted_at`, `published_at`) — **оставить как есть**, это корректно для timezone-независимых timestamp. Для **date-only фильтров** (`logs.ts:99`, `readinessHistory.ts:79`) заменить `.toISOString().slice(0,10)` на `todayForUser()`.
- [ ] **`WeekConstructor.tsx` — hook extraction**: Вынести state для `overrideModal` в `useOverrideModal` hook. Вынести state группового readiness в `useGroupReadiness(phaseId, planId)` hook. Цель: WeekConstructor ≤ 550 LOC.
- [ ] **`AthleteDetailClient.tsx` — split**: Вынести `OverviewTab` в отдельный компонент. Вынести `LogsTab` в `AthleteLogsTab`.
- [ ] **Clean Lint + Any Elimination**: Запустить `/debt` workflow. Исправить все `t: any`. Удалить TODO/FIXME. Цель: 0 warnings.
- [ ] **`getTeamReadinessAlerts` missed >2 days**: Добавить логику missed consecutive days ≥ 2 в `readinessHistory.ts:getTeamReadinessAlerts()`. Сейчас только `score ≤ 40`.

**Gate 5 ✓:** `pnpm type-check` ✅ `pnpm lint` ✅ (0 warnings) `pnpm build` ✅

---

## Phase 6: QA + Deploy

**Skills:** `lint-and-validate`, `verification-before-completion`, `deployment-engineer`

- [ ] Проверить все i18n: RU/EN/CN — нет missing translations.
- [ ] Запустить `/qa` workflow (Smoke Report).
- [ ] `pnpm type-check` && `pnpm lint` → 0 errors, 0 warnings.
- [ ] `pnpm build` ✅
- [ ] `/deploy` на VPS.
- [ ] Закрыть gate 4.242 как Done (этот трек поглощает его).
- [ ] Вызвать `/done` workflow.

---

## 📦 Что поглощаем

| Трек | Статус | Что берём |
|------|--------|-----------|
| 4.242 Phase 1 (остатки) | `[/]` | Группы UX, QuickWorkout check |
| 4.242 Phase 2 | `[ ]` | Полностью |
| 4.242 Phase 3 | `[ ]` | Полностью |
| 4.242 Phase 4 | `[ ]` | QA/Deploy |
| backlog: `getTeamReadinessAlerts` | Medium | Phase 5 |
| backlog: `CoachDashboard refactor` | Low | Phase 5 частично |
| backlog: `WeekConstructor hooks` | Low | Phase 5 |

## 🚫 Что НЕ берём (остаётся в backlog)

- `Push delivery via CF Worker` → Track 5
- `Cron-уведомления` → Track 5
- `PDF export` → Track 5/6
- `E2E tests Playwright` → Track 5
- `Branded types для PB IDs` → Track 6
- `Phase sequence validation` (GPP→COMP без SPP) → Track 5 tech debt

## ⏱ Оценка

| Phase | Оценка |
|-------|--------|
| Phase 1 (P0 фиксы) | 2-3 ч |
| Phase 2 (Hero Banner) | 1 день |
| Phase 3 (7 days + progress) | 4-6 ч |
| Phase 4 (Groups + Status Map) | 1 день |
| Phase 5 (Tech Debt) | 1-2 дня |
| Phase 6 (QA + Deploy) | 2-3 ч |
| **ИТОГО** | **~5-7 дней** |
