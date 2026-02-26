# Implementation Plan — Track 4.241: Bug Fixes & Gap Closure (rev.4)

> **Статус:** Готов к исполнению (ревизия 4 — после глубокого аудита кода + brainstorming-анализа, 2026-02-24)
> **Источник:** `gate.md` + `bug-report.md` + Аудит rev.3 + Code-review 20+ файлов
>
> **Изменения rev.4 vs rev.3:**
>
> - Исправлен `getWeeklyVolumeDelta(weekStart)` — передавать начало недели, не сегодня
> - Добавлена mapping-функция `TrainingLog[] → DayStatus[]` для WeeklyHeatmap
> - Phase 3 StatsStrip — упрощён (убрали лишние API-запросы, streak уже есть в StreakHeroCard)
> - Phase 4: добавлен `QuickWorkout.tsx:296` в таблицу deprecated API
> - Phase 2 DnD: `reorderExercises` уже импортирован — новый handler не нужен

## Общая стратегия

**Backend-first, layered approach:**

1. Сначала маршруты + данные + schema (Phase 1) — всё, что блокирует навигацию
2. Затем недореализованные функции (Phase 2) — Template Apply, DnD save (1 строка!)
3. Затем компоненты UI (Phase 3) — WeeklyHeatmap rewrite, StatsStrip connect
4. Затем security sweep (Phase 4) — pb.filter migration, deprecated API
5. В конце — i18n, stubs, lint, QA (Phase 5)

**Ограничения:**

- Static Export (`output: 'export'`): все новые страницы → `'use client'` + data через `useEffect`
- Перед Phase 3: запустить `/ui-work` (DESIGN_SYSTEM.md + tokens.css)
- После каждой фазы: `pnpm type-check && pnpm build` → Exit 0

---

## Phase 1 — Route Fixes + Data Bugs + Schema Fixes

### 1.1 dateHelpers.ts — добавить `getWeekStart()`

```ts
// src/lib/utils/dateHelpers.ts — добавить:
/**
 * Returns Monday of the current ISO week as YYYY-MM-DD.
 * Needed for getWeeklyVolumeDelta() which expects weekStartDate (Monday).
 */
export function getWeekStart(dateStr?: string): string {
    const d = dateStr ? new Date(dateStr) : new Date();
    const day = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat
    const diff = day === 0 ? -6 : 1 - day; // distance to Monday
    d.setDate(d.getDate() + diff);
    return new Intl.DateTimeFormat('en-CA').format(d);
}
```

### 1.2 AthleteDashboard.tsx

```diff
- import { listSeasons, type SeasonWithRelations, type CompetitionRecord } from '@/lib/pocketbase/services/seasons';
+ import { listSeasons, listSeasonsForAthlete, type SeasonWithRelations, type CompetitionRecord } from '@/lib/pocketbase/services/seasons';
+ import { todayForUser, getWeekStart } from '@/lib/utils/dateHelpers';

- function todayISO() {
-     return new Date().toISOString().slice(0, 10);
- }

// L89: weekStart вместо today
- getWeeklyVolumeDelta(aid, todayISO()),
+ getWeeklyVolumeDelta(aid, getWeekStart()),

// L111: listSeasonsForAthlete вместо listSeasons (athleteId уже доступен как локальная var)
- const seasons = await listSeasons();
+ const seasons = await listSeasonsForAthlete(aid);
```

> **Примечание:** `todayForUser()` используется для отображения даты в UI (L67-70 уже корректен через Intl), замена `todayISO()` нужна только в `getWeeklyVolumeDelta` call.

### 1.3 TodayWorkoutCard.tsx

```diff
- <h3 className={styles.title}>{plan.name || 'Today\'s Workout'}</h3>
+ <h3 className={styles.title}>{t('todaysWorkout')} {t('weekLabel', { n: plan.week_number })}</h3>

- {plan.focus && <span className={styles.focus}>{plan.focus}</span>}
+ {/* Удалить — поле focus не существует в PB schema training_plans */}

- {plan.expand?.plan_exercises?.length || 0} blocks planned.
+ {plan.expand?.['plan_exercises(plan_id)']?.length ?? 0} {t('blocksPlanned')}

- <Link href="/training/today" className={styles.startBtn}>
+ <Link href="/training" className={styles.startBtn}>

// Убрать hardcoded строки:
- <h3 className={styles.title}>Rest Day</h3>
+ <h3 className={styles.title}>{t('restDay')}</h3>
- <p className={styles.desc}>No workout scheduled for today.</p>
+ <p className={styles.desc}>{t('noWorkout')}</p>
- Start Workout
+ {t('startWorkout')}
```

