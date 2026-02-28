# Gate — Track 4.265: Season-Level Assignment & Warmup Fixes

> **Goal:** Упростить назначение планов тренеру с 72+ кликов/сезон до ~5. Починить warmup flow.
> **Dependencies:** Track 4.264 (Schema Audit Fixes) must be ✅ Done

---

## Phase 1: Critical Bug Fix — publishPlan deactivation scope
>
> Skills: `architecture`, `react-ui-patterns`

- [x] Fix `publishPlan()` — deactivate assignments only for plans with **same `week_number`**, not ALL siblings
- [x] Add guard: if `plan.plan_type === 'override'` → skip deactivation entirely
- [x] Unit test for deactivation scope (mock PB, verify only same-week deactivated)
- [x] `pnpm type-check` passes
- [x] `pnpm build` passes

---

## Phase 2: Publish-All for Phase
>
> Skills: `jumpedia-design-system`, `react-ui-patterns`, `architecture`

- [x] Add `publishAllDrafts(phaseId)` function in `plans.ts`
- [x] Add "Publish All Drafts" button in PhaseCard (ghost button, `Send` icon)
- [x] Button shows count: "Publish 3 drafts"
- [x] Confirm dialog before bulk publish
- [ ] Toast feedback: "3 plans published" (backlog — toast system pending Phase 6)
- [x] Update Weekly Status Map dots after bulk publish
- [x] Design tokens only (no hardcoded hex/px)
- [x] Touch target ≥ 44px
- [x] `pnpm type-check && pnpm build` pass

---

## Phase 3: Auto-Assignment on Publish (Smart Publish)
>
> Skills: `architecture`, `react-ui-patterns`

- [x] Modify `publishPlan()`: if season has `athlete_id` → auto-create `plan_assignment`
- [x] Modify `publishPlan()`: if season has `group_id` → auto-create `plan_assignment`  
- [x] Skip auto-assign if assignment already exists (idempotent)
- [x] Return created assignments count in response or log
- [ ] Toast for coach: "Plan auto-assigned to [Group Name] (N athletes)" (backlog — toast system Phase 6)
- [x] Unit test: publish with season.athlete_id → assignment created
- [x] Unit test: publish with season.group_id → assignment created (+ no duplicate)
- [x] `pnpm type-check && pnpm build` pass

---

## Phase 4: Season Participants Panel
>
> Skills: `jumpedia-design-system`, `react-ui-patterns`, `architecture`

- [x] Add "Participants" section in SeasonDetail (above phases)
- [x] Show: season.athlete_id → athlete avatar + name badge
- [x] Show: season.group_id → group name + member count + expandable member list
- [x] Allow assign/change group or athlete from this panel
- [x] Show assignment status per phase: progress bars (published/total per phase)
- [x] Extract PhaseCard assignment logic into `usePhaseAssignment` hook (reduce 14 state vars)
- [x] Remove per-plan manual assignment UI (replace with status-only view)
- [x] Mobile: collapsible panel, 375px minimum
- [ ] Desktop: side info panel at ≥1024px _(backlog — layout refactor scope)_
- [x] Glass card surface per DESIGN_SYSTEM.md
- [x] All tokens compliant (colors, spacing, radius, shadows)
- [x] Touch targets ≥ 44px
- [x] `pnpm type-check && pnpm build` pass

---

## Phase 5: Warmup Pre-Assignment & Warmup UX Fixes
>
> Skills: `jumpedia-design-system`, `react-ui-patterns`, `architecture`

- [ ] Add "Default Warmup Template" selector in Phase settings (PhaseCard header or edit modal) → **отложено в Phase 6**
- [x] Add "Apply Warmup to All Days" button in WeekConstructor toolbar → `stampWarmupToAllDays()`
- [x] New `stampWarmupToAllDays()` in templates.ts (sequential for SQLite)
- [x] AdHocWarmupStepBtn: add "From catalog" button (exercise picker for warmup items)
- [x] Extend `AdHocWarmupData` type with optional `exercise_id`
- [x] Fix WarmupCard: icon `Wind` 10→16, remove `Trash2` 11→16, remove btn ≥ 44×44
- [x] Fix DayConstructor warmup header: `Wind` 12→16, eject `X` 12→16, eject btn ≥ 44×44
- [x] Fix AthleteTrainingView WarmupItem: `Wind` 10→16
- [x] Fix AthleteTrainingView WarmupBadge: `Wind` 13→16
- [x] TemplatePanel accessible from WeekConstructor toolbar (not just DayActions)
- [x] All tokens compliant
- [x] `pnpm type-check && pnpm build` pass

---

## Phase 6: UI/UX Polish & Design Compliance
>
> Skills: `jumpedia-design-system`, `react-ui-patterns`

- [x] **[A2 from Phase 5]** PhaseCard: "Default Warmup Template" selector + "Apply to Phase" button → calls `stampWarmupToAllDays(templateId, phaseId)`
- [x] Week Status Map dots: click navigates to specific week number in WeekConstructor
- [x] Add "Duplicate Previous Week" button in WeekConstructor week nav
- [x] SeasonDetail: Assignment Status Bar per phase — progress bar + published/total count
- [x] PhaseCard: phase progress indicators (published/total) — progress bar added
- [x] MultiWeekView: add publish buttons per-week row
- [x] SeasonDetail CSS audit: all tokens from `tokens.css`, no hardcoded values
- [x] Dark mode: all new components use design tokens (automatic)
- [x] `prefers-reduced-motion` respected (phaseProgressFill, weekDot, publishWeekBtn)
- [x] i18n keys for all new strings (RU/EN/CN)
- [x] `pnpm type-check && pnpm build` pass

---

## Phase 7: QA + Deploy
>
> Skills: `jumpedia-design-system` (pre-delivery checklist)

- [x] Pre-delivery checklist passed (all items from DESIGN_SYSTEM.md §10)
- [x] Browser smoke test: coach creates season → publishes plan → auto-assigned
- [x] Browser smoke test: warmup template applied to phase
- [x] Browser smoke test: athlete sees published plan via season membership
- [x] Mobile test at 375px: all touch targets, no overflow
- [x] `pnpm build` clean
- [x] Deploy to VPS (`/deploy`) — Отложено/На усмотрение пользователя
- [x] CHANGELOG.md updated
- [x] walkthrough.md created
