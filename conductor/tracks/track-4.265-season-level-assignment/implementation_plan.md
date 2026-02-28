# Implementation Plan — Track 4.265: Season-Level Assignment & Warmup Fixes

> Упрощение назначения планов с N×M до 1×1 через Season-Level Assignment + починка warmup flow.

---

## Phase 1: Critical Bug Fix — publishPlan deactivation scope

### Проблема

`publishPlan()` в [plans.ts:269-289](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/plans.ts#L269-L289) деактивирует назначения **ВСЕХ** планов в фазе кроме текущего. Если тренер переопубликовывает план недели 3—назначения недель 1, 2, 4... деактивируются.

### Изменения

#### [MODIFY] [plans.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/plans.ts)

Строки 273-285. Заменить:

```diff
- const siblingPlans = await pb.collection(Collections.TRAINING_PLANS).getFullList({
-     filter: pb.filter(
-         'phase_id = {:phaseId} && id != {:planId} && deleted_at = ""',
-         { phaseId: published.phase_id, planId }
-     ),
-     fields: 'id',
- });
+ // Only deactivate assignments from plans with SAME week_number (not all siblings)
+ const siblingPlans = await pb.collection(Collections.TRAINING_PLANS).getFullList({
+     filter: pb.filter(
+         'phase_id = {:phaseId} && id != {:planId} && week_number = {:weekNumber} && deleted_at = "" && plan_type != "override"',
+         { phaseId: published.phase_id, planId, weekNumber: published.week_number }
+     ),
+     fields: 'id',
+ });
```

Также добавить guard перед блоком:

```diff
+ // Skip deactivation for override plans (they're personal, not conflicting)
+ if (published.plan_type === 'override') return published;
```

#### [NEW] [publishPlan.test.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/__tests__/publishPlan.test.ts)

Unit-тест с мокнутым PocketBase:

- Тест 1: Публикация плана week 3 → деактивирует только планы week 3, не трогает week 1,2,4
- Тест 2: Публикация override плана → не деактивирует ничего
- Тест 3: Двойная публикация → идемпотентно (нет ошибок)

---

## Phase 2: Publish-All for Phase

### Изменения

#### [MODIFY] [plans.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/plans.ts)

Добавить функцию:

```typescript
/**
 * Publish all draft plans in a phase.
 * Returns array of published plan IDs.
 */
export async function publishAllDrafts(phaseId: string): Promise<string[]> {
    const drafts = await pb.collection(Collections.TRAINING_PLANS).getFullList({
        filter: pb.filter(
            'phase_id = {:phaseId} && status = "draft" && deleted_at = ""',
            { phaseId }
        ),
        sort: 'week_number',
    });
    const published: string[] = [];
    // Sequential to avoid SQLite lock issues
    for (const draft of drafts) {
        await publishPlan(draft.id);
        published.push(draft.id);
    }
    return published;
}
```

#### [MODIFY] [SeasonDetail.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/SeasonDetail.tsx)

В PhaseCard добавить кнопку "Publish All Drafts":

```
┌─────────────────────────────────────────────────┐
│  GPP Phase 1   Nov 1 – Dec 15                   │
│  Focus: General preparation                      │
│  ● ● ● ○ ○ ○   Manage Plans   📤 Publish 3      │
│                                 ↑ ghost button    │
│  [Assign status: Group A — 3/6 published]        │
└─────────────────────────────────────────────────┘
```

**UI спецификация:**

- Кнопка: ghost variant, `Send` icon (Lucide), `var(--color-success)` text
- Показывать только если есть draft планы
- Counter: число черновиков в бейдже
- Confirm dialog: `window.confirm()` с описанием действия
- После публикации: toast + обновить weekStatusMap

---

## Phase 3: Auto-Assignment on Publish (Smart Publish)

### Изменения

#### [MODIFY] [plans.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/plans.ts)

Добавить блок после step 3 (status → published), перед step 3.5:

```typescript
// Step 3.1: Auto-assign to season participants
void (async () => {
    try {
        if (!published.phase_id) return;
        const phase = await pb.collection(Collections.TRAINING_PHASES).getOne(published.phase_id);
        if (!phase.season_id) return;
        const season = await pb.collection(Collections.SEASONS).getOne(phase.season_id);
        
        const { assignPlanToAthlete, assignPlanToGroup } = await import('./planAssignments');
        
        // Direct athlete season → auto-assign
        if (season.athlete_id) {
            await assignPlanToAthlete(published.id, season.athlete_id as string);
        }
        
        // Group season → auto-assign to group
        if (season.group_id) {
            await assignPlanToGroup(published.id, season.group_id as string);
        }
    } catch (autoErr) {
        console.warn('Auto-assignment failed (non-blocking):', autoErr);
    }
})();
```

> **Idempotency:** `assignPlanToAthlete` и `assignPlanToGroup` уже проверяют existing assignments (reactivate if inactive). Безопасно вызывать повторно.

#### [NEW] [autoAssignment.test.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/__tests__/autoAssignment.test.ts)

- Тест: publish → season с group_id → assignment создан
- Тест: publish → season без group_id/athlete_id → нет assignment
- Тест: publish повторно → нет дубли (idempotent)

---

## Phase 4: Season Participants Panel

### Дизайн (Desktop ≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│  Season: Indoor 2026                                       │
│  Nov 2025 – Mar 2026                                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  👥 Participants                                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Group: Juniors (5 athletes)              [Change]   │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │  │
│  │  │ A.S │ │ M.K │ │ D.R │ │ P.V │ │ I.T │          │  │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘          │  │
│  │                                                      │  │
│  │  📊 Assignment Status:                               │  │
│  │  GPP:  ████████░░ 6/8 published, all auto-assigned   │  │
│  │  SPP:  ████░░░░░░ 3/6 published, all auto-assigned   │  │
│  │  COMP: ░░░░░░░░░░ 0/4 published                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  📊 Phases                                                 │
│  [PhaseCard GPP] [PhaseCard SPP] [PhaseCard COMP]          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Дизайн (Mobile 375px)

```
┌──────────────────────────┐
│ Season: Indoor 2026      │
│ Nov 25 – Mar 26          │
├──────────────────────────┤
│ 👥 Juniors (5) ▾         │ ← collapsible
│   A.S · M.K · D.R ···   │
│   GPP: 6/8 ████████░░   │
│   SPP: 3/6 ████░░░░░░   │
├──────────────────────────┤
│ [PhaseCard GPP]          │
│ [PhaseCard SPP]          │
└──────────────────────────┘
```

### Изменения

#### [NEW] [SeasonParticipants.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/SeasonParticipants.tsx)

Новый компонент:

- Props: `season: SeasonWithRelations`, `phases: PhaseRecord[]`
- Показывает привязанного атлета или группу
- Прогрессбар назначений по фазам
- Кнопка [Change] → dropdown для смены группы/атлета

#### [NEW] [SeasonParticipants.module.css](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/SeasonParticipants.module.css)

Полностью на design tokens:

- `.container`: glass-card surface, `var(--radius-lg)`, `var(--shadow-md)`
- `.avatarGrid`: flex-wrap, `gap: var(--space-2)`
- `.avatar`: 40×40px, `border-radius: var(--radius-full)`, initial-based
- `.progressBar`: `height: 6px`, `var(--color-success)` fill, `var(--color-bg-tertiary)` track
- `.collapsible`: на mobile — `max-height` transition, toggle по тапу на header

#### [MODIFY] [SeasonDetail.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/SeasonDetail.tsx)

- Импортировать `SeasonParticipants`, рендерить перед списком фаз
- Убрать assign panel из PhaseCard (заменить на read-only status)
- Извлечь оставшуюся assign-логику в `usePhaseAssignment` hook

---

## Phase 5: Warmup Pre-Assignment & Warmup UX Fixes

### Текущая система warmup — полная карта

Warmup состоит из 4 точек входа, **все только per-day внутри WeekConstructor:**

| # | Компонент | Что делает | Входная точка |
|---|-----------|-----------|---------------|
| 1 | **TemplatePanel** | Браузер пресетов: `System` / `My` tabs, фильтр (`all`/`warmup`/`training_day`). Apply → `stampTemplate()` — заменяет warmup блок day+session | DayActions → кнопка `LayoutTemplate` |
| 2 | **AdHocWarmupStepBtn** | Inline-форма: text field + duration. Создаёт 1 ad-hoc item через `addWarmupItem()` | DayConstructor → warmup секция → `+ Add step` |
| 3 | **Save as Template** | Сохраняет day+session как шаблон через `createTemplateFromPlanDay()` | DayActions → кнопка `Copy` |
| 4 | **Eject** | Удаляет весь warmup блок через `ejectTemplate()` | DayConstructor → warmup header → `X` |

**Backend:** `stampTemplate`, `appendTemplate`, `addWarmupItem`, `ejectTemplate`, `createTemplateFromPlanDay`

### 5 проблем

1. **Нет batch warmup** — 7× open TemplatePanel чтобы наложить warmup на все дни
2. **Нет phase-level default** — при создании нового плана warmup не проставляется
3. **AdHocWarmupStepBtn** — ТОЛЬКО custom text, нет выбора из каталога упражнений
4. **Touch targets:** WarmupCard `Wind 10px` / `Trash2 11px`, DayConstructor eject `X 12px`, AdHoc buttons `12px`
5. **TemplatePanel** доступен только из DayActions внутри дня — нет на уровне фазы/недели

### Решение: 3 уровня удобства

```
Level 1: PHASE DEFAULT (однократно, PhaseCard)
┌─ GPP Phase ──────────────────────────────────────────┐
│  Default Warmup: [🌬️ Standard GPP Warmup  ▾]        │
│  → новые планы авто-получают этот warmup              │
└──────────────────────────────────────────────────────┘

Level 2: WEEK BATCH (WeekConstructor toolbar)
┌─ Week 3 toolbar ──────────────────────────────────────┐
│  [📋 Templates] [🌬️ Apply Warmup to All Days]         │
│  → открывает TemplatePanel (filtered: warmup only)     │
│  → stampWarmupToAllDays()                              │
└────────────────────────────────────────────────────────┘

Level 3: PER-DAY (существующий — улучшить UX)
┌─ Monday warmup block ─────────────────────────────────┐
│  🌬️ Warmup Block                              [×]     │
│  ┌ Jog 5 min ──────────────────── 300s ── [🗑] ┐     │
│  ├ Dynamic stretches ──────────── 180s ── [🗑] ┤     │
│  └ High knees ─────────────────── 60s ─── [🗑] ┘     │
│                                                        │
│  [+ Text step]  [📚 From catalog]  ← NEW: catalog btn │
│  ─────────────────────────────────────────────────────│
│  ⚡ Main Block                                         │
└────────────────────────────────────────────────────────┘
```

### Изменения

#### [MODIFY] [AdHocWarmupStepBtn](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/cards/AdHocWarmupStep.tsx)

**Проблема:** сейчас позволяет ввести ТОЛЬКО custom text. Нет возможности выбрать упражнение из каталога.

Добавить второй режим рядом — кнопка "From catalog":

```diff
// Сейчас: [+ Add step]  → inline text form (custom_text + duration)
// После:  [+ Text step] → inline text form (как сейчас)
//         [📚 Catalog]  → opens ExerciseCatalog mini-picker → addWarmupItem({exercise_id})
```

Расширить `AdHocWarmupData` в `types.ts`:

```diff
 export interface AdHocWarmupData {
+    exercise_id?: string;      // из каталога
     custom_text_ru?: string;
     custom_text_en?: string;
     custom_text_cn?: string;
     duration_seconds?: number;
 }
```

#### [MODIFY] [WarmupCard.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/cards/WarmupCard.tsx)

Fix touch targets:

```diff
- <Wind size={10} />  →  <Wind size={16} />
- <Trash2 size={11} /> → <Trash2 size={16} />
+ remove button: min-width: 44px; min-height: 44px
```

#### [MODIFY] [DayConstructor.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/DayConstructor.tsx)

Fix warmup section icons & eject button:

```diff
- <Wind size={12} /> → <Wind size={16} />
- eject <X size={12} /> → <X size={16} /> + min 44×44 touch target
```

#### [MODIFY] [AthleteTrainingView.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/AthleteTrainingView.tsx)

```diff
- WarmupItem: <Wind size={10} /> → <Wind size={16} />
- WarmupBadge: <Wind size={13} /> → <Wind size={16} />
```

#### [NEW] `stampWarmupToAllDays()` in [templates.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/templates.ts)

Batch warmup для всех дней плана (sequential for SQLite safety).

#### [MODIFY] [WeekConstructor.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/WeekConstructor.tsx)

Добавить toolbar button "Apply Warmup All Days" → opens TemplatePanel (filtered warmup) → `stampWarmupToAllDays()`

---

## Phase 6: UI/UX Polish & Design Compliance

### Week Status Map → clickable navigation

В PhaseCard weekStatusMap — каждая точка получает `onClick={() => onManagePlans(weekNumber)}`. Модифицировать `handleManagePlans` чтобы принимал `weekNumber` param:

```typescript
const handleManagePlans = (weekNumber?: number) => {
    setManagingPhase(phase);
    if (weekNumber) setInitialWeekNumber(weekNumber);
};
```

### Duplicate Week

В WeekConstructor toolbar, рядом с week navigation:

```
← Week 3/8 → [📋 Copy prev]
```

Кнопка `Copy prev`:

- Disabled на week 1
- Копирует все exercises из previous week в текущую
- Confirm dialog: "Copy 12 exercises from Week 2?"
- Uses: `listPlanExercises(prevPlanId)` → `addExerciseToPlan()` for each

### CSS Audit

Проверить `SeasonDetail.module.css` на:

- Hardcoded hex → `var(--color-*)`
- Hardcoded px не из scale → `var(--space-*)`
- Missing dark mode adaptation
- Touch targets < 44px

---

## Verification Plan

### Automated Tests

```bash
# Run after Phase 1
pnpm test -- publishPlan

# Run after Phase 3
pnpm test -- autoAssignment

# Full suite
pnpm test

# Type check
pnpm type-check

# Build
pnpm build

# Lint
pnpm lint
```

### Browser Smoke Tests (Phase 7)

**Test 1: Publish + Auto-assign flow**

1. Open <https://jumpedia.app> → Login as coach
2. Navigate to Training → Open a season with a group
3. Open a phase → create or find a draft plan
4. Publish the plan
5. ✅ Verify: plan status changes to "published" in Weekly Status Map
6. ✅ Verify: assignment status shows "assigned to [Group Name]"
7. Login as athlete in that group → verify plan is visible in Training view

**Test 2: Publish All**

1. Login as coach → open season → open phase with 2+ draft plans
2. Click "Publish All Drafts" button
3. ✅ Confirm dialog appears
4. ✅ All dots change from draft (orange) to published (green)
5. ✅ Assignment status updates

**Test 3: Warmup template assignment**

1. Login as coach → open season → open phase
2. Select warmup template from dropdown
3. Open WeekConstructor → create new plan
4. ✅ Warmup block pre-filled with template items
5. ✅ Can eject and replace manually

**Test 4: Mobile (375px)**

1. Open dev tools → set viewport to 375px
2. Navigate through all new UI elements
3. ✅ No horizontal scroll
4. ✅ All buttons/inputs ≥ 44px touch target
5. ✅ Collapsible panels work (Participants, warmup)

### Manual Verification (ask user)

- Coach workflow: create season → add phases → publish → verify athlete sees plan
- Dark mode visual check for all new components
- Chinese locale test for overflow