### 1.4 RecentNotifications.tsx

```diff
- import pb from '@/lib/pocketbase/client';
- import { Collections } from '@/lib/pocketbase/collections';
+ import { listUnread } from '@/lib/pocketbase/services/notifications';

// L12-25: заменить весь useEffect fetch block:
- const recs = await pb.collection(Collections.NOTIFICATIONS).getList(1, 2, {
-     filter: `user_id = "${pb.authStore.record.id}" && is_read = false`,
-     sort: '-created',
- });
- setNotifications(recs.items);
+ const { items } = await listUnread(pb.authStore.record?.id ?? '');
+ setNotifications(items.slice(0, 2));

// L34: href fix
- <Link href="/dashboard/notifications" className={styles.viewAll}>View all</Link>
+ <Link href="/notifications" className={styles.viewAll}>{t('viewAll')}</Link>

// L33: i18n
- <span className={styles.title}>Recent</span>
+ <span className={styles.title}>{t('recent')}</span>
```

### 1.5 training/page.tsx

```diff
// Убрать option value="self" (L177) — передавать реальный athleteId или убрать опцию:
- <option value="self">My Seasons</option>
+ {/* Удалить или получить реальный atletId и передавать */}
```

### 1.6 training/review/page.tsx — [NEW]

```tsx
'use client';
// Static Export constraint: 'use client' + data через useEffect
import { useTranslations } from 'next-intl';
import styles from './review.module.css';

export default function TrainingReviewPage() {
    const t = useTranslations('training');
    return (
        <main>
            <h1>{t('reviewTitle')}</h1>
            {/* Phase 5: подключить PendingReviews component */}
        </main>
    );
}
```

**Gate 1:** `pnpm type-check && pnpm build` → Exit 0

---

## Phase 2 — Feature Completion: Template Apply + DnD Save

### 2.1 TemplateList.tsx — добавить prop `onApply`

```diff
interface Props {
    templates: TrainingTemplateRecord[];
    isSystem: boolean;
    defaultLocale: Language;
+   onApply?: (template: TrainingTemplateRecord) => void;
    onCopy?: (template: TrainingTemplateRecord) => void;
    // ...
}
```

- В actions section добавить кнопку Apply (иконка `<Play size={14} />`) рядом с Copy/Edit/Delete
- Кнопка видима только если `onApply` передан (не noop)

### 2.2 TemplatePanelContent.tsx — пробросить onApply + onClick

```diff
// L119-125: удалить TODO-комментарий
// L110-113: добавить onClick на "Create first template"

  <TemplateList
      templates={templates}
      isSystem={activeTab === 'system'}
      defaultLocale={locale}
+     onApply={(template) => onApply(template.id)}
      onCopy={() => { }}
      onEdit={() => { }}
      onDelete={() => { }}
  />
```

### 2.3 WeekConstructor.tsx — передать onReorderDrag

> **Важно (rev.4):** `reorderExercises` уже импортирован (L12) и работает через `handleReorder`.
> `loadPlan` уже в scope. Нужно только добавить 1 проп:

```diff
// WeekConstructor.tsx:691 (DayConstructorLazy рендер):
  <DayConstructorLazy
      dayOfWeek={activeDay}
      // ... все существующие пропы ...
      onDayNoteChange={!isReadOnly ? (note) => handleDayNoteChange(activeDay, note) : undefined}
+     onReorderDrag={!isReadOnly ? async (updates) => {
+         await reorderExercises(updates);
+         await loadPlan();
+     } : undefined}
      groupReadiness={groupReadiness}
      onClose={() => setActiveDay(null)}
  />
```

**Gate 2:** `pnpm type-check && pnpm build` → Exit 0

---

## Phase 3 — WeeklyHeatmap + StatsStrip

> ⚠️ Перед Phase 3: запустить `/ui-work` workflow.

### 3.1 dateHelpers.ts — добавить `getMondayOf()`

