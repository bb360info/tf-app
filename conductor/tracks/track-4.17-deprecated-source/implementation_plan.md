# Track 4.17: Coach-Athlete Interaction — Implementation Plan (v2)

**Трек:** 4.17 — Coach-Athlete Interaction  
**Оценка:** 5-8 дней | **Приоритет:** High  
**Ревью v2:** Полный архитектурный ревью с подбором скиллов на каждую фазу

---

## Использованные скиллы (ревью & планирование)

| Скилл | Применение |
|-------|-----------|
| `brainstorming` | YAGNI, Understanding Lock, validate before implement |
| `architecture` | 5 ADR решений, schema review, data flow validation |
| `kaizen` | Инкрементальные фазы, small wins first, poka-yoke |

---

## Архитектурные решения (ADR)

### ADR-1: Coach Notes — поле `day_notes` в `training_plans`

**Решение:** JSON поле `day_notes` в существующей коллекции `training_plans`.

Format: `{ "0": "Акцент на технику", "3": "Лёгкая нагрузка" }` (ключ = `day_of_week` 0-6)

**Почему не отдельная коллекция:** YAGNI — заметки привязаны к плану, не нужен CRUD per-exercise. Если позже нужны per-exercise notes → добавим поле в `plan_exercises`.

> [!IMPORTANT]
> **Изменения в plans.ts:** `updatePlan()` сейчас принимает `Partial<Pick<..., 'status' | 'notes' | 'week_number'>>`. Нужно расширить на `'day_notes'`.

### ADR-2: Notification triggers — client-side (MVP)

**Решение:** Client-side. При `saveCheckin()` → если `score < 50` → create notification. При `publishPlan()` → resolve assigned athletes → create notifications.

**Как определить получателей при publish:**
```
publishPlan(planId)
  → listActivePlanAssignments(planId) 
  → для каждого assignment:
    - athlete_id → уведомить напрямую
    - group_id → expand group_members → уведомить каждого athlete
```

### ADR-3: Compliance — client-side service

```
compliance = (loggedExercisesCount / plannedExercisesCount) × 100
```
Данные: `listPlanExercises(planId)` count vs `listWeekLogs(athleteId, weekStart)` → `listLogExercises(logId)` count.

### ADR-4: Competition Countdown — нет отдельного competitions.ts

Соревнования используются в `peaking.ts`, `seasons.ts`. Нет отдельного сервиса. Для Countdown нужен прямой `pb.collection('competitions').getList()` в компоненте.

**Решение:** Добавить `getNextCompetition(athleteId)` в `peaking.ts` (уже работает с competitions).

### ADR-5: DayColumn props — 2 новых prop

```typescript
// Добавить в Props:
dayNote?: string;
onDayNoteChange?: (note: string) => void;
```
Управление state остаётся в `WeekConstructor` — DayColumn только отображает/редактирует.

---

## Proposed Changes

---

### Фаза 1: Quick Wins (1 день)

> **Скиллы для исполнителя:**
> - `/ui-work` workflow (DESIGN_SYSTEM.md + tokens.css + globals.css)
> - `jumpedia-design-system` SKILL.md
> - `react-ui-patterns` SKILL.md
> - `react-best-practices` SKILL.md
> - `lint-and-validate` SKILL.md

#### [MODIFY] [AthleteDashboard.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/dashboard/AthleteDashboard.tsx)

- Импортировать `getPublishedPlanForToday` из `logs.ts` (уже экспортируется)
- В `useEffect` загрузить план дня → `setPlanForToday(plan)`
- Заменить placeholder (L226) на:
  - Компактный список: warmup count + exercise count + estimated duration
  - Кнопка «Перейти к тренировке» → `useRouter().push('/training')`
  - Если план null → текущий empty state
- **DS compliance:** glass-card subtle variant, touch target ≥44px на кнопке

#### [NEW] [CompetitionCountdown.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/dashboard/CompetitionCountdown.tsx)

- Fetch: прямой `pb.collection('competitions').getList(1, 1, { filter: 'date >= "..." && season_id.coach_id = "..."', sort: 'date' })`
- Card: glassmorphism subtle, priority badge (A/B/C — **tokens уже есть** в `tokens.css` L173-179)
- Peaking: если < 7 дней → `--color-warning` banner
- If no competitions → render null
- **Lucide icons:** `Trophy`, `Calendar`, `Flame`

