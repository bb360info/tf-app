
### 2026-02-26 — Track 4.263 Phase 2A+2B: Schema Decoupling (Polymorphic Ownership)

#### Added

- **`exercise_adjustments`** — новая коллекция (12 полей): `plan_exercise_id`, `athlete_id`, `sets`, `reps`, `intensity`, `weight`, `duration`, `distance`, `rest_seconds`, `notes`, `skip`, `deleted_at`. UNIQUE index на `(plan_exercise_id, athlete_id)`.
- **`pb_hooks/ownership_integrity.pb.js`** — validation hook: проверяет FK consistency для `owner_type` (`season→season_id`, `athlete→athlete_id`, `group→group_id`) при создании и обновлении competitions.

#### Changed (Schema)

- **`competitions`**: `season_id` → `required: false` + поля `owner_type` (select: season/athlete/group, required), `athlete_id` (nullable FK), `group_id` (nullable FK) + 5 новых индексов.
- **`training_plans`**: `phase_id` + `week_number` → `required: false` + поля `plan_type` (select: phase_based/standalone/override, required), `start_date`, `end_date` (optional dates) + 4 новых индекса.
- **`personal_records`**: добавлен `competition_id` (nullable FK → competitions).

#### Changed (API Rules — Polymorphic)

- **`competitions`**: listRule/viewRule/updateRule/deleteRule ветвятся по `owner_type` (season/athlete/group).
- **`competition_participants`**, **`competition_media`**, **`competition_proposals`**: каскадно обновлены под новую модель.
- **`training_plans`**: Season Membership Inheritance + nullable phase_id support.
- **`plan_assignments`**: поддержка `plan_id.athlete_id.coach_id` для standalone планов.

#### Migration

- Мигратор `migrate-4263.mjs` с DRY_RUN mode: 11 competitions → `owner_type='season'`, 12 training_plans → `plan_type='phase_based'`, 0 orphans.

---

**Changed:**

- Запущен скрипт `scripts/deploy.sh` по запросу пользователя. Проект пересобран и отправлен на VPS.
- QA Smoke Test подтвердил доступность сайта и корректный рендеринг дашборда.

---

### 2026-02-25 — Track 4.262 Phase 6: Tech Debt Zero

#### Added

- `useOverrideModal` hook в `src/components/training/hooks/useOverrideModal.ts` — вынесены 6 state переменных + `handleOpenOverrideModal` + `handleCreateOverride` из `WeekConstructor.tsx`.
- `OverviewTab.tsx`, `TrainingTab.tsx`, `TestsTab.tsx`, `ReadinessTab.tsx` — 4 отдельных файла из `AthleteDetailClient.tsx` (723 LOC → 186 LOC).

#### Changed

- `readinessHistory.ts:79` + `logs.ts:99` — UTC drift fix: `.toISOString().slice(0,10)` → `toLocalISODate()`.
- `getTeamReadinessAlerts()` в `readiness.ts` — добавлена логика missed streak ≥ 2 дней подряд.
- `t: any` → `ReturnType<typeof useTranslations>` в `PRTimelineChart.tsx`, `SeasonDetail.tsx`, `TrainingLog.tsx` (2 места).
- `err: any` → `err: unknown` в `useTemplates.ts:40` (убран eslint-disable).

#### Metrics

- `WeekConstructor.tsx`: 812 → 767 LOC (−45 строк).
- `AthleteDetailClient.tsx`: 724 → 186 LOC (−538 строк, логика в Tab файлах).

#### Verified

- `pnpm type-check` ✅ (0 ошибок в src/)
- `pnpm build` ✅ Exit code: 0

---

### 2026-02-25 — Track 4.262 Phase 5: UX Групп + Weekly Status Map

#### Added

- **Weekly Status Map** в `SeasonDetail.tsx` `PhaseCard` — горизонтальный ряд цветных кружков-недель: 🟢 зелёный = published план, 🟡 жёлтый = draft, ⚫ серый = нет плана. Данные из `listPlansForPhase()`, кружки кликабельны → `onManagePlans()`.
- `allWeekPlans` state в `PhaseCard` — отслеживает все планы фазы (published + draft), заполняется в `loadAssignments`.
- CSS классы `.weekStatusMap`, `.weekDot`, `.weekDot_published`, `.weekDot_draft`, `.weekDot_empty` в `SeasonDetail.module.css` (все через design tokens).
- i18n ключи RU/EN/CN — `groups.createPlanForGroup` (кнопка в настройках групп).
- i18n ключи RU/EN/CN — `training.weeklyStatus`, `training.weekStatusPublished`, `training.weekStatusDraft`, `training.weekStatusEmpty` (tooltips кружков).

#### Changed

- `SeasonDetail.tsx`: `loadAssignments()` теперь оба: заполняет `publishedPlans` (для assign panel) и `allWeekPlans` (для status map).

#### Verified

- `pnpm type-check` ✅ (Playwright pre-existing errors в tests/, не наши)
- `pnpm build` ✅ Exit code: 0 (все RU/EN/CN маршруты сгенерированы)

---

### 2026-02-25 — Track 4.262 Phase 2: Historical PR Onboarding

#### Added

- `HistoricalOnboardingWidget.tsx` + `HistoricalOnboardingWidget.module.css` — glass-карточка с CTA «Установи точку отсчёта». Показывается в `AthleteDashboard` только когда `prValue === null` и `athleteId` загружен.
- Поле `official_result` в форму «Add Past Start» в `CompetitionsHub`. Обязательное для атлетов (без него PR не считается), опциональное для тренеров.
- Auto-participant: после создания прошлого старта атлетом автоматически создаётся запись `competition_participant` со статусом `finished`.
- i18n ключи `athleteDashboard.prOnboardingTitle/Desc/Cta` (RU/EN/CN).
- i18n ключ `competitions.pastForm.officialResult` (RU/EN/CN).

#### Changed

- `CompetitionsHub`: кнопка «Добавить прошлый старт» теперь видна всем (убран guard `isCoach`).
- `CompetitionsHub`: форма «Add Past» теперь видна всем (убран guard `isCoach`).
- `CompetitionsHub`: `activeTab` и `showPastForm` инициализируются из `searchParams.get('tab')` / `searchParams.get('action')` — ссылка `/competitions?tab=history&action=create` сразу открывает нужную вкладку и форму.
- `CompetitionsHub`: усилена валидация для атлетов — обязательные `discipline` + `season_type` + `official_result`.

#### Verified

- `pnpm type-check` ✅ (Playwright pre-existing errors, не наши)
- `pnpm build` ✅ Exit code: 0

---

### 2026-02-25 — Track 4.262 Phase 1: P0 Quick Fixes (Athlete UX Completion)

#### Removed

- `AthleteSeasonsList` component + CSS — удалён из `training/page.tsx` (не давал ценности атлету).
- `onAthleteIdResolved` callback из `AthleteTrainingView` props — больше не нужен.

#### Changed

- `training.title` EN: "Training Seasons" → "My Training"; CN: "训练" → "我的训练".
- `ScoreCard.tsx`: хардкодные EN строки заменены на `useTranslations('dashboard')`.
- `AthleteTrainingView`: empty state hint — вместо `searchExercises` теперь `coachIsPreparingPlan`.

#### Added

- i18n ключи `training.coachIsPreparingPlan` (RU/EN/CN).
- i18n ключи `dashboard.scoreCard.*` — readiness, primeShape, normalState, fatigued, checkinRequired (RU/EN/CN).

#### Fixed

- Lint error: `AthleteTrainingViewProps` пустой interface → `Record<string, never>` type alias.

---

### [2026-02-23] Track 4.24 Phase 13 — i18n + QA (Unified UX System Redesign & Plan Resolution)

**Added:**

- New localization keys (ru, en, cn) for dashboard states, empty states, Assign UX, and Template Panel.
- Comprehensive Chinese text overflow prevention via CSS (word-break, text-overflow).

**Changed:**

- Finalized Component and Dashboards styling and verified Dark Mode consistency across Athlete Today View and Coach Dashboard.
- Unified UI scaling and typography adjustments preventing layout breaking in various viewports.

**Fixed:**

- Verified Plan Resolution logic via QA: plans assign correctly and overrides are prioritized without side-effects.
- Eliminated all TypeScript errors and verified successful Static Build.

# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] · Track 4.262 Phase 4 — All-7-Days + Progress Indicators

### Added

- `RestDayCard` component in `AthleteTrainingView.tsx` — показывает карточку «День отдыха» с иконкой `Moon` (Lucide) для дней без упражнений
- `.dayCardRest` (dashed border), `.restDayBody`, `.restDayIcon`, `.restDayLabel` CSS классы
- `progressChip` в шапке `DayCard` — показывает `N/M` (залоггировано сессий / всего сессий) зелёным чипом в mono-шрифте
- `.progressChip` CSS класс
- Draft Banner в `WeekSummary.tsx` — плашка «Черновик — атлеты не видят» с иконкой `EyeOff` когда `planStatus === 'draft'`
- `.draftBanner` CSS класс в `WeekSummary.module.css`
- i18n ключ `training.draftAthletesDontSee` в EN/RU/CN

### Changed

- `AthleteTrainingView.tsx`: `activeDays` (с filter) → `allDays = Array.from({length:7})` — все 7 дней всегда рендерятся; дни с упражнениями = `DayCard`, без = `RestDayCard`
- `DayCard` props: добавлен `loggedCount: number`
- `WeekSummary.tsx`: обёрнут в Fragment `<>` для возврата двух элементов (statusRow + draftBanner)

### Verified

- `pnpm type-check` ✅ (Playwright pre-existing errors, не наши)
- `pnpm build` ✅ Exit code: 0

---

## [Unreleased] · Track 4.262 Phase 3 — Athlete Context Banner

### Added

- `getActiveSeasonForAthlete(athleteId)` in `seasons.ts` — fetch active season with phases + competitions expand
- `AthleteContextBanner` component + CSS module — glass hero-block with season timeline, current phase focus, and nearest competition countdown
- i18n keys `training.contextBanner.*` + `training.today` in EN/RU/CN
- DayCard prop `isPast` — past days get `opacity: 0.5` for visual focus

### Changed