```ts
// Уже покрыт getWeekStart() из Phase 1.1. Используем его.
```

### 3.2 logs.ts — добавить `mapLogsToWeekStatus()`

`listWeekLogs()` существует (L157), но возвращает `TrainingLogWithRelations[]`.
WeeklyHeatmap нужен `DayStatus[]`. Добавить mapping-функцию:

```ts
// src/lib/pocketbase/services/logs.ts — добавить:

export type DayStatus = 'done' | 'missed' | 'rest' | 'today' | 'future';

/**
 * Convert week logs + plan structure into 7-cell DayStatus array (Mon=0 .. Sun=6).
 * - done: log exists for this day
 * - missed: past day, no log, but exercises were planned
 * - rest: past day, no log, no exercises planned (intentional rest)
 * - today: today's day index
 * - future: future day
 */
export function mapLogsToWeekStatus(
    logs: TrainingLogWithRelations[],
    weekStart: string,           // YYYY-MM-DD Monday
    todayStr: string,            // YYYY-MM-DD today
    plannedDayIndices: number[]  // days 0-6 that have plan_exercises
): DayStatus[] {
    const logDays = new Set(
        logs.map(l => {
            const d = new Date(l.date);
            const start = new Date(weekStart);
            return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
        })
    );

    const todayIndex = Math.floor(
        (new Date(todayStr).getTime() - new Date(weekStart).getTime()) / 86_400_000
    );

    return Array.from({ length: 7 }, (_, i) => {
        if (logDays.has(i)) return 'done';
        if (i === todayIndex) return 'today';
        if (i > todayIndex) return 'future';
        if (plannedDayIndices.includes(i)) return 'missed';
        return 'rest';
    });
}
```

### 3.3 WeeklyHeatmap.tsx — полная переделка

**Props нового компонента:**

```ts
interface Props {
    weekLogs: DayStatus[]; // массив из 7 элементов (Mon..Sun)
}
```

**Render:** 7-cell grid с цветами по дизайн-системе:

- `done` → `var(--color-success)`
- `missed` → `var(--color-warning)`
- `rest` → `var(--color-text-tertiary)`
- `today` → border `var(--color-accent-primary)`, subtle glow
- `future` → `var(--glass-bg)`, dimmed

Убрать volume delta card полностью (данные volumeData остаются в AthleteDashboard для других целей).

### 3.4 AthleteDashboard.tsx — StatsStrip + WeeklyHeatmap

**Design decision (brainstorming):** Не добавлять 3 новых API-запроса (streak уже есть в lazy `StreakHeroCard`). Показывать 3 реальных метрики из уже загруженных данных:

```diff
+ import { getCurrentPRs } from '@/lib/pocketbase/services/personalRecords';
+ import { listWeekLogs, mapLogsToWeekStatus, type DayStatus } from '@/lib/pocketbase/services/logs';
+ import { getWeekStart, todayForUser } from '@/lib/utils/dateHelpers';

// State:
+ const [prs, setPrs] = useState<{ label: string; value: string }[]>([]);
+ const [weekStatus, setWeekStatus] = useState<DayStatus[]>([]);

// loadCheckin — добавить к существующим Promise.all:
  const [checkin, fetchedPlan, volume] = await Promise.all([
      getTodayCheckin(aid),
      getPublishedPlanForToday(aid),
      getWeeklyVolumeDelta(aid, getWeekStart()),
  ]);

// После Promise.all — добавить параллельно:
+ const weekStart = getWeekStart();
+ const today = todayForUser();
+ const [weekLogs, currentPRs] = await Promise.all([
+     listWeekLogs(aid, weekStart),
+     getCurrentPRs(aid),
+ ]);
+
+ // Planned days — из fetchedPlan expand (если есть)
+ const plannedDays = fetchedPlan?.expand?.['plan_exercises(plan_id)']
+     ?.map((e: { day_of_week: number }) => e.day_of_week) ?? [];
+ setWeekStatus(mapLogsToWeekStatus(weekLogs, weekStart, today, [...new Set(plannedDays)]));
+ setPrs(currentPRs.slice(0, 1).map(p => ({ label: p.exercise_name ?? 'PR', value: `${p.value}` })));

// StatsStrip — 3 реальных метрики:
  const stats = [
-     { label: 'Date', value: todayISO() },
-     { label: 'Volume', value: volumeData?.current ?? 0 },
-     { label: 'Competitions', value: nextCompetition ? 1 : 0 },
+     { label: t('volumeLabel'), value: volumeData?.current ?? 0 },
+     { label: t('volumeDelta'), value: volumeData?.delta >= 0 ? `+${volumeData.delta}` : `${volumeData?.delta ?? 0}` },
+     ...(prs.length > 0 ? [{ label: prs[0].label, value: prs[0].value }] : []),
  ];

// WeeklyHeatmap — передать weekStatus:
- <WeeklyHeatmap
-     current={volumeData.current}
-     previous={volumeData.previous}
-     delta={volumeData.delta}
- />
+ <WeeklyHeatmap weekLogs={weekStatus} />
```