#### [NEW] [CompetitionCountdown.module.css](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/dashboard/CompetitionCountdown.module.css)

- Mobile-first: base 375px, `@media (min-width: 768px)` для desktop
- Tokens: `--glass-bg`, `--radius-lg`, `--shadow-md`, `--space-*`
- Priority badge: `--color-priority-a-bg`, `--color-priority-a-text` etc.

#### [MODIFY] [AthleteTrainingView.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/AthleteTrainingView.tsx)

- При readiness < 60 + auto-adaptation active → inline banner
- Banner: `--color-info-light` background, `Zap` icon
- Text: «Нагрузка адаптирована под готовность (42%)»

#### [MODIFY] [peaking.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/peaking.ts)

- Добавить: `getNextCompetition(seasonId: string): Promise<Competition | null>`
- Filter: `season_id = "${seasonId}" && date >= "${todayISO()}"`, sort `date`, limit 1

#### [MODIFY] i18n (3 файла)

- `messages/ru.json` + `messages/en.json` + `messages/cn.json`
- Ключи: `athleteDashboard.todayExercises`, `todayWarmup`, `todayDuration`, `goToTraining`, `competition.*`, `training.adaptationBanner`

---

### Фаза 2: Coach Notes (1.5 дня)

> **Скиллы для исполнителя:**
> - `/ui-work` workflow (полный)
> - `jumpedia-design-system` SKILL.md
> - `react-ui-patterns` SKILL.md
> - `lint-and-validate` SKILL.md
> - `architecture` SKILL.md → `trade-off-analysis.md` (для PB schema change)

#### [MODIFY PB SCHEMA] training_plans → добавить `day_notes`

```
Field: day_notes
Type: json
Required: false
Default: null
```

Через PB Admin API или `mcp_pocketbase_update_collection`:
```json
{ "name": "day_notes", "type": "json", "required": false }
```

#### [MODIFY] [types.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/types.ts)

```typescript
// В TrainingPlansRecord добавить:
day_notes?: Record<string, string> | null;
```

#### [MODIFY] [plans.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/plans.ts)

- `updatePlan()` L66-72: расширить `Partial<Pick<...>>` добавив `'day_notes'`
- `duplicatePlan()` L107-151: копировать `day_notes` из source plan

#### [MODIFY] [WeekConstructor.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/WeekConstructor.tsx)

- Добавить state: `dayNotes: Record<string, string>` (init из `plan.day_notes ?? {}`)
- При save/publish → `updatePlan(planId, { day_notes: dayNotes })`
- Передать в DayColumn: `dayNote={dayNotes[String(day)]}, onDayNoteChange={...}`

#### [MODIFY] [DayColumn.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/DayColumn.tsx)

- Добавить Props: `dayNote?: string`, `onDayNoteChange?: (note: string) => void`
- UI: textarea под заголовком дня (collapsed по умолчанию, expand по клику на `MessageSquare` icon)
- Max 500 chars, placeholder: «Заметка для атлета...»
- **DS:** `--font-body`, `--text-sm`, `var(--color-bg-tertiary)` background

#### [MODIFY] [DayColumn.module.css](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/DayColumn.module.css)

- `.noteInput` — textarea styles
- `.noteToggle` — icon button (44×44px touch target)

#### [MODIFY] [AthleteTrainingView.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/AthleteTrainingView.tsx)

- В `DayCard`: если `plan.day_notes?.[String(dayOfWeek)]` truthy → glassmorphism banner
- `MessageSquare` icon + text
- Glass: `--glass-bg`, `backdrop-filter: blur(var(--glass-blur))`, `@supports` fallback

#### [MODIFY] i18n — `training.coachNote`, `training.coachNotePlaceholder`, `training.coachNoteLabel`

---

### Фаза 3: Log Visibility (2 дня)

> **Скиллы для исполнителя:**
> - `/ui-work` workflow (полный)
> - `jumpedia-design-system` SKILL.md
> - `react-ui-patterns` SKILL.md (loading/error/empty states)
> - `react-best-practices` SKILL.md (avoid waterfalls, lazy load)
> - `lint-and-validate` SKILL.md

#### [NEW] [compliance.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/compliance.ts)

