# Unified Plan — Track 4.24+4.25: Unified UX System Redesign & Plan Resolution

> **Статус:** ✅ APPROVED  
> **Оценка:** 17-20 дней · 12 фаз · ~28 компонентов  
> **Скиллы (14):** brainstorming, concise-planning, context-driven-development, kaizen, code-refactoring-refactor-clean, react-patterns, react-ui-patterns, ui-visual-validator, mobile-developer, jumpedia-design-system, lint-and-validate, architect-review, systematic-debugging, typescript-expert

---

## 🔍 Анализ интеграции

### Почему нужно объединять

1. **SeasonDetail.tsx** — оба трека её модифицируют: 4.24 (WeekConstructor рефакторинг, навигация, DayConstructor) и 4.25 (показать assignments, unassign, plan name preview). Раздельные изменения → merge conflict и дублирование UX-решений.

2. **Plan resolution → athlete-facing components** — 4.25 исправляет `getPublishedPlanForToday()`, которая напрямую кормит данные в `AthleteDashboard` (Today View из 4.24) и `AthleteTrainingView`. Фикс resolution chain ПЕРЕД созданием Today View гарантирует, что новый UX показывает корректный план.

3. **WeekConstructor** — 4.24 рефакторит toolbar, а 4.25 меняет поведение publishPlan (auto-deactivate). Логически это один поток: construct → publish → assign → resolve.

4. **DayColumn/DayConstructor** — 4.24 декомпозирует DayColumn, а QuickPlanBuilder (4.24 Phase 6) использует `pb.authStore.model` → deprecated. 4.25 уже идентифицировал этот fix. Делать вместе = чистый рефакторинг.

### Стратегия: Backend-First

```
Phase 0-1: Foundation (tokens + dead code + SQL fix)     ← 4.25 Phase 0 + 4.24 Phase 0
Phase 2:   Plan Resolution SRP Refactor                  ← 4.25 Phase 1
Phase 3:   Resolution Logic Fixes                        ← 4.25 Phase 2
Phase 4:   Assignment Validation & Lifecycle              ← 4.25 Phase 3
Phase 5:   Navigation + BottomSheet                       ← 4.24 Phase 1
Phase 6:   Today View + Coach Dashboard                   ← 4.24 Phase 2 + 4.25 Phase 4 (assign UX → dashboard)
Phase 7:   DayColumn Decomposition                        ← 4.24 Phase 3
Phase 8:   Template Panel                                 ← 4.24 Phase 4
Phase 9:   Day Constructor                                ← 4.24 Phase 5
Phase 10:  WeekConstructor + QuickPlanBuilder              ← 4.24 Phase 6
Phase 11:  Data Entry UX                                   ← 4.24 Phase 7
Phase 12:  Animation + Dark Mode + Accessibility + Stubs   ← 4.24 Phase 8
Phase 13:  i18n + QA                                       ← 4.24 Phase 9 + 4.25 Phase 5 (merged)
```

> **Каizen принцип:** Backend fixes (dead code, SQL, SRP, validation) идут ПЕРЕД UI redesign. Это обеспечивает: (а) корректные данные в новых компонентах, (б) чистую кодовую базу для рефакторинга, (в) раннее обнаружение багов.

---

## Proposed Changes

---

### Phase 0 — Design Tokens + Quick Wins + Dead Code Cleanup (0.5d)

> Объединяет 4.24 Phase 0 + 4.25 Phase 0 (dead code + SQL injection)

#### [MODIFY] [tokens.css](file:///Users/bogdan/antigravity/skills%20master/tf/src/styles/tokens.css)
- `--safe-top/bottom` (PWA safe areas via `env()`)
- Score colors: `--color-score-low/mid/high`
- Chart palette: `--color-chart-1..6`
- Bottom sheet tokens: `--sheet-handle-width/height`, `--sheet-border-radius`
- `font-variant-numeric: tabular-nums` utility class
- `@media (prefers-reduced-motion: reduce)` global disable
- Athletic Pulse aliases: `--motion-pulse: var(--duration-normal)`, `--motion-flow: var(--duration-slow)`, `--motion-burst: 500ms`

