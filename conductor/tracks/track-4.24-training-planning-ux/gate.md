# Gate 4.24 — Unified UX System Redesign & Plan Resolution

> **Scope:** Backend plan resolution fixes, role-based nav, Today View, Coach Dashboard, DayColumn decomposition, Template Panel, Day Constructor, data entry UX, Athletic Pulse animations, dark mode + OLED, font scale, feature stubs, assign UX  
> **Estimate:** ~17-20 days · 12 phases · ~33 components/hooks  
> **Skills (14):** brainstorming, concise-planning, context-driven-development, kaizen, code-refactoring-refactor-clean, react-patterns, react-ui-patterns, ui-visual-validator, mobile-developer, jumpedia-design-system, lint-and-validate, architect-review, systematic-debugging, typescript-expert
> **Strategy:** Backend-first — fix plan resolution before building UI that depends on it

---

## Phase 0 — Design Tokens + Quick Wins + Dead Code Cleanup (0.5d)

**tokens.css:**
- [x] `--safe-top/bottom` (PWA safe areas via `env()`)
- [x] Score colors: `--color-score-low/mid/high`
- [x] Chart palette: `--color-chart-1..6`
- [x] Bottom sheet tokens: `--sheet-handle-width/height`, `--sheet-border-radius`
- [x] Athletic Pulse aliases: `--motion-pulse: var(--duration-normal)`, `--motion-flow: var(--duration-slow)`, `--motion-burst: 500ms`
- [x] `font-variant-numeric: tabular-nums` utility class
- [x] `@media (prefers-reduced-motion: reduce)` global disable

**DESIGN_SYSTEM.md sync:**
- [x] Section 1: add score colors + chart palette definitions
- [x] Section 4: add BottomSheet component pattern + sheet tokens
- [x] Section 6: add Athletic Pulse aliases mapping

**Quick Wins:**
- [x] `inputMode="decimal"` on weight inputs
- [x] Safe area bottom padding on BottomTabBar
- [x] Category color bar on ExercisePicker cards
- [x] `aria-label` audit on all icon-only buttons (systematic pass)
- [x] Skeleton shimmer improvements
- [x] ~~NotificationBell badge count~~ — **Done in Track 4.23**

**Dead Code Cleanup (ex-4.25 Phase 0):**
- [x] DELETE `createIndividualOverride()` from `planAssignments.ts` (L154-L165) — doesn't set `parent_plan_id`
- [x] DELETE `duplicatePlan()` from `planAssignments.ts` (L108-L152) — only used by deleted `createIndividualOverride`
- [x] SQL injection fix: `logs.ts:getPublishedPlanViaAssignments` L81-83 — string interpolation → `pb.filter()`

**Gate 0:** `pnpm type-check && pnpm build` → Exit 0 ✅

---

## Phase 2 — Plan Resolution SRP Refactor (0.5d)

> Pure refactor. No behavior change.

- [x] Create `src/lib/pocketbase/services/planResolution.ts` — extract from `logs.ts`:
  - `getPublishedPlanForToday(athleteId)` — public
  - `getPublishedOverrideForAthlete(athleteId)` — private
  - `getPublishedPlanViaAssignments(athleteId)` — private
  - `getActivePlan(planId)` — private
  - `todayISO()` → replace with `todayForUser()`
  - `PLAN_EXPAND` const
- [x] `logs.ts` — remove moved functions, add re-export: `export { getPublishedPlanForToday } from './planResolution'`
- [x] Update imports: `AthleteDashboard.tsx`, `AthleteTrainingView.tsx`, `AthleteDetailClient.tsx`
- [x] `pnpm type-check` → Exit 0
- [x] `pnpm build` → Exit 0

**Gate 2:** `pnpm type-check && pnpm build` → Exit 0

---

## Phase 3 — Resolution Logic Fixes (1d)

