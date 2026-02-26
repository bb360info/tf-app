# Walkthrough — Track 4.263: Schema Decoupling (Polymorphic Ownership)

---

## Phase 2A — Миграция БД: Schema (PocketBase)
>
> Дата: 2026-02-26 · Агент: [G3H]

### Что сделано

- `competitions.season_id` → `required: false` через PocketBase MCP API
- Добавлены поля в `competitions`: `owner_type` (select: season/athlete/group, required), `athlete_id` (FK→athletes, nullable), `group_id` (FK→groups, nullable)
- Добавлены поля в `training_plans`: `plan_type` (select: phase_based/standalone/override, required); `phase_id` + `week_number` → nullable; `start_date`, `end_date` (optional dates)
- Создана новая коллекция `exercise_adjustments` (12 полей: plan_exercise_id✓, athlete_id✓, sets, reps, intensity, weight, duration, distance, rest_seconds, notes, skip, deleted_at) — UNIQUE index на `(plan_exercise_id, athlete_id)`
- Добавлен `competition_id` (nullable FK → competitions) в `personal_records`
- Добавлены индексы: `competitions` (5 индексов), `training_plans` (4 индекса), `exercise_adjustments` (2 индекса)

### Файлы изменены

| Файл | Изменение |
|------|-----------|
| PocketBase: `competitions` | schema update через MCP |
| PocketBase: `training_plans` | schema update через MCP |
| PocketBase: `exercise_adjustments` | новая коллекция |
| PocketBase: `personal_records` | +competition_id |
| `conductor/tracks/track-4.263-schema-decoupling/gate.md` | Phase 2A: все [x] |

### Верификация

- `pnpm type-check` → ⚠️ только pre-existing Playwright ошибки в `tests/` (не в `src/`)
- `pnpm build` → ✅ Exit 0
- `pnpm test` → —

### Заметки для следующего агента

- Правильные `collectionId` для relations: `athletes=pbc_401194191`, `groups=pbc_3346940990`, `competitions=pbc_4031054395`, `training_plans=pbc_4250298155`, `plan_exercises=pbc_2559885587`
- PocketBase MCP `create_collection` не принимает `@request.data.*` в createRule — обходи через pb_hook
- Все существующие записи: `competitions` имеют `season_id`, `training_plans` имеют `phase_id` — Phase 3 это нужно учесть в типах TypeScript

---

## Phase 2B — Миграция БД: Data + Hooks + Rules
>
> Дата: 2026-02-26 · Агент: [G3H]

### Что сделано

- Написан и запущен скрипт-мигратор `/tmp/migrate-4263.mjs` с DRY_RUN mode
  - 11 competitions → `owner_type='season'` (все имели `season_id`, 0 orphans)
  - 12 training_plans → `plan_type='phase_based'` (все имели `phase_id`, 0 orphans)
- Создан `pb_hooks/ownership_integrity.pb.js` — onRecordCreate/onRecordUpdate hooks для `competitions` (валидация FK consistency по owner_type)
- Обновлены API Rules для 6 коллекций с owner_type-ветвлением:
  - `competitions` — polymorphic listRule/viewRule/updateRule/deleteRule
  - `competition_participants`, `competition_media`, `competition_proposals` — каскадные правила
  - `training_plans` — Season Membership Inheritance + nullable phase_id
  - `plan_assignments` — поддержка `plan_id.athlete_id.coach_id`

### Файлы изменены

| Файл | Изменение |
|------|-----------|
| `pb_hooks/ownership_integrity.pb.js` | новый validation hook |
| PocketBase: 6 коллекций | API Rules обновлены |
| `CHANGELOG.md` | +запись Phase 2A+2B |
| `conductor/tracks/track-4.263-schema-decoupling/gate.md` | Phase 2B: все [x] |

### Верификация

- `pnpm type-check` → ⚠️ только pre-existing Playwright ошибки в `tests/` (не в `src/`)
- `pnpm build` → ✅ Exit 0
- `pnpm test` → —

### Kaizen

> Накопленные наблюдения для Phase 3

- `listCompetitions` в `services/competitions.ts` сейчас фильтрует только по `season_id` — Phase 3 должна добавить OR-логику: `athlete_id = me ∪ competition_participants where athlete_id = me`
- `planResolution.ts` Step 0 предполагает `phase_id.season_id.coach_id` — для `standalone` планов цепочка оборвётся на NULL `phase_id` → нужен Step 0.5 guard
- В `types.ts` `CompetitionsRecord` сейчас требует `season_id: string` — нужно сделать `season_id?: string` и добавить discriminated union для `owner_type`
- Поле `exercise_adjustments` не имеет связи с `training_logs` — при логировании тренировки нужно будет resolve adjustments перед отображением