#### DESIGN_SYSTEM.md sync:
- Section 1: add score colors + chart palette definitions
- Section 4: add BottomSheet component pattern + sheet tokens
- Section 6: add Athletic Pulse aliases mapping

#### Quick Wins:
- `inputMode="decimal"` on weight inputs
- Safe area bottom padding on BottomTabBar
- Category color bar on ExercisePicker cards
- `aria-label` audit on all icon-only buttons
- Skeleton shimmer improvements

#### [MODIFY] [planAssignments.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/planAssignments.ts)
- **DELETE** `duplicatePlan()` (L108-L152) — мёртвый код, `WeekConstructor` использует версию из `plans.ts`
- **DELETE** `createIndividualOverride()` (L154-L165) — не ставит `parent_plan_id`, делает override невидимым для resolution chain

#### [MODIFY] [logs.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/logs.ts)
- **SQL injection fix** L81-83: строковая интерполяция group IDs → `pb.filter()` с named параметрами

**Gate 0:** `pnpm type-check && pnpm build` → Exit 0

---

### Phase 1 — (нет отдельной фазы — объединена с Phase 0)

---

### Phase 2 — Plan Resolution SRP Refactor (0.5d)

> 4.25 Phase 1: Вынос plan resolution из logs.ts

#### [NEW] [planResolution.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/planResolution.ts)
Новый модуль — единственная точка ответственности за «какой план видит атлет сегодня»:
- `PLAN_EXPAND` const
- `todayISO()` → заменяется на `todayForUser()`
- `getActivePlan(planId)` — private
- `getPublishedOverrideForAthlete(athleteId)` — private
- `getPublishedPlanViaAssignments(athleteId)` — private
- `getPublishedPlanForToday(athleteId)` — public export

#### [MODIFY] [logs.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/logs.ts)
Re-export для backward compatibility:
```typescript
export { getPublishedPlanForToday } from './planResolution';
```

#### [MODIFY] AthleteDashboard.tsx, AthleteTrainingView.tsx, AthleteDetailClient.tsx
Update imports → `planResolution`

**Gate 2:** `pnpm type-check && pnpm build` → Exit 0

---

### Phase 3 — Resolution Logic Fixes (1d)

> 4.25 Phase 2: Фиксы критических багов в plan resolution

#### [MODIFY] [planResolution.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/planResolution.ts)

**Fix 1: Override scoping (Step 0)** — добавить `phase_id.start_date <= today && phase_id.end_date >= today` (override из прошлого сезона не перекроет текущий план)

**Fix 2: Week number в Step 3** — вычислять `currentWeek` от `phase.start_date`, фильтровать по `week_number`. Fallback: последний published план фазы.

#### [NEW] [dateHelpers.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/utils/dateHelpers.ts) → дополнить
`todayForUser(timezone?: string): string` — YYYY-MM-DD в timezone пользователя. `en-CA` locale.

**Gate 3:** `pnpm type-check && pnpm build` → Exit 0

---

### Phase 4 — Assignment Validation & Lifecycle (0.5d)

> 4.25 Phase 3: Guards + auto-deactivate

#### [MODIFY] [planAssignments.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/planAssignments.ts)
- Guard: `plan.status === 'published'` перед `assignPlanToAthlete()` и `assignPlanToGroup()`

#### [MODIFY] [plans.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/plans.ts)
- `publishPlan()`: auto-deactivate assignments от предыдущих планов той же фазы

**Gate 4:** `pnpm type-check && pnpm build` → Exit 0

---

### Phase 5 — Role-Based Navigation + BottomSheet (1.5d)

> 4.24 Phase 1 (без изменений)