- [x] Fix `getPublishedOverrideForAthlete()` — add phase/date scope: `phase_id.start_date <= today && phase_id.end_date >= today`
- [x] Fix `getPublishedPlanForToday()` Step 3 — calculate current `week_number` from `phase.start_date`, filter by it
- [x] Timezone helper: `lib/utils/dateHelpers.ts` — `todayForUser(timezone?: string): string` (en-CA locale)
- [x] Integrate `todayForUser()` in `planResolution.ts`

**Gate 3:** `pnpm type-check && pnpm build` → Exit 0

---

## Phase 4 — Assignment Validation & Lifecycle (0.5d)

- [x] `planAssignments.ts:assignPlanToAthlete()` — guard: verify `plan.status === 'published'`
- [x] `planAssignments.ts:assignPlanToGroup()` — guard: verify `plan.status === 'published'`
- [x] `plans.ts:publishPlan()` — auto-deactivate assignments from older plans in same phase

**Gate 4:** `pnpm type-check && pnpm build` → Exit 0

---

## Phase 5 — Role-Based Navigation + BottomSheet (1.5d)

- [x] BottomTabBar: `useAuth()` → `ATHLETE_TABS` / `COACH_TABS`
  - Athlete: Today (Home) · Plan (Activity) · Stats (BarChart3) · More (Menu)
  - Coach: Team (Users) · Training (Dumbbell) · Review (ClipboardCheck+badge) · More (Menu)
  - ⚡ **Poka-Yoke:** typed `RoleTab` array с `roles: ('athlete'|'coach')[]` field
- [x] MoreMenu page: Settings, Reference, Exercises, Notifications + future stubs (Video, Offline → "Coming soon")
- [x] `BottomSheet.tsx` shared component (hook `useBottomSheet()`, Portal, drag-to-dismiss, snap points)
  - ⚡ **Arch:** Portal target = `document.getElementById('portal-root')` (add `<div id="portal-root">` to `layout.tsx`). НЕ `#__next` — Static Export может не иметь этот элемент
  - ⚡ **Perf:** `next/dynamic(() => import('./BottomSheet'), { ssr: false })` — drag/snap logic heavy, load on demand
- [x] Review tab badge count (coach: unreviewed logs)
- [x] Routing: Athlete `/dashboard`→`/training`→`/analytics`→`/more`, Coach `/dashboard`→`/training`→`/training/review`→`/more`
- [x] i18n × 3 locale (ru, en, cn)

**Gate 5:** `pnpm type-check && pnpm build` → Exit 0. Browser: coach 4 tabs ≠ athlete 4 tabs.

---

## Phase 6 — Today View + Coach Dashboard + Assign UX (3d)

> Merged: 4.24 dashboards + 4.25 assign UX in SeasonDetail

**Data source helpers (prep):**
- [x] `getWeeklyVolumeDelta(athleteId, weekStart)` — compare `listWeekLogs` current vs prev week → sets count delta
- [x] `getTeamReadinessAlerts(coachId)` — batch `getTodayCheckin` for all coach's athletes → filter readiness <40
- ℹ️ Existing sources: `getCurrentPRs()`, `computeStreak()`, `calculateWeeklyCNS()`, `calculateWeeklyCompliance()`, `listWeekLogs()`

**Athlete Today View — new components:**
- [x] `ScoreCard` — readiness hero number, WHOOP-style color (red <40, orange 41-70, green 71+)
  - Data: `getTodayCheckin()` → `calculateReadiness()`
- [x] `TodayWorkoutCard` — today's plan summary + "Start Workout" CTA (max 2 taps to start)
  - Data: `getPublishedPlanForToday()` → plan exercises summary
- [x] `StatsStrip` — 4 compact metric cards: PR, Streak, CNS%, Volume delta
  - Data: `getCurrentPRs()` · `computeStreak()` · `calculateWeeklyCNS()` · `getWeeklyVolumeDelta()` (new)