**Gate 3:** `pnpm type-check && pnpm build` → Exit 0

---

## Phase 4 — Security + Deprecation Fixes

### 4.1 pb.filter() migration — 25 мест (уточнено rev.4)

Шаблон замены:

```diff
- filter: `athlete_id = "${athleteId}"`
+ filter: pb.filter('athlete_id = {:aid}', { aid: athleteId })
```

Для dynamic arrays (`trainingLoad.ts:52` — список plan_ids):

```ts
const conditions = ids.map((_, i) => `plan_id = {:p${i}}`).join(' || ');
const params = Object.fromEntries(ids.map((id, i) => [`p${i}`, id]));
filter: pb.filter(conditions, params)
```

| Файл | Мест | Строки |
|------|------|--------|
| `exercises.ts` | 5 | 38, 44, 48, 52, 56 |
| `achievements.ts` | 4 | 188, 201, 206, 210 |
| `seasons.ts` | 4 | 36, 40, 102, 164 |
| `trainingLoad.ts` | 3 | 43, 52, 64 |
| `templates.ts` | 3 | 173, 310, 349 |
| `snapshots.ts` | 2 | 17, 38 |
| `customExercises.ts` | 1 | 61 |
| `readinessHistory.ts` | 1 | 31 |
| `preferences.ts` | 1 | 28 |
| `RecentNotifications.tsx` | 1 | 17 *(если не исправлено в Phase 1)* |

### 4.2 pb.authStore.model → .record (deprecated PB v0.23+)

| Файл | Строки | Действие |
|------|--------|---------|
| `seasons.ts` | 33 | `pb.authStore.model` → `pb.authStore.record` |
| `athletes.ts` | 28, 49, 70 | то же |
| `preferences.ts` | 22, 37 | то же |
| `WeekConstructor.tsx` | 296 | убрать `|| pb.authStore.model?.id` |
| `QuickWorkout.tsx` | 209 | убрать `|| pb.authStore.model?.id` |

### 4.3 PB Indexes — через PocketBase API (не Admin GUI!)

> ⚠️ Admin GUI не поддерживает partial WHERE clause. Используй PB MCP или curl с admin token.

```sql
-- Уникальные индексы для plan_assignments:
CREATE UNIQUE INDEX idx_unique_active_assign_athlete
    ON plan_assignments (plan_id, athlete_id)
    WHERE status = 'active' AND athlete_id != '';

CREATE UNIQUE INDEX idx_unique_active_assign_group
    ON plan_assignments (plan_id, group_id)
    WHERE status = 'active' AND group_id != '';

-- Composite index для частого запроса plan_id + status:
CREATE INDEX idx_pa_plan_status
    ON plan_assignments (plan_id, status);
```

> ⚠️ PB API заменяет весь массив `indexes`. Передавай все существующие индексы + 3 новых:
> `idx_plan_assignments_plan`, `idx_plan_assignments_athlete`, `idx_plan_assignments_group`

**Gate 4:** `pnpm type-check && pnpm build` → Exit 0

---

## Phase 5 — i18n + Coach Stubs + Lint + QA

### 5.1 BottomTabBar.tsx

```diff
- import Link from 'next/link';
+ import { Link } from '@/i18n/navigation';

// Убрать ручное формирование locale prefix:
- const href = `/${locale}${path}`;
+ // i18n Link добавляет locale автоматически
```

- `unreviewedCount` — подключить `countUnread()` из notifications service

### 5.2 i18n ключи — все 3 локали (ru/en/cn)

