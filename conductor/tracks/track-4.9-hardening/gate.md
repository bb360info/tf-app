# Gate 4.9: Pre-Launch Hardening ✅ Checklist

## Фаза 0: Coach/Athlete Creation Fixes (QA-verified)

- [x] BUG-1: `readiness.ts:getSelfAthleteId()` — unified `coach_id` lookup for both roles
- [x] BUG-2: `OnboardingWizard.tsx` — save user name to PB via `updateUserName()`
- [x] BUG-3: `preferences.ts:saveMyPreferences()` — include `onboarding_complete` in payload
- [x] BUG-4: `dashboard/page.tsx` — compute readiness from checkin fields
- [x] BUG-6: `AddAthleteModal.tsx` — hardcoded RU → `t('createFailed')` + 3 locales
- [x] BUG-8: `LoginForm.tsx` — PB fallback for onboarding check
- [x] BUG-9: `auth.ts` + `AuthProvider.tsx` — default role → `'athlete'`

## Фаза 1: Quick Fixes + i18n Cleanup

### Hardcoded Strings → i18n
- [x] `AddTestResultModal.tsx` → 4 hardcoded RU строки → i18n ключи ✅ Track 4.7
- [x] `AddTestResultModal.tsx` → inline spinner style → CSS class `.spinIcon` ✅ Track 4.7
- [x] `AthleteCard.tsx` → hardcoded confirm → `t('deleteConfirm', {name})` ✅ Track 4.7
- [x] `AthleteCard.tsx` → `лет` → `t('yearsOld', {age})` ✅ Track 4.7
- [x] `ProgressChart.tsx` → hardcoded `'ru-RU'` → locale map ✅ Track 4.7
- [x] `ProgressChart.tsx` → 2 hardcoded строки → i18n ✅ Track 4.7
- [x] `training/page.tsx` → 4 hardcoded strings → i18n ✅ Track 4.7
- [ ] `dashboard/page.tsx` → 2 hardcoded RU строки → i18n

### Inline Styles → CSS Classes
- [x] `training/page.tsx` → SeasonWizard/Detail loading → CSS classes ✅ Track 4.7
- [x] `training/page.tsx` → 5 inline styles → CSS (2 phase-color остались — динамические, OK) ✅ Track 4.7

### i18n Keys
- [x] ~15 новых ключей в `messages/{ru,en,cn}/common.json` ✅ Track 4.7

## Фаза 2: Settings Improvements

- [x] `auth.ts` → `changePassword(oldPassword, newPassword)` — already existed
- [x] `auth.ts` → `updateUserName(name)` — already existed
- [x] Settings: секция «Security» — смена пароля (old + new + confirm + strength bar) ✅
- [x] Settings: editable name field + save ✅
- [x] Settings: inline styles Save button (3 instances) → `.backBtn`, `.rowActions`, `.rowBlock` CSS члассы ✅
- [x] Settings: ChevronRight → `.chevronIcon` + `.chevronOpen` CSS анимация ✅
- [x] Settings: убран style с Groups Link (`textDecoration`, `cursor`) → `a.row` CSS ✅
- [x] Settings: для `role=athlete` — секция «Мой профиль» (рост, ДР) read-only ✅
- [x] i18n ключи `settings.height`, `cm`, `birthDate` ×3 локали ✅

## Фаза 3: Athlete-Season Binding + PB Cascade ✅ Предварительно реализована

- [x] PB Admin: `athlete_id` (optional relation → athletes) в `seasons` — already in schema
- [x] `types.ts` → `athlete_id?: string` в `SeasonsRecord` — already present line 77
- [x] `seasons.ts` → `createSeason()` принимает optional `athlete_id` — done
- [x] `seasons.ts` → `listSeasons()` принимает optional `athleteId` фильтр — done
- [x] `SeasonWizard.tsx` → dropdown выбора атлета при создании сезона — done lines 262-276
- [ ] PB Admin: cascade delete rules для коллекций с `athlete_id` — не критично
- [ ] `athletes.ts` → упростить `hardDeleteAthleteWithData()` (cascade handles it) — backlog

## Фаза 4: Coach Athlete Detail Page ✅ Предварительно реализована

- [x] `/dashboard/athlete/[id]/page.tsx` — hero + glassmorphism tabs
- [x] Tab: Overview (metric cards 2×2, recent tests, StreakHeroCard)
- [x] Tab: Training History (SeasonSummaryCard с phases)
- [x] Tab: Test Results (ProgressChart + delta chips)
- [x] Tab: Readiness (CnsHeatmap 4W + avgScore)
- [x] `athleteDetail.module.css` — glassmorphism, DS tokens, mobile-first
- [x] `AthleteCard.tsx` → клик → `/dashboard/athlete/[id]`
- [x] i18n: `athleteDetail.yearsOld`, `cm` ×3 locale — 2026-02-21
- [x] hardcoded 'лет' → `t('yearsOld')`, 'cm' → `t('cm')` — 2026-02-21
- [x] skeleton inline styles → `.skeletonHero`, `.skeletonGrid`, `.skeletonStack` CSS

## Фаза 5: Dashboard Groups + ErrorBoundary + UX Polish ✅

- [x] Dashboard: group filter chips (horizontal scroll) — already implemented in page.tsx
- [x] `AthleteCard.tsx` → group badge (Tag icon + groupName) — 2026-02-21
- [x] `ErrorBoundary.tsx` — glassmorphism UI + `onError` callback — already existed
- [x] `ErrorBoundary.module.css` — DS tokens, @supports fallback — already existed
- [x] `layout.tsx` → обернуть children в `<ErrorBoundary>` + telemetry — 2026-02-21
- [x] i18n: `dashboard.group`, `dashboard.allGroups`, `dashboard.filterByGroup` ×3 locale
- [x] `athletes.ts` → `groupId?/groupName?` в AthleteWithStats
- [x] `dashboard/page.tsx` → group_members enrichment (race-condition-safe)
- [x] `dashboard/page.tsx` → убраны 2 inline styles → `.addBtnCentered`, `.emptyStateFull`

## Criteria

- [ ] `pnpm type-check` — Exit 0
- [ ] `pnpm build` — Exit 0
- [ ] `pnpm lint` — 0 new errors
- [ ] `pnpm test` — Exit 0
- [ ] 0 hardcoded RU строк в UI компонентах
- [ ] 0 inline styles в Settings page
- [ ] Тренер может создать сезон для конкретного атлета
- [ ] Атлет видит свой назначенный план