- [x] `WeeklyHeatmap` — 7-cell heatmap, 5 states:
  - ✅ Done (green) — `training_log` exists (late log = same green)
  - ⚠ Missed (orange) — plan existed, no log, day passed
  - — Rest (gray) — no plan for this day
  - ⭕ Today (blue border)
  - ⬜ Future (dimmed)
  - Data: `listWeekLogs()` + `listPlanExercises()` by `day_of_week`
- [x] AthleteDashboard reorder: ScoreCard → TodayWorkout → StatsStrip → WeeklyHeatmap → RecentNotifications → StreakHero → CompetitionCountdown
- [x] `RecentNotifications.tsx` — last 2-3 unread notifications inline on Today View
  - Data: `listUserNotifications(userId, { limit: 3, filter: 'read = false' })` — service ready
- [x] `usePullToRefresh(onRefresh)` hook — CSS transform pull animation + SWR `mutate()` trigger
  - Consumers: AthleteDashboard, CoachDashboard

**Coach Dashboard — new components:**
- [x] `TeamAlerts` — athletes with readiness <40 or missed >2 consecutive days
  - Data: `getTeamReadinessAlerts(coachId)` (new)
- [x] `TrainingToday` — micro-list: which athletes are training now
- [x] `PendingReviews` — logs awaiting review + badge count
- [x] `WeekSummaryBar` — team volume progress bar
- [x] `AthleteCard` visual polish — WHOOP-style hero badge, score color tokens
- [x] Dashboard page: coach/athlete branch via `useAuth()` role

**Assign UX (ex-4.25 Phase 4) — integrated into SeasonDetail.tsx:**
- [x] `SeasonDetail.tsx:PhaseCard` — show active assignments list (badge: «Assigned to: Group A, Athlete B»)
- [x] `SeasonDetail.tsx:PhaseCard` — Unassign button per active assignment
- [x] `SeasonDetail.tsx:handleAssign` — duplicate check: if plan already assigned → show warning
- [x] `SeasonDetail.tsx:handleAssign` — show plan name «Assigning: Week N» before confirm

**Glass variant spec (per DESIGN_SYSTEM.md Section 2):**

| Component | Glass | Reason |
|-----------|-------|--------|
| ScoreCard | `accent` | Hero metric, primary-colored highlight |
| TodayWorkoutCard | `medium` | Primary actionable panel |
| StatsStrip items | `subtle` | Background metric cards |
| WeeklyHeatmap | none (flat) | Compact data-dense, glass = noise |
| TeamAlerts | `accent` | Warning-level attention |
| PendingReviews | `subtle` | Secondary metric |
| RecentNotifications | `subtle` | Background list |
| BottomSheet | `strong` | Overlay surface |

**UI States (mandatory per react-ui-patterns):**
- [x] Each component: loading skeleton, error state + retry, empty state with CTA
- [x] `<DashboardErrorBoundary>` wrapping each dashboard section — isolate failures (StatsStrip crash ≠ whole page crash)
- [x] i18n × 3 locale (including assign/unassign labels)

**Gate 6:** `pnpm type-check && pnpm build` → Exit 0. Browser: athlete Today View + coach Dashboard + assign/unassign works.

---

## Phase 7 — DayColumn Decomposition (1d)

> Pure refactor. No UX change.

- [x] Extract → `cards/WarmupCard.tsx` (~50 LOC)
- [x] Extract → `cards/ExerciseCard.tsx` (~150 LOC)
- [x] Extract → `cards/AdHocWarmupStep.tsx` (~50 LOC)
- [x] Remove from DayColumn: WarmupTemplatePicker, TrainingTemplatePicker, SaveAsDayTemplateBtn
- [x] DayColumn.tsx: 780 → ≤200 LOC

**Gate 7:** `pnpm type-check && pnpm build && pnpm test` → Exit 0. **Behavior unchanged.**

---

## Phase 8 — Template Panel (1.5d)

