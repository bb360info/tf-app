# Implementation Plan — Track 4.263: Schema Decoupling (Polymorphic Ownership)

_Версия 3.0 — финальная, прошедшая сценарную валидацию (20 сценариев × 5 персон)_
_Включает: owner_type discriminator, Season Membership Inheritance, exercise_adjustments, каскадные зависимости_

---

## Контекст и Цель

Текущая архитектура: **жёсткая иерархия** `Coach → Season → Phase → Plan/Competition`.

**Системные блокеры:**

1. Новые атлеты не могут внести историю стартов без создания сезона
2. Тренеры не могут назначить разовую тренировку без полной иерархии фаз
3. Тренер не может создать командный старт для группы (comp привязан к season одного атлета)
4. API Rules завязаны на 4+ JOIN-цепочки → медленно и хрупко
5. `plan_assignments` дублирует season membership — лишняя ручная работа

**Решение:** Полиморфное владение через `owner_type` + Season Membership Inheritance.

---

> [!CAUTION]
> **Критическое требование:** Перед ЛЮБЫМ изменением схемы PocketBase — полный backup `pb_data/` на VPS.
> Мигратор данных запускается ДО обновления API Rules — иначе старые записи становятся недоступны.
> Между шагами 2-10 **не создавать новые записи** (maintenance window ~5-10 мин).

---

## Архитектурные Решения (ADRs)

### ADR-1: `owner_type` discriminator для competitions

**Было:** `competitions.season_id` (required) → единственный владелец
**Стало:**

```
competitions.season_id   → optional FK → seasons     [CHANGED: required→optional]
competitions.athlete_id  → optional FK → athletes    [NEW]
competitions.group_id    → optional FK → groups       [NEW]
competitions.owner_type  → REQUIRED select('season','athlete','group')  [NEW]
```

Семантика:

- `owner_type='athlete'` → `athlete_id` required — личные/исторические старты
- `owner_type='group'` → `group_id` required — командные старты (1 запись = 1 событие)
- `owner_type='season'` → `season_id` required — привязка к сезону (обратная совместимость)

**Почему не `athlete_id: required`:** При group competition (командный старт) нет одного конкретного атлета-владельца. Тренер создаёт ОДИН competition на группу, участники — в `competition_participants`.

**Orphan prevention:** `owner_type` required + pb_hook проверяет что соответствующий FK заполнен.

### ADR-2: `plan_type` discriminator для training_plans

**Было:** `phase_id` required, `week_number` required, `athlete_id` с двойной семантикой
**Стало:**

```
training_plans.phase_id    → optional (было required)
training_plans.week_number → optional (было required)
training_plans.plan_type   → REQUIRED select('phase_based', 'standalone', 'override')  [NEW]
training_plans.start_date  → optional date   [NEW — для standalone планов]
training_plans.end_date    → optional date   [NEW — конец автономного плана]
training_plans.athlete_id  → без изменений (уже optional)
```

| Тип плана | phase_id | week_number | athlete_id | start_date |
|-----------|----------|-------------|------------|------------|
| `phase_based` | ✅ required | ✅ required | null — видимость через season | optional |
| `standalone` | null | null | ✅ required | ✅ required |
| `override` | optional | optional | ✅ required | optional |

### ADR-3: Season Membership Inheritance

**Проблема:** Атлет видит планы ТОЛЬКО через `plan_assignments` — дублирование season membership.

**Решение:** Обновить `training_plans.listRule`:

```
@request.auth.id != "" && deleted_at = "" && (
  # Тренер — видит всё в своих сезонах
  phase_id.season_id.coach_id = @request.auth.id
  # Атлет — в индивидуальном сезоне
  || phase_id.season_id.athlete_id.user_id = @request.auth.id
  # Атлет — в групповом сезоне
  || phase_id.season_id.group_id.group_members_via_group_id.athlete_id.user_id ?= @request.auth.id
  # Standalone / override — прямой владелец
  || athlete_id.user_id = @request.auth.id
  # Standalone — тренер видит
  || athlete_id.coach_id = @request.auth.id
)
```

> ✅ `group_members_via_group_id` back-relation с `?=` — **проверено на проде** (используется в competitions listRule).

Результат: `plan_assignments` из ОБЯЗАТЕЛЬНОГО → ОПЦИОНАЛЬНЫЙ (только для шаринга и исключений).

### ADR-4: `plan_assignments` → Exclusion Tool

После ADR-3 `plan_assignments` нужен только для:

- Шаринга standalone плана с не-участником сезона
- «Освобождения» атлета от конкретного плана (`status: 'inactive'` = badge «Освобождён»)

### ADR-5: `exercise_adjustments` — точечные корректировки