- BottomTabBar: `useAuth()` → `ATHLETE_TABS` / `COACH_TABS`
- MoreMenu page: Settings, Reference, Exercises, Notifications + stubs
- `BottomSheet.tsx` shared component (hook `useBottomSheet()`, Portal `portal-root` — add `<div id="portal-root">` to `layout.tsx`)
  - **Perf:** `next/dynamic(() => import('./BottomSheet'), { ssr: false })` — drag/snap logic heavy, load on demand
- Review tab badge count
- Routing: role-specific routes
- i18n × 3

**Gate 5:** `pnpm type-check && pnpm build` → Exit 0. Browser: coach 4 tabs ≠ athlete 4 tabs.

---

### Phase 6 — Today View + Coach Dashboard + Assign UX (3d)

> Объединяет 4.24 Phase 2 + 4.25 Phase 4

**Data source helpers (prep):**
- `getWeeklyVolumeDelta(athleteId, weekStart)` — compare `listWeekLogs` current vs prev week → sets count delta
- `getTeamReadinessAlerts(coachId)` — batch `getTodayCheckin` for all coach's athletes → filter readiness <40
- ℹ️ Existing: `getCurrentPRs()`, `computeStreak()`, `calculateWeeklyCNS()`, `calculateWeeklyCompliance()`, `listWeekLogs()`

**Athlete Today View:**
- `ScoreCard` (`accent` glass), `TodayWorkoutCard` (`medium` glass), `StatsStrip` (`subtle` glass), `WeeklyHeatmap` (flat) — **данные из исправленного `getPublishedPlanForToday()`**
- `RecentNotifications.tsx` — last 2-3 unread notifications inline on Today View
- `usePullToRefresh(onRefresh)` hook — CSS transform pull + SWR `mutate()`. Consumers: AthleteDashboard, CoachDashboard

**Coach Dashboard:**
- `TeamAlerts` (`accent` glass), `TrainingToday`, `PendingReviews` (`subtle`), `WeekSummaryBar`
- `AthleteCard` visual polish (WHOOP-style)

**Assign UX (из 4.25):**

#### [MODIFY] [SeasonDetail.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/SeasonDetail.tsx)
- PhaseCard: показать список активных assignments (badge: «Assigned to: Group A, Athlete B»)
- Кнопка Unassign для каждого активного assignment
- Duplicate check при assign
- Plan name preview: «Assigning: Week N»

> **⚡ Kaizen insight:** Assign UX делается одновременно с Coach Dashboard — единый стиль карточек и badges. SeasonDetail модифицируется один раз, а не два.

**UI States:** loading skeleton, error + retry, empty state CTA — per component
**`<DashboardErrorBoundary>`**: wrapping each dashboard section to isolate failures
**i18n × 3** включая assign/unassign labels

**Gate 6:** `pnpm type-check && pnpm build` → Exit 0. Browser: athlete Today View + coach Dashboard show real data, assign/unassign works.

---

### Phase 7 — DayColumn Decomposition (1d)

> 4.24 Phase 3 (без изменений — pure refactor)

- Extract → `cards/WarmupCard.tsx`, `ExerciseCard.tsx`, `AdHocWarmupStep.tsx`
- Remove: WarmupTemplatePicker, TrainingTemplatePicker, SaveAsDayTemplateBtn → Template Panel (Phase 8)
- DayColumn.tsx: 780 → ≤200 LOC

**Gate 7:** `pnpm type-check && pnpm build && pnpm test` → Exit 0. Behavior unchanged.

---

### Phase 8 — Template Panel (1.5d)

> 4.24 Phase 4 (без изменений)

- Container/presenter split
- Tabs: System 🏷 | My Templates ✏️
- Filters, actions, save
- Mobile: BottomSheet | Desktop: sidebar
- i18n × 3

**Gate 8:** `pnpm type-check && pnpm build` → Exit 0.

---

### Phase 9 — Day Constructor (2d)

