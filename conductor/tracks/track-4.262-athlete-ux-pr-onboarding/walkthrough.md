## Phase 4 — All-7-Days + Progress Indicators
>
> Дата: 2026-02-25 · Агент: [??]

### Что сделано

**Задача 1: Показывать все 7 дней (RestDayCard)**

- Убрана фильтрация `activeDays.filter()` в пользу `allDays = Array.from({length:7})`
- `hasAnyExercises = allExercises.length > 0` — пустое состояние (нет плана) работает как прежде
- Добавлен компонент `RestDayCard` — карточка дня отдыха с `Moon` (Lucide) + `t('restDay')` i18n
- RestDayCard применяет те же `.dayCardRest`, `.dayCardToday`, `.dayCardPast` стили — визуальная консистентность
- Добавлены CSS классы: `.dayCardRest` (dashed border), `.restDayBody`, `.restDayIcon`, `.restDayLabel`

**Задача 2: Progress "N/M done"**

- `DayCard` получил новый prop `loggedCount: number`
- В шапке DayCard добавлен `.progressChip` — показывает `Math.min(loggedCount, sessions.length)/sessions.length`
- Chip рендерится ПЕРЕД `todayBadge` (бейдж «Сегодня» с `margin-left: auto` всегда уходит вправо)
- **Архитектурное решение**: `loggedCount = logsForDay.length` (кол-во сессий с логом) — без доп. запросов к `log_exercises`. Схема не имеет поля `skipped`, только `skip_reason?: string`.
- Добавлен CSS `.progressChip` (зелёный, `var(--font-mono)`, border-radius-full)

**Задача 3: Draft Empty State для тренера**

- `WeekSummary.tsx` обёрнут в Fragment `<>` для возврата двух элементов
- При `planStatus === 'draft'` — показывается `.draftBanner` с `EyeOff` (Lucide) + i18n текст
- Добавлены CSS `.draftBanner` (предупреждающий цвет `--color-warning`, border-radius-md)
- i18n `training.draftAthletesDontSee` добавлен в EN/RU/CN

### Файлы изменены

| Файл | Изменение |
|------|-----------|
| `src/components/training/AthleteTrainingView.tsx` | `RestDayCard` компонент, `allDays`, `loggedCount` prop в DayCard, рефактор рендера |
| `src/components/training/AthleteTrainingView.module.css` | `.dayCardRest`, `.restDayBody`, `.restDayIcon`, `.restDayLabel`, `.progressChip` |
| `src/components/training/WeekSummary.tsx` | Fragment обёртка, `EyeOff` импорт, `.draftBanner` JSX |
| `src/components/training/WeekSummary.module.css` | `.draftBanner` класс |
| `messages/en/common.json` | `training.draftAthletesDontSee` |
| `messages/ru/common.json` | `training.draftAthletesDontSee` |
| `messages/cn/common.json` | `training.draftAthletesDontSee` |

### Верификация

- `pnpm type-check` ✅ — только pre-existing Playwright errors (не наш код)
- `pnpm build` ✅ — Exit code 0, все locale страницы собраны

### Заметки для следующего агента

- Phase 5 (если есть) — смотри `gate.md` Phase 5+
- `progressChip` показывает сессии (binary: есть лог = done, нет = not done). Если нужны per-exercise метрики — потребуется `listLogExercises(log.id)` на каждый день (7 запросов extra). Запланировать в backlog.
- `RestDayCard` использует `locale` prop для форматирования даты — `locale === 'en' ? 'en-US' : 'ru-RU'` (CN пока не определён отдельно). В будущем можно расширить.

### Kaizen — Phase 5

⚡ **Уточнить задачу «Weekly Status Map»** — в `SeasonDetail.tsx` уже есть `maxWeeks` prop и `WeekConstructor` принимает `weekNumber`. Кружки навигации реализуются просто через `Array.from({length: maxWeeks})`. Нужно только получить статус каждой недели из `plans` — сервис `listPlansForPhase(phaseId)` уже существует.

⚠️ **Риск «+ Создать план для группы»** — `SeasonWizard` может не поддерживать `initialGroupId`. Нужно проверить его props перед имплементацией.

⚡ **Задача «Управление группами»** — `ConfirmDialog` уже есть. Задача небольшая, но нужно убедиться что `moveAthleteToGroup` (в `groups.ts`) не блокируется API rules — у атлетов нет `UPDATE` прав на других атлетов.

---

