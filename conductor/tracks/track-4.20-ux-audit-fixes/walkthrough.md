# Track 4.20: UX Audit & Coach-Athlete Fixes — Walkthrough

> **Status:** ✅ Done | **Duration:** ~24 часа | **Phases:** 7 (1-6 + 4.5)
> **Agents:** [G3H] planning, [CS] deep audit analysis, [G1H] execution (phases 1-6)
> **Skills used:** `database-architect`, `architect-review`, `error-handling-patterns`, `verification-before-completion`, `concise-planning`, `lint-and-validate`

---

## Phase 1: Quick Wins + Security

### SQL Injection Fix
- **9 инстансов** raw string interpolation в `logs.ts` → мигрированы на `pb.filter()` с параметрами
- Pattern: `filter: \`athlete_id = "${id}"\`` → `filter: pb.filter('athlete_id = {:aid}', { aid })`

### ConfirmDialog Component
- Новый reusable glassmorphism dialog (`ConfirmDialog.tsx` + `.module.css`)
- Danger variant, Escape key, click-outside, 44×44px touch targets
- Заменил все `window.confirm()` / `alert()` в проекте

### Season Delete
- Trash2 icon на карточке сезона в `training/page.tsx`
- Optimistic removal + rollback on error

### PocketBase Hardening
- `training_phases` API rules: coach-only create/update/delete

### i18n: +9 keys ×3 locales

---

## Phase 2: Athlete Dashboard + Season Visibility

### Today's Plan (FIX G1)
- `AthleteDashboard.tsx` → вызов `getPublishedPlanForToday()` вместо placeholder
- Athlete видит реальные упражнения дня

### Season Visibility (FIX G6)
- `AthleteSeasonsList.tsx` — read-only seasons для атлетов
- `listSeasonsForAthlete(athleteId)` — фильтр по athlete membership

### Assign UX Fix
- `SeasonDetail.tsx` — radio Group|Athlete + dropdown (не text input!)
- Populated from `listMyGroups()` + `listMyAthletes()`

### i18n: +7 keys ×3 locales

---

## Phase 3: Override + Plan Resolution

### 4-Step Plan Resolution
`getPublishedPlanForToday()` теперь:
1. Step 0: Individual override (`parent_plan_id != "" && athlete_id = X`)
2. Step 1: Direct plan_assignment
3. Step 2: Group membership
4. Step 3: Season fallback (`parent_plan_id = ""`)

### Override CRUD
- `createIndividualOverride(planId, athleteId)` — sequential copy (SQLite safety)
- Guard: no override-from-override chains
- Override badge в PhaseCard (`countOverridesForPhase()`)

### WeekConstructor Override Button
- UserCog icon → modal с athlete dropdown
- Active only when `isPublished = true`

### i18n: +6 keys ×3 locales

---

## Phase 4: Workout + Templates Hybrid UX

### Architecture: Variant C (Hybrid)
- CRUD остаётся в Reference → Templates
- Quick-access picker добавлен в Training

### DayColumn Toolbar
- `TrainingTemplatePicker` — dropdown шаблонов `training_day`
- `SaveAsDayTemplateBtn` — Bookmark → inline input (no `window.prompt()`)
- `.mainToolbar` flex row per session

### QuickPlanBuilder
- «Save to Library» → lazy PB import + chunked batch (5 items, SQLite safety)

### templates.ts
- `appendTemplate()` — append-only sequential inserts
- `createTemplateFromPlanDay()` — chunked batch по 5

### i18n: +6 keys ×3 locales

---

## Phase 4.5: Warmup Page Migration

- Удалён hard-coded `PROTOCOLS` массив
- `listTemplates('warmup')` из PocketBase
- 3 состояния UI: skeleton loading → error+Retry → protocol cards
- `getLocalizedText()` helper для locale-aware fallback

---

## Phase 5: Bidirectional Communication

### Athlete → Coach
- `AthleteTrainingView.tsx` → per-day notes textarea с debounced auto-save (500ms)
- Skip reason quick-select: Equipment | Pain | Time | CoachDecision | Other
- PB field: `log_exercises.skip_reason` (text, max 255)