> 4.24 Phase 5. Plain decomposition per `UX_IMPROVEMENT_PLAN.md` — NO compound pattern

- Plain decomposition: DayHeader.tsx, ExerciseRow.tsx (rename from ExerciseCard), DayActions.tsx + container DayConstructor.tsx (~200 LOC)
- Controlled: props from WeekConstructor, no DayConstructor Context
- Adaptive layout, @dnd-kit (single DndContext per day, no nested providers), CNS, template trigger
- Lazy loading via `next/dynamic`
- **Perf:** `content-visibility: auto` + `contain-intrinsic-size: 0 120px` on ExerciseRow container

**Gate 9:** `pnpm type-check && pnpm build` → Exit 0.

---

### Phase 10 — WeekConstructor Refactor + QuickWorkout (1.5d)

> 4.24 Phase 6 — **усилен** фиксом из 4.25

- Toolbar: 4 items + More menu
- DayColumn → compact summary, click → DayConstructor
- Phase guidelines → collapsible banner
- **Extract `WeekStrip.tsx`** (~100 LOC, 7-day horizontal strip) + **`WeekSummary.tsx`** (~60 LOC, CNS/compliance). WeekConstructor: 792 → ~450 LOC
- **QuickPlanBuilder → rename `QuickWorkout`**: 2 entry points (FAB on Today View + More menu), keep localStorage, PB migration → Track 6
- `pb.authStore.model` → `.record` fix
- **publishPlan() теперь auto-deactivates** (Phase 4) — toolbar Publish кнопка уже использует исправленную версию

**Gate 10:** `pnpm type-check && pnpm build` → Exit 0.

---

### Phase 11 — Data Entry UX (2d)

> 4.24 Phase 7 (без изменений)

- SetLogger shared component (`mode: 'plan'|'log'`)
- ± stepper, RPE slider, auto-fill
- ~~Sparkline~~ → text "Last 3: 75×5  80×5  80×4" (per UX wireframe, YAGNI sparkline → Track 6)
- Rest timer: 30/60/90/120s visual only
- ExerciseItem extraction
- Completion pulse animation

**Gate 11:** `pnpm type-check && pnpm build` → Exit 0.

---

### Phase 12 — Animation System + Dark Mode + Accessibility + Stubs (1.5d)

> 4.24 Phase 8 (без изменений)

- "Athletic Pulse": 12 animations (6 Pulse + 4 Flow + 2 Burst). Tokens = aliases to DS: `--motion-pulse: var(--duration-normal)`, `--motion-flow: var(--duration-slow)`, `--motion-burst: 500ms`. ~~3 Burst deferred → Track 6~~ (streak milestone, confetti-dots, 100% compliance)
- Dark mode: softer + glow + OLED auto
- Font scale + contrast audit
- Feature stubs

**Gate 12:** `pnpm type-check && pnpm build` → Exit 0.

---

### Phase 13 — i18n + QA (Unified) (1.5d)

> Объединяет 4.24 Phase 9 + 4.25 Phase 5

**i18n:**
- All new keys × 3 locale (ru, en, cn) — **включая assign/unassign/planResolution i18n из 4.25**
- Chinese text overflow check

**Browser Smoke Tests (13):**
1. Coach login → 4 role-specific tabs
2. Athlete login → 4 role-specific tabs
3. Athlete Today View: ScoreCard + TodayWorkout + WeeklyHeatmap
4. Coach Dashboard: TeamAlerts + PendingReviews + AthleteCard badges
5. Coach: Week → click day → Day Constructor sidebar (desktop)
6. Day Constructor: add exercise, reorder, edit sets/reps, save
7. Template Panel: filter, apply, save as template
8. Exercise logging: stepper, RPE slider, auto-fill, rest timer
9. Mobile 375px: navigation, fullscreen DayConstructor, bottom sheets
10. Dark mode: all new components correct
11. **Plan resolution: создать план → publish → assign группе → войти как атлет → увидеть правильный план**
12. **Override: создать override → verify Step 0 > Step 2 → verify старые overrides не отображаются**
13. **Assign UX: видны assignments на PhaseCard, unassign работает, publish auto-deactivates старые**

