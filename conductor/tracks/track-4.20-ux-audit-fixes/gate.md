# Track 4.20: UX Audit & Coach-Athlete Fixes — Gate (v3)

> Source: Deep UX audit + Tracks 4.17/4.18 gap analysis + architecture verification (5 skills)
> Review: [CS] deep analysis + [G3H] technical review — 5 corrections applied
> Issues: 14 UX bugs + 5 architecture risks + 7 gaps + warmup duplication + SQL injection

---

## Phase 1: Quick Wins + Security (~2-3 часа)
**Skills:** `always` + `architecture` + `error-handling-patterns`

- [x] FIX: `logs.ts` — migrate ALL filters from raw string interpolation to `pb.filter()` (SQL injection) → Verify: 0 template literals in filter strings
- [x] `ConfirmDialog.tsx` — new reusable glassmorphism confirm component (replaces native `confirm()`)
- [x] Season delete button in `training/page.tsx` → Verify: ConfirmDialog → season disappears
- [x] Error handling in `groups/page.tsx` `handleCreate` → Verify: error displayed
- [x] FIX: `SeasonDetail.tsx` `handleAssign` silent catch → show error → Verify: error message on failure
- [x] PB: harden `training_phases` API rules (coach-only create/update/delete) → Verify: MCP view_collection
- [x] i18n: `deleteSeasonConfirm`, `seasonDeleted`, `createError`, `assignFailed`, `deleteGroup*`, `confirmDelete/Cancel`, `noPublishedPlan` ×3
- [x] `pnpm type-check` + `pnpm build` → Exit 0

## Phase 2: Athlete Dashboard + Season Visibility (~3-4 часа)
**Skills:** `always` + `frontend` + `typescript` + `/ui-work` before UI

- [x] **FIX G1:** `AthleteDashboard.tsx` → call `getPublishedPlanForToday()`, replace placeholder → Verify: athlete sees today's exercises
- [x] **FIX G6:** `AthleteDashboard.tsx` → pass `athleteId` to `listSeasons()` → Verify: CompetitionCountdown shows
- [x] Athlete sees seasons on training page (read-only `AthleteSeasonsList` below `AthleteTrainingView`) → Verify: season cards visible
- [x] **FIX UX:** Assign modal in `SeasonDetail.tsx` → radio Group|Athlete + **dropdown** (NOT text input!) populated from `listMyGroups()` + `listMyAthletes()` → Verify: both assignment types work
- [x] i18n: `todayExercises`, `goToTraining`, `assignToAthlete`, `assignToGroup`, `noGroups`, `selectGroup`, `selectAthlete` ×3
- [x] `pnpm type-check` + `pnpm build` → Exit 0

## Phase 3: Override + Plan Resolution (~4-5 часов)
**Skills:** `always` + `architecture` + `frontend` + `architect-review`

- [x] Update `getPublishedPlanForToday()` in `logs.ts` — Step 0 override (highest priority) + `getPublishedOverrideForAthlete()` private helper. Fallback filter now excludes overrides (`parent_plan_id = ""`). Verify: 4-step resolve works
- [x] `createIndividualOverride()` + `listOverridesForPlan()` + `countOverridesForPhase()` added to `plans.ts`. Sequential `for...of` copy (SQLite safety). Guard: no override-from-override chains.
- [x] «Create Override» button in `WeekConstructor.tsx` → calls `createIndividualOverride()` via lazy import → modal with athlete dropdown. Active only when `isPublished = true`.
- [x] Override badge in `SeasonDetail.tsx` PhaseCard → `countOverridesForPhase` on mount → «N overrides» badge visible
- [x] i18n: `createOverride`, `overrideFor`, `overrides`, `overrideWarning`, `overrideSuccess`, `selectAthleteForOverride` ×3
- [x] CSS: `overrideBadge` (SeasonDetail), modal overlay/card/actions (WeekConstructor)
- [x] `pnpm type-check` → Exit 0 | `pnpm build` → Exit 0

## Phase 4: Workout + Templates Hybrid UX (~5-6 часов)
**Skills:** `always` + `frontend` + `ui_design` + `/ui-work` before UI

> Architecture: Variant C (Hybrid) — CRUD in Reference, quick-access in Training

