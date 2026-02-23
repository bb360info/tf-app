# Implementation Plan: Track 4.20 — UX Audit & Coach-Athlete Fixes (v3)

**Skills analysis:** `architect-review`, `brainstorming`, `context-driven-development`, `plan-writing`, `error-handling-patterns`, `database-architect`
**Review:** Deep audit `[CS]` v2 + Technical review `[G3H]` — 5 corrections applied (PB syntax, React lifecycle, SQLite safety, PB GROUP BY, catch strategy)

---

## Скиллы на каждую фазу

| Фаза | `/auto-skills` groups | Specific skills |
|---|---|---|
| 1: Quick Wins + Security | `always` + `architecture` | `database-architect`, `error-handling-patterns` |
| 2: Athlete Visibility | `always` + `frontend` + `typescript` | `react-best-practices`, `typescript-expert` |
| 3: Override + Resolution | `always` + `architecture` + `frontend` | `architect-review`, `react-best-practices` |
| 4: Workout + Templates Hybrid | `always` + `frontend` + `ui_design` | `/ui-work` workflow, `jumpedia-design-system` |
| 4.5: Warmup Page Migration | `always` + `frontend` | `react-best-practices` |
| 5: Bidirectional Comms | `always` + `frontend` + `architecture` | `/ui-work` workflow, `database-architect` |
| 6: Stability | `always` + `debugging` | `error-handling-patterns`, `systematic-debugging` |

---

## Phase 1: Quick Wins + Security (~2-3 часа)

**Skills:** `always` + `architecture` + `error-handling-patterns`

### 1.1 SQL Injection fix в logs.ts

> [!CAUTION]
> `getPublishedPlanForToday()` uses raw string interpolation — SQL injection vector.
> Same bug was fixed in `notifications.ts` in Track 4.16.

#### [MODIFY] [logs.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/logs.ts#L37-L67)

**Текущее L43-55:** Raw string interpolation:
```typescript
filter: `athlete_id = "${athleteId}" && start_date <= "${today}"...`
```
**Изменение:** Migrate ALL filters to `pb.filter()`:
```typescript
filter: pb.filter(
  'athlete_id = {:aid} && start_date <= {:today} && end_date >= {:today}',
  { aid: athleteId, today }
),
```

**Verify:** `grep -rn 'filter:.*\`' src/lib/pocketbase/services/logs.ts` → 0 results (no template literals in filters).

### 1.2 Кнопка удаления сезона

#### [MODIFY] [training/page.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/(protected)/training/page.tsx)

Добавить `Trash2` icon на season card → custom ConfirmDialog → `deleteSeason(id)`.

> [!IMPORTANT]
> НЕ использовать `confirm()` — нативный диалог не стилизуется и может быть заблокирован на iOS.
> Создать reusable `ConfirmDialog` компонент с glassmorphism.

#### [NEW] [ConfirmDialog.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/shared/ConfirmDialog.tsx)

```typescript
interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}
```

Glassmorphism overlay, Lucide AlertTriangle for danger variant, 44px touch targets.

**Verify:** Кнопка видна → клик → ConfirmDialog → сезон пропадает из списка.

### 1.3 Error handling в groups create + PhaseCard.handleAssign

#### [MODIFY] [groups/page.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/(protected)/settings/groups/page.tsx)

**Текущее L108:** `catch {}` — пустой блок.
**Изменение:**
```typescript
} catch (err) {
  setError(err instanceof Error ? err.message : t('errors.networkError'));
}
```

#### [MODIFY] [SeasonDetail.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/SeasonDetail.tsx#L367-L369)

**Текущее L367:** Silent catch in `handleAssign`.
**Изменение:** Show error toast/state:
```typescript
} catch (err) {
  alert(err instanceof Error ? err.message : 'Assignment failed');
}
```

**Verify:** Ошибка assign → сообщение отображается.

### 1.4 Ужесточить training_phases API rules

#### PocketBase Admin → `training_phases`