**Проблема:** `createIndividualOverride()` делает FULL COPY плана → дрифт при обновлении базового.

**Решение:** Новая коллекция для точечных изменений (sets/reps/skip конкретного упражнения для конкретного атлета). Базовый план не копируется, merge при рендеринге.

---

## Предлагаемые Изменения

### Phase 2A — Backend: PocketBase Schema

#### [MODIFY] `competitions`

```diff
  season_id:   optional FK → seasons   [CHANGED: required→optional]
+ athlete_id:  optional FK → athletes  [NEW]
+ group_id:    optional FK → groups    [NEW]
+ owner_type:  REQUIRED select('season','athlete','group')  [NEW]
```

API Rules:

```
listRule/viewRule:
  @request.auth.id != "" && deleted_at = "" && (
    (owner_type = "season" && (season_id.coach_id = @request.auth.id || season_id.athlete_id.user_id = @request.auth.id || season_id.group_id.group_members_via_group_id.athlete_id.user_id ?= @request.auth.id))
    || (owner_type = "athlete" && (athlete_id.user_id = @request.auth.id || athlete_id.coach_id = @request.auth.id))
    || (owner_type = "group" && (group_id.coach_id = @request.auth.id || group_id.group_members_via_group_id.athlete_id.user_id ?= @request.auth.id))
  )

createRule:
  @request.auth.id != "" && @request.data.owner_type != ""

updateRule: same as listRule
deleteRule:
  (owner_type = "season" && season_id.coach_id = @request.auth.id)
  || (owner_type = "athlete" && (athlete_id.coach_id = @request.auth.id || athlete_id.user_id = @request.auth.id))
  || (owner_type = "group" && group_id.coach_id = @request.auth.id)
```

Новые индексы:

```sql
CREATE INDEX idx_comp_athlete ON competitions (athlete_id) WHERE athlete_id != '';
CREATE INDEX idx_comp_group ON competitions (group_id) WHERE group_id != '';
CREATE INDEX idx_comp_owner_date ON competitions (owner_type, date);
```

#### [MODIFY] `competition_participants` (каскадная зависимость)

API Rules обновить — заменить `competition_id.season_id.*` на owner_type ветвление:

```
listRule/viewRule:
  @request.auth.id != "" && (
    competition_id.owner_type = "season" && (competition_id.season_id.coach_id = @request.auth.id || competition_id.season_id.athlete_id.user_id = @request.auth.id)
    || competition_id.owner_type = "athlete" && (competition_id.athlete_id.user_id = @request.auth.id || competition_id.athlete_id.coach_id = @request.auth.id)
    || competition_id.owner_type = "group" && (competition_id.group_id.coach_id = @request.auth.id || competition_id.group_id.group_members_via_group_id.athlete_id.user_id ?= @request.auth.id)
    || athlete_id.user_id = @request.auth.id
  )
```

#### [MODIFY] `competition_media` (каскадная зависимость)

Аналогично — обновить все пути через `competition_id.season_id.*` на owner_type ветвление.

#### [MODIFY] `competition_proposals` (каскадная зависимость)

Аналогично.

#### [MODIFY] `training_plans`

```diff
  phase_id:    optional  [CHANGED: required→optional]
  week_number: optional  [CHANGED: required→optional]
+ plan_type:   REQUIRED select('phase_based','standalone','override')  [NEW]
+ start_date:  optional date  [NEW]
+ end_date:    optional date  [NEW]
```

API Rules (Season Membership Inheritance):

```
listRule/viewRule:
  @request.auth.id != "" && deleted_at = "" && (
    phase_id.season_id.coach_id = @request.auth.id
    || phase_id.season_id.athlete_id.user_id = @request.auth.id
    || phase_id.season_id.group_id.group_members_via_group_id.athlete_id.user_id ?= @request.auth.id
    || athlete_id.user_id = @request.auth.id
    || athlete_id.coach_id = @request.auth.id
  )

createRule:
  @request.auth.id != "" && (
    phase_id.season_id.coach_id = @request.auth.id
    || athlete_id.coach_id = @request.auth.id
    || athlete_id.user_id = @request.auth.id
  )
```

Новые индексы:

```sql
CREATE INDEX idx_plans_type ON training_plans (plan_type);
CREATE INDEX idx_plans_standalone ON training_plans (athlete_id) WHERE plan_type = 'standalone';
CREATE INDEX idx_plans_start_date ON training_plans (start_date) WHERE start_date != '';
```

#### [MODIFY] `plan_assignments` (каскадная зависимость)

```
createRule/updateRule:
  @request.auth.id != "" && (
    plan_id.phase_id.season_id.coach_id = @request.auth.id
    || plan_id.athlete_id.coach_id = @request.auth.id
  )
```