```typescript
export interface ComplianceResult {
  planned: number;
  logged: number;
  percent: number;
  byDay: Record<number, { planned: number; logged: number }>;
}

export async function getWeeklyCompliance(
  athleteId: string,
  planId: string,
  weekStartDate: string  // ISO YYYY-MM-DD (Monday)
): Promise<ComplianceResult>

export async function getExerciseComparison(
  planId: string,
  logId: string
): Promise<Array<{
  exercise: ExercisesRecord;
  planned: { sets: number; reps: string; weight?: number };
  actual: { sets_data: SetData[]; rpe?: number } | null;
  status: 'completed' | 'skipped' | 'partial';
}>>
```

#### [NEW] [compliance.test.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/__tests__/compliance.test.ts)

- Mock plan_exercises (5 items) + log_exercises (3 items) → assert compliance 60%
- Edge cases: empty plan, empty logs, 100% compliance

#### [NEW] [CoachLogViewer.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/CoachLogViewer.tsx)

- Props: `athleteId`, `planId`, `weekStart`
- Table: Plan vs Fact
  - Columns: Exercise | Planned (sets×reps, weight) | Actual (sets_data) | RPE | Status ✓/✗
  - Rows: green = completed, grey = skipped, yellow = partial
- Compliance % badge header (glassmorphism)
- **Dosages font:** `--font-mono` для чисел (per DS rule)
- **Loading:** Skeleton table (per DS Section 4 — Skeleton UI)
- **Empty:** EmptyState component «No logs for this week»

#### [NEW] [CoachLogViewer.module.css](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/CoachLogViewer.module.css)

- Mobile-first: vertical cards → `@media(min-width: 768px)` → horizontal table
- Touch targets for expand/collapse
- Color coding: `--color-success` / `--color-text-muted` / `--color-warning`

#### [MODIFY] [AthleteDetailClient.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/(protected)/dashboard/athlete/%5Bid%5D/AthleteDetailClient.tsx)

- Training Tab: lazy-load `CoachLogViewer` under each season's active plan
- Show compliance % badge next to season name

#### [MODIFY] [dashboard/page.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/(protected)/dashboard/page.tsx)

- In `AthleteCard`: mini compliance badge (circle % indicator)
- Fetch compliance async (не блокировать render карточки)
- **DS:** `--text-xs`, `--font-mono` для %, `--color-success`/`--color-warning`/`--color-error` color coding

#### [MODIFY] i18n — `training.compliance.*`, `training.planned`, `training.actual`, `training.rpe`, `training.completed`, `training.skipped`

---

### Фаза 4: Notification Engine (1.5 дня)

> **Скиллы для исполнителя:**
> - `lint-and-validate` SKILL.md
> - `architecture` SKILL.md → `pattern-selection.md`
> - `react-best-practices` SKILL.md (side effects, error boundaries)

#### [NEW] [notificationTriggers.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/notificationTriggers.ts)

```typescript
import pb from '../client';
import { Collections } from '../collections';
import { listActivePlanAssignments } from './planAssignments';

// Types
type NotificationType = 'low_readiness' | 'achievement' | 'plan_published' | 'coach_note';

// Core function
async function createNotification(
  userId: string,
  type: NotificationType,
  message: string,
  link?: string
): Promise<void>

// Triggers
export async function notifyCoachLowReadiness(
  coachUserId: string, athleteName: string, score: number
): Promise<void>

export async function notifyCoachAchievement(
  coachUserId: string, athleteName: string, achievementType: string
): Promise<void>

export async function notifyAssignedAthletesPlanPublished(
  planId: string, planName: string
): Promise<void>
// ↑ Uses listActivePlanAssignments → resolve athlete_ids → create notifs
// ↑ For group assignments: expand group_members → get athlete user_ids
```

> [!WARNING]
> **Ключевой нюанс:** `notifications.user_id` — это FK на `users`, не на `athletes`. При триггере из `readiness.ts` нужно:
> 1. `athlete.coach_id` → это `users` FK → OK для coach notification
> 2. `athlete.user_id` → это `users` FK → OK для athlete notification
> 
> Если `athlete.user_id` пуст (legacy data) → skip notification (graceful degradation).

#### [MODIFY] [readiness.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/readiness.ts)

- В `saveCheckin()`: после сохранения + score < 50:
  ```typescript
  try {
    const athlete = await pb.collection('athletes').getOne(athleteId);
    await notifyCoachLowReadiness(athlete.coach_id, athlete.name, score);
  } catch { /* non-blocking */ }
  ```