**Текущее:** `@request.auth.id != ""`
**Изменение:**
```
createRule: @request.auth.id != "" && season_id.coach_id = @request.auth.id
updateRule: @request.auth.id != "" && season_id.coach_id = @request.auth.id
deleteRule: @request.auth.id != "" && season_id.coach_id = @request.auth.id
listRule:   @request.auth.id != "" && (season_id.coach_id = @request.auth.id || season_id.athlete_id.user_id = @request.auth.id)
viewRule:   @request.auth.id != "" && (season_id.coach_id = @request.auth.id || season_id.athlete_id.user_id = @request.auth.id)
```

**Verify:** MCP `view_collection training_phases` → rules updated.

### 1.5 i18n: missing keys

#### [MODIFY] messages/{ru,en,cn}/common.json

Добавить:
- `training.deleteSeasonConfirm`, `training.seasonDeleted`
- `groups.createError`
- `training.skipReason`, `training.athleteNotes`
- `shared.confirm`, `shared.cancel` (для ConfirmDialog)

**Verify:** `pnpm type-check` + `pnpm build` → Exit 0.

---

## Phase 2: Athlete Dashboard + Season Visibility (~3-4 часа)

**Skills:** `always` + `frontend` + `typescript` + `/ui-work` workflow

### 2.1 FIX G1: Today's Plan (убрать заглушку)

#### [MODIFY] [AthleteDashboard.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/dashboard/AthleteDashboard.tsx)

**Текущее L232-243:** Статичная заглушка `<p>{t('noPublishedPlan')}</p>`.
**Изменение:**

```typescript
const [todayPlan, setTodayPlan] = useState<PlanWithExercises | null>(null);

// В loadCheckin:
const plan = await getPublishedPlanForToday(aid);
setTodayPlan(plan);

// JSX:
{todayPlan ? (
  <div className={styles.todayPlanContent}>
    <p className={styles.planSummary}>
      {todayExerciseCount} {t('todayExercises')}
    </p>
    <button onClick={() => router.push(`/${locale}/training`)}>
      {t('goToTraining')}
    </button>
  </div>
) : (
  <p className={styles.emptyPlan}>{t('noPublishedPlan')}</p>
)}
```

**Verify:** Атлет с published plan → Dashboard показывает количество упражнений + кнопку.

### 2.2 FIX G6: listSeasons() → передать athleteId

#### [MODIFY] [AthleteDashboard.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/dashboard/AthleteDashboard.tsx)

**Текущее L85:** `const seasons = await listSeasons();` — без athleteId.
**Изменение:** `const seasons = await listSeasons(aid);`

**Verify:** CompetitionCountdown visible for athlete with competitions.

### 2.3 Атлет видит сезоны на training page

#### [MODIFY] [training/page.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/(protected)/training/page.tsx#L79-L89)

Добавить `AthleteSeasonsList` (lazy-loaded, read-only карточки) ПОД `AthleteTrainingView`.

**Verify:** Атлет → Training → видит свои сезоны (read-only).

### 2.4 Assign к Group + Athlete (Fix broken UX)

#### [MODIFY] [SeasonDetail.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/SeasonDetail.tsx#L349-L432)

**Текущее:** Raw text input for groupId (UUID ввод вручную — неюзабельно).
**Изменение:** Полная переработка AssignPanel:

1. Radio toggle: `Group | Athlete`
2. **Dropdown** (не text input!) populated from:
   - Groups: `listMyGroups()` → `<select>` с именами групп
   - Athletes: `listMyAthletes()` → `<select>` с именами атлетов
3. Loading state для dropdown
4. Empty state: «Нет групп. Создайте группу в настройках.»

```typescript
const [assignTarget, setAssignTarget] = useState<'group' | 'athlete'>('group');
const [groups, setGroups] = useState<GroupRecord[]>([]);
const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
const [selectedId, setSelectedId] = useState('');

// Load на showAssign=true:
useEffect(() => {
  if (showAssign) {
    listMyGroups().then(setGroups);
    listMyAthletes().then(setAthletes);
  }
}, [showAssign]);
```

