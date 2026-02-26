# Walkthrough — Phase 3: Frontend (Types, Services, Components)
>
> Track 4.263 Schema Decoupling · 2026-02-26 · Agent: CS
> Скиллы: typescript-expert, concise-planning, lint-and-validate, jumpedia-design-system

## Чек результата (Iron Law)

```bash
pnpm type-check  # ✅ 0 errors в наших файлах (playwright pre-existing TS errors — не наши)
pnpm lint        # ✅ 0 errors, 20 pre-existing warnings (не добавили ни одного нового)
pnpm build       # ⬜ не запускался (выполнить при деплое через /deploy)
```

## Изменённые файлы

### 🔷 types.ts — Типы

**Новые типы:**

- `PlanType = 'phase_based' | 'standalone' | 'override'`
- `CompetitionOwnerType = 'season' | 'athlete' | 'group'`
- `DiscriminatedOwner` — точный union-тип для polymorphic ownership

**Обновлённые интерфейсы:**

- `TrainingPlansRecord`: `phase_id?`, `week_number?` (optional), `plan_type` (required), `+start_date`, `+end_date`
- `CompetitionsRecord`: `season_id?` (optional), `owner_type` (required), `+athlete_id`, `+group_id`

**Новый интерфейс:**

- `ExerciseAdjustmentsRecord` — per-athlete overrides для упражнений (sets/reps/intensity/skip)

### 🔷 collections.ts

Добавлен `EXERCISE_ADJUSTMENTS: 'exercise_adjustments'`

### 🔷 services/competitions.ts

- `CompetitionMutationInput`: `season_id?`, `owner_type` required, `+athlete_id`, `+group_id`
- `CompetitionFilters`: `+groupId`, `+ownerType`
- **Kaizen fix OR-логика:** `(athlete_id = :aid || participants.athlete_id ?= :aid)`

### 🔷 services/planResolution.ts — Полная перезапись

- **Step 0** — убран `phase_id.start_date` фильтр (NULL safety)
- **Step 0.5** — `getStandalonePlanForToday()` — standalone планы без phase_id
- **Step 3** — добавлен `plan_type = "phase_based"` в фильтр
- **Новая функция** `applyAdjustments()` — merge exercise_adjustments

### 🔷 services/exerciseAdjustments.ts — НОВЫЙ

`upsertAdjustment`, `removeAdjustment`, `listAdjustmentsForPlan`

### 🔷 validation/content.ts + training.ts

Обновлены схемы с новыми полями + cross-field `.refine()` в `CompetitionsSchema`

### 🔷 validation/exerciseAdjustments.ts — НОВЫЙ

`ExerciseAdjustmentsSchema`

### 🔷 validation/index.ts

Добавлены экспорты новых схем

### 🔷 components/competitions/CompetitionsHub.tsx

1. Убрана обязательность `pastSeasonId` в валидации
2. `owner_type` auto-detect при создании прошлого старта
3. Empty state для нового атлета без сезонов
4. `season_id` optional guard в `seasonNameById` lookup

### 🔷 components/training/SeasonDetail.tsx

Адаптированы локальные типы state под `week_number: number | undefined`

## Kaizen feedback — статус

| Пункт | Статус |
|-------|--------|
| listCompetitions OR-логика | ✅ |
| planResolution Step 0.5 guard | ✅ |
| season_id optional + DiscriminatedOwner | ✅ |
| exercise_adjustments resolution | ✅ |

---

## Kaizen Review — для Phase 4 🔍

**Найдено при gap-анализе (`track_4263_analysis2.md.resolved`):**

- ⚡ **ВАЖНО:** `applyAdjustments()` создана, но **не вызывается** в `AthleteTrainingView` — атлет видит базовый план, игнорируя adjustments. Нужно вызвать при загрузке плана.
- ⚡ **ВАЖНО:** Нет UX-флоу «Участвовать / Отказаться» для `owner_type='group'` competitions — атлет видит старт, но не может управлять участием.

**Ложные тревоги (проверено на коде):**

- Dexie.js не используется → offline-sync не нужен для этого трека
- Readiness calculator не зависит от планов → standalone не ломает аналитику
- `todayForUser()` уже timezone-aware → новая проблема только в `planResolution.ts` без timezone (backlog)

**Заметки для следующего агента:**

- Phase 4 — QA heavy: 9 smoke-сценариев (S1/S2/S4/S5/S7/S9/S11/S14/S15) + деплой
- `applyAdjustments()` находится в `planResolution.ts` — нужен вызов после `getPublishedPlanForToday()`
- Кнопка join/leave → нужна API `createParticipant/deleteParticipant` в `competitions.ts`
