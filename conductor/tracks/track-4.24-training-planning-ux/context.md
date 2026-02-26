# Context — Track 4.24: Unified UX System Redesign & Plan Resolution

## Problem
Two interrelated issues in one unified track:

**A. UX Redesign:** The training planning UI is overloaded and unintuitive for coaches. The entire app navigation is role-agnostic (same 5 tabs for everyone). Athletes lack a "Today View" home screen. Multiple template systems confuse users. DayColumn.tsx (780 LOC) and WeekConstructor.tsx (792 LOC) are unmaintainable monoliths.

**B. Plan Resolution Bugs (ex-Track 4.25):** `getPublishedPlanForToday()` has 4 critical bugs: (1) duplicate `createIndividualOverride` in `planAssignments.ts` without `parent_plan_id`, (2) SQL injection in group plan resolution, (3) no `week_number` filtering — athlete may get wrong week's plan, (4) overrides not scoped by phase — stale overrides from past seasons. Plus SRP violation (resolution in `logs.ts`), no assign validation, and UX doesn't show assignments.

## Solution

**Strategy: Backend-first** — fix plan resolution (Phases 0-4) before building UI that depends on it (Phases 5-13).

**Direction A — System UX (Phases 5-6):**
- Role-based navigation (4 tabs per role)
- Athlete Today View (ScoreCard, TodayWorkoutCard, StatsStrip, WeeklyHeatmap, RecentNotifications)
- Coach Dashboard (TeamAlerts, PendingReviews, AthleteCard rework)
- BottomSheet shared component (lazy-loaded via `next/dynamic`)
- Pull-to-refresh on dashboards (`usePullToRefresh` hook)
- DashboardErrorBoundary per section (isolate failures)
- Glass variant spec per component (DS Section 2 compliance)
- Assign UX in SeasonDetail (show assignments, unassign, duplicate check)

**Direction B — Training Planning (Phases 7-10):**
- DayColumn decomposition (780 → ~200 LOC) — plain decomposition: DayHeader + ExerciseRow + DayActions
- Unified Template Panel (replaces 3 separate pickers)
- Day Constructor (sidebar/full-screen adaptive, plain props, content-visibility for ExerciseRow perf)
- WeekConstructor: toolbar cleanup + WeekStrip/WeekSummary extraction (792 → ~450 LOC) + QuickWorkout rename

**Direction C — Backend Fixes (Phases 0-4):**
- Dead code cleanup (`planAssignments.ts` duplicates)
- SQL injection fix in `logs.ts`
- SRP refactor → new `planResolution.ts`
- Override/week scoping fixes
- Assignment validation guards
- Auto-deactivate assignments on publish
- Timezone-aware `todayForUser()` helper

**Polish (Phases 11-12):**
- "Athletic Pulse" animation system (12 animations, tokens = aliases to existing DS `--duration-*`)
- Dark mode refinements + OLED auto-detect
- Data entry UX (SetLogger, stepper, RPE, rest timer, auto-fill, "Last 3 sets" text)
- Font scale for coaches 50+
- Feature stubs