- [x] `TemplatePanel.tsx` — container/presenter split
- [x] Tabs: System 🏷 | My Templates ✏️
- [x] Filters: Warmup / Training Day / All
- [x] Actions: Apply to Day, Copy & Edit, Delete (own only)
- [x] "Save current day as template" inline input
- [x] Mobile: BottomSheet (Phase 5) | Desktop: sidebar panel
- [x] WeekConstructor: trigger button for Template Panel
- [x] i18n × 3

**Gate 8:** `pnpm type-check && pnpm build` → Exit 0.

---

## Phase 9 — Day Constructor (2d)

> Plain decomposition per `UX_IMPROVEMENT_PLAN.md` L71-82. NO compound pattern (1 consumer = WeekConstructor, Rule of Three not met).

- [x] `DayConstructor.tsx` — container component (~200 LOC), plain props:
  ```
  DayHeader.tsx        — day name, date, session switch (AM/PM), totals
  ExerciseRow.tsx       — single exercise row (rename from ExerciseCard)
  DayActions.tsx        — toolbar: add exercise, template panel trigger, save-as-template
  ```
  - ⚡ **Arch (controlled):** DayConstructor НЕ владеет PB state. Принимает props от WeekConstructor
  - ⚡ **No compound:** plain props, no DayConstructor Context, no `invariant()`
- [x] Adaptive layout: sidebar (≥1024px) / full-screen with ← Back (<1024px)
- [x] Inline editing: sets × reps × weight (unit-type aware)
- [x] `@dnd-kit` drag & drop for exercise reorder — single DndContext per DayColumn, no nested providers
- [x] Coach notes textarea + CNS indicator per day
- [x] Template Panel trigger button in DayActions
- [x] "Save as Template" button in DayActions
- [x] **Lazy loading:** `next/dynamic` для DayConstructor
- [x] **Perf:** `content-visibility: auto` + `contain-intrinsic-size: 0 120px` on ExerciseRow container (skip rendering off-screen exercises)

**Gate 9:** `pnpm type-check && pnpm build` → Exit 0.

---

## Phase 10 — WeekConstructor Refactor + QuickWorkout (1.5d)

- [x] WeekConstructor toolbar: **4 items** — Back, Week nav (< 1/4 >), Publish/Draft toggle, CNS chip
- [x] More menu (⋯): AutoFill, Print, PDF (disabled stub), History, Save snapshot, Override
- [x] DayColumn → compact summary cards; click → DayConstructor opens
- [x] Phase guidelines → collapsible banner (not permanent toolbar)
- [x] Extract `WeekStrip.tsx` (~100 LOC) — 7-day horizontal strip with compact day cards (presentational)
- [x] Extract `WeekSummary.tsx` (~60 LOC) — CNS chip + exercise count + compliance % (presentational)
  - WeekConstructor remains container: 792 → ~450 LOC (~45% reduction)
- [x] **QuickPlanBuilder → rename `QuickWorkout`** (482 LOC standalone workout logger with localStorage):
  - Rename file + component: `QuickPlanBuilder.tsx` → `QuickWorkout.tsx`
  - 2 entry points: FAB "➕ Quick Workout" on Athlete Today View (when no plan or extra) + More menu "Quick Workout History"
  - Keep localStorage (`jp_quick_workouts`) — PB migration deferred to Track 6 (YAGNI)
  - ⚡ **Fix:** `pb.authStore.model` → `.record` (deprecated in PB v0.23+)

**Gate 10:** `pnpm type-check && pnpm build` → Exit 0.

---

## Phase 11 — Data Entry UX (2d)

- [x] `SetLogger.tsx` shared component: weight × reps × RPE inline entry
  - 3 consumers: DayConstructor (coach), AthleteTrainingView (athlete), standalone workout
  - ⚡ **Arch:** Props `mode: 'plan' | 'log'`
- [x] ± stepper buttons for reps (touch-friendly, ≥44px targets)
- [x] RPE slider (CSS range 1-10, green→red gradient) — only in `mode: 'log'`
- [x] Auto-fill from previous workout
- [x] ~~Sparkline~~ → **YAGNI:** text "Last 3: 75×5  80×5  80×4" (per UX wireframe, sparkline → Track 6)
- [x] Rest timer: configurable 30/60/90/120s, visual countdown circle
  - ~~audio beep~~ → **YAGNI:** visual only (audio → Track 6)