- [x] `TrainingTemplatePicker` + `SaveAsDayTemplateBtn` — встроены в `DayColumn.tsx` (по паттерну WarmupTemplatePicker). Props: `onAppendTemplate`, `onSaveAsTemplate`. `SaveAsDayTemplateBtn` использует inline input (без window.prompt()).
- [x] `QuickPlanBuilder.tsx` → «Save to Library» → lazy import `createTemplate()` + **chunked batch** `addTemplateItem()` (5 at a time, SQLite safety). CSS: `.libraryBtn`.
- [x] `DayColumn.tsx` → `.mainToolbar` — flex row container, per-session toolbar (Add + Picker + SaveAsTemplate).
- [x] `templates.ts` → `appendTemplate()` (append-only, no eject for training_day, sequential inserts) + `createTemplateFromPlanDay()` (chunked batch 5).
- [x] `WeekConstructor.tsx` → `handleAppendTemplate` + `handleSaveAsTemplate` (lazy imports, coachId from authStore).
- [x] i18n: `trainingTemplatePicker`, `templatePickerEmpty`, `saveAsTemplate`, `enterTemplateName` (training ns) + `saveToLibrary`, `savedToLibrary` (quickPlan ns) ×3.
- [x] `pnpm type-check` + `pnpm build` → Exit 0.

## Phase 4.5: Warmup Page Migration (~2 часа)
**Skills:** `always` + `frontend`

- [x] `templates.ts` — добавлен опциональный `type?` фильтр + `expand` в `listTemplates()`. Backward compat: все вызовы без аргумента работают как раньше.
- [x] `reference/warmup/page.tsx` — удалён `PROTOCOLS` const, добавлены useState/useEffect + `listTemplates('warmup')`. 3 состояния: skeleton loading ×3 / error+Retry / protocol cards из PB.
- [x] BreathingTimer сохранён без изменений. `getLocalizedText()` helper для locale-aware fallback ru→en.
- [x] `warmup.module.css` — `.skeleton` (shimmer), `.emptyState`, `.retryBtn` (44px), `.protocolDesc`.
- [x] i18n ×3: `loading`, `loadError`, `noTemplates`, `retry` в `warmupPage` namespace.
- [x] `pnpm type-check` + `pnpm build` → Exit 0.

## Phase 5: Bidirectional Communication (~3-4 часа)
**Skills:** `always` + `frontend` + `architecture` + `database-architect` + `/ui-work` before UI

- [x] PB: `log_exercises` += `skip_reason` (text, max 255, not required) → Verify: MCP view_collection
- [x] `types.ts`: `LogExercisesRecord` += `skip_reason?: string` → Verify: `pnpm type-check`
- [x] `AthleteTrainingView.tsx` → per-day notes textarea with **debounced auto-save (500ms)** + `log.id` guard + disabled until ready → Verify: auto-saves, coach sees in CoachLogViewer
- [x] `AthleteTrainingView.tsx` → skip_reason quick-select (Equipment|Pain|Time|CoachDecision|Other) → Verify: skip reason saved
- [x] `CoachLogViewer.tsx` → display `training_logs.notes` + `log_exercises.skip_reason` → Verify: coach sees both
- [x] **FIX G2:** `AthleteTrainingView.tsx` → adaptation banner when readiness < 60 → Verify: banner visible
- [x] `readinessHistory.ts` → new `getLatestReadinessForGroup()` (Promise.all per athlete, NOT batch — PB has no GROUP BY) → Verify: function works
- [x] `WeekConstructor.tsx` → readiness mini-badges for assigned athletes → Verify: color-coded scores
- [x] i18n: `athleteNotePlaceholder`, `adaptationBanner`, `skipReasons.*`, `shared.saving` ×3
- [x] `pnpm type-check` + `pnpm build` → Exit 0

## Phase 6: Stability (~2-3 часа)
**Skills:** `always` + `database-architect` + `error-handling-patterns`

- [x] Create `src/lib/utils/errors.ts` → `logError()` + `getErrorMessage()` utility (fire-and-forget telemetry) + 8 unit tests
- [x] Replace ~82 empty `catch {}` blocks **context-aware** across ~40 files (services→`/* expected */`, pages→`logError()`, hooks→`/* non-critical */`) → Verify: `grep` = 0 bare catches + `pnpm type-check` passes
- [x] PB: Replace `idx_plan_ex_plan(plan_id)` → `idx_planex_plan_deleted(plan_id, deleted_at)` (composite, leftmost prefix) → Verify: MCP view_collection ✅
- [x] Update `docs/ARCHITECTURE.md` indexes section
- [x] `pnpm type-check` + `pnpm build` + `pnpm test` → Exit 0

## Quality Gate
- [x] All 7 phases pass `pnpm type-check` + `pnpm build`
- [x] `pnpm test` — existing + new tests pass (35/35)
- [x] Manual QA: Coach flow + Athlete flow via browser_subagent (login, dashboard, training, settings, warmup)
- [x] Update CHANGELOG.md
- [x] Update tracks.md → 4.20 ✅ Done