**Verify:** Coach → PhaseCard → Assign → dropdown с именами → назначение работает.

### 2.5 i18n

- `todayExercises`, `goToTraining`, `assignToAthlete`, `assignToGroup`
- `training.noGroups`, `training.selectGroup`, `training.selectAthlete`

**Verify:** `pnpm type-check` + `pnpm build` → Exit 0.

---

## Phase 3: Override + Plan Resolution (~4-5 часов)

**Skills:** `always` + `architecture` + `frontend` + `architect-review`

### 3.1 Override resolution (оптимизированный)

#### [MODIFY] [logs.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/logs.ts#L37-L67)

**Текущее:** Только season → phase → plan (3 sequential запроса).
**Изменение:** 2-step resolve (оптимизация vs 3+ запросов из оригинального плана):

```typescript
export async function getPublishedPlanForToday(athleteId: string): Promise<PlanWithExercises | null> {
  const today = todayISO();
  try {
    // Step 1: Check individual override (athlete_id directly on plan)
    const overrides = await pb.collection(Collections.TRAINING_PLANS).getFullList<PlanWithExercises>({
      filter: pb.filter(
        'athlete_id = {:aid} && status = "published" && deleted_at = ""',
        { aid: athleteId }
      ),
      expand: 'plan_exercises(plan_id).exercise_id',
      sort: '-created',
    });
    if (overrides.length) return overrides[0];

    // Step 2a: Check direct athlete assignment
    const directAssign = await pb.collection(Collections.PLAN_ASSIGNMENTS).getFullList({
      filter: pb.filter(
        'athlete_id = {:aid} && status = "active"',
        { aid: athleteId }
      ),
      expand: 'plan_id',
      sort: '-created',
    });
    if (directAssign.length && directAssign[0].expand?.plan_id) {
      const planId = directAssign[0].plan_id;
      return await pb.collection(Collections.TRAINING_PLANS).getOne<PlanWithExercises>(planId, {
        expand: 'plan_exercises(plan_id).exercise_id',
      });
    }

    // Step 2b: Check group assignment (split into 2 queries — PB back-relation
    // syntax `_via_` requires `?=` operator which is fragile for nested relations)
    const myGroups = await pb.collection(Collections.GROUP_MEMBERS).getFullList({
      filter: pb.filter('athlete_id = {:aid}', { aid: athleteId }),
    });
    if (myGroups.length) {
      const groupIds = myGroups.map(g => g.group_id);
      // Build OR filter for all groups
      const groupFilter = groupIds.map((_, i) => `group_id = {:g${i}}`).join(' || ');
      const groupParams = Object.fromEntries(groupIds.map((id, i) => [`g${i}`, id]));
      const groupAssign = await pb.collection(Collections.PLAN_ASSIGNMENTS).getFullList({
        filter: pb.filter(`(${groupFilter}) && status = "active"`, groupParams),
        expand: 'plan_id',
        sort: '-created',
      });
      if (groupAssign.length && groupAssign[0].expand?.plan_id) {
        const planId = groupAssign[0].plan_id;
        return await pb.collection(Collections.TRAINING_PLANS).getOne<PlanWithExercises>(planId, {
          expand: 'plan_exercises(plan_id).exercise_id',
        });
      }
    }

    // Step 3: Fallback — season → phase → plan (using pb.filter!)
    const seasons = await pb.collection(Collections.SEASONS).getFullList({
      filter: pb.filter(
        'athlete_id = {:aid} && start_date <= {:today} && end_date >= {:today}',
        { aid: athleteId, today }
      ),
      sort: '-start_date',
    });
    if (!seasons.length) return null;

    const phases = await pb.collection(Collections.TRAINING_PHASES).getFullList({
      filter: pb.filter(
        'season_id = {:sid} && start_date <= {:today} && end_date >= {:today}',
        { sid: seasons[0].id, today }
      ),
    });
    if (!phases.length) return null;

    const plans = await pb.collection(Collections.TRAINING_PLANS).getFullList<PlanWithExercises>({
      filter: pb.filter(
        'phase_id = {:pid} && status = "published" && deleted_at = ""',
        { pid: phases[0].id }
      ),
      expand: 'plan_exercises(plan_id).exercise_id',
      sort: '-created',
    });
    return plans[0] ?? null;
  } catch {
    return null;
  }
}
```

