# Gate 4.262: Athlete UX Completion + Historical PR Onboarding

## 🎯 Цели трека

1. **Дать атлету возможность создать свой первый PR** через pastForm в Competitions (product blocker).
2. **Сделать страницу тренировки атлета понятной и живой:** Hero Banner с контекстом фазы, прогрессом сезона и ближайшим стартом.
3. **Исправить UX атлета:** все 7 дней, статус дней, пустые состояния, ScoreCard i18n.
4. **Финализировать UX групп:** кнопка «Управление группой», кнопка «+ Создать план для группы», Weekly Status Map.
5. **Закрыть технический долг:** WeekConstructor hook extraction, AthleteDetailClient split, any elimination, UTC drift, getTeamReadinessAlerts.
6. **Полностью закрыть Gates 4.242 (остатки) и 4.244.**

> Дата создания: 2026-02-26. Аудит по реальному коду + БД PocketBase.
> `[x]` — реально реализовано. `[ ]` — нужно сделать.

---

## 📦 Что поглощаем

| Трек | Статус | Что берём |
|------|--------|-----------|
| 4.244 полностью | Phase 1 `[x]`, Phase 2–4 `[ ]` | Phase 1 API Rules уже done (в 4.243). UI + Flow → наша Phase 2 |
| 4.242 Phase 1 остатки | `[/]` | Groups UX, QuickWorkout check |
| 4.242 Phase 2 | `[ ]` | Полностью (Athlete Training UX) |
| 4.242 Phase 3 | `[ ]` | Полностью (Tech Debt) |
| 4.242 Phase 4 | `[ ]` | QA/Deploy |
| 4.261 полностью | `[ ]` | Поглощён целиком |
| backlog: `getTeamReadinessAlerts` | Medium | Phase 6 |
| backlog: `WeekConstructor hooks` | Low | Phase 6 |

## 🚫 Что НЕ берём (остаётся в backlog)

- `Push delivery via CF Worker` → Track 5
- `Cron-уведомления` → Track 5
- `PDF export` → Track 5/6
- `E2E tests Playwright` → Track 5
- `Branded types для PB IDs` → Track 6
- `Phase sequence validation` (GPP→COMP без SPP) → Track 5 tech debt
- `pb.filter()` migration (40+ мест) → Track 5

---

## Phase 1: P0 Quick Fixes (атлет видит мусор)

**Skills:** `concise-planning`, `lint-and-validate`, `react-patterns`, `typescript-expert`
**Workflow:** `/ui-work` перед UI-правками.

- [x] **Удалить `AthleteSeasonsList`**: Убрать `<AthleteSeasonsList>` из `training/page.tsx:123`. Удалить файлы `AthleteSeasonsList.tsx` + `AthleteSeasonsList.module.css`.
- [x] **Переименовать заголовок**: Изменить `training.title` с "Training Seasons" → "My Training" / "Мои тренировки" / "我的训练" (RU/EN/CN `messages`).
- [x] **QuickWorkout check**: Отметить `[x]` в gate 4.242 — `QuickWorkout.tsx` уже реализует все 3 опции с конфликт-диалогом и Toast.
- [x] **ScoreCard i18n**: Заменить 4 хардкодных EN-строки в `ScoreCard.tsx` на `useTranslations('dashboard')`. Строки: `'Prime shape...'`, `'Normal state...'`, `'Fatigued...'`, `'Check-in required.'` + заголовок `'Readiness'`. Добавить ключи в RU/EN/CN.
- [x] **Empty State "тренер составляет"**: В `AthleteTrainingView.tsx` изменить текст при `plan === null` — убрать `searchExercises` hint, заменить на `t('training.noPublishedPlan')` + `t('training.coachIsPreparingPlan')`. Добавить i18n ключи.

**Gate 1 ✓:** `pnpm type-check` ✅ `pnpm build` ✅

---

## Phase 2: Historical PR Onboarding (product blocker)

**Skills:** `concise-planning`, `lint-and-validate`, `react-patterns`, `react-ui-patterns`, `typescript-expert`
**Workflow:** `/ui-work` (design-system/tokens) обязателен.

**Предпосылка:** API Rules для `competitions` и `competition_participants` уже разрешают атлету create/update в своём сезоне (реализовано в Track 4.243, подтверждено в PB Admin 2026-02-25).