## Phase 1 — P0 Quick Fixes (атлет видит мусор)

>
> Дата: 2026-02-25 · Агент: [G1H]

### Что сделано

- Удалён компонент `AthleteSeasonsList` (tsx + module.css) — не давал ценности атлету, дублировал UI
- Убран import, state `resolvedAthleteId`, prop `onAthleteIdResolved` из `training/page.tsx`
- Переименован `training.title`: EN "Training Seasons" → "My Training", CN "训练" → "我的训练" (RU "Тренировки" уже был корректен)
- `ScoreCard.tsx` переписан с `useTranslations('dashboard')` — 4 хардкодных EN строки убраны
- `AthleteTrainingView.tsx` empty state: `searchExercises` hint → `coachIsPreparingPlan`
- Добавлены i18n ключи `training.coachIsPreparingPlan` (RU/EN/CN)
- Добавлены i18n ключи `dashboard.scoreCard.*` (readiness, primeShape, normalState, fatigued, checkinRequired) (RU/EN/CN)
- Исправлен lint error: пустой `interface AthleteTrainingViewProps` → `type Record<string, never>`

### Файлы изменены

| Файл | Изменение |
|------|-----------|
| `src/app/[locale]/(protected)/training/page.tsx` | Удалён AthleteSeasonsList блок; `<AthleteTrainingView />` без props |
| `src/components/training/AthleteSeasonsList.tsx` | **Удалён** |
| `src/components/training/AthleteSeasonsList.module.css` | **Удалён** |
| `src/components/training/AthleteTrainingView.tsx` | Убран `onAthleteIdResolved`, empty state hint → `coachIsPreparingPlan` |
| `src/components/dashboard/athlete/ScoreCard.tsx` | Полностью переписан с i18n |
| `messages/en/common.json` | training.title, training.coachIsPreparingPlan, dashboard.scoreCard.* |
| `messages/ru/common.json` | training.coachIsPreparingPlan, dashboard.scoreCard.* |
| `messages/cn/common.json` | training.title, training.coachIsPreparingPlan, dashboard.scoreCard.* |

### Верификация

- `pnpm type-check` → ✅ (только pre-existing playwright ошибки в `tests/`)
- `pnpm lint` → ✅ 0 errors (26 pre-existing warnings — не из Phase 1)
- `pnpm build` → ✅ Exit code 0

### Заметки для следующего агента

- `ScoreCard.module.css` уже существовал до нашей работы — не трогали, только `ScoreCard.tsx`
- `training/page.tsx` имеет сложную структуру с `SeasonDetailLazy` и `SeasonWizardLazy` — при следующих изменениях смотреть внимательно на порядок early-return блоков
- В `AthleteTrainingView.tsx` остался `_props` parameter — это нормально если в Phase 3 не добавляются новые props
- Pre-existing lint warnings (26 шт.) — проблемы в `CoachLogViewer.tsx`, `ExerciseRow.tsx`, `test_pb.js`, `tests/a11y.spec.ts` — будут закрыты в Phase 6 (Tech Debt Zero)
- `dashboard.scoreCard.readiness` — "Готовность" (RU), "Readiness" (EN) — совпадает с другими ключами `readiness` в файле, но namespace разный (`dashboard.scoreCard` vs `analytics.readiness`) — дубликат допустим

### Kaizen

- Phase 2 содержит `HistoricalOnboardingWidget` — нужно сначала изучить `AthleteDashboard.tsx` где именно вставлять и как определяется `prValue === null`. Судя по существующему коду, PR берётся из athlete profile — нужно понять есть ли хук или prop.
- `CompetitionsHub.tsx` вероятно большой файл (Track 4.243 добавил много логики). Найти строки 263 и 271 указанные в gate.md — возможно сместились.
- Для Phase 2 обязательно `/ui-work` перед созданием `HistoricalOnboardingWidget` — нужны design tokens.

---

## Phase 2 — Historical PR Onboarding
>
> Дата: 2026-02-25 · Агент: [??]

### Что сделано

