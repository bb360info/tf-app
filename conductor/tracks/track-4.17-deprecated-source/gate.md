# Track 4.17: Coach-Athlete Interaction — Tasks

## Planning
- [x] Brainstorm athlete↔coach interaction gaps
- [x] Select skills: brainstorming, architecture, kaizen
- [x] Read ARCHITECTURE.md, PB schema, existing services
- [x] Create implementation plan with ADRs
- [x] Review v2: per-phase skills, DS compliance, code-level corrections
- [x] User approval of plan v2
- [x] Save to conductor/tracks/track-4.17-coach-athlete/ (gate + context + impl_plan)

## Phase 1: Quick Wins — `/ui-work` + `jumpedia-design-system` + `react-ui-patterns` + `react-best-practices`
- [ ] `AthleteDashboard.tsx` — call `getPublishedPlanForToday()`, render today's exercises
- [ ] `CompetitionCountdown.tsx` + `.module.css` — new component, priority tokens from `tokens.css`
- [ ] `peaking.ts` — add `getNextCompetition(seasonId)`
- [ ] `AthleteTrainingView.tsx` — adaptation explanation banner (readiness < 60)
- [ ] i18n keys (3 locales)
- [ ] `pnpm type-check` + `pnpm build` — Exit 0
- [ ] Pre-Delivery DS Checklist

## Phase 2: Coach Notes — `/ui-work` + `architecture` + `jumpedia-design-system`
- [ ] PB schema: add `day_notes` JSON field to `training_plans`
- [ ] `types.ts` — update `TrainingPlansRecord` + Zod schema
- [ ] `plans.ts` — expand `updatePlan()` Partial to include `day_notes`, copy in `duplicatePlan()`
- [ ] `WeekConstructor.tsx` — dayNotes state + save on publish/save
- [ ] `DayColumn.tsx` — 2 new props: `dayNote`, `onDayNoteChange` + textarea UI
- [ ] `DayColumn.module.css` — noteInput + noteToggle styles
- [ ] `AthleteTrainingView.tsx` — coach note glassmorphism banner in DayCard
- [ ] i18n keys (3 locales)
- [ ] `pnpm type-check` + `pnpm build` — Exit 0
- [ ] Pre-Delivery DS Checklist

## Phase 3: Log Visibility — `/ui-work` + `react-ui-patterns` + `react-best-practices`
- [ ] `compliance.ts` — `getWeeklyCompliance()` + `getExerciseComparison()`
- [ ] `compliance.test.ts` — unit test (mock data)
- [ ] `CoachLogViewer.tsx` + `.module.css` — plan vs fact table (mobile cards → desktop table)
- [ ] `AthleteDetailClient.tsx` — integrate CoachLogViewer (lazy) in Training tab
- [ ] `dashboard/page.tsx` — compliance mini badge in AthleteCard
- [ ] i18n keys (3 locales)
- [ ] `pnpm type-check` + `pnpm build` + `pnpm test` — Exit 0
- [ ] Pre-Delivery DS Checklist

## Phase 4: Notification Engine — `architecture` + `react-best-practices`
- [ ] `notificationTriggers.ts` — createNotification + 3 trigger functions
- [ ] `readiness.ts` — trigger on score < 50 (non-blocking)
- [ ] `achievements.ts` — trigger on grant (non-blocking)
- [ ] `plans.ts` — trigger in `publishPlan()` (resolves via planAssignments)
- [ ] `NotificationBell.tsx` — type-based Lucide icons + navigation
- [ ] `pnpm type-check` + `pnpm build` — Exit 0

## Phase 5: Activity Feed — `/ui-work` + `jumpedia-design-system` + `react-best-practices`
- [ ] `ActivityFeed.tsx` + `.module.css` — merge 3 collections, horizontal scroll
- [ ] `dashboard/page.tsx` — integrate ActivityFeed (lazy, coach only)
- [ ] i18n keys (3 locales)
- [ ] `pnpm type-check` + `pnpm build` — Exit 0
- [ ] Pre-Delivery DS Checklist

## Quality Gate
- [ ] All 5 phases pass `pnpm type-check` + `pnpm build`
- [ ] `pnpm test` — existing + new tests pass
- [ ] Manual QA: 11 test scenarios (see plan)
- [ ] Update CHANGELOG.md
- [ ] Update tracks.md → 4.17 ✅ Done
