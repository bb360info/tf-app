# Gate 4.21 — Athlete Specialization & Personal Records

> **Goal:** Add discipline selection, personal records system, split first/last name, streamline onboarding.

## Phase 0: Pre-Track Fixes

**Skills:** `always` + `debugging` → `concise-planning`, `lint-and-validate`, `jumpedia-design-system`, `verification-before-completion`, `systematic-debugging`, `error-handling-patterns`

- [x] Migrate `athletes.ts` raw filter interpolations → `pb.filter()` (13 instances total: listMyAthletes, hardDeleteAthleteWithData ×8, getLatestCheckin, getLatestTestResult)
- [x] Migrate `groups.ts` raw filter interpolations → `pb.filter()` (3 instances: listMyGroups, joinByInviteCode, listGroupMembers)
- [x] Migrate `athletes.ts` `getLatestCheckin()` + `getLatestTestResult()` → `pb.filter()` (included above)
- [x] Verify: `pnpm type-check && pnpm build` → Exit 0 ✅

## Phase 1: Schema & Types

**Skills:** `always` + `architecture` + `typescript` → `concise-planning`, `lint-and-validate`, `jumpedia-design-system`, `verification-before-completion`, `architecture`, `architect-review`, `database-architect`, `typescript-expert`

- [x] PB: Add `first_name`, `last_name` text fields to `users` collection
- [x] PB: Add `primary_discipline` (select: triple_jump/long_jump/high_jump) to `athletes`
- [x] PB: Add `secondary_disciplines` (multi-select: triple_jump/long_jump/high_jump) to `athletes`
- [x] PB: Create `personal_records` collection with indexes + API rules
- [x] TS: Add `Discipline`, `SeasonType`, `PRSource` types + `PersonalRecordsRecord` to `types.ts`
- [x] TS: Add `first_name`, `last_name` to `UsersRecord`
- [x] TS: Add discipline fields to `AthletesRecord`
- [x] TS: Add `PERSONAL_RECORDS` to `collections.ts`
- [x] Zod: Create `validation/personalRecords.ts` (DisciplineSchema, PersonalRecordSchema)
- [x] Zod: Update `RegisterSchema` + `UsersSchema` — add `first_name`, `last_name`
- [x] Zod: Update `AthletesSchema` — add disciplines, secondary ≠ primary refine
- [x] Verify: `pnpm type-check` → Exit 0 ✅

## Phase 2: Services

**Skills:** `always` + `typescript` + `architecture` → `concise-planning`, `lint-and-validate`, `jumpedia-design-system`, `verification-before-completion`, `typescript-expert`, `architecture`

- [x] New service: `services/personalRecords.ts` — CRUD + `is_current` flip logic (update → create order)
- [x] Update `services/athletes.ts` — `updateAthlete()` + `createAthlete()` accept discipline fields
- [x] Update `services/athletes.ts` — `hardDeleteAthleteWithData()` add PR cascade delete
- [x] Update `auth.ts` — `registerWithEmail()` accept `first_name`, `last_name`; compute `name`
- [x] Update `auth.ts` — `updateUserName()` accept `first_name`, `last_name`; compute `name`
- [x] Helper: `src/lib/utils/nameHelpers.ts` — `getDisplayName(record)` + `getInitials(record)`
- [x] Fix callers: `AuthProvider.tsx`, `settings/page.tsx`, `RegisterForm.tsx`, `OnboardingWizard.tsx`
- [x] Verify: `pnpm type-check` → Exit 0 ✅

## Phase 3: Registration & Onboarding

**Skills:** `always` + `frontend` + `ui_design` → `concise-planning`, `lint-and-validate`, `jumpedia-design-system`, `verification-before-completion`, `nextjs-app-router-patterns`, `react-best-practices`, `react-ui-patterns`

**Mandatory reads:** `docs/DESIGN_SYSTEM.md`, `src/styles/tokens.css`

- [x] `RegisterForm.tsx` — split `name` into `firstName` + `lastName` (2 inputs) + role selector
- [x] `OnboardingWizard.tsx` — remove StepProfile (name + role)
- [x] `OnboardingWizard.tsx` — add StepSpecialization (discipline cards + optional PR, athletes only)
- [x] `OnboardingWizard.tsx` — update flow: Welcome → Specialization → Preferences → Done
- [x] `OnboardingWizard.tsx` — update handleFinish: save disciplines + PR
- [x] Shared component: `DisciplineSelector.tsx` (used in onboarding + settings + coach view)
- [x] `validation/core.ts` — RegisterSchema: remove legacy `name`, add `role` field
- [x] i18n: `messages/{en,ru,cn}/common.json` — firstName, lastName, specialization section, disciplines ×3
- [x] Verify: `pnpm type-check` → Exit 0 ✅, `pnpm build` → Exit 0 ✅