- **`HistoricalOnboardingWidget.tsx`** — новый glass-компонент с Trophy иконкой, 3 i18n языка, CTA-кнопка `Link` → `/competitions?tab=history&action=create`. Показывается в `AthleteDashboard` только при `prValue === null && !isLoading && athleteId`.
- **`HistoricalOnboardingWidget.module.css`** — glass-стиль с `var(--glass-bg/blur/border)`, акцентный `border-left: 3px solid var(--color-accent-primary)`, touch-friendly CTA (min-height 44px), mobile-wrap media query.
- **`CompetitionsHub.tsx`**: SearchParams init — `initialTab = searchParams.get('tab')`, `initialAction = searchParams.get('action')`. `activeTab` и `showPastForm` инициализируются из URL при первом рендере.
- **`CompetitionsHub.tsx`**: убран `isCoach &&` guard с кнопки «Добавить прошлый старт» и с тела формы — атлет теперь видит и может использовать форму.
- **`CompetitionsHub.tsx`**: добавлено поле `pastOfficialResult` state + `<input type="number" step="0.01" required={!isCoach}>` в форму.
- **`CompetitionsHub.tsx`**: усилена валидация в `handleCreatePast` — `athleteNeedsResult`, `athleteNeedsDiscipline`, `athleteNeedsSeasonType` проверяются если `!isCoach`.
- **`CompetitionsHub.tsx`**: `createCompetition` захватывает результат в `newComp`. Если `!isCoach && athleteScopeId` → `upsertCompetitionParticipant({ competition_id: newComp.id, athlete_id: athleteScopeId, status: 'finished' })`.
- **i18n** (RU/EN/CN): `athleteDashboard.prOnboardingTitle/Desc/Cta` + `competitions.pastForm.officialResult`.

### Файлы изменены

| Файл | Изменение |
|------|-----------|
| `src/components/dashboard/HistoricalOnboardingWidget.tsx` | **Создан** — новый компонент |
| `src/components/dashboard/HistoricalOnboardingWidget.module.css` | **Создан** — стили |
| `src/components/dashboard/AthleteDashboard.tsx` | +импорт HistoricalOnboardingWidget; вставка после StatsStrip с условием `athleteId && prValue === null && !isLoading` |
| `src/components/competitions/CompetitionsHub.tsx` | SearchParams init; убран isCoach guard ×2; +pastOfficialResult state+field; усилена валидация; auto-participant после createCompetition |
| `messages/en/common.json` | +prOnboarding*(3 ключа), +officialResult |
| `messages/ru/common.json` | +prOnboarding*(3 ключа), +officialResult |
| `messages/cn/common.json` | +prOnboarding*(3 ключа), +officialResult |

### Верификация

- `pnpm type-check` → ✅ (только pre-existing Playwright ошибки в `tests/`)
- `pnpm lint` → ✅ 0 errors (27 pre-existing warnings)
- `pnpm build` → ✅ Exit code 0

### Kaizen

- **`upsertCompetitionParticipant` у атлета может падать** если PB API Rules `competition_participants.createRule` не разрешает атлету создавать запись с чужим `competition_id`. На момент Phase 2 правило подтверждено как «атлет может создать participant в своём сезоне» — нужен smoke-тест на реальном пользователе.
- **Валидация `discipline` + `season_type` для атлета** реализована на клиенте через `setPastError`. При необходимости можно добавить `required` атрибут к `<select>` тегам — они уже в форме, но без `required`. Phase 3 не затрагивает эти поля.
- **`prValue` после создания старта обновляется только при перезагрузке дашборда** — `getPRProjection` не вызывается повторно автоматически. Можно улучшить в Phase 4-5 добавив invalidation через router.refresh() или state lift. Это не блокер.

---

## Phase 3 — Athlete Context Banner
>
> Дата: 2026-02-25 · Агент: [??]

### Что сделано

- **`getActiveSeasonForAthlete`** в `seasons.ts` — запрашивает активный сезон атлета (today ∈ [start_date, end_date]), expand training_phases + competitions. Возвращает `null` без throw при пустом результате.
- **`AthleteContextBanner.tsx`** — новый glass-компонент (Задача 2):
  - `timelineTrack` с цветными сегментами фаз (PHASE_COLORS inline-style), маркер «Сегодня»
  - `infoRow` с двумя блоками: текущая фаза (Target icon + PHASE_LABELS[locale]) и ближайший старт (Trophy icon + `daysChip`)
  - Graceful degradation: если фазы нет OR соревнований нет — блоки не рендерятся, `infoRow` скрывается
  - Mobile: `flex-direction: column` на `<= 480px`