> [!NOTE]
> **[G3H] correction applied:** Step 2 split into 2a (direct athlete) + 2b (group via `group_members` lookup).
> PB back-relation `_via_` syntax requires `?=` operator which is fragile for nested rels.
> Two simple queries are safer and more predictable than one complex back-relation filter.

**Verify:** Атлет с override → видит override. Без override → группа. Без группы → season fallback.

### 3.2 Кнопка Override в WeekConstructor

#### [MODIFY] [WeekConstructor.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/WeekConstructor.tsx)

Actions dropdown → «Create Override for Athlete» → modal с выбором атлета → `createIndividualOverride()`.

**Verify:** Coach → WeekConstructor → Override → выбор атлета → копия плана создана.

### 3.3 Override badge в SeasonDetail

#### [MODIFY] [SeasonDetail.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/SeasonDetail.tsx)

PhaseCard → badge «N overrides» + expandable list.

**Verify:** Coach видит badge → клик → список атлетов.

### 3.4 i18n + build

- `createOverride`, `overrideFor`, `overrides` ×3
- `pnpm type-check` + `pnpm build` → Exit 0

---

## Phase 4: Workout + Templates Hybrid UX (~5-6 часов)

**Skills:** `always` + `frontend` + `ui_design` + `/ui-work` workflow

> [!IMPORTANT]
> **Архитектурное решение: Вариант C (Гибрид)**
> - CRUD шаблонов остаётся в Reference → Templates (как есть)
> - Quick-access picker добавляется в Training (WeekConstructor/DayColumn)
> - QuickPlanBuilder сохраняет в PB + может вставить в план

### 4.1 TemplateQuickApply в DayColumn

#### [NEW] [TemplateQuickApply.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/TemplateQuickApply.tsx)

Dropdown-picker для training_day шаблонов (аналог существующего WarmupTemplatePicker):
- Загружает `listTemplates()` filtered by `type='training_day'`
- Выбор шаблона → `stampTemplate(templateId, planId, dayOfWeek, session)`
- Показывает preview: название + количество упражнений
- 44px touch targets

#### [MODIFY] [DayColumn.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/DayColumn.tsx)

Добавить `TemplateQuickApply` в footer дня (рядом с warmup picker).

**Verify:** Coach → DayColumn → «Apply Template» → dropdown → шаблон применяется.

### 4.2 QuickPlan → Save as Template (batch)

#### [MODIFY] [QuickPlanBuilder.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/QuickPlanBuilder.tsx)

Кнопка «Save to Library»:

```typescript
async function handleSaveToLibrary() {
  const template = await createTemplate({
    coach_id: user.id,
    type: 'training_day',
    name_ru: templateName,
    name_en: templateName,
    name_cn: templateName,
  });
  // [G3H] correction: chunked batch (5 at a time) to avoid SQLite lock
  // PocketBase uses SQLite — burst Promise.all with 10-20 writes can cause
  // "database is locked" errors. Chunks of 5 are safe and still fast.
  const items = exercises.map((item, idx) => ({
    template_id: template.id,
    block: 'main' as const,
    exercise_id: item.exerciseId,
    order: idx,
    sets: item.sets,
    reps: item.reps,
  }));
  for (let i = 0; i < items.length; i += 5) {
    await Promise.all(items.slice(i, i + 5).map(item => addTemplateItem(item)));
  }
}
```

**Verify:** QuickPlan → Save → template appears in Reference → Templates.

### 4.3 Insert Workout into Plan (simplified picker)

