# Track 4.5: UX Core — Agent Context

> Quick-reference for any agent picking up this track. Read `gate.md` for checklist, `implementation_plan.md` for full details.

## Approved Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Exercise Catalog location | `/reference/exercises` | Fits Reference section, doesn't break 5-tab BottomTabBar |
| Athlete Dashboard routing | Role-switch in same route | `if (isAthlete) return <AthleteDashboard />` — simpler than separate routes |
| Custom exercise visibility | personal / pending_review / approved / rejected | Coach creates → optional submit for admin approval → global catalog |
| Admin approval UI | Track 6 (PB Admin Panel for now) | Out of scope for Track 4.5, added to backlog |
| Favorites storage | localStorage (MVP) | Can migrate to PB collection in Track 6 |

## Key Files to Read First

### Architecture & Design
- `docs/ARCHITECTURE.md` — PB schema (21 collections), indexes, API rules
- `docs/DESIGN_SYSTEM.md` — **MANDATORY before any UI work**
- `src/styles/tokens.css` — CSS custom properties source of truth
- `GEMINI.md` — Agent rules, project structure, commands

### PocketBase Services (existing, to reuse)
- `src/lib/pocketbase/types.ts` — All 21 collection interfaces
- `src/lib/pocketbase/services/exercises.ts` — `searchExercises()`, `getExerciseName()`, `cnsCostColor()`, `CATEGORY_COLORS`
- `src/lib/pocketbase/services/plans.ts` — `listPlansForPhase()`, `addExerciseToPlan()`, `publishPlan()`, `groupByDay()`
- `src/lib/pocketbase/services/athletes.ts` — `listMyAthletes()`, `getLatestCheckin()`
- `src/lib/pocketbase/services/readiness.ts` — `getSelfAthleteId()`, `getTodayCheckin()`, `saveCheckin()`
- `src/lib/pocketbase/collections.ts` — Collection name constants

### Components to Extend/Reuse
- `src/components/training/ExercisePicker.tsx` — 229 lines, modal sheet with search+filters. **Refactor: make `phaseType` optional, add "My exercises" tab**
- `src/components/training/DayColumn.tsx` — 223 lines, **`readOnly` prop already exists** — use for athlete view
- `src/components/training/TrainingLog.tsx` — 552 lines, already accepts `athleteId` — athlete can fill
- `src/components/training/WeekConstructor.tsx` — 503 lines, lazy-loads ExercisePicker
- `src/components/readiness/DailyCheckin.tsx` — 6KB, reuse for athlete check-in

### Pages to Modify
- `src/app/[locale]/(protected)/dashboard/page.tsx` — Add role-switch (coach vs athlete)
- `src/app/[locale]/(protected)/training/page.tsx` — Add QuickPlan button + athlete view
- `src/app/[locale]/(protected)/reference/page.tsx` — Add exercises/warmup/mental categories

### Layout & Navigation
- `src/app/[locale]/(protected)/layout.tsx` — AuthGuard + BottomTabBar
- `src/components/shared/BottomTabBar.tsx` — 5 tabs: dashboard/training/analytics/reference/settings
- `src/components/auth/AuthGuard.tsx` — Checks isLoggedIn, NOT role

### i18n
- `messages/ru/common.json`, `messages/en/common.json`, `messages/cn/common.json`

## PB Schema Changes Required

```
# 1. training_plans: make phase_id nullable
ALTER TABLE training_plans ALTER COLUMN phase_id DROP NOT NULL;

# 2. custom_exercises: add visibility fields
# Via PB Admin Panel (/_/) → custom_exercises collection:
#   + visibility: select (personal|pending_review|approved|rejected) default="personal"
#   + approved_by: relation → users (nullable)
#   + approved_at: date (nullable)
#   + rejection_reason: text (nullable)
#   + illustration: file (nullable)
#
# API Rules:
#   List: coach_id = @request.auth.id || visibility = "approved" || (@request.auth.role = "admin")
#   Create: @request.auth.id != ""
#   Update: coach_id = @request.auth.id || @request.auth.role = "admin"
#   Delete: coach_id = @request.auth.id || @request.auth.role = "admin"
```

## Execution Order

1. **Phase 1: Exercise Catalog** (2-3 days) — `/reference/exercises` page, ExerciseDetailSheet, CoachTips+TTS, ShowAthleteOverlay, favorites
2. **Phase 2: Daily Builder + Constructor** (2-3 days) — QuickPlanBuilder, ExerciseConstructor (wizard), visibility model, customExercises service, ExercisePicker refactor
3. **Phase 3: Athlete Dashboard** (2-3 days) — useAuth hook, CoachDashboard extraction, AthleteDashboard, AthleteTrainingView, role-switch
4. **Phase 4: Warmup & Mental** (1-1.5 days) — warmup/mental reference pages, BreathingTimer

## Verification Commands

```bash
pnpm type-check   # TypeScript
pnpm build         # Static export
pnpm lint          # ESLint
pnpm test          # Vitest
```

## Mandatory Workflows

- Run `/ui-work` before any UI/CSS work
- Run `/switch-agent` when starting new chat
- Skills: `always` group (concise-planning, lint-and-validate, jumpedia-design-system, verification-before-completion)
