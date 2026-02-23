# Track 4.8: Lint Cleanup — Gate ✅

## Группа A: `no-explicit-any` (35 ошибок)

### Скрипты (16 ошибок) — `scripts/`
- [x] `scripts/audit-check.ts` — eslint-disable убран (argsIgnorePattern покрывает)
- [x] `scripts/migrate-exercises.ts` — eslint-disable убран
- [x] `scripts/patch-exercises.ts` — eslint-disable убран + prefer-const fix
- [x] `scripts/populate-phase-suitability.ts` — eslint-disable убран
- [x] `scripts/test-athlete-scope.ts` — eslint-disable убран
- [x] `scripts/update-exercises-schema.ts` (4 ошибки: L26, L30, L33, L35) — eslint-disable убран

### Src файлы (19 ошибок)
- [x] `src/app/[locale]/(protected)/training/page.tsx` (L30, L64) — `any` → `CheckinData`
- [x] `src/components/analytics/ProgressChart.tsx` — `useRef` → `useMemo` (react-hooks/refs устранён)
- [x] `src/components/analytics/TrainingLoadPie.tsx` (L105, L118) — `useRef` → `useMemo`
- [x] `src/components/training/PlanHistoryModal.tsx` (L12) — типизирован
- [x] `src/components/training/SeasonWizard.tsx` (L207) — `err: any` → `err: unknown`
- [x] `src/lib/autofill/processor.ts` (L68) — `any[]` → `unknown[]`
- [x] `src/lib/pocketbase/services/snapshots.ts` (L14) — типизирован

## Группа B: `no-unused-vars` (18 warnings)

- [x] `scripts/migrate-exercises.ts` — `_coach2Athlete` prefix
- [x] `src/components/exercises/ExerciseCatalog.tsx` — удалён `CATEGORY_COLORS`
- [x] `src/components/exercises/ExerciseConstructor.tsx` — удалены `UNIT_TYPES`, `_locale`
- [x] `src/components/readiness/DailyCheckin.tsx` — удалён `ReadinessStatus`
- [x] `src/components/training/DaySummaryCard.tsx` — удалены `_t`, `_i`
- [x] `src/components/training/PlanHistoryModal.tsx` — удалены `RotateCcw`, `_onRestore`
- [x] `src/components/training/SeasonDetail.tsx` — `weekNum` → `_weekNum`
- [x] `src/components/training/WeekConstructor.tsx` — удалены `applyAdaptation`, `adaptationLabel`, `_autoAdaptEnabled`
- [x] `src/lib/pocketbase/services/peaking.ts` — удалены `TrainingPhasesRecord`, `RecordModel`
- [x] `src/lib/pocketbase/services/readiness.ts` — `_score` prefix
- [x] `src/lib/pocketbase/services/snapshots.ts` — удалён `BaseRecord`

## Группа C: `setState-in-effect` (4 ошибки — требуют рефакторинга)

- [x] `src/lib/theme/ThemeProvider.tsx` (L38, L50) — рефакторинг → lazy initializer
- [x] `src/lib/pocketbase/AuthProvider.tsx` (L49) — рефакторинг
- [x] `src/components/shared/NotificationBell.tsx` (L42) — рефакторинг

## Группа D: Прочее (5 ошибок)

- [x] `src/components/training/DaySummaryCard.tsx` (L28) — `@ts-ignore` → `@ts-expect-error`
- [x] `src/components/dashboard/EditAthleteModal.tsx` — `tDash` добавлен в deps `useCallback`
- [x] `scripts/patch-exercises.ts` — `conductor/scripts/**` в globalIgnores
- [x] `public/sw.js` — добавлен в globalIgnores

## Criteria
- [x] `pnpm lint` — Exit 0 (0 errors, 0 warnings)
- [x] `pnpm type-check` — Exit 0
- [ ] `pnpm build` — Exit 0 (не проверялся, требуется отдельный запуск)