#### [MODIFY] [QuickPlanBuilder.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/QuickPlanBuilder.tsx)

Кнопка «Insert into Plan» → **Simplified PlanPicker** (NOT 5-level deep):

```
Step 1: Select Season (active season pre-selected)
Step 2: Select Day (show week grid with day labels, highlight today)
         + AM/PM toggle
```

Merge strategy: **append** to existing exercises (not replace).

**Verify:** Insert → выбрать день → exercises appear in WeekConstructor.

### 4.4 Save Day as Template

#### [MODIFY] [DayColumn.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/DayColumn.tsx)

Bookmark icon in day footer → name modal → create template from day's exercises.

#### [MODIFY] [templates.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/templates.ts)

```typescript
export async function createTemplateFromPlanDay(
  planId: string,
  dayOfWeek: number,
  session: number,
  coachId: string,
  name: { ru: string; en: string; cn: string }
): Promise<TrainingTemplateWithItems> {
  // 1. Load plan_exercises for this day+session
  const exercises = await pb.collection(Collections.PLAN_EXERCISES).getFullList({
    filter: pb.filter(
      'plan_id = {:pid} && day_of_week = {:dow} && session = {:s} && deleted_at = ""',
      { pid: planId, dow: dayOfWeek, s: session }
    ),
    sort: '+order',
  });

  // 2. Create template
  const template = await createTemplate({
    coach_id: coachId,
    type: 'training_day',
    name_ru: name.ru, name_en: name.en, name_cn: name.cn,
  });

  // 3. Chunked batch create items ([G3H]: SQLite lock safety)
  const items = exercises.map((ex, idx) => ({
    template_id: template.id,
    block: ex.block || 'main',
    exercise_id: ex.exercise_id || undefined,
    custom_text_ru: ex.custom_text_ru,
    custom_text_en: ex.custom_text_en,
    custom_text_cn: ex.custom_text_cn,
    order: idx,
    sets: ex.sets,
    reps: ex.reps,
    duration_seconds: ex.duration,
  }));
  for (let i = 0; i < items.length; i += 5) {
    await Promise.all(items.slice(i, i + 5).map(item => addTemplateItem(item)));
  }

  return getTemplate(template.id);
}
```

**Verify:** Day → Save as Template → template in Reference.

### 4.5 i18n + build

- `saveToLibrary`, `insertIntoPlan`, `selectDay`, `saveAsTemplate`, `applyTemplate` ×3
- `pnpm type-check` + `pnpm build` → Exit 0

---

## Phase 4.5: Warmup Page Migration (~2 часа)

**Skills:** `always` + `frontend`

### 4.5.1 Migrate warmup page to PB templates

#### [MODIFY] [warmup/page.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/(protected)/reference/warmup/page.tsx)

**Текущее L12-45:** Hard-coded `PROTOCOLS` array (3 warmup protocols).
**Изменение:**
- Load warmup templates from PB via `listTemplates()` filtered by `type='warmup'`
- Display each template with its `template_items` (expandable phases)
- Keep `total_minutes` from template record
- **Keep BreathingTimer** as-is (standalone interactive widget, not template-based)

```typescript
const [warmups, setWarmups] = useState<TrainingTemplateWithItems[]>([]);

useEffect(() => {
  listTemplates().then(all => 
    setWarmups(all.filter(t => t.type === 'warmup'))
  );
}, []);
```

**Fallback:** If PB fails to load → show loading skeleton, then error state with retry.

**Verify:**
- Warmup page shows templates from PB (not hard-coded)
- Each template shows phases from `template_items`
- BreathingTimer still works
- `pnpm type-check` + `pnpm build` → Exit 0

---

## Phase 5: Bidirectional Communication (~3-4 часа)

**Skills:** `always` + `frontend` + `architecture` + `/ui-work` workflow + `database-architect`

### 5.1 PB: skip_reason field

#### PocketBase Admin → `log_exercises` → add field

```
name: skip_reason
type: text
required: false
max: 255
```