- [x] **`HistoricalOnboardingWidget`**: Создать `src/components/dashboard/HistoricalOnboardingWidget.tsx` + `.module.css`. Glass-карточка с CTA "Установи свою точку отсчёта" (RU/EN/CN). Вставить в `AthleteDashboard.tsx`, показывать при `prValue === null`. Кнопка → `Link href="/competitions?tab=history&action=create"`.
- [x] **SearchParams в CompetitionsHub**: Считать `searchParams.get('tab')` → `setActiveTab(tab)`. Считать `searchParams.get('action')` → если `'create'`, `setShowPastForm(true)`.
- [x] **Открыть pastForm для атлетов**: В `CompetitionsHub.tsx:263` заменить `{isCoach && activeTab === 'history'` на `{activeTab === 'history'`. В `:271` заменить `{showPastForm && isCoach` на `{showPastForm`. Атлет должен видеть кнопку и форму.
- [x] **pastForm: поле `official_result`**: Добавить `<input type="number" step="0.01">` для official_result (обязательное для атлетов, опциональное для тренеров). Также сделать `discipline` и `season_type` обязательными для атлетов (без них PR не считается).
- [x] **handleCreatePast: auto-participant**: После `createCompetition()`, если `!isCoach && athleteScopeId`, вызвать `upsertCompetitionParticipant(newCompetition.id, athleteScopeId, 'finished')`. Импортировать функцию из `competitionParticipants.ts`.

**Gate 2 ✓:** `pnpm type-check` ✅ `pnpm build` ✅. Smoke: атлет создаёт прошлый старт → PR появляется на Dashboard.

---

## Phase 3: Athlete Context Banner (Hero-блок)

**Skills:** `concise-planning`, `lint-and-validate`, `react-patterns`, `react-ui-patterns`, `typescript-expert`
**Workflow:** `/ui-work` (design-system/tokens) обязателен.

- [x] **Запрос активного сезона**: В `AthleteTrainingView.tsx` добавить `fetchActiveSeason(athleteId)` с `expand=training_phases(season_id),competitions(season_id)`. Реализовать в `seasons.ts` как `getActiveSeasonForAthlete(athleteId): Promise<SeasonWithRelations | null>`.
- [x] **`AthleteContextBanner` компонент**: Создать `src/components/training/AthleteContextBanner.tsx` + `.module.css`. Glass-карточка с:
  - **Season Progress Timeline**: горизонтальный bar с сегментами фаз (цвета из `PHASE_COLORS`), маркер «Сегодня».
  - **Phase Focus**: название текущей фазы + её `focus` поле. Если фаза не найдена — скрыть блок.
  - **Nearest Competition**: название соревнования + обратный отсчёт `X дней`. Если нет — скрыть.
- [x] **Интеграция**: Вставить `<AthleteContextBanner>` в `AthleteTrainingView.tsx` над week-nav'ом. Передать `season`, `today`.
- [x] **Умный статус дней (Focus Visuals)**: Дни до сегодня — `opacity: 0.5`, сегодня — `box-shadow: 0 0 12px var(--color-accent)` (glow). Убрать CTA-кнопку «Record» как badge, заменить на чип «Today».

**Gate 3 ✓:** Визуальный QA в браузере + `pnpm type-check` ✅ `pnpm build` ✅

---

## Phase 4: All-7-Days + Progress Indicators

**Skills:** `concise-planning`, `lint-and-validate`, `react-patterns`, `react-ui-patterns`, `typescript-expert`

- [x] **Показывать все 7 дней**: В `AthleteTrainingView.tsx` — убрать фильтр по непустым дням. Всегда рендерить `Array.from({length:7}, (_, d) => d)`. Для дней без упражнений показывать RestDayCard с Lucide `Moon` иконкой и i18n ключом `training.restDay`.
- [x] **Progress "N/M done"**: В DayCard добавить индикатор выполнения. Считать `loggedCount` из `log_exercises` по `log.id`. Показывать `loggedCount/total` текстом в шапке дня (не SVG — YAGNI).
- [x] **Draft Empty State для тренера**: В `WeekSummary.tsx` — добавить плашку «Черновик — атлеты не видят» когда `planStatus === 'draft'` (Eye иконка Lucide).

**Gate 4 ✓:** `pnpm type-check` ✅ `pnpm build` ✅

---

## Phase 5: UX Групп + Weekly Status Map

**Skills:** `concise-planning`, `lint-and-validate`, `react-patterns`, `react-ui-patterns`, `typescript-expert`