#### [NEW] `exercise_adjustments`

| Поле | Тип | Required |
|------|-----|----------|
| `plan_exercise_id` | FK → plan_exercises | ✅ |
| `athlete_id` | FK → athletes | ✅ |
| `sets` | number | ❌ |
| `reps` | text | ❌ |
| `intensity` | text | ❌ |
| `weight` | number | ❌ |
| `duration` | number | ❌ |
| `distance` | number | ❌ |
| `rest_seconds` | number | ❌ |
| `notes` | text | ❌ |
| `skip` | bool | ❌ default false |
| `deleted_at` | date | ❌ |

```sql
CREATE UNIQUE INDEX idx_adj_unique ON exercise_adjustments (plan_exercise_id, athlete_id);
CREATE INDEX idx_adj_athlete ON exercise_adjustments (athlete_id);
```

#### [NEW] pb_hook: ownership validation

```javascript
// pb_hooks/ownership_integrity.pb.js
onRecordCreate("competitions", (e) => {
  const r = e.record;
  const t = r.get("owner_type");
  if (t === "athlete" && !r.get("athlete_id"))
    throw new BadRequestError("athlete_id required for owner_type=athlete");
  if (t === "group" && !r.get("group_id"))
    throw new BadRequestError("group_id required for owner_type=group");
  if (t === "season" && !r.get("season_id"))
    throw new BadRequestError("season_id required for owner_type=season");
});
// Аналогично onRecordUpdate
```

#### [MODIFY] `personal_records`

```diff
+ competition_id: optional FK → competitions  [NEW — normalization, без UI в этом треке]
```

#### [NEW] Скрипт-мигратор

```javascript
// 1. competitions: owner_type + athlete_id/group_id из сезона
for (const comp of allCompetitions) {
  if (!comp.season_id) continue; // safety
  const season = await pb.collection('seasons').getOne(comp.season_id);
  await pb.collection('competitions').update(comp.id, {
    owner_type: 'season', // все старые = сезонные
    athlete_id: season.athlete_id || null,
    group_id: season.group_id || null,
  });
}
// LOG: competitions where owner_type still empty (orphans for manual review)

// 2. training_plans: plan_type
for (const plan of allTrainingPlans) {
  let plan_type = 'phase_based';
  if (plan.parent_plan_id) plan_type = 'override';
  await pb.collection('training_plans').update(plan.id, { plan_type });
}
// LOG: plans where plan_type still empty
```

---

### Phase 2B — Backend: Ad-hoc Training Architecture

Атлет → «Свободная тренировка» → Frontend auto-creates:

```
training_plan { plan_type:'standalone', athlete_id:X, start_date:today, status:'published' }
→ training_log { plan_id: new_plan.id }
```

НЕ требует изменений в `training_logs`.

---

### Phase 3 — Frontend

#### [MODIFY] `src/lib/pocketbase/types.ts`

```typescript
export interface CompetitionsRecord {
  season_id?: string;      // nullable [CHANGED]
  athlete_id?: string;     // [NEW]
  group_id?: string;       // [NEW]
  owner_type: 'season' | 'athlete' | 'group';  // [NEW]
  // rest unchanged
}

export interface TrainingPlansRecord {
  phase_id?: string;       // nullable [CHANGED]
  week_number?: number;    // nullable [CHANGED]
  plan_type: 'phase_based' | 'standalone' | 'override';  // [NEW]
  start_date?: string;     // [NEW]
  end_date?: string;       // [NEW]
  // rest unchanged
}

// [NEW]
export interface ExerciseAdjustmentsRecord {
  plan_exercise_id: string;
  athlete_id: string;
  sets?: number;
  reps?: string;
  intensity?: string;
  weight?: number;
  duration?: number;
  distance?: number;
  rest_seconds?: number;
  notes?: string;
  skip?: boolean;
  deleted_at?: string;
}
```

#### [MODIFY] `src/lib/pocketbase/services/competitions.ts`

- `CompetitionMutationInput.season_id` → optional, добавить `athlete_id?`, `group_id?`, `owner_type`
- `listCompetitions`: фильтр по `athleteId` — OR-логика:

  ```typescript
  if (filters.athleteId) {
    clauses.push('(athlete_id = {:aid} || competition_participants_via_competition_id.athlete_id ?= {:aid})');
  }
  ```

- Добавить фильтр по `groupId`

#### [MODIFY] `src/lib/pocketbase/services/planResolution.ts`

- Добавить Step 0.5: standalone plan lookup по `start_date <= today <= end_date`
- `getPublishedOverrideForAthlete`: обновить фильтр для standalone (без `phase_id.start_date`)
- Добавить `applyAdjustments(exercises, athleteId)` — merge exercise_adjustments

