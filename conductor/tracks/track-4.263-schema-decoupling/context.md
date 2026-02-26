# Track 4.263 — Context: Полиморфная Архитектура (Decoupling Season Hierarchy)

## Проблема

В текущей архитектуре (v2) существует **жёсткая иерархическая зависимость**:

```
Coach / Group / Athlete
  └── Season (обязательный, season_id required)
        └── Training Phase (обязательный, season_id required)
              └── Training Plan (обязательный, phase_id required)
              └── Competitions (обязательный, season_id required)
```

### Конкретные боли с которыми столкнулись сейчас

1. **Onboarding новых атлетов сломан:** Атлет не может добавить "Прошлый старт" (`Add Past Start` в `CompetitionsHub`), потому что у него ещё нет ни одного сезона. PocketBase возвращает ошибку — `season_id` обязательный.

2. **Разовые тренировки невозможны:** Тренер не может назначить ad-hoc тренировку ("тренируемся в субботу") без создания полной иерархии: Сезон → Фаза → План.

3. **Группы vs Индивидуалы не решены для соревнований:** Сейчас соревнование принадлежит сезону, а не атлету/группе напрямую. Нет возможности сделать "командный старт" при разных сезонах участников.

4. **API Rules хрупкие:** Права доступа вычисляются цепочкой из 4+ JOIN-ов (`plan_id → phase_id → season_id → coach_id = @request.auth.id`). Это медленно и хрупко — если одно звено пустое, всё ломается.

---

## Цель Трека

Провести **архитектурный рефакторинг** ключевых коллекций для:

- Снижения порога входа (онбординг без сезона)
- Гибкой адресации (атлет, группа, или сезон — как точки привязки)
- Упрощения API Rules (короче и быстрее)
- Сохранения обратной совместимости с существующими данными

---

## Область изменений (Affected Collections)

| Коллекция | Что меняем |
|-----------|-----------|
| `competitions` | `season_id` → Nullable; добавляем `athlete_id` (Nullable), `group_id` (Nullable) |
| `training_plans` | `phase_id` → Nullable; добавляем `athlete_id` (Nullable, если нет через plan_assignments) |
| `training_phases` | Без изменений (остаются внутри сезона) |
| `seasons` | Без изменений |
| `plan_assignments` | Без изменений (уже умеет раздавать на athlete_id или group_id) |

---

## Ключевые Архитектурные Решения (принятые в ходе брейншторма)

### ADR-1: Полиморфное Владение через `owner_type` discriminator

**Решение:** `competitions` используют `owner_type: select('season','athlete','group')` (required) для явного указания типа владения:

- `owner_type='athlete'` → `athlete_id` required — личные/исторические старты
- `owner_type='group'` → `group_id` required — командные старты (1 запись = 1 событие, участники в `competition_participants`)
- `owner_type='season'` → `season_id` required — привязка к сезону (обратная совместимость)

Orphan prevention: `owner_type` required + pb_hook проверяет что соответствующий FK заполнен.

**Альтернатива отклонена:** `athlete_id: required` — не работает для group competitions (тренер создаёт ОДИН competition на группу, нет конкретного атлета-владельца).

**Альтернатива отклонена:** Auto-создание "фейкового" сезона "Archive" — засоряет БД, ломает UX фильтров.

### ADR-2: `plan_type` discriminator для training_plans

**Решение:** `training_plans` используют `plan_type: select('phase_based','standalone','override')` чтобы разрешить семантический конфликт `athlete_id` (override vs direct ownership) и `week_number` (бессмысленно без фазы).

- `phase_based` → phase_id required, week_number required (как сейчас)
- `standalone` → phase_id null, start_date required (ad-hoc тренировки)
- `override` → athlete_id required, parent_plan_id required (существующий механизм)

### ADR-3: Season Membership Inheritance

**Решение:** Обновить API Rules `training_plans` чтобы атлет видел планы **автоматически через season membership** (`phase_id.season_id.athlete_id/group_id`), без обязательного `plan_assignment`. Результат: `plan_assignments` из обязательного → опциональный.

_Проверено на проде:_ `group_members_via_group_id.athlete_id.user_id ?=` работает в PocketBase API Rules.

### ADR-4: `plan_assignments` → Exclusion Tool

**Решение:** После ADR-3 `plan_assignments` нужен только для шаринга standalone плана с не-участником сезона и «освобождения» атлета от плана (status='inactive').

### ADR-5: `exercise_adjustments` — точечные корректировки

**Решение:** Новая коллекция для изменения sets/reps/skip конкретного упражнения для конкретного атлета. Заменяет Full Copy override для мелких корректировок. Merge при рендеринге в `planResolution.ts`.

### ADR-6: Migration-first подход

**Решение:** Перед обновлением API Rules обязательно запустить скрипт-мигратор — он заполнит `owner_type`, `athlete_id`, `group_id`, `plan_type`. Maintenance window ~5-10 мин.

---

## Известные Ограничения PocketBase

- PocketBase не поддерживает CHECK constraints → validation через pb_hooks
- PocketBase API Rules поддерживают back-relation через junction-таблицы с `?=` оператором (проверено на проде)
- PocketBase не поддерживает IS NULL — используем `!= ""` / `= ""`

---

## Файлы, которые будут затронуты

### Backend (PocketBase)

- Схема: `competitions`, `training_plans` — новые поля, изменение required
- Схема: `exercise_adjustments` — новая коллекция
- Схема: `personal_records` — +competition_id FK (optional, без UI)
- API Rules: `competitions`, `competition_participants`, `competition_media`, `competition_proposals` (каскадные)
- API Rules: `training_plans`, `plan_assignments`, `exercise_adjustments`
- `pb_hooks/ownership_integrity.pb.js` — validation hook

### Frontend (Next.js)

- `src/lib/pocketbase/types.ts` — обновление интерфейсов + новый ExerciseAdjustmentsRecord
- `src/lib/pocketbase/services/competitions.ts` — owner_type, OR-логика фильтров
- `src/lib/pocketbase/services/planResolution.ts` — standalone step + applyAdjustments
- `src/lib/pocketbase/services/exerciseAdjustments.ts` — [NEW] CRUD
- `src/components/competitions/CompetitionsHub.tsx` — owner_type auto-detect, empty state, badges
- `src/lib/validation/` — обновление Zod-схем

---

## Источник Идеи

Брейншторм-сессия в Conversation `b1b5051a` (Track 4.262 → боль при онбординге).
Сценарная валидация (20 сценариев × 5 персон) в Conversation `023a0c5b`.