#### [MODIFY] [types.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/types.ts)

```typescript
export interface LogExercisesRecord {
  // ...existing fields
  skip_reason?: string; // 'no_equipment' | 'pain' | 'time' | 'coach_decision' | custom text
}
```

### 5.2 Athlete training notes (with auto-save)

#### [MODIFY] [AthleteTrainingView.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/AthleteTrainingView.tsx)

Per-day notes textarea with **debounced auto-save (500ms)** + saving indicator:

> [!WARNING]
> **[G3H] correction:** `log.id` may be `undefined` before `ensureLog()` completes.
> Must guard with `if (!log?.id) return` and disable textarea until log is ready.

```typescript
const [noteValue, setNoteValue] = useState(log?.notes ?? '');
const [saving, setSaving] = useState(false);
const logReady = !!log?.id; // [G3H]: guard against undefined log

// Debounced auto-save:
useEffect(() => {
  if (!logReady) return; // [G3H]: skip save if log not yet created in PB
  if (noteValue === (log?.notes ?? '')) return;
  const timer = setTimeout(async () => {
    setSaving(true);
    try {
      await updateTrainingLog(log.id, { notes: noteValue });
    } catch (err) {
      console.error('[AthleteNotes] auto-save failed:', err);
    } finally {
      setSaving(false);
    }
  }, 500);
  return () => clearTimeout(timer);
}, [noteValue, logReady]);

// JSX:
<div className={styles.noteArea}>
  <textarea
    placeholder={t('training.athleteNotePlaceholder')}
    value={noteValue}
    onChange={(e) => setNoteValue(e.target.value)}
    maxLength={500}
    disabled={!logReady} // [G3H]: prevent input before log exists
  />
  {saving && <span className={styles.savingIndicator}>{t('shared.saving')}</span>}
</div>
```

**Verify:** Атлет пишет заметку → 500ms → «Сохраняется...» → сохранено. Textarea disabled until log created.

### 5.3 Skip reason quick-select

#### [MODIFY] [AthleteTrainingView.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/AthleteTrainingView.tsx)

При пропуске упражнения — quick-select:
- Equipment (нет оборудования)
- Pain (боль/дискомфорт)
- Time (нехватка времени)
- Coach Decision (тренер решил)
- Other (+ custom text input)

#### [MODIFY] [CoachLogViewer.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/CoachLogViewer.tsx)

Display `skip_reason` badge in Status column.

**Verify:** Athlete skips → selects reason → Coach sees badge in CoachLogViewer.

### 5.4 Adaptation Banner

#### [MODIFY] [AthleteTrainingView.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/AthleteTrainingView.tsx)

```jsx
{readinessScore < 60 && (
  <div className={styles.adaptationBanner}>
    <Zap size={16} />
    {t('training.adaptationBanner', { score: readinessScore })}
  </div>
)}
```

**Verify:** Athlete readiness 42% → banner visible.

### 5.5 Readiness mini-badges в WeekConstructor

#### [MODIFY] [WeekConstructor.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/WeekConstructor.tsx)

#### [NEW function in readinessHistory.ts] `getLatestReadinessForGroup(groupId: string)`

> [!NOTE]
> **[G3H] correction:** PB has no SQL `GROUP BY`. Cannot get "latest per athlete" in one query.
> Use `Promise.all` per athlete — groups are small (5-30 people), so this is fast.

```typescript
export async function getLatestReadinessForGroup(groupId: string) {
  // 1. Get group members
  const members = await pb.collection(Collections.GROUP_MEMBERS).getFullList({
    filter: pb.filter('group_id = {:gid}', { gid: groupId }),
    expand: 'athlete_id',
  });

  // 2. Fetch latest checkin per athlete (parallel — groups are small)
  const results = await Promise.all(
    members.map(async (m) => {
      const checkins = await pb.collection(Collections.DAILY_CHECKINS).getList(1, 1, {
        filter: pb.filter('athlete_id = {:aid}', { aid: m.athlete_id }),
        sort: '-date',
        requestKey: `readiness-${m.athlete_id}`, // cancel-safe
      });
      return {
        athleteId: m.athlete_id,
        athleteName: m.expand?.athlete_id?.name ?? '',
        checkin: checkins.items[0] ?? null,
      };
    })
  );

  return results;
}
```