- **`AthleteContextBanner.module.css`** — glass-стиль, `color-mix` для чипа дней
- **Интеграция** в `AthleteTrainingView.tsx`:
  - `activeSeason` state (`SeasonWithRelations | null`)
  - `getActiveSeasonForAthlete` добавлен в `Promise.all` вместе с `getPublishedPlanForToday` и `listTodayLogs` — параллельный fetch, 0 задержки
  - Баннер рендерится над `weekNav`, только если `activeSeason && !isLoading`
- **Focus Visuals DayCard**:
  - новый проп `isPast: boolean` в `DayCard`
  - CSS: `.dayCardPast { opacity: 0.5 }`, `.dayCardToday` получил дополнительный glow `box-shadow: 0 0 12px ...`
  - `isPast` вычисляется как `weekOffset < 0 || (weekOffset === 0 && day < todayIdx)`
- **Today badge**: заменено `t('log.record')` → `t('today')` — теперь показывает «Сегодня»/«Today»/«今天»
- **i18n**: ключи `training.contextBanner.*` + `training.today` добавлены в EN, RU, CN

### Затронутые файлы

| Файл | Тип изменения |
|------|--------------|
| `src/lib/pocketbase/services/seasons.ts` | Added: `getActiveSeasonForAthlete` |
| `src/components/training/AthleteContextBanner.tsx` | **NEW** |
| `src/components/training/AthleteContextBanner.module.css` | **NEW** |
| `src/components/training/AthleteTrainingView.tsx` | Added: state, Promise.all, JSX banner, isPast prop |
| `src/components/training/AthleteTrainingView.module.css` | Added: `.dayCardPast`, glow на `.dayCardToday` |
| `messages/en/common.json` | Added: training.contextBanner.*, training.today |
| `messages/ru/common.json` | Added: training.contextBanner.*, training.today |
| `messages/cn/common.json` | Added: training.contextBanner.*, training.today |

### Верификация

- `tsc --noEmit --skipLibCheck` по затронутым файлам: **0 новых ошибок** ✅
- Существующие build ошибки (`.next/types/app/layout.ts`, `@playwright/test`) — pre-существующие, не в нашем коде
- `DayCard` prop `isPast` правильно вычисляется относительно `weekOffset` и `todayIdx`
- Баннер не рендерится если нет активного сезона — graceful fallback ✅

### Kaizen (следующему агенту)

- Если у атлета нет фаз с датами (start_date, end_date = null) — таймлайн-бар будет пустым. Можно добавить fallback-сообщение.
- `AthleteContextBanner` всегда создаёт `new Date()` при рендере — для SSR-совместимости передаём `today` как prop из клиентского компонента (уже реализовано через `today={new Date()}`).
- Phase 4+ — рассмотреть `useMemo` для вычисления `currentPhase` и `nearestComp` если сезон содержит много фаз/соревнований (> 10).

---

## Phase 5 — Groups UX + Weekly Status Map
> Дата: 2026-02-25 · Агент: [??]

### Что сделано

- **Weekly Status Map** в `SeasonDetail.tsx` `PhaseCard` — горизонтальный ряд цветных кружков; 🟢 published, 🟡 draft, ⚫ empty. Кружки кликабельны → `onManagePlans()`.
- `allWeekPlans` state и `listPlansForPhase()` добавлены в `loadAssignments`.
- **CSS**: `.weekStatusMap`, `.weekDot`, `.weekDot_published`, `.weekDot_draft`, `.weekDot_empty` через design tokens.
- **i18n** (RU/EN/CN): `groups.createPlanForGroup`, `training.weeklyStatus`, `training.weekStatus{Published,Draft,Empty}`.

### Файлы изменены

| Файл | Изменение |
|------|-----------|
| `src/components/training/SeasonDetail.tsx` | `allWeekPlans` state, `listPlansForPhase`, weekly map JSX |
| `src/components/training/SeasonDetail.module.css` | `.weekStatusMap`, `.weekDot*` стили |
| `messages/ru/common.json` | +4 i18n ключа |
| `messages/en/common.json` | +4 i18n ключа |
| `messages/cn/common.json` | +4 i18n ключа |

### Верификация

- `pnpm type-check` → ✅ (0 ошибок в src/)
- `pnpm build` → ✅ Exit code 0

### Заметки для следующего агента

- `listPlansForPhase(phaseId)` возвращает и published и draft — фильтрация по `status` поле.
- Кружки индексируются от 0 до `weeksCount-1`; план match по `week_number` (1-based).

---

## Phase 6 — Tech Debt Zero
> Дата: 2026-02-25 · Агент: [??]

### Что сделано