#### [NEW] `src/lib/pocketbase/services/exerciseAdjustments.ts`

CRUD для exercise_adjustments: `upsertAdjustment`, `removeAdjustment`, `listAdjustmentsForPlan`

#### [MODIFY] `src/components/competitions/CompetitionsHub.tsx`

- Past Start: `pastSeasonId` → optional, добавить `owner_type` логику:
  - Нет сезонов / выбрал «без сезона» → `owner_type='athlete'`, `athlete_id=self`
  - Выбрал сезон → `owner_type='season'`, `season_id=selected`
  - Тренер + выбрал группу → `owner_type='group'`, `group_id=selected`
- Empty state для нового атлета без сезонов

#### [MODIFY] `src/lib/validation/`

- `competitionsSchema`: `season_id` optional, `owner_type` required, conditional FK validation
- `trainingPlansSchema`: `phase_id` optional, `plan_type` required enum
- [NEW] `exerciseAdjustmentsSchema`

---

## Порядок Выполнения (КРИТИЧЕСКИ ВАЖЕН)

```
 1.  BACKUP pb_data/ на VPS
 2.  ⚠️ MAINTENANCE WINDOW START
 3.  Добавить новые поля в competitions (season_id→optional, +athlete_id, +group_id, +owner_type)
 4.  Добавить новые поля в training_plans (+plan_type, +start_date, +end_date, phase_id/week_number→optional)
 5.  Создать коллекцию exercise_adjustments
 6.  Добавить competition_id FK в personal_records
 7.  Запустить скрипт-мигратор (competitions + training_plans)
 8.  Деплой pb_hook ownership_integrity.pb.js
 9.  Обновить API Rules: competitions
10.  Обновить API Rules: competition_participants  ← КАСКАДНАЯ ЗАВИСИМОСТЬ
11.  Обновить API Rules: competition_media         ← КАСКАДНАЯ ЗАВИСИМОСТЬ
12.  Обновить API Rules: competition_proposals      ← КАСКАДНАЯ ЗАВИСИМОСТЬ
13.  Обновить API Rules: training_plans (Season Membership Inheritance)
14.  Обновить API Rules: plan_assignments            ← КАСКАДНАЯ ЗАВИСИМОСТЬ
15.  Обновить API Rules: exercise_adjustments
16.  Добавить индексы (competitions, training_plans, exercise_adjustments)
17.  ✅ MAINTENANCE WINDOW END
18.  Frontend: types.ts, services, validation
19.  Frontend: components (CompetitionsHub, planResolution)
20.  pnpm type-check && pnpm build && pnpm test
```

> [!CAUTION]
> Шаги 3-6 (схема) → шаг 7 (мигратор) → шаг 8 (hook) → шаги 9-16 (API Rules + indexes).
> Нарушение порядка = старые данные недоступны до восстановления из backup.

---

## План Верификации

### Automated

```bash
pnpm type-check   # 0 ошибок
pnpm build        # успешный static export
pnpm test         # все существующие тесты зелёные
```

### Manual QA (сценарии из валидации)

| # | Сценарий | Ожидаемый результат |
|---|----------|---------------------|
| S1 | Новый атлет (0 сезонов) → «Add Past Start» | owner_type='athlete', без season_id |
| S2 | Опытный атлет → старт с сезоном | owner_type='season', season_id заполнен |
| S4 | Тренер → командный старт группы | owner_type='group', group_id заполнен, все в группе видят |
| S5 | Атлет видит group comp, но не участвует | Видит с бейджем «👀 Группа» |
| S7 | Фильтр «Мои старты» | OR: athlete_id=me ∪ competition_participants |
| S9 | Старые данные после миграции | Все competitions видны, owner_type='season' |
| S11 | Ad-hoc тренировка без фазы | plan_type='standalone', start_date заполнен |
| S14 | Exercise adjustment для одного атлета | Badge «⚡ скорректировано», базовый план не изменён |
| S15 | Атлет добавлен в группу mid-season | Сразу видит опубликованные планы |

---

## Оценка Рисков

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Данные недоступны после смены Rules | Высокая | Мигратор ДО Rules (шаг 7 → шаги 9-16) |
| competition_participants/media/proposals сломаются | Высокая | Явные шаги 10-12 |
| plan_assignments createRule сломается | Средняя | Явный шаг 14 |
| owner_type не заполнен для новых записей | Низкая | pb_hook + required field |
| exercise_adjustments UNIQUE нарушен при upsert | Низкая | getFirstListItem → update if exists |
| TypeScript ошибки | Low | pnpm type-check блокирует |