### Coach ← Athlete
- `CoachLogViewer.tsx` → отображает `training_logs.notes` + `log_exercises.skip_reason`

### Readiness Integration
- Adaptation banner когда readiness < 60
- `getLatestReadinessForGroup()` (Promise.all per athlete)
- Readiness mini-badges в `WeekConstructor.tsx`

### i18n: +8 keys ×3 locales

---

## Phase 6: Stability

### Error Utilities
- `src/lib/utils/errors.ts`: `logError()` (fire-and-forget telemetry) + `getErrorMessage()` (PocketBase-aware)
- 8 unit tests

### Catch Block Audit (~82 blocks, ~40 files)

| Слой | Файлов | Catch-блоков | Стратегия |
|---|---|---|---|
| Services | 10 | 19 | `/* expected: ... */` / `/* non-critical: ... */` |
| Pages | 11 | 28 | `logError()` + UI error state |
| Components | 13 | 22 | `logError()` / `/* non-critical: ... */` |
| Hooks | 3 | 6 | `/* expected/non-critical */` |
| Theme + SW + Layout | 3 | 3 | comments |

**Результат:** 0 bare `} catch {}` в кодовой базе.

### PB Index Optimization
- Skills: `database-architect`, `architect-review`, `verification-before-completion`
- Анализ 3 вариантов → **Вариант B** (составной index)
- `idx_plan_ex_plan(plan_id)` → `idx_planex_plan_deleted(plan_id, deleted_at)`
- Leftmost prefix гарантирует backward compat

---

## Verification

### Build & Tests

| Проверка | Результат |
|---|---|
| `pnpm type-check` | ✅ Exit 0 |
| `pnpm build` | ✅ Exit 0 |
| `pnpm test` | ✅ 35/35 |
| `pnpm lint` | ✅ |
| PB `view_collection` indexes | ✅ 2 индекса |
| Bare `} catch {}` grep | ✅ 0 matches |

### QA Smoke Test (browser_subagent)

**Coach flow** (`demo.coach@jumpedia.app`):
- ✅ Login → redirect to dashboard
- ✅ Dashboard: 3 атлета, readiness badges (71%, 83%), avg 77%
- ✅ Training: сезон «Конец февраля», trash icon, фазы (ОФП, Предсор, Сорев)
- ✅ Settings: Волков Игорь Сергеевич, correct email
- ✅ Warmup: 3 протокола из PocketBase (не hard-coded)

**Athlete flow** (`demo.athlete1@jumpedia.app`):
- ✅ Logout → Login → redirect to athlete dashboard
- ✅ Dashboard: Кириллов Андрей, чек-ин 71%, streak 29/30, «Чек-ин заполнен ✓»
- ✅ Training: «Приседание со штангой» + notes textarea + «Мои сезоны» (Конец февраля)
- ✅ Settings: Кириллов Андрей, demo.athlete1@jumpedia.app (email подтверждён)

### Minor Finding
- Settings (athlete): stray «0» между полями Имя и Email — косметический, не блокирующий.

---

## Summary of Changes

### Files Modified: ~60+
### PocketBase Changes: 3
1. `training_phases` — API rules hardened
2. `log_exercises` — `skip_reason` field added
3. `plan_exercises` — composite index `(plan_id, deleted_at)`

### New Components: 4
- `ConfirmDialog.tsx`
- `AthleteSeasonsList.tsx`
- `TrainingTemplatePicker` (inline in DayColumn)
- `SaveAsDayTemplateBtn` (inline in DayColumn)

### New Services: 8 functions
- `createIndividualOverride()`, `listOverridesForPlan()`, `countOverridesForPhase()`
- `appendTemplate()`, `createTemplateFromPlanDay()`
- `getLatestReadinessForGroup()`, `listSeasonsForAthlete()`, `getMyGroupIds()`

### New Utility: 1
- `src/lib/utils/errors.ts` — `logError()` + `getErrorMessage()`

### i18n: ~36 new keys ×3 locales (RU, EN, CN)