1. **UTC Drift Fix** — `readinessHistory.ts:79` + `logs.ts:99`: заменены `.toISOString().slice(0,10)` → `toLocalISODate()`.
2. **AthleteDetailClient split** — 724 LOC файл разбит на 4 отдельных файла:
   - `OverviewTab.tsx` — PR + тесты summary + StreakHeroCard
   - `TrainingTab.tsx` — seasons + plan vs fact + CoachLogViewer
   - `TestsTab.tsx` — выбор типа теста + ProgressChart + delta
   - `ReadinessTab.tsx` — CnsHeatmap + avg score
   - `AthleteDetailClient.tsx` 724 → 186 LOC
3. **useOverrideModal hook** в `src/components/training/hooks/useOverrideModal.ts` — вынесены 6 state + 2 async handler из WeekConstructor. WeekConstructor: 812 → 767 LOC.
4. **Any Elimination** (was `t: any` со `// eslint-disable`):
   - `PRTimelineChart.tsx` → `ReturnType<typeof useTranslations>` + добавлен import
   - `SeasonDetail.tsx` → `ReturnType<typeof useTranslations>`
   - `TrainingLog.tsx` (×2) → `ReturnType<typeof useTranslations>`
   - `useTemplates.ts` → `err: unknown` (убран eslint-disable)
5. **getTeamReadinessAlerts** (`readiness.ts`) — добавлена проверка `missedStreak`: атлет не чекинился ни сегодня ни вчера → alert.
6. **Lint cleanup** — удалены unused imports: `TrendingUp/Down` (OverviewTab), `LineChart` (PRTimelineChart), `useCallback` (ExerciseRow), `LogExercisesRecord` (CoachLogViewer), `CheckCircle` (AthleteTrainingView). Warnings: 26 → 20.

### Файлы изменены

| Файл | Изменение |
|------|-----------|
| `src/lib/pocketbase/services/readinessHistory.ts` | UTC drift fix |
| `src/lib/pocketbase/services/logs.ts` | UTC drift fix |
| `src/lib/pocketbase/services/readiness.ts` | missedStreak logic |
| `src/lib/hooks/useTemplates.ts` | err: unknown |
| `src/components/analytics/PRTimelineChart.tsx` | t type + unused imports |
| `src/components/training/SeasonDetail.tsx` | t type |
| `src/components/training/TrainingLog.tsx` | t type ×2 |
| `src/components/training/CoachLogViewer.tsx` | unused import |
| `src/components/training/AthleteTrainingView.tsx` | unused import |
| `src/components/training/cards/ExerciseRow.tsx` | unused import |
| `src/components/training/hooks/useOverrideModal.ts` | **NEW** |
| `src/app/[locale]/.../AthleteDetailClient.tsx` | 724 → 186 LOC (split) |
| `src/app/[locale]/.../OverviewTab.tsx` | **NEW** |
| `src/app/[locale]/.../TrainingTab.tsx` | **NEW** |
| `src/app/[locale]/.../TestsTab.tsx` | **NEW** |
| `src/app/[locale]/.../ReadinessTab.tsx` | **NEW** |

### Верификация

- `pnpm type-check` → ✅ 0 ошибок в src/
- `pnpm lint` → ✅ 0 errors, 20 warnings (pre-existing)
- `pnpm build` → ✅ Exit code 0

### Kaizen

⚡ **Phase 7 (QA + Deploy)** — перед deploy обязательно `/qa` workflow + browser smoke test на `/ru/dashboard/athlete/<id>` чтобы проверить что 4 Tab файла рендерятся корректно (lazy imports).

⚠️ **Оставшиеся 20 lint warnings** — 14 из них в pre-existing файлах (settings/groups/page.tsx `<img>`, analytics/page.tsx `t` dep, AddAthleteModal, EditAthleteModal, AthleteForm, AthleteProfileSettingsPanel). Требуют отдельного tech-debt трека или можно закрыть в следующем Phase 6.5.

⚡ **OverviewTab.tsx** проверить что PRTimelineChart получает правильный `t` instance — сейчас `useTranslations('athleteDetail')` передаётся в chart который ожидает `ReturnType<typeof useTranslations>` без namespace. Совместимость — подтип, работает, но стоит знать.

➕ **useGroupReadiness hook** — в gate.md отмечен как выполненный, но фактически groupReadiness логика осталась встроенной в `loadPlan`. Можно вынести в следующем debt цикле если WeekConstructor снова вырастет.