**Final:**
- `pnpm test` → all pass
- `pnpm build` → Exit 0
- CHANGELOG.md updated

**Gate 13 (Track Complete):** All 13 smoke tests pass. Build clean.

---

## User Review Required

> [!IMPORTANT]
> **Объединение 4.25 → 4.24 меняет оценку:** 15-16d → 17-20d (+2-4 дня на backend-фазы 0-4)

> [!IMPORTANT]
> **tracks.md потребует обновления:** удалить строку 4.25, обновить 4.24 title → «Unified UX System Redesign & Plan Resolution»

### Решения требующие подтверждения:

1. **Порядок фаз** — backend-first стратегия (fix resolution → fix assignments → затем UI). Альтернатива: UI-first, потом backend. **Рекомендация:** backend-first (Kaizen: корректные данные перед визуализацией).

2. **Phase 6 merge** — assign UX из 4.25 делается вместе с Coach Dashboard (один стиль badge). Альтернатива: отдельная мини-фаза. **Рекомендация:** merge (один проход по SeasonDetail.tsx).

3. ~~Unit tests в Phase 3~~ — **Скип.** Manual verification через smoke tests в Phase 13.

---

## Cross-Track Analysis

| Track | Overlap | Conflict |
|-------|---------|----------|
| **4.22** (Invite & Groups) | 0 files — groups page inline rendering | ✅ None |
| **4.23** (Notifications) | NotificationBell badge done in 4.23. SQL injection в `planAssignments.ts` + `plans.ts` уже исправлен в 4.23, наш scope — только `logs.ts` | ✅ Resolved |
| **4.21** (Specialization) | OnboardingWizard not touched | ✅ None |

---

## Verification Plan

### Automated Tests

```bash
pnpm type-check    # TypeScript compilation — after each phase
pnpm build         # Static export — after each phase
pnpm test          # Unit tests (existing) — phases 7, 13
```

### New Tests:
Нет — plan resolution верифицируется через smoke tests (tests 11-13).

### Browser Smoke Tests (Phase 13):
13 тестов (см. Phase 13 выше) — выполняются через `browser_subagent`

### Manual Verification (Phase 13):
- Coach: создать планы Week 1-4 → publish Week 2 → assign группе → войти как athlete → видеть Week 2
- Coach: создать override для одного атлета → athlete видит override, другие — групповой план
- Coach: publish новый план → старые assignments автоматически деактивированы
- Assign UX: PhaseCard показывает "Assigned to: Group Demo", кнопка Unassign работает

---

## Audit Log (Brainstorming Skill)

| # | Решение | Альтернатива | Причина выбора |
|---|---------|-------------|----------------|
| 1 | Backend-first ordering | UI-first | Kaizen: корректные данные перед визуализацией. Исправленный `getPublishedPlanForToday` нужен Today View |
| 2 | Merge assign UX + Coach Dashboard | Separate phases | SeasonDetail.tsx модифицируется один раз. Единый стиль badges. Poka-Yoke |
| 3 | Dead code → Phase 0 | Separate track | Kaizen JIT: убрать мёртвый код до начала любого рефакторинга |
| 4 | planResolution.ts SRP extract | Keep in logs.ts | Clean code SRP + 4.24 DayColumn decomposition уже следует этому принципу |
| 5 | todayForUser() timezone helper | Keep UTC | China access (UTC+8). Утром в Китае UTC показывает вчера |
| 6 | ~~Unit tests~~ → skip | Manual via smoke tests | User decision — verify через browser smoke tests 11-13 |
| 7 | 12+1 smoke tests (vs 10) | Keep 10 | +3 теста стоят ~15 мин, покрывают critical plan resolution |