- `AthleteTrainingView.tsx`: integrated `AthleteContextBanner` above week-nav; added `activeSeason` state; `getActiveSeasonForAthlete` fetched in parallel with existing `Promise.all`
- `.dayCardToday` glow effect enhanced with second `box-shadow` layer
- Today badge in DayCard: `log.record` → `today` i18n key
Format: [Keep a Changelog](https://keepachangelog.com/)

## [Unreleased]

### 2026-02-26 — Notifications Fix: Push Permission Prompt Closure

**Fixed:**

- Resolved bug where "Enable Notifications" prompt would not disappear after clicking "Allow".
- Added `hasInteracted` state flag in `PushPermissionPrompt.tsx` to prevent race condition re-triggering from `useEffect`.
- Hardened `usePushSubscription.ts` hook to propagate errors instead of silent catching, enabling proper UI feedback.
- Added `loading` state check in `PushPermissionPrompt` effect to prevent flickering during subscription process.

### 2026-02-26 — Track 4.243 Phase 6 Done: QA + Handoff

**Added:**

- Checked Phase 6 QA items for Track 4.243. Tested UI manually and ran checks (Type-check, Lint, Build). E2E automated tests skipped by user.
- Updated `walkthrough.md` and `gate.md` checkboxes for track 4.243 completion.

### 2026-02-26 — Track 4.243 Phase 5 Done: Auto-PR Projection + UI Migration

**Added:**

- New `prProjectionService`: `getPRProjection` (current PB by discipline + indoor/outdoor) and `getPRTimeline` (historical PB progression timeline) based purely on `official_result` from past competitions.
- UI Component: `PRTimelineChart` via Recharts to display PB timeline chronologically, available in the athlete's 'Overview' tab.
- Documented migration strategy in `docs/migrations/personal_records_migration.md`.

**Changed:**

- `AthleteDashboard` now uses `getPRProjection` for displaying the current PRs instead of fetching legacy `personal_records`.
- `AthleteDetailClient` Overview tab now displays the chronological `PRTimelineChart` and auto-projected PR properties.

**Removed:**

- All UI traces of manual PR assignments removed from: `AthleteForm`, `AthleteProfileSettingsPanel`, `OnboardingWizard`, `AddAthleteModal`, and `EditAthleteModal`.
- Service `/services/personalRecords.ts` is completely removed.
- Validations related to manual PRs (`PersonalRecordSchema`, `AddPRSchema`, `AthleteFormPROperationSchema`) removed.
- Cleaned up database operations in `/services/athletes.ts`: `personal_records` cascade deletions are no longer necessary.

### 2026-02-25 — Track 4.243 Phase 3 Done: Competition Card + Proposal Workflow

**Added:**

- New role-based competition card flow:
  - `src/components/competitions/CompetitionCard.tsx`
  - `src/components/competitions/CompetitionCard.module.css`
- Proposal payload Zod schemas for competition workflow:
  - `result`, `metadata`, `pre_event_info`, `media_meta`.
- New competitions i18n keys for card/review/proposal flows in RU/EN/CN.

**Changed:**

- Competitions hub now uses actionable coach inbox with direct open to the related competition card.
- Coach workflow implemented for official updates + participants management + proposal review actions (`approve`, `approve with corrections`, `reject`).
- Athlete workflow implemented for proposal submission without direct overwrite of official competition data.
- Review audit trail persisted in `competition_proposals.reviewed_fields` (before/after snapshots + applied payload).

**Fixed:**

- Restored `pnpm type-check` by fixing missing Lucide icon imports in notifications UI.
- Removed lint blockers (`react-hooks/set-state-in-effect`) in:
  - `src/components/exercises/ExerciseDetailSheet.tsx`
  - `src/components/exercises/ShowAthleteOverlay.tsx`

### 2026-02-25 — Deployment & Build Fix

**Changed:**

- Re-uploaded static data and PocketBase hooks to VPS (`scripts/deploy.sh`).

**Fixed:**

- Fixed build error in `NotificationsClientPage.tsx` by adding missing `UserCheck` and `Calendar` imports from `lucide-react`.

### 2026-02-25 — Track 4.243 Phase 1 Done: Data Foundation + PB Index Stability

**Added:**

- New `competition_proposals.proposed_at` field for deterministic proposal ordering and index-safe sorting in PocketBase.

**Changed:**

- `competition_proposals` indexing strategy switched from system `created` to explicit `proposed_at`:
  - `idx_comp_proposals_inbox (competition_id, status, proposed_at)`
  - `idx_comp_proposals_athlete (athlete_id, status, proposed_at)`
- Proposal services now sort by `-proposed_at,-created` and set `proposed_at` on create.

**Fixed:**

- Eliminated PocketBase index creation failure (`no such column: created`) for `competition_proposals`.
- Synced local schema/contracts/docs with the applied production PocketBase state.

### 2026-02-25 — Track 4.243 Phase 2 (Partial): Competitions Hub UI + Navigation

**Added:**

- New competitions hub route and UI:
  - `src/app/[locale]/(protected)/competitions/page.tsx`
  - `src/components/competitions/CompetitionsHub.tsx`
  - `src/components/competitions/CompetitionsHub.module.css`
- Coach history CTA flow to create past starts directly from `/competitions` (status `completed`).

**Changed:**

- Dashboard entrypoints to `/competitions` added for both coach and athlete dashboards.
- Coach pending reviews card now uses `competition_proposals` pending count instead of notifications unread count.
- Training competition context now links into competitions hub (`/competitions?seasonId=...&competitionId=...`).
- Competition location marker in `SeasonDetail` switched from emoji to Lucide `MapPin`.
- Expanded i18n (RU/EN/CN):
  - `nav.competitions`,
  - `competitions.*` namespace,
  - dashboard/athlete dashboard competitions CTA labels,
  - `training.competitionsOpen`.

**Fixed:**

- Proposal sorting consistency in UI path aligned with backend strategy (`-proposed_at,-created`).
- Added batched participants loader to avoid per-competition N+1 queries in coach registry.

### 2026-02-25 — Track 4.243 Phase 2 (Gate Closure): PB latency check + filter smoke

**Changed:**

- `competitionProposals` service sorting hardened for coach inbox paths:
  - `listPendingCompetitionProposals()` -> `sort: -proposed_at`
  - `listCompetitionProposals()` -> `sort: -proposed_at`

**Verified:**

- Smoke matrix for competitions filters on real PB data (`season`, `discipline`, `season_type`, `status`, combined filter).
- Deep relation rules stability for coach registry/proposal inbox queries under temporary load dataset.

**Fixed:**

- Removed unstable fallback sort by system field `created` in proposals list paths that could trigger intermittent `400` under deep relation filtering.

### 2026-02-25 — Track 4.26: Invite Self-Profile Hotfix

**Changed:**

- Hardened invite join resolution in `src/lib/pocketbase/services/groups.ts`:
  - resolve athlete profile by `user_id + coach_id`,
  - fallback to self-profile by `user_id`,
  - update `coach_id` on existing self-profile when needed,
  - create new athlete profile only when no self-profile exists.
- Synced `scripts/setup-collections.ts` with runtime auth model for `athletes`:
  - added `coachOrSelfRules`,
  - added `user_id` relation,
  - added unique index `idx_athletes_user`.

**Fixed:**

- Applied PocketBase hotfix for `athletes` access rules to enforce coach-or-self access on list/view/create/update and coach-only delete.
- Removed invite/profile desync case where athlete could join a group but still hit `Athlete profile not found` due schema/rules mismatch.

### 2026-02-25 — Auth/Join Hardening: Invite-only Athlete + OAuth Role Picker + Strict DS

**Added:**

- New OAuth role selection route and UI:
  - `src/app/[locale]/(public)/auth/oauth-role/page.tsx`
  - `src/components/auth/OAuthRolePicker.tsx`
  - `src/components/auth/OAuthRolePicker.module.css`
- New auth i18n keys (ru/en/cn) for invite-only athlete rules, OAuth role step, and invite join errors.
- Athlete dashboard empty-state (when athlete role has no valid athlete profile) with CTA to `/join` and `/settings/groups`.

**Changed:**

- Athlete registration is now invite-only in app flow:
  - email registration without pending invite creates `coach`
  - pending invite enforces `athlete`
- OAuth login/register now routes new users (or users with invalid role) to `/auth/oauth-role`.
- `pendingInvite` join flow now returns explicit typed statuses (`joined`, `alreadyMember`, `invalidOrExpired`, `coachCannotJoin`, `none`, `error`) and is handled explicitly by auth/onboarding.
- `getSelfAthleteProfile` / `getSelfAthleteId` now resolve active athlete profiles with `deleted_at = ""` and prefer coached profile when duplicates exist.
- Auth and Join public pages now use `PageWrapper maxWidth="narrow"` for DS-consistent layout.

**Fixed:**

- Removed silent invite join degradation in login/onboarding paths; users now get clear feedback for expired/invalid invite cases.
- Removed self-athlete auto-create fallback from onboarding (now consistent with invite-only athlete model).
- Fixed “missing check-in” scenario for athlete users without valid profile by showing explicit guidance instead of implicit failure.
- DS strict cleanup across auth/join/onboarding:
  - removed emoji icons in specialization selector (Lucide only)
  - removed inline styles in onboarding wizard
  - added/normalized `focus-visible` states
  - increased toggle touch target to >=44px
  - replaced hardcoded color values with token/color-mix usage.

### 2026-02-25 — Track 4.242 Phase 1: AthleteForm Unification (Dashboard + Settings)

**Added:**

- Shared athlete form module:
  - `src/components/athletes/form/types.ts`
  - `src/components/athletes/form/AthleteForm.tsx`
  - `src/components/athletes/form/AthleteForm.module.css`
  - `src/components/athletes/form/index.ts`
  - `src/components/athletes/index.ts`
- New Zod schemas for unified form payload in `src/lib/validation/athleteForm.ts`.
- Shared i18n namespace `athleteForm` in `messages/ru/common.json`, `messages/en/common.json`, `messages/cn/common.json`.

**Changed:**

- `AddAthleteModal.tsx` refactored to use shared `AthleteForm` while keeping submit IO in container (`createAthlete` + PR writes).
- `EditAthleteModal.tsx` refactored to use shared `AthleteForm` with `getCurrentPRs` loading.
- `AthleteProfileSettingsPanel.tsx` refactored to shared `AthleteForm` in `settings` mode (sport profile + PR only).
- `src/lib/validation/index.ts` now exports `AthletePatchSchema`, `AthleteFormPROperationSchema`, `AthleteFormSubmitPayloadSchema`.

**Fixed:**

- UX parity between Create/Edit athlete flows (single form language and controls).
- Secondary disciplines now support up to 2 values with primary/secondary dedupe guard.
- PR overwrite uses `addPersonalRecord` path consistently to preserve history.
- PR delete remains available only in `settings/profile` (removed from dashboard edit/create modes).

### 2026-02-24 — Track 4.241 Phase 5: i18n + Coach Stubs + Lint + QA

**Added:**

- New localization keys across English, Russian, and Chinese for dashboard empty states, pull-to-refresh messages, and notifications.
- Basic visual implementation of `PendingReviews` and `TrainingToday` coach stubs, hooked up to realistic unread notification counting.

**Changed:**

- `BottomTabBar` updated to use `next-intl`'s navigation link specifically routing via dual locale prefix paths.
- Added unreviewed notifications badge logic on Review bottom tab based on real `countUnread()` data.
- Refactored multiple scripts to remove unused variables and `any` types enforcing stricter linting rules.

**Fixed:**

- Resolved 25 residual TypeScript ESLint warnings/errors (Unexpected `any` types and unused variables).
- Handled background sync interval initialization to use `const` properly within `useNotifications.ts`.

### 2026-02-24 — Track 4.241 Phase 4: Security + Deprecation Fixes

**Security:**

- Migrated 25 instances of string interpolation in PocketBase API filter queries to `pb.filter()` across 9 service files (SQL injection prevention).

**Changed:**

- Replaced deprecated `pb.authStore.model` with `pb.authStore.record` in `seasons.ts`, `athletes.ts`, `preferences.ts`, and React components (QuickWorkout, WeekConstructor).

**Added:**

- PocketBase schema: 2 partial unique indexes and 1 composite index for `plan_assignments` table to optimize status tracking.

**Verified:** `pnpm type-check` ✅ `pnpm build` ✅ (Gate 4)

### 2026-02-24 — Track 4.241: Local Production Preview Setup

**Added:**

- `preview` script in `package.json` for local static export testing (`pnpm build && serve out`).
- `serve` added as a dev dependency to power the static preview.

**Verified:** `pnpm preview` starts a static server, redirects to locales correctly, and serves PWA assets. ✅

### 2026-02-24 — Track 4.241 Phase 2: Template Apply + DnD Save

**Added:**

- `TemplateList.tsx`: prop `onApply?: (template) => void` + Apply button (Play icon, shown only when `onApply` is passed). i18n key `templates.apply` in EN/RU/CN.
- `TemplatePanelContent.tsx`: wires `onApply` through to `TemplateList`; `onClick` on "Create first template" button (switches to My Templates tab).
- `WeekConstructor.tsx`: passes `onReorderDrag` to `DayConstructorLazy` — reorders exercises via `reorderExercises()` + `loadPlan()` on drop.

**Removed:**

- TODO comment block in `TemplatePanelContent.tsx` (was 6 lines of dead notes).

**Verified:** `pnpm type-check` ✅ `pnpm build` ✅ (Gate 2)

### 2026-02-24 — Track 4.241 Phase 3: WeeklyHeatmap + StatsStrip

**Added:**

- `logs.ts`: `DayStatus` type + `mapLogsToWeekStatus(logs, weekStart, today, plannedDays)` — pure function, converts `TrainingLog[]` to 7-slot `DayStatus[]` array (done/missed/rest/today/future).
- `WeeklyHeatmap.tsx`: Replaced volume card (current/previous/delta) with 7-cell day grid. New props: `weekLogs: DayStatus[]`. Color-coded cells: done=green, missed=orange, rest=dimmed, today=blue-border, future=faded.
- `AthleteDashboard.tsx`: `weekStatus: DayStatus[]` state populated via fire-and-forget `listWeekLogs()` + `mapLogsToWeekStatus()`. `prValue` state via fire-and-forget `getCurrentPRs()`.
- i18n (EN/RU/CN): `setsThisWeek`, `vsLastWeek`, `myPR`, `weeklyVolume` in `athleteDashboard.*`.

**Changed:**

- `StatsStrip` data: was `[Date, Volume, Competitions]` hardcoded → now `[sets this week, vs last week %, my PR]` real live data.
- `WeeklyHeatmap.module.css`: Removed old volume-card classes (header/badge/up/down/neutral/metric/valueSmall). Added grid/cell/done/missed/rest/today/future/labels/dayLabel.

**Verified:** `pnpm type-check` ✅ `pnpm build` ✅ (Gate 3)

### 2026-02-24 — Track 4.24 Phase 12: Animation System + Dark Mode + Accessibility + Stubs

**Added:**

- **Athletic Pulse Animation System**: Configured motion tokens (`--motion-pulse/flow/burst`), and applied button micro-animations. Added global disable via `@media (prefers-reduced-motion: reduce)`.
- **Advanced Dark Mode**: Added `--color-bg-primary: #000000` true-black on OLED screens via `@media (dynamic-range: high)` to optimize battery.
- **Accessibility**: Added scalable font framework via `FontScaleProvider` (persistent in `localStorage`) with a UI slider in Settings page (1.0x - 1.5x range). All core touch targets audited and passed ≥44px.
- **Feature Stubs**: Added `ComingSoonCard` for Offline and Video placeholders in the `more/page.tsx`. Replaced real functionality for `PDF Export` in `WeekConstructor.tsx` with a coming soon toast. Added `ExerciseIllustration` for media-less workouts.

**Verified:** `pnpm type-check` ✅ `pnpm lint` ✅ `pnpm build` ✅

### 2026-02-24 — Track 4.24 Phase 11: Data Entry UX

**Added:**

- `SetLogger.tsx` component for data entry featuring modes (`plan`, `log`), circular Rest Timer and RPE slider.
- `getLastExerciseLog` service function for "Autofill from last workout" logic.
- `ExerciseItem.tsx` extracted as a standalone reusable component for athlete views.

**Changed:**

- `ExerciseRow.tsx` refactored to consume `SetLogger mode="plan"` instead of inline HTML forms.
- `AthleteTrainingView.tsx` refactored to utilize extracted `ExerciseItem.tsx`, fixing context scope bugs.
- `QuickWorkout.tsx` updated to use Stepper UI inputs for unified dose UX.

**Verified:** `pnpm type-check` ✅ `pnpm build` ✅

### 2026-02-24 — Track 4.24 Phase 10: WeekConstructor Refactor + QuickWorkout

**Added:**

- `WeekStrip.tsx` extracted for presentational 7-day horizontal strip rendering.
- `WeekSummary.tsx` extracted for CNS chip, exercise count, and compliance summary.
- More Menu (⋯) dropdown in `WeekConstructor.tsx` to group secondary actions (Print, PDF stub, History, Snapshot, Override).

**Changed:**

- `WeekConstructor.tsx` refactored from monolith (~800 -> ~650 LOC), leveraging `WeekStrip` and `WeekSummary` to simplify markup.
- `QuickPlanBuilder.tsx` renamed to `QuickWorkout.tsx` globally.
- `pb.authStore.model` usages in `QuickWorkout.tsx` migrated to `pb.authStore.record` (PB v0.23+).
- Quick Workout entry point added to Athlete Today View FAB and Coach More Menu.

**Verified:** `pnpm type-check` ✅ `pnpm lint` ✅ `pnpm build` ✅

### 2026-02-24 — Track 4.24 Phase 9: Day Constructor

**Added:**

- `DayConstructor.tsx` container interface for detailed daily layout.
- `DayHeader.tsx` and `DayActions.tsx` for structured daily workout sections.
- `ExerciseRow.tsx` refactored from `ExerciseCard` to include inline editing and metrics.
- Adaptive styling for Day Constructor (Sidebar on Desktop, Full-screen on Mobile).
- `@dnd-kit/core` layout and logic for drag-and-drop exercise resorting.
- `types.ts` for strict typing (`UpdateExerciseData`, `AdHocWarmupData`).

**Changed:**

- `DayColumn.tsx` simplified into a summary card component (>700 LOC -> <200 LOC).
- `WeekConstructor.tsx` updated with `activeDay` state and lazy-loading integration for `DayConstructor`.

**Verified:** `pnpm type-check` ✅ `pnpm lint` ✅ `pnpm build` ✅

### 2026-02-24 — Track 4.24 Phase 8: Template Panel

**Added:**

- `useTemplates` hook implementing SWR (Stale-While-Revalidate) pattern for optimal template fetching.
- `TemplatePanel.tsx` Container and `TemplatePanelUI.tsx` Presenter components for separation of concerns.
- Adaptive layout for Template Panel: Sidebar on Desktop, `BottomSheet` on Mobile, utilizing pure CSS media queries to prevent Static Export hydration mismatches.
- `TemplatePanelContent.tsx` with Shimmer Loading skeletons and polished empty states.
- Template Panel button in `DayColumn` header, managed by `WeekConstructor` state.
- i18n keys for Template Panel across EN, RU, CN.

**Verified:** `pnpm type-check` ✅ `pnpm build` ✅

### 2026-02-24 — Track 4.24 Phase 6: Today View & Dashboards

**Added:**

- `usePullToRefresh` hook for touch devices on dashboards.
- `DashboardErrorBoundary` generic component to isolate section failures.
- `getWeeklyVolumeDelta`, `getTeamReadinessAlerts` purely derived services.
- `ScoreCard`, `StatsStrip`, `TodayWorkoutCard`, `WeeklyHeatmap`, `RecentNotifications` components for Athlete Dashboard.
- `TeamAlerts`, `TrainingToday`, `PendingReviews`, `WeekSummaryBar` components for Coach Dashboard.
- i18n keys for Assign UX in all 3 locales (EN, RU, CN).

**Changed:**

- `AthleteDashboard.tsx` completely refactored from monolith to focused modular components.
- `dashboard/page.tsx` Coach Dashboard integrating the new `TeamAlerts`, `TrainingToday`, etc.
- `SeasonDetail.tsx` PhaseCard now prominently fetches and renders active plan assignments with an Unassign button.

**Verified:** `pnpm type-check` ✅ `pnpm lint` ✅ `pnpm build` ✅

### 2026-02-23 — Track 4.24 Phase 5: Role-Based Navigation & BottomSheet

**Added:**

- `<div id="portal-root">` to `layout.tsx` for standalone overlays.
- `BottomSheet.tsx`, `BottomSheet.module.css`, and `useBottomSheet.ts` for a unified glassmorphic modal overlay.
- `more/page.tsx` menu hub structure for athletes and coaches.
- `FeatureTeaser.tsx` generic widget for upcoming features.
- i18n keys for navigation additions across EN, RU, CN.

**Changed:**

- `BottomTabBar.tsx` now conditionally renders `ATHLETE_TABS` or `COACH_TABS` depending on `useAuth()`.

**Verified:** `pnpm type-check` ✅ `pnpm build` ✅ `pnpm lint` ❌

### 2026-02-23 — Track 4.24 Phase 4: Assignment Validation & Lifecycle

**Fixed:**

- `planAssignments.ts:assignPlanToAthlete()`: guard — throws if `plan.status !== 'published'`
- `planAssignments.ts:assignPlanToGroup()`: guard — throws if `plan.status !== 'published'`
- `plans.ts:publishPlan()`: Step 3.5 auto-deactivate — при публикации плана снимает active assignments у планов-соседей той же фазы (fire-and-forget)

**Verified:** `pnpm type-check` ✅ `pnpm build` ✅

### 2026-02-23 — Track 4.24 Phase 3: Resolution Logic Fixes

**Added:**

- `src/lib/utils/dateHelpers.ts` — `todayForUser(timezone?: string): string` с `Intl.DateTimeFormat('en-CA')` — timezone-aware, backward compat (UTC default)

**Fixed:**

- `planResolution.ts` `getPublishedOverrideForAthlete()`: добавлен `phase_id.start_date <= today && phase_id.end_date >= today` → стылые overrides из прошлых сезонов больше не возвращаются
- `planResolution.ts` Step 3: добавлен `week_number = {:week}` фильтр с `calcWeekNumber()` — атлет получает план своей недели

**Changed:**

- `planResolution.ts`: удалена приватная `todayForUser()`, импортируется из `@/lib/utils/dateHelpers`
- `planResolution.ts`: добавлена приватная `calcWeekNumber(phaseStart, today): number`

**Verified:** `pnpm type-check` ✅ `pnpm build` ✅

**Added:**

- `src/lib/pocketbase/services/planResolution.ts` — новый SRP-сервис (~150 LOC): `getPublishedPlanForToday` (public), `getPublishedOverrideForAthlete`, `getPublishedPlanViaAssignments`, `getActivePlan` (private), `export const PLAN_EXPAND`

**Changed:**

- `logs.ts`: удалён блок `// ─── Plan Fetch` (-145 LOC), добавлен re-export `getPublishedPlanForToday` из `planResolution.ts`
- `logs.ts`: `listTodayLogs()` — inline `new Date().toISOString().split('T')[0]` вместо удалённой `todayISO()`
- `AthleteDashboard.tsx`, `AthleteTrainingView.tsx`, `AthleteDetailClient.tsx` — импорты `getPublishedPlanForToday` → `planResolution`
- `planResolution.ts`: `todayISO()` переименована в `todayForUser()` (gate requirement)

**Verified:** `pnpm type-check` ✅ `pnpm build` ✅ grep 0 old imports ✅

**Added:**

- `tokens.css`: PWA safe areas, score colors, chart palette (6), bottom sheet tokens, Athletic Pulse motion aliases, `.tabular-nums`, `.skeleton-shimmer`, `prefers-reduced-motion` global disable
- `ExercisePicker`: category color bar (4px left border) on exercise cards
- `DESIGN_SYSTEM.md`: BottomSheet pattern, Athletic Pulse aliases table

**Changed:**

- `BottomTabBar.module.css`: `env(safe-area-inset-bottom)` → `var(--safe-bottom)` token
- `DayColumn.tsx`: weight input `inputMode="decimal"` for mobile decimal keypad
- `DESIGN_SYSTEM.md`: synced animation durations (150/250/350ms) with `tokens.css`

**Fixed:**

- `logs.ts`: SQL injection in `getPublishedPlanViaAssignments` — string interpolation → `pb.filter()` with named params
- `DayColumn.tsx`, `TemplateEditor.tsx`: 4 icon-only buttons missing `aria-label`

**Removed:**

- `planAssignments.ts`: dead code `duplicatePlan()` + `createIndividualOverride()` (-62 LOC)

### 2026-02-23 — Track 4.23 Phase 5: Unit Tests

#### Added

- **`notifications.test.ts`**: 8 unit-тестов для `sendNotification()` и `sendCoachNote()`
  - `sendNotification`: missing userId → throws, muted type → null, message_key/params stored, default priority = normal, non-muted type → creates
  - `sendCoachNote`: no user_id → null, custom text preserved in messageParams.text, empty message → `{}`

#### Verified

- `pnpm type-check` → Exit 0 ✅
- `pnpm build` → Exit 0 ✅
- `pnpm test` → **94/94 passed** ✅ (+8 новых)

### 2026-02-23 — Track 4.23 Phase 3+4: App Icon Badge + Badge Asset

#### Added

- **`sw.ts`**: после `showNotification()` — `setAppBadge(1)` с feature detection (`'setAppBadge' in self.navigator`)
- **`sw.ts`**: в `notificationclick` — `clearAppBadge()` при взаимодействии пользователя с уведомлением
- **`useNotifications.ts`**: `useEffect` на `unreadCount` → `setAppBadge(count)` если > 0, `clearAppBadge()` если = 0 — синхронизация OS значка с реальным счётчиком
- **`/public/icons/badge-72.png`**: монохромный 72×72 PWA badge icon (белый «J» на прозрачном фоне)

#### Verified

- `pnpm type-check` → Exit 0 ✅
- `pnpm build` → Exit 0 ✅
- `pnpm test` → 86/86 passed ✅

### 2026-02-23 — Track 4.23 Phase 2: NotificationBell i18n Render

#### Added

- **`NotificationBell.tsx`**: полностью переписан — `useTranslations('notifications')` вместо props labels, `renderMessage()` resolver: `message_key → t(key, params)` с fallback на `n.message`
- **`NotificationBell.tsx`**: click на notification → `markRead` + `router.push(n.link)` если есть link (навигация из уведомлений)
- **`NotificationsClientPage.tsx`**: i18n resolver + при наличии `n.link` — рендерит `<a href>` вместо `<span>` с click → markRead

#### Fixed

- **`useNotifications.ts:loadInitial`**: фильтруем expired уведомления (`expires_at < now`) — не показываем устаревшие в колоколе
- **`analytics/page.tsx`**: убраны устаревшие props `labels` из `<NotificationBell />`

#### Verified

- `pnpm type-check` → Exit 0 ✅
- `pnpm build` → Exit 0 ✅
- `pnpm test` → 86/86 passed ✅

### 2026-02-23 — Track 4.23 Phase 1: Notification Triggers

#### Added

- **`groups.ts`** `joinByInviteCode()`: notify атлету (system/joinedGroup) + тренеру (invite_accepted/inviteAccepted) после join — fire-and-forget, не блокирует join
- **`groups.ts`** `moveAthleteToGroup()`: notify атлету (system/movedToGroup) при перемещении между группами — fire-and-forget
- **`plans.ts`** `publishPlan()`: batch notify всех назначенных атлетов (через direct assignments + group members) с `batchCheckPreferences()` для фильтрации disabled_types
- **`AchievementsGrid.tsx`**: achievement notification trigger после `checkAndGrant()` — при `newlyEarned.length > 0` создаёт `achievement` уведомления fire-and-forget
- **i18n ×3** (RU/EN/CN): `coachNoteDefault`, `coachNoteSent`, `planPublished`, `achievementEarned`, `inviteAccepted`, `movedToGroup` в `notifications.` секцию

#### Fixed

- **`GroupMember` interface** в `groups.ts`: добавлен `user_id?: string` в `expand.athlete_id` type для корректного resolve при batch-notify

#### Verified

- `pnpm type-check` → Exit 0 ✅
- `pnpm build` → Exit 0 ✅
- `pnpm test` → 86/86 passed ✅

### 2026-02-23 — Track 4.23 Phase 0: Foundation — Unified Service + Security

#### Security

- **`planAssignments.ts`**: 4 raw filter interpolations → `pb.filter()` — `listPlanAssignments()` (L20), `assignPlanToAthlete()` (L35), `assignPlanToGroup()` (L64), `listActivePlanAssignments()` (L100)
- **`plans.ts`**: 3 raw filter interpolations → `pb.filter()` — `listPlansForPhase()` (L37), `getOrCreatePlan()` (L90), `listPlanExercises()` (L106)

#### Added

- **`notifications.ts`**: новая `sendNotification({ userId, type, messageKey, messageParams?, link?, priority? })` — unified creator с preference check (`disabled_types`) и fail-safe fallback (no prefs = allow all). Throws если `userId` пустой (Poka-Yoke).
- **`notifications.ts`**: новая `batchCheckPreferences(userIds, type)` → `Set<string>` — batch check предпочтений через 1 HTTP запрос вместо N последовательных
- **PocketBase schema**: `notifications` — +`message_key` (text, max 100), +`message_params` (json) для i18n уведомлений

#### Fixed

- **`notifications.ts`** `sendCoachNote()`: критический баг — `user_id: athleteId` (athletes ≠ users коллекции) → теперь resolve `athlete.user_id` через PB, strict no fallback; кастомный текст тренера сохраняется через `messageParams: { text: message }` (UX не теряется)
- **`plans.ts`**: удалён stale `console.log('[listPlansForPhase]...')` (L42)
- **`dashboard/page.tsx`** `handleNotify`: хардкод emoji-строка → `tNotif('coachNoteDefault')` (i18n локализованный default text)
- **`types.ts`**: `NotificationsRecord` — +`message_key?: string`, +`message_params?: Record<string, string | number>`

#### Verified

- `pnpm type-check` → Exit 0 ✅
- `pnpm build` → Exit 0 ✅
- `pnpm test` → 86/86 passed ✅
- PB `notifications.createRule` = `@request.auth.id != ""` — OK ✅

### 2026-02-23 — Track 4.22: Invite Links & Group Management

#### Added

- **`src/lib/utils/pendingInvite.ts`** — новый утилитарный модуль для управления pending invite-кодами: `savePendingInvite`, `getPendingInvite`, `clearPendingInvite`, `consumePendingInvite`, `joinWithPendingInvite`, `getJoinedGroupName`. localStorage + sessionStorage fallback (Safari Private Mode). Auto-cleanup stale кодов >24ч.
- **`src/app/[locale]/(public)/join/page.tsx`** + **`JoinContent.tsx`** — `/join?code=XXXXXX` landing page с полной state machine: loading / success / alreadyMember / codeExpired / invalidLink / coachCannotJoin / registerPrompt. Suspense wrapper для Static Export совместимости. Generic OG meta tags.
- **`join.module.css`** — стили страницы: glassmorphism card, icon variants, primary/secondary buttons, shimmer skeleton.
- **`groups.ts`**: `moveAthleteToGroup()` — перемещение атлета между группами с create-first стратегией и coach_id guard; `hasActiveGroupPlan()` — проверка активного плана у группы.
- **`qrcode` package** — клиентская генерация QR кода (MIT).
- **Coach Share UI** в `settings/groups/page.tsx`: кнопка Share Link (Web Share API + clipboard fallback + expiry check), QR Code modal (dark mode aware, download PNG), Move/Add athletes между группами (ConfirmDialog с предупреждением о планах).
- **i18n** ×3 (RU/EN/CN): `join.*` (~15 ключей), `groups.shareLink/linkCopied/inviteTitle/inviteText/linkExpiry/linkExpiringSoon/moveTo/addTo/moveWarning*/moveSuccess/addSuccess/showQR/downloadQR`, `auth.inviteBanner`, `onboarding.done.joinedGroup`.
- **pendingInvite.test.ts** — 14 unit тестов (save/get/stale/clear/consume/sessionStorage fallback/getJoinedGroupName).

#### Fixed

- **`groups.ts`** `joinByInviteCode`: добавлен `deleted_at = ""` фильтр (soft-deleted группы не принимают инвайты).
- **`groups.ts`** `joinByInviteCode`: `first_name`/`last_name` теперь копируются в новый athlete record.
- **`groups.ts`** `joinByInviteCode`: `alreadyMember` теперь re-throw как `Error('invite.alreadyMember')` — вместо silent ignore.
- **`groups.ts`** `listMyGroups`: `pb.authStore.model` → `pb.authStore.record` (депрекация).
- **`RegisterForm.tsx`**: при pending invite — role selector скрыт, роль заблокирована на `athlete`, показывается invite info banner.
- **`LoginForm.tsx`**: `joinWithPendingInvite()` вызывается после email логина и Google OAuth.
- **`OnboardingWizard.tsx`**: `joinWithPendingInvite()` вызывается ПЕРВЫМ в `handleFinish()` (до specialization save), redirect → `/dashboard` если joined group, StepDone показывает «Вы добавлены в группу X».

#### Verified

- `pnpm type-check` → Exit 0 ✅
- `pnpm build` → Exit 0 ✅
- `pnpm vitest run` → 86/86 passed ✅ (+14 новых тестов pendingInvite)

#### Post-Audit Fixes (пост-аудит, тот же трек)

- **`groups.ts`** `createGroup`: `pb.authStore.model` → `pb.authStore.record` (пропущено при Phase 0)
- **`JoinContent.tsx`** registerPrompt: кнопка показывала `t('registerFirst')` (описательный текст) вместо лейбла — добавлены ключи `join.register` + `join.loginExisting` ×3
- **`JoinContent.tsx`** href двойной locale: `href={\`/${locale}/dashboard\`}` → `href="/dashboard"` (Link из `@/i18n/navigation` добавляет locale автоматически)
- **`JoinContent.tsx`**: убран неиспользуемый `useLocale` импорт
- **`groups/page.tsx`**: хрупкий `.replace(' «»', '')` хак → нормальные ключи `groups.moveConfirm` + `groups.addConfirm` ×3

#### Added

- **`athletes.ts`**: new `getSelfAthleteProfile()` — queries by `user_id` for athlete-context (was using coach-only `listMyAthletes()`)

#### Fixed

- **`readiness.ts`**: SQL injection in `getTodayCheckin()` + `getSelfAthleteId()` — migrated to `pb.filter()`
- **`AthleteDashboard.tsx`**: discipline badge now loads via `getSelfAthleteProfile()` (was invisible to athletes)
- **`settings/page.tsx`**: specialization + PR sections now visible to athletes (was calling coach-only method)
- **`OnboardingWizard.tsx`**: athlete specialization + PB now saves during onboarding (was silently lost)
- **`AthleteDetailClient.tsx`**: PR Add/Delete restricted to coach role; `prForm.season` → `season_type`; PR delete confirm; `.toFixed(2)` formatting
- **`AthleteCard.tsx`** + **`AthleteDetailClient.tsx`**: discipline labels now i18n-ized via `onboarding.specialization.disciplines.*`

### 2026-02-22 — Track 4.21 Phase 7: QA Gate

#### Added

- **`nameHelpers.test.ts`**: 19 unit tests for `getDisplayName()` and `getInitials()` — full fallback chain coverage (first+last, name, email, null/undefined)
- **`validation.test.ts`**: 18 unit tests for Zod schemas — `DisciplineSchema`, `PRSourceSchema`, `SeasonTypeSchema`, `PersonalRecordSchema`, `AddPRSchema`

#### Verified

- `pnpm type-check` → Exit 0 ✅
- `pnpm build` → Exit 0 ✅
- `pnpm vitest run` → 72/72 passed ✅ (was 35, +37 new tests)

### 2026-02-22 — Track 4.21 Phase 6: i18n

#### Changed

- **`messages/{en,ru,cn}/common.json`**: added `onboarding.specialization.meters`, `.outdoor`, `.indoor`, `.competition`, `.training` to existing specialization objects — these were hardcoded in settings/page.tsx and athlete detail PR forms

### 2026-02-22 — Track 4.21 Phase 5: Name Migration

#### Changed

- **`AthleteCard.tsx`**: all 7 `athlete.name` display references → `getDisplayName(athlete)` (display name, aria-labels, notify/delete callbacks)
- **`AthleteDetailClient.tsx`**: hero `<h1>` `athlete.name` → `getDisplayName(athlete)`; added `getDisplayName` to nameHelpers import
- **`groups.ts`**: `joinByInviteCode()` athlete auto-create — `user.name` → `getDisplayName(user as HasName)` + import nameHelpers

### 2026-02-22 — Track 4.21 Phase 4 (residual): Coach View Discipline + PR

#### Added

- **`AthleteDetailClient.tsx`**: discipline chip in hero (below athlete name); PR section in OverviewTab — `getCurrentPRs` on load, Add PR inline form (discipline/season/result/date), delete PR button; replaced local `initials()` → `getInitials()` from nameHelpers
- **`athleteDetail.module.css`**: `.disciplineChip`, `.prSection`, `.prSectionHeader`, `.prForm`, `.prFormRow`, `.prSelect`, `.prInput`, `.prSaveBtn`, `.prList`, `.prRow`, `.prResult`, `.prDeleteBtn`, `.prEmpty`
- **`EditAthleteModal.tsx`**: `primary_discipline` select field (high_jump / long_jump / triple_jump, optional)
- **`AddAthleteModal.tsx`**: `primary_discipline` select field (optional on create)
- **`messages/{en,ru,cn}/common.json`**: added `dashboard.newAthlete.discipline` key

### 2026-02-22 — Track 4.21 Phase 4: Settings & Dashboard

#### Added

- **`settings/page.tsx`**: new athlete-only Specialization section — DisciplineSelector (edit primary + secondary), save → `updateAthlete()`, PR table with add form (discipline, season, result, source, date) + expandable history
- **`settings/page.tsx`**: profile section now edits `first_name` + `last_name` separately (two-column layout)
- **`settings.module.css`**: new classes: `.nameRow` (2-col grid), `.sectionHeader`, `.disciplineSummary`, `.disciplineChip`, `.prSection`, `.prHeader`, `.prToggle`, `.prAddBtn`, `.prForm`, `.prFormRow`, `.prList`, `.prRow`, `.prRowCurrent`, `.prCurrentBadge`, `.prDeleteBtn`, `.prEmpty`
- **`AthleteDashboard.tsx`**: hero badge `.disciplineBadge` showing athlete's primary discipline under welcome text
- **`AthleteDashboard.module.css`**: added `.disciplineBadge` class
- **`AthleteCard.module.css`**: added `.disciplineChip` class under athlete name

#### Changed

- **`settings/page.tsx`**: imports `updateAthlete`, `listPersonalRecords`, `addPersonalRecord`, `deletePersonalRecord`, `DisciplineSelector`, `Discipline` type
- **`AthleteCard.tsx`**: replaced local `initials()` function with imported `getInitials()` from `nameHelpers`; shows `primary_discipline` chip below name when set (falls back to birth_date)
- **`AthleteDashboard.tsx`**: fetches `listMyAthletes()` on load to read `primary_discipline` for hero badge

### 2026-02-22 — Track 4.21 Phase 3: Registration & Onboarding

#### Added

- **`DisciplineSelector.tsx`** (new shared): primary single-select + secondary multi-select + optional PB input; reusable in Onboarding, Settings, Coach view
- **`DisciplineSelector.module.css`**: card-style selection UI, all design tokens

#### Changed

- **`RegisterForm.tsx`**: single `name` field → `firstName` + `lastName` side-by-side + role selector (Athlete/Coach) at registration time
- **`OnboardingWizard.tsx`**: StepProfile (name+role) removed; new StepSpecialization (DisciplineSelector + PR input for athletes, info card for coaches); role read from `authStore` instead of wizard state; `handleFinish` now saves discipline + secondaries + PR via new services
- **`validation/core.ts`**: `RegisterSchema` — removed legacy `name` field, `last_name` now optional, added `role` enum
- **`AuthForms.module.css`**: added `.nameRow` for two-column name inputs
- **`messages/{en,ru,cn}/common.json`**: added `auth.firstName/lastName/firstNamePlaceholder/lastNamePlaceholder/roleLabel`; new `onboarding.specialization` section with discipline translations

### 2026-02-22 — Track 4.21 Phase 2: Services

#### Added

- **`services/personalRecords.ts`** (new): `listPersonalRecords`, `getCurrentPRs`, `addPersonalRecord` (is_current flip: update→create), `updatePersonalRecord`, `deletePersonalRecord`
- **`lib/utils/nameHelpers.ts`** (new): `getDisplayName(user)` + `getInitials(user)` with fallback chain (first_name+last_name → name → email prefix)

#### Changed

- **`auth.ts`**: `registerWithEmail` → object params `{email, password, first_name, last_name, role}`, computes `name` automatically; `updateUserName` → object `{first_name, last_name}`, patches all 3 fields
- **`AuthProvider.tsx`**: `register` callback + `AuthContextValue` type updated to object params
- **`athletes.ts`**: `createAthlete` + `updateAthlete` now accept `primary_discipline` + `secondary_disciplines`; `hardDeleteAthleteWithData` + cascade delete for `personal_records`
- **`validation/index.ts`**: + `DisciplineSchema`/`SeasonTypeSchema`/`PRSourceSchema` (from core), + `PersonalRecordSchema`/`AddPRSchema` (from personalRecords)

#### Fixed

- **`athletes.ts` L151** (Phase 0 miss): raw interpolation in achievements `deleteAll` → `pb.filter()`
- **Compatibility patches**: `RegisterForm.tsx`, `OnboardingWizard.tsx`, `settings/page.tsx` updated to new API (name splitting until Phase 3)

### 2026-02-22 — Track 4.21 Phase 1: Schema & Types

#### Added

- **PB `users`**: +`first_name` (text, max 100), +`last_name` (text, max 100)
- **PB `athletes`**: +`primary_discipline` (select: triple_jump/long_jump/high_jump), +`secondary_disciplines` (multi-select, maxSelect 2)
- **PB `personal_records`** (new collection): fields athlete_id/discipline/season_type/result/date/competition_name/source/is_current/notes + API rules + indexes
- **`types.ts`**: `Discipline`, `SeasonType`, `PRSource` types; `PersonalRecordsRecord` interface; `first_name/last_name` in `UsersRecord`; disciplines in `AthletesRecord`
- **`collections.ts`**: `PERSONAL_RECORDS` constant
- **`validation/personalRecords.ts`** (new): `PersonalRecordSchema`, `AddPRSchema`, exported types

#### Changed

- **`validation/core.ts`**: `DisciplineSchema`/`SeasonTypeSchema`/`PRSourceSchema` added; `UsersSchema` +optional first/last name; `RegisterSchema` +`first_name`/`last_name` required; `AthletesSchema` +disciplines +refine (secondary ≠ primary)

### 2026-02-22 — Track 4.21 Phase 0: SQL Injection Fixes

#### Security

- **`athletes.ts`**: 13 raw filter interpolations migrated to `pb.filter()` — `listMyAthletes()`, `hardDeleteAthleteWithData()` (×8 across logs/tests/checkins/seasons/phases/plans), `getLatestCheckin()`, `getLatestTestResult()`
- **`groups.ts`**: 3 raw filter interpolations migrated to `pb.filter()` — `listMyGroups()`, `joinByInviteCode()`, `listGroupMembers()`

### 2026-02-22 — Track 4.20 Phase 6: Stability

#### Added

- **Utility**: `src/lib/utils/errors.ts` — `logError(error, context)` fire-and-forget error logging to console + telemetry; `getErrorMessage(error)` with PocketBase-specific extraction
- **Tests**: `src/lib/utils/__tests__/errors.test.ts` — 8 unit tests for error utilities

#### Changed

- **Error handling**: ~82 empty `catch {}` blocks replaced across ~40 files with context-aware handling:
  - Critical catches → `logError()` + UI error state (pages, modals, forms)
  - Expected catches → `/* expected: ... */` comments (404s, invalid dates)
  - Non-critical catches → `/* non-critical: ... */` comments (streak, achievements, localStorage)
- **PB Index**: `idx_plan_ex_plan(plan_id)` replaced with composite `idx_planex_plan_deleted(plan_id, deleted_at)` — covers soft-delete filter queries via leftmost prefix
- **Docs**: `ARCHITECTURE.md` indexes section updated

### 2026-02-22 — Track 4.20 Phase 5: Bidirectional Communication

#### Added

- **PB Field**: `log_exercises.skip_reason` (text, max 255)
- **Feature**: `AthleteTrainingView.tsx` — per-day notes textarea with debounced auto-save (500ms), `log.id` guard
- **Feature**: `AthleteTrainingView.tsx` — skip_reason quick-select (Equipment|Pain|Time|CoachDecision|Other)
- **Feature**: `CoachLogViewer.tsx` — displays `training_logs.notes` + `log_exercises.skip_reason`
- **Feature**: Adaptation banner when readiness < 60 in `AthleteTrainingView.tsx`
- **Service**: `readinessHistory.ts` → `getLatestReadinessForGroup()` (Promise.all per athlete)
- **Feature**: `WeekConstructor.tsx` → readiness mini-badges for assigned athletes (color-coded)
- **i18n ×3**: `athleteNotePlaceholder`, `adaptationBanner`, `skipReasons.*`, `shared.saving`

### 2026-02-22 — Track 4.20 Phase 4.5: Warmup Page Migration

#### Changed

- **`templates.ts`**: `listTemplates()` получил опциональный `type?` параметр + `expand: 'template_items(template_id)'`. Backward compatible — все вызовы без аргумента работают.
- **`reference/warmup/page.tsx`**: Удалён hard-coded `PROTOCOLS` массив. Данные загружаются из PocketBase через `listTemplates('warmup')`. Добавлены 3 состояния UI: skeleton loading (×3), error+Retry кнопка, cards из PB. `BreathingTimer` без изменений; добавлен `getLocalizedText()` helper для locale-aware fallback.
- **`warmup.module.css`**: Добавлены `.skeleton` (shimmer 1.2s), `.emptyState`, `.retryBtn` (44px touch target), `.protocolDesc`.
- **i18n ×3**: `warmupPage.loading`, `warmupPage.loadError`, `warmupPage.noTemplates`, `warmupPage.retry`.

### 2026-02-22 — Track 4.20 Phase 4: Workout + Templates Hybrid UX

#### Added

- **`templates.ts`**: `appendTemplate()` — добавляет упражнения шаблона к дню плана (append-only, no eject for training_day, sequential SQLite-safe inserts)
- **`templates.ts`**: `createTemplateFromPlanDay()` — сохраняет день плана как шаблон training_day (chunked batch по 5, SQLite safety)
- **`DayColumn.tsx`**: `TrainingTemplatePicker` — выпадающий список шаблонов типа `training_day` (по паттерну WarmupTemplatePicker)
- **`DayColumn.tsx`**: `SaveAsDayTemplateBtn` — кнопка Bookmark → inline input (без `window.prompt()`); закрывается по Escape/Enter
- **`DayColumn.tsx`**: Props `onAppendTemplate` + `onSaveAsTemplate`; JSX `.mainToolbar` flex row
- **`DayColumn.module.css`**: `.mainToolbar` + override стили для toolbar контекста
- **`WeekConstructor.tsx`**: `handleAppendTemplate` + `handleSaveAsTemplate` handlers (lazy import, coachId из authStore)
- **`QuickPlanBuilder.tsx`**: «Save to Library» — lazy PB import, `createTemplate()` + `addTemplateItem()` chunked batch (5); states `savingToLibrary`/`savedToLibrary`
- **`QuickPlanBuilder.module.css`**: `.libraryBtn` (accent ghost style)
- **i18n ×3**: `training.trainingTemplatePicker`, `training.templatePickerEmpty`, `training.saveAsTemplate`, `training.enterTemplateName`, `quickPlan.saveToLibrary`, `quickPlan.savedToLibrary`

#### Fixed

- **Security**: `logs.ts` — 9 instances of raw string interpolation in filter queries migrated to `pb.filter()` (SQL injection prevention)
- **UX**: `SeasonDetail.tsx` `handleAssign` — silent `catch {}` replaced with `assignError` state; `alert()` removed
- **UX**: `groups/page.tsx` — silent `catch` in `handleCreate` replaced with `createError` inline error display; native `confirm()` removed

#### Added

- **Component**: `ConfirmDialog.tsx` + `ConfirmDialog.module.css` — reusable glassmorphism confirm dialog with danger variant, Escape key support, click-outside, min 44×44px touch targets
- **Feature**: Delete Season button in `training/page.tsx` (Trash2 icon, optimistic removal, rollback on error)
- **PocketBase**: `training_phases` API rules hardened — coach-only create/update/delete, authenticated read for coaches+athletes
- **i18n**: Added 9 new keys to RU/EN/CN `common.json` (`deleteSeasonTitle/Confirm`, `seasonDeleted`, `noPublishedPlan`, `createError`, `deleteGroupTitle/Confirm`, `confirmDelete/Cancel`, `assignFailed`)
- **CSS**: `.seasonCardInner`, `.seasonDeleteBtn`, `.assignError` CSS classes

---

### 2026-02-22 — Track 4.20 Phase 3: Override + Plan Resolution

#### Added

- **Feature**: `createIndividualOverride(planId, athleteId)` in `plans.ts` — creates a published copy of a plan for a specific athlete. Sequential `for...of` exercise copy (SQLite safety). Guard: throws if source is itself an override.
- **Feature**: `listOverridesForPlan(planId)` + `countOverridesForPhase(phaseId)` helper functions in `plans.ts`
- **Feature**: Override button (UserCog icon) in `WeekConstructor.tsx` toolbar — active only when plan is published. Opens modal with athlete dropdown.
- **Feature**: Override badge in `SeasonDetail.tsx` PhaseCard — shows «N overrides» count via `countOverridesForPhase`
- **i18n**: 6 new keys ×3 locales: `createOverride`, `overrideFor`, `overrides`, `overrideWarning`, `overrideSuccess`, `selectAthleteForOverride`
- **CSS**: `.overrideBadge` in `SeasonDetail.module.css`; override modal styles (overlay, card, actions) in `WeekConstructor.module.css`

#### Fixed

- **Resolution**: `getPublishedPlanForToday()` now checks Step 0 (individual override via `parent_plan_id != "" AND athlete_id = X`) **before** plan_assignments. Season fallback filter now excludes overrides (`parent_plan_id = ""`).

---

### 2026-02-22 — Track 4.20 Phase 2: Athlete Dashboard + Season Visibility

#### Fixed

- **Critical**: `logs.ts` `getPublishedPlanForToday()` — 3-step resolution: direct plan_assignments → group membership → season fallback
- **Critical**: `AthleteDashboard.tsx` — replaced placeholder with real `getPublishedPlanForToday()` call
- **UX**: `SeasonDetail.tsx` PhaseCard — replaced text UUID input with radio Group|Athlete + lazy dropdown

#### Added

- **Service**: `groups.ts` — `getMyGroupIds(athleteId)`
- **Service**: `seasons.ts` — `listSeasonsForAthlete(athleteId)`
- **Component**: `AthleteSeasonsList.tsx` + `.module.css` — read-only seasons for athletes
- **Prop**: `AthleteTrainingView.onAthleteIdResolved` callback
- **PocketBase**: `plan_assignments` listRule+viewRule — group membership check added
- **i18n**: `mySeasons`, `assignToGroup`, `assignToAthlete`, `selectGroup`, `todayExercises` in RU/EN/CN

---

### 2026-02-22 — Track 4.19 Phase 2: Coach Notes & Log Visibility (Partial)

#### Added

- **TDD**: `compliance.test.ts` — 11 тестов: 0%/60%/100%, AM/PM, dedup, cap + ExerciseComparison 4 статуса (matched/partial/missed/added)
- **Service**: `compliance.ts` — `calculateWeeklyCompliance()` и `getExerciseComparison()` (pure functions, zero PB dependency)
- **UI**: `DayColumn` — `dayNote` prop + textarea (500 chars, MessageSquare icon, glassmorphism, readOnly fallback `<p>`)
- **State**: `WeekConstructor` — `dayNotes` state (инициализация из `plan.day_notes`, auto-save через `updatePlan()`)
- **API**: `updatePlan()` — расширен на `day_notes` поле
- **i18n**: `training.dayNote` + `training.dayNotePlaceholder` ×3 локали (RU/EN/CN)
- **UI**: `AthleteTrainingView` DayCard — `dayNote` banner из `plan.day_notes` (glassmorphism, MessageSquare icon)
- **UI**: `CoachLogViewer` — Plan vs Fact comparison (desktop table / mobile cards, 4 статуса, compliance chip)
- **UI**: `AthleteCard` — `weekCompliance` prop + TrendingUp inline badge (data-level: high/medium/low + CSS)
- **i18n**: `coachLog` namespace × RU+EN+CN, `dashboard.compliance` × RU+EN+CN
- **UI**: `CoachLogViewerLazy` → `AthleteDetailClient.TrainingTab` via `next/dynamic(ssr:false)` — нагружает план+логи+недельный compliance
- **CF Worker**: `push-service` — zadeploen na `push.jumpedia.app` (Custom Domain), VAPID keys сгенерированы, batch endpoint `/push-batch`, shared secret auth 401, health 200
- **Phase 4 SW**: `sw.ts` += `push` handler (foreground dedup + `seenPushIds` Set), `notificationclick`, `SW_UPDATED` postMessage
- **Phase 4 Hooks**: `usePushSubscription.ts` (subscribe/unsubscribe/decline + 30d grace), `useNotifications.ts` (SSE + BG Sync + exponential backoff + dedup)
- **Phase 4 UI**: `PushPermissionPrompt.tsx` (3-visit smart timing, iOS A2HS + push prompt, glassmorphism, mobile bottom sheet)
- **Fix**: `notifications.ts` `markAllRead()` N+1→batch fetch `/api/custom/mark-all-read` (O(1))
- **Phase 5 Services**: `notifications.ts` listUnread→`getList(1,20)`+totalItems, `listByType()` добавлен; `notificationPreferences.ts` (upsert getOrCreate, toggleType, quietHours, debounce)
- **Phase 5 UI**: `ActivityFeed.tsx` (shimmer skeleton, CLS fix), `/notifications` страница (type filter chips, ARIA tablist), `NotificationPreferences.tsx` (toggle ARIA role=switch, debounce 500ms)
- **Phase 5 i18n**: `notifications` namespace ×3 locale (RU+EN+CN), 9 типов + quietHours + push/email keys
- **Phase 6 ESLint**: PushPermissionPrompt setState→single-state refactor, useNotifications recursive callback fix — 0 errors
- **Phase 6 WCAG**: NotificationPreferences inputs id+htmlFor (Level A 3.3.2), PushPermissionPrompt aria-live assertive (4.1.3), prefers-reduced-motion ×3 CSS (2.2.2)
- **Phase 6 QA**: china-audit.sh ✅ PASS, type-check Exit 0, build Exit 0

#### Fixed

- **SQL injection** in `notifications.ts` — all 4 queries migrated to `pb.filter()` parameterized format
- `listAll()` changed from `getFullList` to paginated `getList(1, 20)` to prevent loading unbounded records
- Added `listPaginated()` and `requestKey` for cancel-safe notification queries

#### Added

- **PocketBase schema**: `push_subscriptions` collection (endpoint, p256dh, auth_key; `idx_push_subs_user`)
- **PocketBase schema**: `notification_preferences` collection (push/email toggles, quiet hours, IANA timezone; UNIQUE `user_id`)
- **PocketBase schema**: `notifications` collection extended — `priority` (normal|urgent), `expires_at`, `delivered` fields; 4 new types
- **PocketBase schema**: `training_plans.day_notes` JSON field for per-day coach notes
- **PocketBase indexes**: `idx_notif_prefs_tz_enabled`, `idx_notifications_expires`, `idx_notifications_delivered`
- **TypeScript**: `PushSubscriptionsRecord`, `NotificationPreferencesRecord` interfaces; `NotificationPriority` type
- **TypeScript**: `NotificationType` expanded to 8 values (+low_readiness, coach_note, invite_accepted, competition_upcoming)
- **Zod**: `validation/push.ts` — `PushSubscriptionSchema` + `NotificationPreferencesSchema` (IANA regex, HH:MM validation)
- **Validation**: `TrainingPlansSchema.day_notes` field added
- **UI**: `CompetitionCountdown` component (glassmorphism, A-priority urgency style, 0 days until highlight)
- **Service**: `getNextCompetition(season)` in `peaking.ts` — returns nearest future competition from expanded season
- **Dashboard**: `AthleteDashboard` integrates `CompetitionCountdown` (lazy loads from athlete's latest season)
- **i18n**: `athleteDashboard.competition` + `athleteDashboard.daysUntil` keys added ×3 locales (RU/EN/CN)
- `Collections.PUSH_SUBSCRIPTIONS`, `Collections.NOTIFICATION_PREFERENCES` constants

## [0.1.0] — 2026-02-21 — Track 4.16 + Previous Tracks

### 2026-02-21 — Track 4.16 Phase 1: DB Integrity — Critical FK + Service Bug Fixes

#### Fixed

- **PocketBase**: `seasons.athlete_id` FK target corrected — was `_pb_users_auth_` (users), now `pbc_401194191` (athletes). Also `cascadeDelete: false` (was `true` — dangerous). Fix applied via two-step MCP API (delete old field → create new field)
- **`customExercises.ts`**: Filter `deleted = false` → `deleted_at = ""` in `listMyCustomExercises` (line 61) and `listApprovedCommunityExercises` (line 104). Field `deleted` (bool) never existed — `deleted_at` (date) is correct soft-delete field
- **`customExercises.ts`**: Soft-delete in `deleteCustomExercise`: `{ deleted: true }` → `{ deleted_at: new Date().toISOString() }`
- **`types.ts`**: Corrected comment on `SeasonsRecord.athlete_id` — `// FK → users` → `// FK → athletes`

### 2026-02-21 — Track 4.16 Phase 2: API Rules Hardening

#### Security

- **PocketBase `training_logs`**: Hardened from `@request.auth.id != ""` to `athlete_id.coach_id = @request.auth.id || athlete_id.user_id = @request.auth.id` for list/view/create/update. Delete restricted to coach only
- **PocketBase `daily_checkins`**: Same hardened rules as training_logs
- **PocketBase `training_plans`**: list/view: `phase_id.season_id.coach_id = @request.auth.id || athlete_id.user_id = @request.auth.id`; create/update/delete: coach only via relation chain
- **PocketBase `plan_assignments`**: list/view: `plan_id.phase_id.season_id.coach_id || athlete_id.user_id`; create/update/delete: coach only
- **PocketBase `seasons`**: listRule/viewRule extended to allow athlete access via `athlete_id.user_id = @request.auth.id`

### 2026-02-21 — Track 4.16 Phase 3: Medium & Low DB Integrity Fixes

#### Fixed

- **`seasons.ts`**: Removed dead `'self'` special case in `listSeasons()` — callers must pass real `athleteId` from athletes collection (was found unused by grep scan)

#### Added

- **PocketBase `athletes`**: Added `CREATE UNIQUE INDEX idx_athletes_user ON athletes (user_id) WHERE user_id != ''` — prevents duplicate athlete records for same user

#### Changed

- **`athletes.ts`**: `hardDeleteAthleteWithData()` comment updated — architectural decision documented: athlete-owned seasons are FULLY deleted (not just unlinked)

---

### 2026-02-21 — Track 4.15 Phase 1: Training Templates & Warm-Up System — PB Schema + Types + Service

#### Added

- **PocketBase**: `training_templates` collection — coach_id, name_ru/en/cn, type (warmup/training_day), total_minutes, is_system, description_ru/en/cn; API Rules: coach_id || is_system for list/view; index `idx_templates_coach`
- **PocketBase**: `template_items` collection — template_id (cascade), order, block (warmup/main), exercise_id (nullable), custom_text_ru/en/cn, duration_seconds, sets, reps, intensity, weight, distance, rest_seconds, notes; index `idx_items_template`
- **PocketBase**: 5 new fields in `plan_exercises` — `block` (select: warmup/main), `custom_text_ru/en/cn` (nullable text), `source_template_id` (relation→training_templates); `exercise_id` made nullable; composite index `idx_planex_block`
- **Seed Data**: 6 system templates (3 warmup: Training 15m, Competition 25m, Recovery 20m; 3 training_day: Jump Day, Strength Day, Speed Day) with is_system=true
- **`types.ts`**: `TrainingTemplateRecord`, `TemplateItemRecord`, `TemplateType`, `TemplateItemBlock`, `PlanExerciseBlock` — new interfaces; `PlanExercisesRecord` updated (exercise_id nullable, block, custom_text_*, source_template_id)
- **`collections.ts`**: `TRAINING_TEMPLATES`, `TEMPLATE_ITEMS` constants
- **`validation/templates.ts`**: Zod schemas — `TrainingTemplateSchema`, `TemplateItemSchema`, `AddWarmupItemSchema`
- **`services/templates.ts`**: Full CRUD (`listTemplates`, `getTemplate`, `createTemplate`, `updateTemplate`, `deleteTemplate`, `copyTemplate`), Template Items CRUD (`addTemplateItem`, `updateTemplateItem`, `removeTemplateItem`, `reorderTemplateItems`), Warmup ops (`stampTemplate`, `ejectTemplate`, `addWarmupItem`)

#### Changed

- **`validation/training.ts`**: `PlanExercisesSchema` — `exercise_id` made optional, added `block`, `custom_text_*`, `source_template_id`
- **`AthleteTrainingView.tsx`**: `getExerciseName()` handles nullable `exercise_id` with `custom_text_*` fallback; `handleSave` skips warmup items without `exercise_id`
- **`TrainingLog.tsx`**: `ExerciseState.exerciseId` made optional; warmup items filtered out from logging UI; `batchSaveLogExercises` call uses type guard filter

---

### 2026-02-21 — Track 4.15 Phase 2: Training Library UI

#### Added

- **`reference/templates/page.tsx`**: Training Library page — tabs (Warm-Ups / Training Days), system + custom sections, loading/error states, integrated TemplateList + TemplateEditor
- **`TemplateList.tsx`**: Glassmorphism card list with Copy (system), Edit / Delete (own) buttons; localized names; Lucide icons
- **`TemplateEditor.tsx`**: Bottom-sheet modal with DnD reorder (@dnd-kit/sortable), 3-locale name inputs, ExercisePicker (PB search), CustomStepForm, warmup/main sections, create + edit logic
- **CSS Modules**: `templates.module.css`, `TemplateList.module.css`, `TemplateEditor.module.css` — Athletic Minimal + Glassmorphism design
- **i18n**: 45+ new keys in `messages/ru`, `messages/en`, `messages/cn` under `templates.*`
- **`reference/page.tsx`**: New Training Templates card (`LayoutList` icon → `/reference/templates`)
- **Dependencies**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` installed

#### Verified

- `pnpm type-check` — exit 0
- `pnpm build` — exit 0, `/[locale]/reference/templates` built in ru/en/cn

---

### 2026-02-21 — Track 4.15 Phase 3: WeekConstructor Integration

#### Changed

- **`DayColumn.tsx`**: Визуальное разделение warmup/main секций; `WarmupTemplatePicker` dropdown (загружает шаблоны из PB); `AdHocWarmupStepBtn` (inline форма кастомного шага); `WarmupCard` для custom_text items (nullable exercise_id); eject кнопка; новые props `onStampTemplate/onEjectWarmup/onAddWarmupItem`
- **`DayColumn.module.css`**: Новые стили warmupSection, sectionDivider, warmupCard, warmupBtn, warmupDropdown, adHocForm
- **`WeekConstructor.tsx`**: Handlers `handleStampTemplate/handleEjectWarmup/handleAddWarmupItem`; передача в `DayColumn`; import `stampTemplate/ejectTemplate/addWarmupItem`
- **`services/plans.ts`**: `calculateWeeklyCNS()` фильтрует `block === 'warmup'` — не учитывает их в CNS нагрузке
- **i18n** (ru/en/cn): 6 новых ключей в `training.*`: `warmupBlock`, `mainBlock`, `warmupPicker`, `warmupPickerEmpty`, `ejectWarmup`, `addWarmupStep`

#### Verified

- `pnpm type-check` — exit 0
- `pnpm build` — exit 0

---

### 2026-02-21 — Track 4.15 Phase 4: Athlete View + Warmup Badge

#### Added

- **`WarmupItem`** (в `AthleteTrainingView.tsx`): простая li с именем и длительностью — без RPE/Sets UI
- **`WarmupBadge`** (в `AthleteTrainingView.tsx`): collapsible секция разминки, свёрнута по умолчанию; атлет не видит название шаблона

#### Changed

- **`LoggableSession`**: split `exercises` → `warmupItems` / `mainItems`; warmup → `WarmupBadge`, main → `ExerciseItem` (RPE/Sets, как прежде)
- **`AthleteTrainingView.module.css`**: новые классы `.warmupBadge`, `.warmupBadgeHeader`, `.warmupBadgeTitle`, `.warmupList`, `.warmupItem`, `.warmupItemDur`

#### Verified

- `pnpm type-check` — exit 0
- `pnpm build` — exit 0
- `pnpm test` — 16/16 pass

#### Added

- **`planAssignments.ts`**: новый сервис — `assignPlanToAthlete`, `assignPlanToGroup`, `unassignPlan`, `deletePlanAssignment`, `listActivePlanAssignments`, `duplicatePlan`, `createIndividualOverride`
- **`groups.ts`**: расширен — `listGroupMembers`, `removeGroupMember`, `updateGroup`, `deleteGroup`
- **`SeasonDetail.tsx`**: кнопка «Assign» в PhaseCard → AssignPanel (вводить group ID, назначать опубликованный план)
- **`GroupsPage`**: collapsible members panel, delete group (soft-delete), remove member
- **`SeasonDetail.module.css`**: `phaseActions`, `assignBtn`, `assignPanel`, `assignRow`, `assignInput`, `assignConfirmBtn`
- **`groups.module.css`**: `membersPanel`, `membersList`, `memberItem`, `deleteBtn`, `removeBtn`
- **i18n EN/RU/CN**: `assign`, `assignHint`, `groupIdPlaceholder`, `manageGroups`

### 2026-02-21 — Track 4.14 Phase 3: Unified Athlete Logging + 7-Day Week View

#### Added

- **`logs.ts`**: unified module — `getPublishedPlanForToday`, `listTodayLogs`, `createTrainingLog`, `listWeekLogs`, `getOrCreateLog(session)` — единый сервис логирования
- **`trainingLogs.ts`**: конвертирован в re-export shim → `logs.ts` (backward-compatible)
- **`AthleteTrainingView.tsx`**: полная переработка — 7-day scroll view, week navigation (±недели), AM/PM session группировка через `groupByDayAndSession`, weekly log map
- **`AthleteTrainingView.module.css`**: новые классы `weekNav`, `weekNavBtn`, `weekScroll`, `dayCard`, `dayCardToday`, `dayCardHeader`, `sessionBlock`, `startLogBtn`
- **`TrainingLog.tsx`**: добавлен `session` prop (default=0=AM), передаётся в `getOrCreateLog`

### 2026-02-21 — Track 4.14 Phase 2: Multi-Session AM/PM + Unit-Aware Plan Editing

#### Added

- **`plans.ts`**: `addExerciseToPlan` теперь принимает `session` (0=AM, 1=PM) + unit fields (weight, duration, distance, rest_seconds)
- **`plans.ts`**: `groupByDayAndSession()` — группировка по дню И сессии `Record<day, Record<session, exercises[]>>`
- **`plans.ts`**: `updatePlanExercise` расширен — weight, duration, distance, rest_seconds, session
- **`DayColumn.tsx`**: полная поддержка AM/PM сессий — SessionBlock с заголовками (Sun=AM/Moon=PM), кнопка «+ PM Session»
- **`DayColumn.tsx`**: unit-aware `ExerciseCard` — адаптивный ввод по `unit_type`: weight→kg, distance→m, time→sec, reps→reps×intensity
- **`DayColumn.module.css`**: CSS классы `.sessionBlock`, `.sessionHeader`, `.sessionHeaderPM`, `.addSessionBtn`
- **`WeekConstructor.tsx`**: `pickerSession` state, `handleAddExercise` передаёт session, `handleReorder` работает внутри сессий
- **i18n** (EN/RU/CN): `training.sessionAM`, `training.sessionPM`, `training.addSession`
- **`UpdateExerciseData`** type экспортируется из `DayColumn.tsx`

#### Added

- **PocketBase**: 5 new fields in `plan_exercises` — `session` (int, AM=0/PM=1), `weight`, `duration`, `distance`, `rest_seconds`
- **PocketBase**: 2 new fields in `training_plans` — `athlete_id` (FK → athletes, for individual overrides), `parent_plan_id` (FK → self, for override chain)
- **PocketBase**: 1 new field in `training_logs` — `session` (int, default 0)
- **PocketBase**: New `plan_assignments` collection — `plan_id` (cascade delete), `athlete_id`, `group_id`, `status` with 3 indexes
- **UNIQUE index**: `training_logs` updated from `(athlete_id, plan_id, date)` → `(athlete_id, plan_id, date, session)` to support AM/PM sessions
- **`types.ts`**: `PlanExercisesRecord`, `TrainingPlansRecord`, `TrainingLogsRecord` updated with new fields; `SetData` extended with `height`/`result` for jump attempts; `PlanAssignmentsRecord` type added
- **`collections.ts`**: `PLAN_ASSIGNMENTS` constant added
- **`validation/planAssignments.ts`**: Zod schema for `plan_assignments` with refine check (athlete_id or group_id required)
- **`validation/training.ts`**: `PlanExercisesSchema` + `TrainingPlansSchema` updated with new fields

#### Note

- `athletes.user_id` already existed in PB schema — confirmed and kept as-is

#### Fixed

- `LoginForm.tsx`: added `useRef` fallback for email/password — handles iOS autofill and password managers that inject values without triggering `onChange`
- `SeasonWizard.tsx`: replaced "Myself" default with "Select athlete" placeholder (`disabled` option) — coach must select an athlete (self-athlete removed in 4.12)
- `SeasonWizard.tsx`: added `isBasicsValid` check requiring athlete selection for coaches with athletes
- `SeasonWizard.tsx`: 3 hardcoded EN error strings → i18n keys (`errors.authLoading`, `errors.notLoggedIn`, `training.createFailed`)
- `SeasonWizard.tsx`: replaced 3 text `✕` symbols with Lucide `<X>` icon component
- `warmup/page.tsx`: hardcoded `мін` (lines 194, 201) → `{t('min')}` i18n key
- `AthleteDashboard.tsx`: inline `style={{}}` on BarChart2 icon → CSS module class `.chartIcon`
- `dashboard/page.tsx`: consolidated duplicate `@/i18n/navigation` imports

#### Added

- `dashboard/page.tsx` + `dashboard.module.css`: ⚡ Quick Plan shortcut button on Coach Dashboard (outline secondary style, links to `/training`)
- `AthleteDashboard.module.css`: `.chartIcon` utility class for inline icon alignment
- 7 new i18n keys × 3 locales (EN/RU/CN): `errors.authLoading`, `errors.notLoggedIn`, `training.selectAthlete`, `training.noAthletesHint`, `training.createFailed`, `warmupPage.min`, `dashboard.quickPlan`

#### Won't Fix

- Date input placeholders (`ДД.ММ.ГГГГ` in EN) — native `<input type="date">` behavior, controlled by OS/browser
- Greeting locale mixing (`Hey, Кириллов!`) — by design: `user.name` is user data in any script, i18n keys already locale-dependent

### 2026-02-21 — Track 4.12: Audit Bug Fixes

#### Fixed

- `AthleteDetailClient.tsx`: `checkin?.readiness_score` access bug replaced with `calculateReadiness()`
- `dashboard/page.tsx` & `AthleteDashboard.tsx`: inline readiness calculation bug replaced with `calculateReadiness()` for a unified source of truth
- `AthleteTrainingView.tsx`: hardcoded `DAY_NAMES` replaced with `training.day_*` i18n keys

#### Removed

- `readiness.ts`: removed `getSelfAthleteId` self-athlete auto-creation logic for coaches (Track 4.8 removal follow-up)
- `athletes.ts`: removed unused self-athlete exclusion filter from `listMyAthletes()`
- `training/page.tsx`: removed coach-side readiness check-in logic (state, effects, handlers, modals)
- `SeasonDetail.tsx`: removed readiness-related props tied to the old check-in modal

#### Added

- `tokens.css`: added utility classes `.sr-only` and `.hidden-mobile`
- `groups.ts`: added coach role guard to `joinByInviteCode()` preventing coaches from joining groups
- `analytics/page.tsx`: added Analytics Role Guard — athletes now load their own data directly without the athlete selector
- `AthleteDashboard.tsx`: replaced `↩` string with `RotateCcw` Lucide icon

### 2026-02-21 — Track 4.11: Debt Closure

#### Fixed

- `dashboard/page.tsx:51` — `let groupMap` → `const groupMap` (prefer-const)
- `layout.tsx:15` — removed unused `eslint-disable` directive
- `ShowAthleteOverlay.module.css:56,79` — `#ffffff` → `var(--color-text-inverse)`
- EN `constructor` section — 5 hardcoded RU strings → English

#### Changed

- `SeasonWizard.tsx` — priority emoji (🔺🔸🔹) → `.priorityDot` CSS classes (5 locations)
- `SeasonDetail.tsx` — priority emoji → `.priorityDot` CSS classes (2 locations)
- `AthleteDetailClient.tsx:155` — ♂♀ symbols → `t('male')`/`t('female')` i18n keys
- `TestResultCard.tsx:31` — ▲▼ emoji → Lucide `TrendingUp`/`TrendingDown` icons
- `analytics/page.tsx` — 3 RU hardcoded strings → i18n keys, 2 inline styles → CSS classes
- `ErrorBoundary.tsx` — 3 RU strings → `labels` prop with EN fallbacks
- `ErrorBoundaryWrapper.tsx` + `protected/layout.tsx` — pass i18n labels to `<ErrorBoundary>`
- `NotificationBell.tsx` — 5 RU fallbacks → EN defaults
- `ThemeToggle.tsx` — 5 RU strings → `useTranslations('settings')`
- `LocaleSwitcher.tsx` — RU aria-label → `t('appLanguage')`
- `CnsHeatmap.tsx` — 4 hardcoded RU/locale-switch → `useTranslations('analytics')`
- `AchievementsGrid.tsx` — inline CATEGORY_LABELS map → `t('category_*')`
- `ExerciseConstructor.tsx` — 2 RU placeholders → i18n keys

#### Added

- ~20 new i18n keys × 3 locales (EN, RU, CN) — errors, analytics, athleteDetail, constructor
- `.headerActions`, `.addTestBtn` CSS classes in `analytics.module.css`
- `.priorityDot` CSS classes in `SeasonWizard.module.css` + `SeasonDetail.module.css`
- PWA icons: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`
- `ARCHITECTURE.md` — Offline/Dexie.js marked as *(planned — Track 6)*

### 2026-02-21 — Track 4.9 Phase 5: Dashboard Polish + ErrorBoundary

#### Fixed

- `dashboard/page.tsx`: 2 inline styles removed → `.addBtnCentered`, `.emptyStateFull` CSS classes
- `dashboard/page.tsx`: group filter now uses `groupId` from enriched `AthleteWithStats` (was `a.group_id` which was always undefined)

#### Added

- `layout.tsx`: `<ErrorBoundary onError={handleError}>` wraps all protected pages with auto-telemetry reporting to PocketBase `error_logs` collection
- `AthleteCard.tsx`: group badge (Tag icon + group name) displayed when athlete belongs to a group
- `athletes.ts`: `groupId` and `groupName` optional fields added to `AthleteWithStats`
- `dashboard/page.tsx`: `group_members` enrichment via PocketBase expand — loads group info for all athletes in one query
- CSS: `.groupBadge` in `AthleteCard.module.css`, `.addBtnCentered` + `.emptyStateFull` in `dashboard.module.css`
- i18n: `dashboard.group`, `dashboard.allGroups`, `dashboard.filterByGroup` × 3 locales

#### Fixed

- `settings/page.tsx`: 3 inline styles removed → CSS classes (`backBtn`, `rowActions`, `rowBlock`, `chevronIcon` animation, `a.row`)
- `AthleteDetailClient.tsx`: hardcoded `'лет'` → `t('yearsOld')`, `'cm'` → `t('cm')`
- `AthleteDetailClient.tsx`: 4 skeleton inline style blocks → `.skeletonHero`, `.skeletonGrid`, `.skeletonStack` CSS classes

#### Added

- `settings/page.tsx`: password **strength bar** (4 levels: weak/fair/good/strong)
- `settings/page.tsx`: athlete profile section (read-only height + birth_date) for `role=athlete`
- CSS: `backBtn`, `chevronIcon`, `rowBlock`, `profileField`, `strengthBar`, `strengthFill` in `settings.module.css`
- CSS: `skeletonHero`, `skeletonGrid`, `skeletonStack` in `athleteDetail.module.css`
- i18n: `settings.height`, `settings.cm`, `settings.birthDate` × 3 locales
- i18n: `athleteDetail.yearsOld`, `athleteDetail.cm` × 3 locales

### 2026-02-20 — PocketBase Schema Fixes + Test Data + MCP

#### Fixed

- **coach_preferences** — added missing `onboarding_complete` (bool) field to PB schema — coach was stuck in onboarding loop on every login
- **achievements.type** — updated select values from 4 generic types to 13 specific types matching `types.ts` (`first_workout`, `streak_7d`, etc.) — gamification was completely broken
- **test_results.value** — fixed `max=0` constraint → `max=9999` — saving any test result was impossible
- **page.tsx** — authenticated users now auto-redirect from landing page to `/dashboard` instead of seeing login/register buttons
- **athlete/[id]** — fixed 500 error on athlete detail page: added nginx `try_files` fallback to route dynamic athlete IDs to placeholder.html shell (React Router handles the real ID client-side)
- **readinessHistory.ts** — fixed `sleep_duration` → `sleep_hours` field name mismatch causing empty readiness heatmap
- **CnsHeatmap** — reduced from 12 to 4 weeks, added score numbers inside cells, mobile tap support

#### Added

- **PocketBase MCP** — `dynamic-pocketbase-mcp` integrated in `mcp_config.json` (replaced broken `@mcpflow.io` package)
- **Test Data** — seeded via MCP: 1 coach (`coach.petrov@test.jumpedia.app`), 3 athletes, group, 2 seasons, 4 phases, 7 plans, 42 checkins, 24 test results, 3 competitions, 9 achievements

### 2026-02-20 — Track 4.9: Coach/Athlete Creation Fixes + QA

#### Fixed

- **BUG-1** `readiness.ts:getSelfAthleteId()` — self-athlete теперь корректно создаётся для обеих ролей через `coach_id` (PB `athletes` не имеет `user_id`)
- **BUG-2** `OnboardingWizard.tsx` — имя пользователя из онбординга сохраняется в PocketBase через `updateUserName()`
- **BUG-3** `preferences.ts:saveMyPreferences()` — `onboarding_complete` включён в PB payload (раньше терялся)
- **BUG-4** `dashboard/page.tsx` — readiness score вычисляется из полей чекина (`sleep_hours`, `sleep_quality`, `mood`, `pain_level`) вместо несуществующего `readiness_score`
- **BUG-6** `AddAthleteModal.tsx` — hardcoded RU ошибка → `t('createFailed')` + eslint dep fix
- **BUG-8** `LoginForm.tsx` — fallback на PB `coach_preferences.onboarding_complete` при отсутствии `localStorage` (новое устройство/инкогнито)
- **BUG-9** `auth.ts` + `AuthProvider.tsx` — дефолт роли унифицирован на `'athlete'` (было `'coach'` непоследовательно)

#### Added

- **i18n** — ключ `dashboard.newAthlete.createFailed` в 3 локалях (RU/EN/CN)

### 2026-02-20 — Track 4.9: QA Bug Fixes

#### Fixed

- **BUG-08** `AthleteDashboard.tsx` — убран `split(' ')[0]` ␲ приветствие теперь показывает полное имя («Привет, QA Athlete!» вместо «Привет, QA!»)
- **BUG-02** `athletes.ts:listMyAthletes()` — self-athlete (созданный через dual-role) больше не попадает в список атлетов тренера (фильтр `user_id !== currentUser.id`)
- **BUG-04** `groups.ts:listMyGroups()` — graceful обработка пустого списка (возвращает `[]` вместо 400 для новых пользователей)
- **BUG-06** `OnboardingWizard.tsx:StepDone` — финальный экран онбординга теперь role-aware: атлет видит свои функции (чекин, план, прогресс, справочник), тренер — свои (планирование, конструктор)

#### Added

- **i18n** — 8 новых ключей `onboarding.done.athleteFeature{1-4}` + `{1-4}Desc` в `messages/{ru,en,cn}/common.json` для ролевого онбординга

### 2026-02-20 — Track 4.7 Extension: i18n + CSS + UX Polish

#### Added

- **i18n** — ~15 новых ключей в `messages/{en,ru,cn}/common.json`: `training.checkin/checkinDone/checkinCreateFailed/checkinSaveFailed`, `dashboard.deleteConfirm/yearsOld`, `analytics.addTestForm.invalidValue/futureDateError/saveFailed/notesPlaceholder`, `analytics.minResults/chartLoading`, `athleteDashboard.reCheckin`
- **ProgressChart.tsx** — новые props: `locale`, `noDataMessage`, `loadingLabel` для полной i18n-ности
- **training.module.css** — 7 новых CSS классов: `.headerActions`, `.checkinBtn`, `.checkinDoneBtn`, `.settingsBtn`, `.wizardLoadingOverlay`, `.wizardLoadingBox`, `.detailLoadingBox`
- **AthleteDashboard.module.css** — UX Quick Wins: `@keyframes fadeIn` (staggered), `@keyframes shimmer`, `.shimmerBar`, CLS fix `min-height: 160px` на `.analyticsLoading`
- **AddTestResultModal.module.css** — `.spinIcon` + `@keyframes spin` (замена inline style)

#### Changed

- **AddTestResultModal.tsx** — 4 hardcoded RU строки → i18n ключи (`tf('invalidValue')`, `tf('futureDateError')`, `tf('saveFailed')`, `tf('notesPlaceholder')`)
- **AddTestResultModal.tsx** — inline spinner `style={{animation}}` → `className={styles.spinIcon}`
- **AthleteCard.tsx** — hardcoded confirm dialog → `t('deleteConfirm', {name})`, `лет` → `t('yearsOld', {age})`
- **ProgressChart.tsx** — hardcoded `'ru-RU'` → dynamic `dateLocale` map, 2 RU строки → props
- **training/page.tsx** — 5 inline styles → CSS classes, hardcoded 'Check-in'/'Ready'/alert strings → i18n
- **training/page.tsx** — SeasonWizardLazy/DetailLazy inline styles → CSS classes
- **AthleteDashboard.tsx** — spinner-based Suspense fallbacks → shimmer skeleton bars, `Обновить` → `t('reCheckin')`

### 2026-02-20 — Track 4.8: Lint Cleanup

#### Fixed

- **ProgressChart.tsx** — рефакторинг `useCssVars`: `useRef` → `useMemo` (устранены `react-hooks/refs` и `react-hooks/set-state-in-effect`)
- **TrainingLoadPie.tsx** — рефакторинг `useCategoryColors`: `useRef` → `useMemo` (те же правила)
- **EditAthleteModal.tsx** — `tDash` добавлен в deps массив `useCallback` (`react-hooks/exhaustive-deps`)
- **SeasonWizard.tsx** — `catch (err: any)` → `err: unknown` с proper narrowing
- **processor.ts** — `errors: any[]` → `unknown[]`
- **patch-exercises.ts** — `let changes` → `const changes` (`prefer-const`)
- **DaySummaryCard.tsx** — `@ts-ignore` → `@ts-expect-error`
- **training/page.tsx** — `any` → `CheckinData` для state и handler; `null → undefined ?? undefined` для initialData
- **11 компонентов** — неиспользуемые переменные с `_prefix` (B-группа)
- **eslint.config.mjs** — `globalIgnores` расширен: `conductor/scripts/**`, `public/sw.js`
- **5 скриптов** — убраны устаревшие `eslint-disable` директивы через `--fix`

### 2026-02-20 — Track 4.7: Bug Fixes + DS Polish

#### Added

- **loading_states_brainstorm.md** — UX Loading States исследование: 6 вариантов решения (Skeleton UI, IndexedDB Cache First, Progressive Reveal, Optimistic UI, CLS fix, Page Transitions), сравнительная таблица, план реализации по трекам

#### Fixed

- **types.ts** — добавлено `user_id?: string` в `AthletesRecord` (поле было в PB, отсутствовало в TypeScript-типе)
- **readiness.ts** — `_getSelfAthleteIdImpl()`: при создании self-athlete устанавливается `user_id: user.id` (dual-role self-link)
- **groups.ts** — `joinByInviteCode()`: заменён ручной lookup через `coach_id` на `getSelfAthleteId()` (единый путь для обоих ролей); sanitize invite code (strip `"` chars — PB filter injection prevention)
- **EditAthleteModal.tsx** — hardcoded Russian error string → i18n ключ `dashboard.updateFailed`
- **forgot-password/page.tsx** — убраны 2 inline styles, заменены на CSS классы `.submitBtnBlock` и `.iconLabel`

#### Added

- **tokens.css** — `--color-text-on-accent: #ffffff` в `:root` и `[data-theme="dark"]` (устранено undefined CSS variable)
- **not-found.tsx** + **not-found.module.css** — страница 404 в `src/app/[locale]/` с DS glassmorphism + `@supports` fallback
- **AuthForms.module.css** — классы `.submitBtnBlock` и `.iconLabel`
- **messages/{ru,en,cn}/common.json** — ключ `dashboard.updateFailed` для трёх локалей

#### Changed

- **groups.module.css** — `.backLink` 36→44px, `.iconBtn` 28→min 44px (touch targets DS), `.input` 14→16px (iOS zoom prevention); добавлен `@supports not (backdrop-filter)` fallback

#### Фаза 3-4 (дополнение)

- **not-found.tsx** — обновлён на `'use client'` + `useTranslations()` с полной i18n поддержкой
- **AuthForms.module.css** — добавлены `.submitBtnBlock`, `.iconLabel`
- **messages/{ru,en,cn}/common.json** — ключи `app.notFound`, `app.notFoundDescription`, `app.goHome`, `auth.resendVerification`
- **EmailVerificationBanner.tsx** — исправлен i18n ключ `sendResetLink` → `resendVerification` (точнее описывает действие)
- **AuthProvider.tsx**, **lib/hooks/useAuth.ts** — добавлены JSDoc comments для документирования разницы двух API

### 2026-02-20 — Track 4.6: Gamification v2 — Achievements + Celebrations

#### Added

- **types.ts** — `AchievementType` расширен с 5 до 13 типов (4 категории: streak/training/testing/compete); удалены `volume_1000`, `season_complete`
- **achievements.ts** — `AchievementProgress`, `CheckAndGrantResult`, `getProgress()` (4 батч-запроса); `ACHIEVEMENTS_BY_CATEGORY` mapping; `computeStreak()` экспортирован
- **computeStreak.test.ts** — 11 unit-тестов для timezone-safe streak вычисления
- **StreakHeroCard.tsx** + CSS Module — hero-number с pulse, best streak, milestone progress, evening warning (≥18:00); glassmorphism + `@supports` fallback
- **useCelebration.ts** — FIFO queue hook (fullscreen 5s / toast 3s auto-dismiss)
- **CelebrationOverlay.tsx** + CSS Module — fullscreen celebration: 30 CSS confetti (deterministic), badge reveal animation, haptic vibrate, sound, Escape dismiss, `aria-modal`
- **CelebrationToast.tsx** + CSS Module — slide-up toast, `aria-live="polite"`, haptic
- i18n: `streakHero.*` + `celebration.*` ключи в `messages/{ru,en,cn}/common.json`

#### Changed

- **AchievementBadge.tsx** — добавлен progress bar для locked ачивок (`role="progressbar"`, ARIA); 4 новые Lucide иконки (Target, Dumbbell, Medal, Flag)
- **AchievementsGrid.tsx** — единственный `checkAndGrant()` call (race condition fix), группировка по 4 категориям, skeleton loading, celebration integration
- **AthleteDashboard.tsx** — lazy-loaded `StreakHeroCard` (Suspense + spinner)

#### Fixed

- **computeStreak()** — timezone-safe: `parseLocalDate()` вместо `new Date(string)` (UTC off-by-one fix)
- **checkAndGrant()** — race condition: возвращает `CheckAndGrantResult` (allEarned + newlyEarned + progress) вместо void

### 2026-02-20 — Cascade Delete Athlete + Hard Delete Support

#### Added

- **athletes.ts** — `hardDeleteAthleteWithData(athleteId)` — каскадное удаление: log_exercises → training_logs → test_results → daily_checkins → seasons (phases→plans→exercises/snapshots, competitions) → achievements → athlete
- **AthleteCard.tsx** — кнопка удаления (Trash2, появляется при hover), window.confirm, `onDelete` prop + `.deleteBtn` CSS
- **DashboardPage** — `handleDelete` с оптимистичным удалением + rollback

### 2026-02-20 — i18n Auto-Detection + Browser Language Mapping

#### Added

- **middleware.ts** — next-intl middleware с `localeDetection: true`, Accept-Language автодетекция
- **detectLocale.ts** (`src/lib/i18n/`) — клиент: `navigator.languages` → ru/cn/en
- **OnboardingWizard.tsx** — дефолт из `detectBrowserLocale()` (не 'ru'); `router.replace(pathname, { locale })` при выборе

### 2026-02-20 — Fix: AthleteTrainingView 400 Error + i18n Phase Names

#### Fixed

- **AthleteTrainingView.tsx** — `user.id` → `getSelfAthleteId()`; 400/404 → empty state
- **messages/ru/common.json** — переводы фаз: PRE_COMP, COMP, TRANSITION

### 2026-02-20 — Bug Fix: Role Selection Moved to Onboarding

#### Fixed

- **OnboardingWizard.tsx** — выбор роли при онбординге теперь **фактически сохраняется**: `handleFinish` вызывает `updateUserRole(role)` перед `saveMyPreferences`; default роли изменён с `'coach'` на `'athlete'`
- **RegisterForm.tsx** — убран дублирующий role selector; при регистрации передаётся временный `'athlete'`, который онбординг перезапишет

#### Added

- **auth.ts** — функция `updateUserRole(role)` для обновления роли текущего пользователя в PocketBase

### 2026-02-20 — Bug Fix: Auth Role Assignment + i18n Key Format

#### Fixed

- **auth.ts** — `registerWithEmail` теперь принимает параметр `role` (default `'coach'` для обратной совместимости)
- **AuthProvider.tsx** — `register()` принимает и передаёт параметр `role` в `registerWithEmail`
- **RegisterForm.tsx** — добавлен radio-selector «Атлет / Тренер» перед кнопкой регистрации; роль передаётся в `register()`; default — `'athlete'`
- **useAuth.ts** — убран ложный fallback `?? 'coach'` → `?? null`, чтобы атлеты не получали роль тренера
- **i18n en/ru/cn** — ключи вида `"protocol.training"` (dot-notation) преобразованы в nested JSON-объекты в секциях `warmupPage` и `mentalPage` (исправлена ошибка `INVALID_KEY` от next-intl)

#### Added

- **i18n** — ключи `auth.role` / `auth.roleAthlete` / `auth.roleCoach` в en/ru/cn
- **AuthForms.module.css** — стили `.roleRow` / `.roleOption` / `.roleActive` для role picker

### 2026-02-19 — Track 4.5 Block B+E: Dashboard Analytics + DS Audit

#### Changed

- **AthleteDashboard.tsx** — добавлены lazy-loaded секции: `ProgressChart` (standing_jump данные) + `AchievementsGrid` (checkAndGrant + Suspense), fetch `listTestResults` после основного check-in load
- **AthleteDashboard.module.css** — добавлены `.analyticsLoading` (spinner placeholder) + `.achievementsSection`

#### Added i18n

- `athleteDashboard.progressTitle` / `jumpChartTitle` / `achievementsTitle` — en/ru/cn

#### Verified

- `pnpm type-check`: 0 ошибок в src/
- `pnpm build`: Exit 0 — Static export успешен
- `china-audit.sh`: PASS — 0 external CDN, 14 woff2 self-hosted
- Emoji audit: новые компоненты emoji-free (mental/page.tsx уже исправлен в Block A)

### 2026-02-19 — Track 4.5 Block A+C: Quick Wins + AthleteTrainingView

#### Added

- **trainingLogs.ts** (`src/lib/pocketbase/services/`) — типы `TrainingLogRecord`.`LogExerciseRecord` + сервисы: `getPublishedPlanForToday`, `createTrainingLog`, `updateTrainingLog`, `listTodayLogs`, `createLogExercise`, `updateLogExercise`
- **AthleteTrainingView** (`src/components/training/`) — компонент просмотра плана дня для атлета: auto-create draft log, RPE слайдер (цветовая шкала 1-10), sets stepper, per-exercise save
- **AthleteTrainingView.module.css** — CSS модуль: glassmorphism cards, мобильный RPE ползунок, touch targets ≥44px

#### Changed

- **ExerciseCatalog.tsx** — добавлен equipment фильтр (chips: barbell/box/dumbbell/mat/hurdles/band/bodyweight), community badge (`status==='approved'`), `badgeRow` layout
- **ExerciseCatalog.module.css** — новые классы `.badgeRow`, `.communityBadge` (success green)
- **exercises.ts** — `searchExercises` принимает `equipment?: string`, фильтрует через `equipment ~ "..."` PocketBase operator
- **mental/page.tsx** — эмодзи иконки заменены на Lucide (Brain, Target, Wind, MessageCircle, Unlock, Zap)
- **training/page.tsx** — role-based routing: `if (isAthlete) return <AthleteTrainingView>`

#### Added i18n

- `training.log.saved` — en/ru/cn
- `exercises.communityBadge` — en/ru/cn (было добавлено ранее для en, теперь ru/cn тоже)
- `exercises.filterEquipment` — уже существовал

#### Added

- **reference/warmup/page.tsx** — 3 warm-up protocols (Training/Competition/Recovery) with phase lists + **Box Breathing Timer** (4-4-4-4 SVG circle animation with play/pause/reset)
- **reference/mental/page.tsx** — 6 Mental Prep cards (Visualization, Pre-Comp Routine, Breathing Focus, Self-Talk, Pressure Release, Performance Mindset) + 5-step pre-competition routine
- **reference/page.tsx** — Added Warmup (`Wind` icon) and Mental Prep (`Brain` icon) navigation cards
- **i18n**: `warmupPage.*` + `mentalPage.*` keys (RU/EN/CN), `reference.categories.warmup/mental` in all 3 locales

### 2026-02-19 — Track 4.5 Phase 3: Athlete Dashboard

#### Added

- **useAuth** (`src/lib/hooks/useAuth.ts`) — reactive hook reading `pb.authStore.record.role`, subscribes to `pb.authStore.onChange`
- **AthleteDashboard** (`src/components/dashboard/AthleteDashboard.tsx`) — athlete role view: greeting, daily check-in card, stats, plan placeholder
- **ReadinessCheckin** (`src/components/dashboard/ReadinessCheckin.tsx`) — 4-slider form (sleep hours/quality, mood, soreness), saves via `saveCheckin()`
- **Role-switch** in `dashboard/page.tsx` — `if (isAthlete) return <AthleteDashboard />` before coach content
- **i18n**: `athleteDashboard.*` keys (22 keys × 3 locales: RU/EN/CN) added to `messages/`

### 2026-02-19 — Track 4.5 Phase 2: QuickPlanBuilder

#### Added

- **QuickPlanBuilder** (`src/components/training/QuickPlanBuilder.tsx`) — localStorage-based bottom sheet constructor for quick workout sessions without season/phase binding
- **QuickPlanBuilder.module.css** — Athletic Minimal + Glassmorphism styling, mobile-first, full dark mode support
- **i18n**: `quickPlan.*` keys (23 keys × 3 locales: RU/EN/CN) added to `messages/`
- **Features**: date picker, duration field, CNS load indicator, exercise list with sets×reps editing, reorder (▲▼), notes textarea, localStorage history (last 30 workouts)
- Integrates `ExercisePicker` with both `library` and `custom` exercise sources

### 2026-02-19 — Track 4.5: Implementation Plan + Exercise Constructor

#### Added

- **implementation_plan.md** — detailed plan for Track 4.5 with 4 phases, ~35 checklist items
- **Exercise Constructor** concept — step-by-step wizard for creating custom exercises
- **Visibility model** for `custom_exercises`: personal → pending_review → approved → rejected
- **PB schema additions**: `visibility`, `approved_by`, `approved_at`, `rejection_reason`, `illustration` fields
- **Admin Exercise Review UI** added to backlog → Track 6

#### Changed

- **gate.md** — updated to 4 phases with ~35 checkboxes (was 27), added ExerciseConstructor + visibility items
- **backlog.md** — added Admin Exercise Review UI entry for Track 6
- Exercise Catalog confirmed at `/reference/exercises` (inside Reference section)
- Athlete Dashboard confirmed as role-switch (same routes, different components)

### 2026-02-19 — Track 4.5: UX Core created

#### Added

- **Track 4.5: UX Core** — new track inserted between Track 4 (Analytics) and Track 5 (Video)
- **gate.md** with 27 checkboxes across 4 sections: Exercise Catalog, Daily Training Builder, Athlete Dashboard, Warmup & Mental Prep
- GAP analysis report comparing legacy v1 features vs current v2 implementation

#### Changed

- **tracks.md** — Track 4.5 set to 🔵 Active, Track 5 moved to 🟡 Next, timeline updated to 33-40 days

### 2026-02-20 — Track 4.5: Integration (Navigation + Auth Guard)

#### Added

- **BottomTabBar**: 5-tab navigation bar (Dashboard, Training, Analytics, Reference, Settings) with glassmorphism, locale-aware links, active state highlighting, ARIA roles
- **AuthGuard**: protects `(protected)` routes, redirects unauthenticated users to `/auth/login` with `returnTo` parameter
- **Route Groups**: `(protected)` and `(public)` groups for clean separation of authenticated vs public pages
- **Account section** in Settings: displays user name/email + Logout button
- `returnTo` support in LoginForm: redirects user back to the page they were trying to access after login
- i18n keys: `nav.dashboard`, `nav.reference`, `settings.account` in 3 locales (EN, RU, CN)

#### Fixed

- `dashboard/page.tsx`: `handleAthleteClick` now uses `@/i18n/navigation` router (was missing locale prefix)
- LoginForm: default redirect after login changed from `/training` to `/dashboard`
- `reference/` moved from `(public)` to `(protected)` route group — BottomTabBar now visible on Reference pages

### 2026-02-19 — Bugfixes: Reference slug + LocaleSwitcher

#### Fixed

- `reference/[slug]/page.tsx` — split into server wrapper (`page.tsx` with `generateStaticParams`) + `ReferenceArticleClient.tsx` (`'use client'`). Fixes Next.js error "cannot use both 'use client' and generateStaticParams"
- `LocaleSwitcher.tsx` — `router.push()` → `router.replace()` so back button navigates to previous page instead of cycling through locale changes
- `settings/page.tsx` — removed `language` from local state (was conflicting with `LocaleSwitcher`); `handleSave` now always uses current `locale` from `useLocale()` — "Saved!" toast now works on all 3 languages
- `settings/page.tsx` — back button changed from `router.back()` to `<Link href="/{locale}/dashboard">` for deterministic navigation (no more cycling through locale history)

### 2026-02-19 — WeekConstructor Toolbar Fix + Design Token Finalization

#### Fixed

- WeekConstructor toolbar: added missing `.actionsRight`, `.multiViewBtn`, `.publishBtn` CSS classes — buttons now display horizontally
- WeekConstructor TSX: publish button uses semantic `.publishBtn` class instead of `.autoFillBtn`

#### Changed

- Replaced `border-radius: 50%` → `var(--radius-full)` in 9 files (10 occurrences)
- Replaced hardcoded `font-size: 0.65–0.75rem` → `var(--text-xs)` in DayColumn, DaySummaryCard
- Replaced `rgba(239, 68, 68, 0.1)` → `var(--color-danger-light)` in WeekConstructor, SeasonWizard, AuthForms
- Tokenized `padding`, `font-weight`, `transition` values in DaySummaryCard, MultiWeekView
- Replaced hardcoded priority hex colors → `var(--color-priority-*-bg/text)` in SeasonDetail
- Replaced `background: #fff` → `var(--color-bg-primary)` in settings toggle thumb
- Replaced `z-index: 10` → `var(--z-raised)` in MultiWeekView sticky header
- Replaced `blur(24px)` → `blur(var(--glass-blur))` in ExercisePicker sheet

### 2026-02-19 — Track 6: Design System Compliance Fix

#### Added

- `tokens.css` — alias layer (13 short-name variables mapping to canonical tokens), `--glass-overlay-blur`, `--radius-xs`, `--z-tooltip`, 6 priority-color tokens, all with dark mode variants

#### Changed

- `PlanHistoryModal.module.css` — full rewrite: all values via tokens, `@supports` fallback, `-webkit-backdrop-filter`, 44px touch targets
- `training.module.css` — 6 hex competition colors → `--color-priority-*` tokens, `white` → `--color-text-inverse`, `blur(4px)` → token
- `TrainingLog.module.css` — `z-index: 200` → `var(--z-overlay)`, blur → token, `@supports` fallback, `border-radius: 3px` → `var(--radius-xs)`
- `DayColumn.module.css` — `#fff` × 2 → `var(--color-text-inverse)`
- `ExercisePicker.module.css` — `#fff` → `var(--color-text-inverse)`
- `SeasonWizard.module.css` — `blur(4px)` → token, `-webkit-backdrop-filter`, `@supports` fallback, `color: white` → token
- `SeasonDetail.module.css` — `color: white` × 2 → `var(--color-text-inverse)`
- `WeekConstructor.module.css` — `@supports` fallback for toolbar glassmorphism
- `AddTestResultModal.module.css`, `AddAthleteModal.module.css` — `blur(4px)` → `var(--glass-overlay-blur)`
- `CnsHeatmap.module.css`, `NotificationBell.module.css` — `border-radius: 2px` → `var(--radius-xs)`
- `settings.module.css` — `#fff` → `var(--color-text-inverse)`
- `NotificationBell.tsx` — emojis (📋⏰🏆ℹ️) → Lucide icons (ClipboardList, Clock, Trophy, Info)
- `WeekConstructor.tsx` — emojis (⚠️📅🖨️📄🕒💾) → Lucide icons (AlertTriangle, CalendarDays, Printer, FileText, History, Save)

### 2026-02-19 — Track 4 Phase 4.6: Theme + i18n Switcher + China Audit

#### Added

- `ThemeProvider.tsx` — React context: light/dark/auto modes, localStorage persistence (`jp-theme`), system `prefers-color-scheme` listener
- Anti-FOUC inline `<script>` in `layout.tsx` — reads localStorage before React hydrates
- `ThemeToggle.tsx` + CSS Module — 3-way pill (Sun/Monitor/Moon), aria-pressed, 44px touch targets
- `LocaleSwitcher.tsx` + CSS Module — RU/EN/中文 pill, useRouter redirect on locale change
- `scripts/china-audit.sh` — bash audit: 15+ blocked patterns, self-hosted fonts check, exit code 0/1

#### Changed

- `layout.tsx` — wrapped with `ThemeProvider`, added anti-FOUC script in `<head>`
- `settings/page.tsx` — replaced select dropdowns with `ThemeToggle` + `LocaleSwitcher` pills; emoji 🌙📏 → Lucide Moon/Ruler; removed redundant theme localStorage logic

### 2026-02-19 — Track 4 Phase 4.5: Reference + Scientific

#### Added

- `reference/page.tsx` — hub page: 4 glass category cards (technique/errors/periodization/injuries) + scientific featured card
- `reference/[slug]/page.tsx` — 4 articles with `generateStaticParams`; content from i18n JSON via `t.raw()`
- `reference/scientific/page.tsx` — TRA vs DUP comparison table (scrollable mobile) + peaking rules list
- `reference/reference.module.css` — glass cards, 2→4 col grid, article layouts (phase steps, error cards, period table, injury cards, sci table)
- i18n: `reference.*` keys in RU/EN/CN — all content trilingual via Python script

### 2026-02-19 — Track 4 Phase 4.4: Achievements + Notifications

#### Added

- `AchievementsRecord` type updated: 5 specific types (streak_7d, streak_30d, volume_1000, first_pb, season_complete)
- `achievements.ts` service: `listAchievements`, `checkAndGrant` (streak/volume/pb/season logic), `ACHIEVEMENT_META` (icons + trilingual labels)
- `notifications.ts` service: `listUnread`, `markRead`, `markAllRead`, `countUnread`
- `AchievementBadge.tsx` — glass card: gold border for unlocked, grayscale/dim for locked, popIn animation
- `AchievementsGrid.tsx` — 2→3→5-col responsive grid, parallel checkAndGrant + listAchievements, skeleton shimmer
- `NotificationBell.tsx` — 44px touch target, red badge count, glass dropdown, mark-read, aria accessible
- i18n: `achievements`, `notifications.*` keys in RU/EN/CN

#### Changed

- `analytics/page.tsx` — NotificationBell in header, AchievementsGrid section after CnsHeatmap

### 2026-02-19 — Track 4 Phase 4.3: Training Load Pie + CNS Heatmap

#### Added

- `TrainingLoadPie.tsx` — Recharts PieChart (lazy donut) with category color tokens
- `CnsHeatmap.tsx` — pure CSS Grid readiness heatmap (7×N weeks), hover tooltips
- `trainingLoad.ts` service — aggregation by `training_category` for seasons
- `readinessHistory.ts` service — `calculateReadiness` wrapper for daily_checkins
- `--color-highjump` and `--color-jump` tokens in `tokens.css`
- i18n: `trainingLoad`, `cnsHeatmap`, `selectSeason` keys in RU/EN/CN
- Season selector on analytics page for Pie chart data source

#### Changed

- `analytics/page.tsx` — integrated TrainingLoadPie + CnsHeatmap + season selector

### 2026-02-19 — Track 4 Phase 4.2: Analytics + Test Results

#### Added

- `testResults.ts` — service: CRUD, `enrichWithDelta` (delta + PB detection), `testUnit`, `isLowerBetter` для спринта
- `ProgressChart.tsx` — lazy Recharts LineChart (`next/dynamic`), CSS vars через `getComputedStyle`, glassmorphism tooltip, skeleton shimmer
- `TestResultCard.tsx` — PB gold badge, delta chip ▲/▼ (`color-mix()`), icon mapping (Zap/Timer/Dumbbell)
- `AddTestResultModal.tsx` — bottom sheet, 7 типов, валидация (value > 0, no future dates), `Loader2` spinner
- `analytics/page.tsx` — athlete selector, scrollable test tabs, chart + results grid (last 6), empty state with CTA
- i18n `analytics.*` в RU/EN/CN (7 типов тестов + форма)

#### Fixed (DS Audit)

- `dashboard.module.css` — `var(--space-24)` → `calc(var(--space-20) + var(--space-4))`, `hsl()` fallback → `var(--color-accent-light)`
- `AddAthleteModal.module.css` — `hsl()` fallback → `var(--color-accent-light)`
- `AddAthleteModal.tsx` — `'...'` loading text → `<Loader2>` Lucide icon

---

### 2026-02-19 — Track 4 Phase 4.1: Coach Dashboard

#### Added

- `athletes.ts` — CRUD service: `listMyAthletes`, `createAthlete`, `updateAthlete`, `deleteAthlete`, `getLatestCheckin`, `readinessLevel`
- `app/[locale]/dashboard/page.tsx` — Coach Dashboard: athlete grid + quick stats (total/active today/avg readiness)
- `AthleteCard.tsx` — Glassmorphism card: avatar initials, readiness color-coded bar, relative last-log date
- `AddAthleteModal.tsx` — Bottom-sheet modal for creating new athletes
- i18n `dashboard.*` in RU/EN/CN

---

### 2026-02-19 — Track 3: Onboarding Wizard

#### Added

- `OnboardingWizard.tsx` — 4-step wizard (Welcome, Profile, Preferences, Done) with glassmorphism card and slide animation
- `onboarding.module.css` — full design-system-compliant styles (all tokens, mobile-first 375px, touch targets ≥44px)
- `/onboarding` route — `src/app/[locale]/onboarding/page.tsx`
- `completeOnboarding()` in `preferences.ts` — saves `onboarding_complete: true` to PB + sets `localStorage.onboarding_done`
- i18n keys `onboarding.*` in RU, EN, CN (welcome, profile, prefs, done steps)

#### Changed

- `RegisterForm.tsx` — post-registration redirect changed to `/onboarding`
- `LoginForm.tsx` — checks `localStorage.onboarding_done`; returns to `/onboarding` if wizard not yet finished
- `CoachPreferencesRecord` + `CoachPreferencesSchema` — added `onboarding_complete?: boolean`

### 2026-02-19 — Track 3: Data Isolation + Auto-Volume + DS Compliance

#### Changed

- `seasons.ts` — `listSeasons()` now filters by `coach_id` (security: users only see own seasons)
- `SeasonWizard.module.css` — replaced 4 hardcoded hex colors with CSS custom properties
- `TrainingLog.module.css` — replaced 1 hardcoded `#fff` with `var(--color-text-inverse)`

#### Added

- `adaptation.ts` — `applyPreCompReduction()`: auto-reduces sets by 40% when competition ≤ 2 days away
- i18n key `training.preCompReduction` in RU, EN, CN

---

### 2026-02-19 — Track 3: Phase 4 — Snapshots + Peaking + Auto-Adaptation + Invite Codes

#### Added

- `src/lib/pocketbase/services/peaking.ts` — Peaking validation service (`validatePeaking`, `hasCriticalPeakingIssues`). Validates PRE_COMP phase placement relative to A/B/C competitions. Returns structured warnings with i18n keys.
- `src/lib/autofill/adaptation.ts` — Auto-Adaptation service (`applyAdaptation`, `adaptationLabel`). Reduces exercise sets by 20–30% when readiness < 60 and auto-adaptation is enabled in coach preferences.
- `src/lib/pocketbase/services/groups.ts` — Groups + Invite Codes service: `listMyGroups`, `createGroup`, `generateInviteCode` (6-char, 7-day expiry), `joinByInviteCode`, `getActiveInviteCode`.
- Peaking warnings section in `SeasonDetail.tsx` — color-coded error/warning cards per competition.
- i18n keys: `training.peakingWarnings`, `training.peaking.*`, `training.adaptationBadge` in RU/EN/CN.

#### Changed

- `publishPlan()` in `plans.ts` — Now auto-creates a plan snapshot (exercises + metadata) before updating status to `published`. Snapshot creation is non-blocking (errors are logged, not thrown).
- `WeekConstructor.tsx` — Imports `applyAdaptation` + `getMyPreferences`; loads `autoAdaptEnabled` state on mount.

### 2026-02-15 — Pre-Track 0: Audit & Design System

#### Added

- `docs/DESIGN_SYSTEM.md` — Athletic Minimal + Glassmorphism design system (tokens, glass, mobile-first, components, accessibility, China rules)
- `docs/SECURITY.md` — Auth flow, API rules matrix, security headers, CORS, rate limiting
- `docs/PERIODIZATION.md` — Season structure, phases, CNS system, readiness score, plan lifecycle
- `.gitignore` — Next.js + PocketBase + PWA ignores
- Git repository initialized (commit `9c7ce7b`)

#### Changed

- `CLAUDE.md` — Added Design System section, added `DESIGN_SYSTEM.md` to docs list
- `GEMINI.md` — Expanded from stub to full agent rules (mirrors CLAUDE.md)
- `PROJECT_CONTEXT.md` — Fixed Technology Decisions table (Supabase → PocketBase, Vercel → VPS, Tailwind → vanilla CSS)

#### Fixed

- `ui-ux-pro-max` CLI — f-string backslash error in `design_system.py:437` (Python 3.9 compat)

### Changed

- **Track 4.24 (Phase 7):** Refactored `DayColumn.tsx` component, extracting `WarmupCard`, `ExerciseCard`, and `AdHocWarmupStep` into standard standalone components. Reduced main DayColumn file size from ~800 to <200 LOC. Removed Template Pickers from the DayColumn, pending their restoration in the new Template Panel (Phase 8).

### 2026-02-25 — Track 4.243 Phase 4: Competition Media Upload (Step 1)

#### Added

- `CompetitionCard` media upload flow for athlete:
  - file upload bound to `competition_id`;
  - upload metadata: `kind`, `visibility`, `caption`.
- Media list section inside Competition Card using `competition_media` records with direct file links.
- Client-side validation for uploads:
  - max file size `50MB`;
  - allowed file types: image/video/PDF.

#### Changed

- `src/components/competitions/CompetitionCard.tsx` — integrated `competitionMedia` service calls (`listCompetitionMedia`, `uploadCompetitionMedia`) into card details + refresh flow.
- `src/components/competitions/CompetitionCard.module.css` — added media section/list styles using design tokens.
- i18n updates for RU/EN/CN in `messages/*/common.json`:
  - media section labels/actions;
  - media upload validation and error messages.

### 2026-02-25 — Track 4.243 Phase 4: Media Permissions + Visibility (Step 2)

#### Added

- `updateCompetitionMedia()` in `competitionMedia` service for metadata edits (`kind`, `visibility`, `caption`).
- Role-aware media listing API:
  - coach: full list in competition scope;
  - athlete: `moderation_status=visible` + visibility constraints.
- Competition Card media metadata editor for author/coach.

#### Changed

- `src/components/competitions/CompetitionCard.tsx`:
  - media section now available for both coach and athlete;
  - visibility-aware rendering and author/coach edit controls;
  - fixed card details effect deps for media load context.
- `scripts/setup-collections.ts`: tightened `competition_media` list/view rules to enforce visibility policy and coach-only access to hidden media.
- `docs/SECURITY.md`: documented media visibility matrix (`public|team|participants|private`) and hidden moderation behavior.
- `messages/*/common.json`: added RU/EN/CN strings for media metadata edit flow and related errors.

### 2026-02-25 — Track 4.243 Phase 4: Subject Athlete Validation (Step 3)

#### Added

- Subject-athlete selection in competition media upload flow:
  - upload payload now includes `subject_athlete_id`;
  - subject is selected from current competition participants.
- Client-side validation preventing upload when selected `subject_athlete_id` is not in participant registry.
- Default subject behavior for athlete: self-athlete preselected when present in participants.

#### Changed

- `scripts/setup-collections.ts`: `competition_media` create/update rules now enforce `subject_athlete_id` belongs to `competition_participants` (or empty).
- `docs/SECURITY.md`: clarified `subject_athlete_id` policy for competitions media.
- `messages/*/common.json`: added RU/EN/CN labels/errors for subject-athlete field and participant constraint validation.

### 2026-02-25 — Track 4.243 Phase 4: Coach Hide/Unhide + Security Edge Cases (Steps 4-5)

#### Added

- Coach moderation controls in `CompetitionCard` for competition media:
  - `hide` action with mandatory moderation reason;
  - `unhide` action to restore visibility.
- `mediaAccess` utility with unit tests for media access edge-cases:
  - hidden media blocked for athletes;
  - private media allowed only for uploader/subject;
  - participants media blocked for non-participants;
  - edit permissions limited to uploader athlete.
- New RU/EN/CN i18n keys for moderation actions/reasons and related errors.

#### Changed

- `src/components/competitions/CompetitionCard.tsx` now uses `moderateCompetitionMedia()` and displays moderation reason in media items.
- `docs/SECURITY.md` expanded with explicit competition media security test scenarios (foreign media visibility/edit and moderation behavior).