## Key Decisions (finalized)
- **QuickPlanBuilder**: rename → `QuickWorkout.tsx`, NOT delete. 2 entry points: FAB on Today View + More menu. Keep localStorage, PB migration → Track 6
- **DayConstructor**: plain decomposition (DayHeader + ExerciseRow + DayActions), NOT compound pattern. Rule of Three not met (1 consumer)
- **Data sources**: 90% existing services. 2 new helpers: `getWeeklyVolumeDelta()`, `getTeamReadinessAlerts()`
- **BottomSheet**: portal `portal-root` in layout.tsx + `next/dynamic` lazy-loading
- **Animations**: 12 total (6 Pulse + 4 Flow + 2 Burst). Tokens = aliases to existing DS. 3 Burst deferred → Track 6
- **Glass variants**: specified per component (accent/medium/subtle/flat/strong) per DS Section 2
- **Pull-to-refresh**: `usePullToRefresh` hook + SWR `mutate()` on dashboards
- **RecentNotifications**: inline widget on Today View (2-3 unread)
- **DashboardErrorBoundary**: wrapping each section to isolate crashes
- **content-visibility**: `auto` on ExerciseRow for off-screen rendering skip
- **WeekStrip + WeekSummary**: extracted from WeekConstructor (792 → ~450 LOC)
- **SetLogger history**: "Last 3: 75×5  80×5  80×4" (per UX wireframe, not sparkline)
- **DESIGN_SYSTEM.md sync**: Phase 0 includes DS update (score colors, chart palette, sheet tokens, aliases)
- Gestures (swipe/long-press): NO → Track 6
- Liquid Glass evolution: NO → Track 6
- Onboarding redesign: NO → Track 6
- WeekConstructor decomposition: toolbar only
- AthleteTrainingView decomposition: only ExerciseItem
- AthleteCard: visual polish only (readiness/discipline/compliance already exist)
- OLED: auto-detect via CSS `dynamic-range: high` (no toggle)
- WeeklyHeatmap: 5 states (done/missed/rest/today/future)
- Unit tests for plan resolution: SKIP — manual verification via smoke tests
- Assign UX merged with Coach Dashboard phase (one SeasonDetail.tsx pass)

## Files affected
- `src/lib/pocketbase/services/planAssignments.ts` → DELETE dead code
- `src/lib/pocketbase/services/logs.ts` → extract plan resolution, fix SQL
- `src/lib/pocketbase/services/planResolution.ts` → NEW (extracted + fixed)
- `src/lib/pocketbase/services/plans.ts` → auto-deactivate on publish
- `src/lib/utils/dateHelpers.ts` → +todayForUser()
- `src/components/shared/BottomTabBar.tsx` → role-based tabs
- `src/components/shared/BottomSheet.tsx` → NEW
- `src/components/dashboard/AthleteDashboard.tsx` → Today View + import update
- `src/components/dashboard/AthleteCard.tsx` → rework
- `src/components/training/DayColumn.tsx` → decompose
- `src/components/training/WeekConstructor.tsx` → toolbar cleanup
- `src/components/training/AthleteTrainingView.tsx` → ExerciseItem extraction + import update
- `src/components/training/QuickPlanBuilder.tsx` → rename → `QuickWorkout.tsx`
- `src/components/training/DayConstructor.tsx` → NEW
- `src/components/training/TemplatePanel.tsx` → NEW
- `src/components/training/cards/*.tsx` → NEW (extracted)
- `src/components/training/SetLogger.tsx` → NEW
- `src/components/training/SeasonDetail.tsx` → assign UX (badges, unassign, duplicate check)
- `src/app/[locale]/(protected)/dashboard/athlete/[id]/AthleteDetailClient.tsx` → import update
- `src/styles/tokens.css` → new tokens + animations
- ~10 NEW components (ScoreCard, TodayWorkoutCard, StatsStrip, etc.)

## Skills
brainstorming, concise-planning, context-driven-development, kaizen, code-refactoring-refactor-clean, react-patterns, react-ui-patterns, ui-visual-validator, mobile-developer, jumpedia-design-system, lint-and-validate, architect-review, systematic-debugging, typescript-expert

## Cross-Track Analysis
- **Track 4.22** (Invite Links): 0 file overlap. No conflict.
- **Track 4.23** (Notifications): NotificationBell badge done. SQL injection in `planAssignments.ts` + `plans.ts` already fixed. Our scope = `logs.ts` only. No conflict.
- **Track 4.21** (Athlete Specialization): OnboardingWizard not touched. No conflict.
- **Track 4.25**: ❌ ABSORBED — all 4.25 tasks integrated into this track (Phases 0-4 + Phase 6 assign UX).

## What stays unchanged
- PocketBase schema (no collection changes)
- Auth flow
- Season/Phase/Plan hierarchy
- Exercise library
- Analytics/Charts (Track 5-6)