#### [MODIFY] [achievements.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/achievements.ts)

- В grant функции: после grant → `notifyCoachAchievement(coachUserId, athleteName, type)`
- Non-blocking (try/catch)

#### [MODIFY] [plans.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/plans.ts)

- В `publishPlan()`: после publish → `notifyAssignedAthletesPlanPublished(planId, planName)`
- Non-blocking

#### [MODIFY] [NotificationBell.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/shared/NotificationBell.tsx)

- Type-based icons: `AlertTriangle` (low_readiness), `Trophy` (achievement), `ClipboardCheck` (plan_published), `MessageSquare` (coach_note)
- Click → mark read + navigate to `link` (if present)
- Count badge: `--color-error` background, `--text-xs`

---

### Фаза 5: Activity Feed (1 день)

> **Скиллы для исполнителя:**
> - `/ui-work` workflow (полный)
> - `jumpedia-design-system` SKILL.md
> - `react-ui-patterns` SKILL.md (loading states, empty states)
> - `react-best-practices` SKILL.md (data fetching, lazy load)
> - `lint-and-validate` SKILL.md

#### [NEW] [ActivityFeed.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/dashboard/ActivityFeed.tsx)

- Merge 3 collections (last 24h):
  1. `daily_checkins` → «{name} checked in (score%)»
  2. `training_logs` → «{name} logged training (RPE {n})»
  3. `achievements` → «{name} earned {type}!»
- Sort by `created` DESC, limit 20
- Horizontal scroll на mobile (карточки 200px wide), grid на desktop
- Event card: avatar placeholder (first letter) | message | relative time
- **DS:** glass-card subtle, `--text-sm`, `--font-body`
- **Empty state:** «No recent activity» с `Activity` Lucide icon (32px)

#### [NEW] [ActivityFeed.module.css](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/dashboard/ActivityFeed.module.css)

- Mobile: `overflow-x: auto; scroll-snap-type: x mandatory`, cards `scroll-snap-align: start`
- Desktop: CSS Grid 3 columns
- Card: glass subtle, `--radius-md`, `--shadow-sm`

#### [MODIFY] [dashboard/page.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/(protected)/dashboard/page.tsx)

- Lazy-load `ActivityFeed` between quick stats и athlete list
- Only render for coach role

#### [MODIFY] i18n — `dashboard.activityFeed.*`, `dashboard.noRecentActivity`, event type messages

---

## Verification Plan

### Automated (каждая фаза)

```bash
pnpm type-check   # 0 errors
pnpm build         # Exit 0
pnpm test          # Existing + new tests pass
```

### Pre-Delivery DS Checklist (фазы 1, 2, 3, 5)

- [ ] Все цвета: `var(--color-*)` — нет hardcoded hex
- [ ] Все отступы: `var(--space-*)` — нет magic px values
- [ ] Glass: `@supports` fallback для `backdrop-filter`
- [ ] Lucide icons only — нет emoji as UI
- [ ] Touch targets ≥ 44px
- [ ] Mobile-first: `min-width` breakpoints only
- [ ] Tested light + dark mode
- [ ] `prefers-reduced-motion` respected
- [ ] Chinese text layout tested

### Manual QA по фазам

| Фаза | Тест | Ожидание |
|------|------|----------|
| 1 | Athlete Dashboard → published plan exists | Today's exercises list + «Go to training» button |
| 1 | Athlete Dashboard → no plan | Empty state (current behavior) |
| 1 | Athlete Dashboard → competition in 5 days | Countdown card + peaking alert |
| 2 | Coach → WeekConstructor → add note to day 0 | Note textarea appears, saves |
| 2 | Athlete → Training → day with note | Glassmorphism banner with note text |
| 3 | Athlete logs 3/5 exercises with RPE | Data saved in PB |
| 3 | Coach → Athlete Detail → Training tab | CoachLogViewer shows plan vs fact, 60% compliance |
| 3 | Coach Dashboard | Compliance badge on athlete card |
| 4 | Athlete checkin with readiness 42% | Coach receives notification |
| 4 | Coach publishes plan (assigned to group) | All group athletes receive notification |
| 5 | Coach Dashboard | Activity feed shows last 24h events |