| Компонент | Ключи |
|-----------|-------|
| `TodayWorkoutCard` | `restDay`, `noWorkout`, `todaysWorkout`, `weekLabel`, `startWorkout`, `blocksPlanned` |
| `RecentNotifications` | `recent`, `viewAll` |
| `StatsStrip` / `AthleteDashboard` | `volumeLabel`, `volumeDelta`, `prLabel` |
| `TeamAlerts` | `attentionNeeded` |
| `AthleteDashboard` | `pullToRefresh`, `refreshing` |
| `training/review/page` | `reviewTitle` |

### 5.3 Coach Stubs

- `PendingReviews.tsx` — подключить `countUnread()` или `getLogsForPlan()` для review queue
- `TrainingToday.tsx` — подключить `listActivePlanAssignments()` тренера

### 5.4 Lint fix

```bash
# scripts/clear_pb.ts, clear_users.ts, test_users.ts — заменить `any` на конкретные типы
```

### 5.5 QA Smoke Tests

Запускать через `/qa` workflow (`browser_subagent`):

| # | Тест | Проверяем |
|---|------|-----------|
| 1 | Coach Review Tab | `/training/review` — без 404 |
| 2 | Start Workout | кнопка → `/training` — без 404 |
| 3 | View all notifications | href → `/notifications` |
| 4 | WeeklyHeatmap | 7 ячеек, 5 цветовых состояний visible |
| 5 | StatsStrip | 3 метрики с реальными данными |
| 6 | Template Apply | кнопка Apply видима, применяет шаблон |
| 7 | DnD reorder | перетащить упражнение → порядок в БД обновился |
| 8 | Assign UX | badges на PhaseCard, Unassign работает |
| 9 | RecentNotifications | показывает реальные уведомления |
| 10 | TodayWorkoutCard | отображает week_number и exercise count |

### 5.6 Final

```bash
pnpm lint       # Exit 0
pnpm type-check # Exit 0
pnpm build      # Exit 0
pnpm test       # Exit 0
```

**Gate 5 (Track Complete):** Все 10 smoke tests pass. Build + lint clean. CHANGELOG + walkthrough обновлены.

---

## Verification Plan

```bash
# После каждой фазы:
pnpm type-check && pnpm build   # Exit 0

# Финально:
pnpm lint && pnpm test          # Exit 0
```

- 10 smoke tests через `/qa` workflow (Phase 5)

---

## Зависимости между фазами

```
Phase 1 (данные/маршруты)
    ↓
Phase 2 (фичи) — независима от Phase 1, можно параллельно
    ↓
Phase 3 (UI) — зависит от Phase 1 (weekStart, listWeekLogs)
    ↓
Phase 4 (security) — независима, можно параллельно с Phase 2-3
    ↓
Phase 5 (i18n + QA) — зависит от всех фаз
```

---

## Decision Log (Brainstorming)

| Решение | Альтернатива | Почему выбрано |
|---------|--------------|---------------|
| StatsStrip — 3 метрики (Volume + Delta + PR) | 4 метрики (PR + Streak + CNS + Volume) | 4 метрики требуют 2 лишних API-запроса; CNS% уже есть в WeekConstructor toolbar; streak уже в StreakHeroCard |
| getWeekStart() в dateHelpers.ts | Inline в AthleteDashboard | Переиспользуется в WeeklyHeatmap и getWeeklyVolumeDelta |
| mapLogsToWeekStatus() в logs.ts | В WeeklyHeatmap.tsx | Логика принадлежит data layer, не UI |
| DnD: 1 строка в WeekConstructor | Новый handler + reorderExercises | reorderExercises уже импортирован, action идентична |
| WeeklyHeatmap: убрать volumeDelta card | Оставить как дополнительный card | DashboardErrorBoundary уже показывает volumeData в StatsStrip |

---

## Риски

1. `WeeklyHeatmap` CSS-модуль нужен новый — использовать design tokens обязательно
2. `mapLogsToWeekStatus` — timezone edge case: `new Date(log.date)` без timezone может дать wrong day. Использовать `.slice(0, 10)` для date string comparison
3. PB partial indexes — SQLite ≥ v3.8.0 (2013), PB v0.36.3 ✅ безопасно
4. `getCurrentPRs` — может вернуть пустой массив (новый пользователь); StatsStrip должен gracefully скрывать PR stat
