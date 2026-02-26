# Gate 4.263 — Schema Decoupling (Polymorphic Ownership)

> **Цель:** Отвязать `competitions` и `training_plans` от обязательной привязки к `season_id` / `phase_id`, ввести полиморфное владение через `owner_type` / `plan_type`.

---

## Phase 1 — Планирование и Архитектурное Ревью

- [x] Брейншторм проведён (conversation b1b5051a)
- [x] Architectural Decision Records (ADR-1..3) зафиксированы в context.md
- [x] Выявлены все затронутые коллекции (competitions, training_plans + каскадные)
- [x] Выявлены все затронутые файлы фронтенда
- [x] Schema analysis + design questions — 4 вопроса с вариантами решены
- [x] Ревью (track-4263-review.md) — 10 проблем выявлено и адресовано
- [x] Сценарная валидация — 20 сценариев × 5 персон, все покрыты
- [x] owner_type vs athlete_id:required — решено: owner_type discriminator (v3.0)
- [x] `implementation_plan.md` v3.0 согласован с пользователем

---

## Phase 2A — Миграция БД: Schema (PocketBase)

> ⚠️ Выполнять только после полного BACKUP данных на VPS
> ⚠️ Maintenance window ~5-10 мин: не создавать записи между шагами

- [x] Бэкап `pb_data/` сделан на VPS перед изменениями
- [x] `competitions`: `season_id` → `required: false`
- [x] `competitions`: добавлено поле `athlete_id` (relation → athletes, nullable)
- [x] `competitions`: добавлено поле `group_id` (relation → groups, nullable)
- [x] `competitions`: добавлено поле `owner_type` (select: season/athlete/group, required)
- [x] `training_plans`: `phase_id` → `required: false`
- [x] `training_plans`: `week_number` → `required: false`
- [x] `training_plans`: добавлено поле `plan_type` (select: phase_based/standalone/override, required)
- [x] `training_plans`: добавлено поле `start_date` (date, optional)
- [x] `training_plans`: добавлено поле `end_date` (date, optional)
- [x] `exercise_adjustments` — новая коллекция создана (12 полей + UNIQUE index)
- [x] `personal_records`: добавлено поле `competition_id` (FK → competitions, optional)

---

## Phase 2B — Миграция БД: Data + Hooks + Rules

- [x] Скрипт-мигратор написан с DRY RUN mode + логирование orphans
- [x] Скрипт-мигратор запущен на продакшене, данные проверены (11 comp + 12 plans, 0 orphans)
- [x] `pb_hooks/ownership_integrity.pb.js` — validation hook создан и деплоен
- [x] API Rules: `competitions` — обновлены (owner_type ветвление)
- [x] API Rules: `competition_participants` — обновлены (каскадная зависимость)
- [x] API Rules: `competition_media` — обновлены (каскадная зависимость)
- [x] API Rules: `competition_proposals` — обновлены (каскадная зависимость)
- [x] API Rules: `training_plans` — обновлены (Season Membership Inheritance)
- [x] API Rules: `plan_assignments` — обновлены (nullable phase_id)
- [ ] API Rules: `exercise_adjustments` — созданы
- [x] Индексы: `competitions` (athlete_id, group_id, owner_type+date)
- [x] Индексы: `training_plans` (plan_type, standalone+athlete, start_date)
- [x] Индексы: `exercise_adjustments` (UNIQUE + athlete + plan_exercise)

---

## Phase 3 — Обновление Фронтенда

- [ ] `types.ts` — `CompetitionsRecord`: season_id optional, +athlete_id, +group_id, +owner_type
- [ ] `types.ts` — `TrainingPlansRecord`: phase_id/week_number optional, +plan_type, +start_date, +end_date
- [ ] `types.ts` — `ExerciseAdjustmentsRecord` — новый интерфейс
- [ ] `services/competitions.ts` — `CompetitionMutationInput`: season_id optional, +owner_type, +athlete_id, +group_id
- [ ] `services/competitions.ts` — `listCompetitions`: OR-логика (athlete_id ∪ competition_participants)
- [ ] `services/planResolution.ts` — Step 0.5: standalone plan lookup по start_date
- [ ] `services/planResolution.ts` — `applyAdjustments()` merge для exercise_adjustments
- [ ] [NEW] `services/exerciseAdjustments.ts` — CRUD для exercise_adjustments
- [ ] `CompetitionsHub.tsx` — форма «Add Past Start» работает без season_id (owner_type auto-detect)
- [ ] `CompetitionsHub.tsx` — Empty state для нового атлета без сезонов
- [ ] `CompetitionsHub.tsx` — Бейджи «🏃 Участвую» / «👀 Группа» для group competitions
- [ ] Zod-схемы в `src/lib/validation/` обновлены
- [ ] `pnpm type-check` — 0 ошибок
- [ ] `pnpm build` — успешный билд

---

## Phase 4 — QA и Деплой

- [ ] S1: Новый атлет (0 сезонов) → «Add Past Start» работает
- [ ] S2: Опытный атлет → старт с привязкой к сезону работает
- [ ] S4: Тренер → командный старт группы → все участники видят
- [ ] S5: Атлет видит group comp, но не участвует → бейдж «👀 Группа»
- [ ] S7: Фильтр «Мои старты» → athlete_id ∪ participants
- [ ] S9: Старые данные после миграции корректны
- [ ] S11: Ad-hoc тренировка (standalone plan) — создаётся и работает
- [ ] S14: Exercise adjustment → badge «⚡», базовый план не изменён
- [ ] S15: Mid-season join → атлет сразу видит планы
- [ ] Деплой на VPS выполнен (`/deploy`)
- [ ] `walkthrough.md` написан

---

## Acceptance Criteria (Definition of Done)

1. Атлет без единого сезона может добавить «Прошлый Старт» (owner_type='athlete')
2. Тренер может создать командный старт для группы (owner_type='group'), все участники видят
3. Тренер может создать ad-hoc тренировку без season→phase (plan_type='standalone')
4. Атлет в сезоне видит планы автоматически без plan_assignments (Season Membership Inheritance)
5. Exercise adjustments: точечные корректировки без full copy
6. Все существующие данные в продакшене отображаются корректно после миграции
7. `pnpm build` и `pnpm type-check` проходят без ошибок