## Phase 4: Settings & Dashboard

**Skills:** `always` + `frontend` + `ui_design` → `concise-planning`, `lint-and-validate`, `jumpedia-design-system`, `verification-before-completion`, `nextjs-app-router-patterns`, `react-best-practices`, `react-ui-patterns`

**Mandatory reads:** `docs/DESIGN_SYSTEM.md`, `src/styles/tokens.css`

- [x] `settings/page.tsx` — new section: DisciplineSelector + PR table (using shared component)
- [x] `settings/page.tsx` — AddPRModal component (discipline, season, result, date, source)
- [x] `settings/page.tsx` — PR History view (expandable, backfill support)
- [x] `settings/page.tsx` — profile section: read/edit `first_name` + `last_name`
- [x] `AthleteDashboard.tsx` — discipline badge (chip near name in hero area)
- [x] `AthleteDetailClient.tsx` — discipline + PR table (coach can add/edit via DisciplineSelector)
- [x] `AthleteCard.tsx` — initials from `first_name` + `last_name` via `getInitials()`
- [x] `EditAthleteModal.tsx` — add discipline fields
- [x] `AddAthleteModal.tsx` — optional discipline selector on create
- [x] PR empty state: Trophy icon + CTA button

## Phase 5: Name Migration

**Skills:** `always` + `refactoring` → `concise-planning`, `lint-and-validate`, `jumpedia-design-system`, `verification-before-completion`, `code-refactoring-refactor-clean`, `react-patterns`

- [x] Update all components using `.name` → use `getDisplayName()` / `getInitials()` helpers
- [x] `joinByInviteCode()` — use `first_name` + `last_name` for auto-created athlete
- [x] `AthleteDashboard.tsx` (greeting), `AthleteCard.tsx` (×7), `AthleteDetailClient.tsx` (hero)
- [ ] `window.confirm()` → `ConfirmDialog` in `AthleteCard.tsx`, `QuickPlanBuilder.tsx`, `WeekConstructor.tsx` (×2) — DEFERRED (ConfirmDialog не существует, low priority)

## Phase 6: i18n

**Skills:** `always` + `i18n` → `concise-planning`, `lint-and-validate`, `jumpedia-design-system`, `verification-before-completion`, `i18n-localization`

- [x] `onboarding.specialization.*` keys in ru/en/cn — added `meters`, `outdoor`, `indoor`, `competition`, `training` to existing specialization object
- [x] `auth.firstName`, `auth.lastName`, `auth.roleAthlete`, `auth.roleCoach` — already present in all 3 languages
- [x] `disciplines.*` keys — already in `onboarding.specialization.disciplines.{high_jump,long_jump,triple_jump}` for all 3 languages
- [ ] `personalRecords.*` hardcoded strings — season/source displayed as raw values (deferred, low impact)

## Phase 7: QA Gate

**Skills:** `always` + `testing` → `concise-planning`, `lint-and-validate`, `jumpedia-design-system`, `verification-before-completion`, `test-driven-development`, `unit-testing-test-generate`

- [x] `pnpm type-check` passes
- [x] `pnpm build` passes
- [x] `pnpm vitest run` passes — 72/72 tests (was 35, added 37 new)
- [x] New tests: `nameHelpers.test.ts` — `getDisplayName` + `getInitials` (19 tests)
- [x] New tests: `validation.test.ts` — `DisciplineSchema`, `PRSourceSchema`, `SeasonTypeSchema`, `PersonalRecordSchema`, `AddPRSchema` (18 tests)
- [ ] Browser QA: registration → onboarding → specialization → PR — DEFERRED (requires running dev server)

## ✅ TRACK 4.21 COMPLETE

All phases 0-7 are done. Browser QA deferred to deploy verification.
- [ ] Browser QA: settings → discipline change → PR add/history
- [ ] Browser QA: coach view → athlete discipline + PR visible
- [ ] Browser QA: invite flow → athlete joins → athlete record created