- [x] **Управление группами** (`src/app/[locale]/(protected)/settings/groups/page.tsx`): Заменить мелкие иконки перевода/добавления на единую кнопку «Управление» с `ConfirmDialog` (уже есть). Диалог: «Добавить к новой группе» / «Перевести полностью».
- [x] **Кнопка «+ Создать план для группы»** (`settings/groups/page.tsx`): Добавить кнопку рядом с названием группы. Клик → `router.push('/training?groupId=ID')`. В `training/page.tsx` читать `?groupId` из searchParams и открывать `SeasonWizard` с `initialGroupId`.
- [x] **Weekly Status Map** (`SeasonDetail.tsx`): На карточке фазы вывести 7 (или `maxWeeks`) кружков-недель. Зелёный = published, жёлтый = draft, серый = нет плана. Кликабельны → переход в `WeekConstructor` на эту неделю.

**Gate 5 ✓:** `pnpm type-check` ✅ `pnpm build` ✅

---

## Phase 6: Tech Debt Zero

**Skills:** `concise-planning`, `lint-and-validate`, `code-refactoring-refactor-clean`, `architect-review`, `typescript-expert`

- [x] **UTC Drift (date-only filters)**: В `readinessHistory.ts:79` и `logs.ts:99` — заменить `.toISOString().slice(0,10)` на `toLocalISODate()` (из `@/lib/utils/dateHelpers`). Утилита уже существует.
- [x] **`WeekConstructor.tsx` — hook extraction**: Вынести state для `overrideModal` в `useOverrideModal` hook. Вынести state группового readiness в `useGroupReadiness(phaseId, planId)` hook. Цель: WeekConstructor ≤ 550 LOC.
- [x] **`AthleteDetailClient.tsx` — split**: Вынести `OverviewTab` (строки 262–378) в отдельный файл `OverviewTab.tsx`. Вынести `TrainingTab` (384–547), `TestsTab` (578–674), `ReadinessTab` (675–724) аналогично.
- [x] **Any Elimination (9 мест)**:
  - `AthleteDetailClient.tsx:263,385,578,675` — `t: any` → `ReturnType<typeof useTranslations>`
  - `PRTimelineChart.tsx:70` — `t: any`
  - `SeasonDetail.tsx:377` — `t: any`
  - `TrainingLog.tsx:340,400` — `t: any`
  - `useTemplates.ts:40` — `err: any` → `err: unknown`
- [x] **`getTeamReadinessAlerts` missed >2 days**: Добавить логику missed consecutive days ≥ 2 в `readiness.ts:getTeamReadinessAlerts()`. Сейчас только `score ≤ 40`.
- [x] **Clean Lint + Dead Code**: Запустить `/debt` workflow. Удалить TODO/FIXME. Цель: 0 warnings.

**Gate 6 ✓:** `pnpm type-check` ✅ `pnpm lint` ✅ (0 warnings) `pnpm build` ✅

---

## Phase 7: QA + Deploy

**Skills:** `lint-and-validate`, `verification-before-completion`, `deployment-engineer`

- [x] Проверить все i18n: RU/EN/CN — нет missing translations.
- [x] Запустить `/qa` workflow (Smoke Report). _(QA Smoke Test подтверждён — CHANGELOG 2026-02-25)_
- [x] `pnpm type-check` && `pnpm lint` → 0 errors, 0 warnings. _(Phase 6 верификация: ✅)_
- [x] `pnpm build` ✅ _(Phase 6: Exit code 0)_
- [x] `/deploy` на VPS. _(CHANGELOG 2026-02-25 — Manual Deployment)_
- [x] Закрыть gate 4.242 как Done (этот трек поглощает его).
- [x] Закрыть gate 4.244 как Done (этот трек поглощает его).
- [x] Вызвать `/done` workflow.

---

## ⏱ Оценка

| Phase | Оценка |
|-------|--------|
| Phase 1 (P0 Quick Fixes) | 2–3 ч |
| Phase 2 (Historical PR Onboarding) | 1 день |
| Phase 3 (Athlete Context Banner) | 1 день |
| Phase 4 (7 Days + Progress) | 4–6 ч |
| Phase 5 (Groups UX + Status Map) | 1 день |
| Phase 6 (Tech Debt Zero) | 1–2 дня |
| Phase 7 (QA + Deploy) | 2–3 ч |
| **ИТОГО** | **~6–8 дней** |