- [x] Extract `ExerciseItem` from AthleteTrainingView.tsx → reuse with SetLogger
  - ⚡ **Arch:** abstract batchSaveLogExercises to callback prop
- [x] Completion pulse animation (scale 1→1.03→1, 250ms, `--ease-spring`)

**Gate 11:** `pnpm type-check && pnpm build` → Exit 0.

---

## Phase 12 — Animation System + Dark Mode + Accessibility + Stubs (1.5d)

**"Athletic Pulse" Animation System:**
- [x] Motion tokens: `--motion-pulse: var(--duration-normal)`, `--motion-flow: var(--duration-slow)`, `--motion-burst: 500ms` (aliases → existing DS tokens)
- [x] 6× Pulse: set recorded, streak+1, readiness update, save confirm, exercise added, delete collapse
- [x] 4× Flow: tab crossfade, card expand, bottom sheet slide, day constructor open
- [x] 2× Burst: new PR (glow ring), phase complete
  - ~~3× deferred → Track 6:~~ streak milestone, first jump (confetti-dots), 100% compliance
- [x] All disabled via `prefers-reduced-motion: reduce`
- [x] All use GPU-only properties: `transform`, `opacity`, `box-shadow`

**Dark Mode:**
- [x] Softer danger/success (dark only)
- [x] Glow shadows (dark only)
- [x] Glass more opaque (dark only)
- [x] OLED auto-detect: `@media (dynamic-range: high)` → `--color-bg-primary: #000000`

**Accessibility:**
- [x] Font scale `--fs-scale` + Settings toggle: Normal (×1) | Large (×1.125) | Extra Large (×1.25)
- [x] Contrast audit: category chips, graph axis labels
- [x] Touch targets ≥44px verification pass

**Feature Stubs:**
- [x] `FeatureTeaser.tsx` — "Coming soon" inline banner
- [x] `ComingSoonCard.tsx` — feature preview card
- [x] Video / Offline entries in More menu with FeatureTeaser
- [x] PDF Export: disabled button
- [x] `ExerciseIllustration.tsx` — fallback icon

**Gate 12:** `pnpm type-check && pnpm build` → Exit 0.

---

## Phase 13 — i18n + QA (1.5d)

**i18n:**
- [x] All new keys × 3 locale (ru, en, cn) — including assign/unassign/planResolution keys
- [x] Chinese text overflow check on all new components

**Browser Smoke Tests (13):**
- [x] 1. Coach login → 4 role-specific tabs
- [x] 2. Athlete login → 4 role-specific tabs
- [x] 3. Athlete Today View: ScoreCard + TodayWorkout + WeeklyHeatmap
- [x] 4. Coach Dashboard: TeamAlerts + PendingReviews + AthleteCard badges
- [x] 5. Coach: Week → click day → Day Constructor sidebar (desktop)
- [x] 6. Day Constructor: add exercise, reorder, edit sets/reps, save
- [x] 7. Template Panel: filter, apply, save as template
- [x] 8. Exercise logging: stepper, RPE slider, auto-fill, rest timer
- [x] 9. Mobile 375px: navigation, fullscreen DayConstructor, bottom sheets
- [x] 10. Dark mode: all new components correct
- [x] 11. Plan resolution: create → publish → assign → athlete sees correct plan
- [x] 12. Override: create override → verify priority → verify stale override hidden
- [x] 13. Assign UX: assignments visible on PhaseCard, unassign works, publish auto-deactivates

**Final:**
- [x] `pnpm test` → all pass
- [x] `pnpm build` → Exit 0
- [x] CHANGELOG.md updated (Added/Changed sections)
- [x] context.md + walkthrough.md finalized

**Gate 13 (Track Complete):** All 13 smoke tests pass. Build clean. CHANGELOG updated.