**Verify:** Coach → WeekConstructor → readiness badges visible.

### 5.6 i18n + build

- `athleteNotePlaceholder`, `adaptationBanner`, `skipReasons.*`, `shared.saving` ×3
- `pnpm type-check` + `pnpm build` → Exit 0

---

## Phase 6: Stability (~2-3 часа)

**Skills:** `always` + `debugging` + `error-handling-patterns`

### 6.1 Error + success toast utility

#### [NEW] [errors.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/utils/errors.ts)

```typescript
export function showError(error: unknown, fallbackMessage: string): string {
  const message = error instanceof Error ? error.message : fallbackMessage;
  return message;
}

export function showSuccess(message: string): void {
  // Can be extended to toast system later
  console.info('[success]', message);
}
```

### 6.2 Replace 50+ empty catch blocks (context-aware)

> [!WARNING]
> **[G3H] correction:** Blind replace will break `pnpm type-check` —
> many files have no `setError` state or `t()` hook. Each catch must be handled individually.

**Strategy by context:**

| Context | Has `setError`? | Has `t()`? | Approach |
|---|---|---|---|
| Page components (pages/) | ✅ | ✅ | `setError(showError(err, t('errors.networkError')))` |
| Components with UI state | ✅ | ✅ | Same — use existing error state |
| Services (templates.ts, logs.ts) | ❌ | ❌ | Re-throw: `throw err` (let caller handle) |
| Hooks / callbacks | ❌ | ❌ | `console.error('[context]', err)` |
| Background fetches | ❌ | ❌ | `console.error` + silent degrade |

**Process:**
```bash
# 1. Find all silent catches:
grep -rn 'catch\s*{' src/app/ src/components/ src/lib/

# 2. For each file — check if setError/t exists, apply matching strategy
# 3. Verify: grep count = 0 AND pnpm type-check passes
```

**Verify:** `grep -rn 'catch\s*{' src/` → 0 results + `pnpm type-check` → Exit 0.

### 6.3 plan_exercises deleted_at index

#### PocketBase Admin → `plan_exercises`

```sql
CREATE INDEX idx_planex_deleted ON plan_exercises (deleted_at)
```

**Verify:** MCP `view_collection plan_exercises` → index exists.

### 6.4 Build + test gate

- `pnpm type-check` + `pnpm build` + `pnpm test` → Exit 0

---

## Verification Plan

### Automated (каждая фаза)
```bash
pnpm type-check   # 0 errors
pnpm build         # Exit 0
pnpm test          # existing + new tests pass
```

### Manual QA (14 scenarios)

| # | Test | Expected |
|---|---|---|
| 1 | Athlete Dashboard → published plan | Today's exercises + «Go to training» button |
| 2 | Athlete Dashboard → competition | CompetitionCountdown visible |
| 3 | Athlete → Training → seasons list | Read-only season cards below AthleteTrainingView |
| 4 | Coach → Assign → Group dropdown | Dropdown with names (NOT UUID input!) |
| 5 | Coach → Assign → Athlete dropdown | Both options work |
| 6 | Coach → Delete season | ConfirmDialog → season disappears |
| 7 | Coach → Create group error | Error message shown |
| 8 | Coach → Create Override → edit | Override plan saved |
| 9 | Athlete with override → Training | Override plan displayed (not season fallback) |
| 10 | DayColumn → Apply Template | Training_day template stamped |
| 11 | QuickPlan → Save to Library | Template in Reference |
| 12 | Warmup page → shows PB templates | Not hard-coded protocols |
| 13 | Athlete → notes auto-save | Coach sees in CoachLogViewer |
| 14 | Athlete → skip → reason | Coach sees skip reason badge |
