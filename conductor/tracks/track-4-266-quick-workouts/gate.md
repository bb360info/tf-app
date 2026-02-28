---
title: Track 4.266 - Context-Aware Quick Workouts
---

# Gate 4.266

- [ ] Phase 1: Backend Services (plans.ts, seasons.ts)
  - [ ] Implement `ensureStandalonePlan`
  - [ ] Implement `getStandalonePlansForPeriod`
  - [ ] Implement `resolveStandaloneConflict`
- [ ] Phase 2: Frontend QuickWorkout
  - [ ] Update `QuickWorkout.tsx` to handle `standalone` saving when season is missing
- [ ] Phase 3: Conflict Resolution UI (SeasonWizard)
  - [ ] Design Conflict Resolution UI Step
  - [ ] Add Conflict Step to `SeasonWizard.tsx`
  - [ ] Integrate with `resolveStandaloneConflict` on Save
- [ ] Phase 4: Verification & Polish
  - [ ] Test standalone saving
  - [ ] Test conflict resolution (Merge, Keep, Delete)
  - [ ] Run QA smoke tests (`pnpm test`, `pnpm build`, `pnpm type-check`)
