# Gate 4.16: DB Integrity — FK Fixes + API Rules + Soft-Delete Consistency

> **Контекст:** Аудит `users`/`athletes` выявил 7 проблем. 2 критических (broken FK, wrong filter),
> 3 средних (слабые API Rules, semantic bug, hardDelete пропуск), 2 низких (rules для athlete, missing index).
>
> **Источник:** `brain/d01deece.../implementation_plan.md`
>
> **Зависимости:** Не блокирует Track 4.15 (работают в разных слоях). Выполнять параллельно или после 4.15 Phase 1.

---

## Фаза 1: Critical Fixes — PB Schema + Service Bugs

> 🛠 **Скиллы:** `always` + `architecture` + `database-architect`
>
> *Mandatory reads перед началом:* `docs/ARCHITECTURE.md`

### 1.1 — FIX: `seasons.athlete_id` FK target (Critical, 10 min)

**Проблема:** `seasons.athlete_id` ссылается на `users` (`_pb_users_auth_`), все остальные `athlete_id` → `athletes` (`pbc_401194191`).

**Последствие:** `SeasonWizard` записывает `athletes.id`, PB ожидает `users.id` → PB error при привязке сезона к атлету. `getPublishedPlanForToday()` и `hardDeleteAthleteWithData()` не находят сезоны.

- [x] Через PocketBase Admin API обновить поле `athlete_id` в коллекции `seasons`:
  - `collectionId: "pbc_401194191"` (athletes, было `_pb_users_auth_`)
  - `cascadeDelete: false` (было `true` — опасно)
- [x] Убедиться: `curl GET https://jumpedia.app/api/collections/seasons` → поле `athlete_id.collectionId = "pbc_401194191"` ✅ подтверждено через MCP API

### 1.2 — FIX: `types.ts` — комментарий `SeasonsRecord.athlete_id` (5 min)

- [x] `src/lib/pocketbase/types.ts` — строка с `athlete_id` в `SeasonsRecord`:
  ```diff
  - athlete_id?: string; // FK → users (if assigned to specific athlete)
  + athlete_id?: string; // FK → athletes (individual season assignment)
  ```

### 1.3 — FIX: `customExercises.ts` — фильтр по несуществующему полю (Critical, 10 min)

**Проблема:** Код фильтрует `deleted = false`, поля `deleted` (bool) нет — есть `deleted_at` (date).

- [x] `src/lib/pocketbase/services/customExercises.ts:61`:
  ```diff
  - filter: `coach_id = "${coachId}" && deleted = false`,
  + filter: `coach_id = "${coachId}" && deleted_at = ""`,
  ```
- [x] `src/lib/pocketbase/services/customExercises.ts:104`:
  ```diff
  - filter: `visibility = "approved" && deleted = false`,
  + filter: `visibility = "approved" && deleted_at = ""`,
  ```

---

## Фаза 2: API Rules Hardening

> 🛠 **Скиллы:** `always` + `auth_security` + `database-architect`
>
> *Mandatory reads:* `docs/SECURITY.md`, `docs/ARCHITECTURE.md`

**Проблема:** 4 коллекции используют `@request.auth.id != ""` — любой авторизованный юзер видит ВСЕ чужие данные.

| Коллекция | Кто должен иметь доступ |
|-----------|------------------------|
| `training_plans` | coach = владелец фазы → `phase_id.season_id.coach_id = @request.auth.id` |
| `training_logs` | coach + сам athlete → `athlete_id.coach_id = @request.auth.id \|\| athlete_id.user_id = @request.auth.id` |
| `daily_checkins` | coach + сам athlete → то же |
| `plan_assignments` | coach → `plan_id.phase_id.season_id.coach_id = @request.auth.id` |

### 2.1 — `training_logs` (10 min)

- [x] `listRule`: `@request.auth.id != "" && (athlete_id.coach_id = @request.auth.id || athlete_id.user_id = @request.auth.id)` ✅
- [x] `viewRule`: то же ✅
- [x] `createRule`: `@request.auth.id != "" && (athlete_id.coach_id = @request.auth.id || athlete_id.user_id = @request.auth.id)` ✅
- [x] `updateRule`: то же ✅
- [x] `deleteRule`: `@request.auth.id != "" && athlete_id.coach_id = @request.auth.id` ✅

### 2.2 — `daily_checkins` (10 min)

- [x] `listRule`: `@request.auth.id != "" && (athlete_id.coach_id = @request.auth.id || athlete_id.user_id = @request.auth.id)` ✅
- [x] `viewRule`: то же ✅
- [x] `createRule`: то же ✅
- [x] `updateRule`: то же ✅
- [x] `deleteRule`: `@request.auth.id != "" && athlete_id.coach_id = @request.auth.id` ✅

### 2.3 — `training_plans` (15 min)

> ⚠️ Relation-chain `phase_id.season_id.coach_id` — убедиться что PB поддерживает such depth.

- [x] Протестировать: PB поддерживает `phase_id.season_id.coach_id` — правило принято без ошибок ✅
- [x] `listRule`/`viewRule`: `phase_id.season_id.coach_id = @request.auth.id || athlete_id.user_id = @request.auth.id` ✅
- [x] `createRule`/`updateRule`/`deleteRule`: `phase_id.season_id.coach_id = @request.auth.id` ✅

### 2.4 — `plan_assignments` (10 min)

- [x] `listRule`/`viewRule`: `plan_id.phase_id.season_id.coach_id = @request.auth.id || athlete_id.user_id = @request.auth.id` ✅
- [x] `createRule`/`updateRule`/`deleteRule`: `plan_id.phase_id.season_id.coach_id = @request.auth.id` ✅

### 2.5 — Регрессионный тест API Rules (15 min)

- [x] Проверить: все правила приняты PocketBase без ошибок ✅
- [ ] `pnpm build` — Exit 0 (pnpm зависает, проверить локально)

---

## Фаза 3: Medium & Low Fixes

> 🛠 **Скиллы:** `always` + `typescript` + `architecture`

### 3.1 — FIX: `listSeasons('self')` семантика (Medium, 10 min)

**Проблема:** `athleteId === 'self'` → `athlete_id = ""` (сезоны без привязки), а не «мои сезоны».

- [x] `src/lib/pocketbase/services/seasons.ts:37-40` — спецкейс `'self'` удалён, просто `if (athleteId)` ✅
- [x] `'self'` нигде не использовался — проверено grep ✅
- [x] Все вызовы `listSeasons()` передают корректные ID ✅

### 3.2 — FIX: `seasons` API Rules — athlete может видеть свои сезоны (Low, 10 min)

- [x] `listRule` seasons: `@request.auth.id != "" && (coach_id = @request.auth.id || athlete_id.user_id = @request.auth.id)` ✅
- [x] `viewRule` seasons: то же ✅

### 3.3 — ADD: UNIQUE index `athletes.user_id` (Low, 5 min)

**Проблема:** Ничто не мешает создать 2 athletics с одним `user_id` → `getSelfAthleteId()` берёт первую.

- [x] Через MCP API добавлен:
  ```sql
  CREATE UNIQUE INDEX idx_athletes_user ON athletes (user_id) WHERE user_id != ''
  ```
- [x] Проверено: 2 записи с уникальными user_id, дубликатов нет ✅

### 3.4 — VERIFY: `hardDeleteAthleteWithData()` (5 min)

**Архитектурное решение:** сезоны в `seasons.athlete_id` УДАЛЯЮТСЯ полностью (не снимается привязка).

- [x] Комментарий обновлён: сезоны с `athlete_id = athleteId` удаляются полностью ✅
- [x] Остальные сезоны тренера (без `athlete_id`) — не затрагиваются ✅

---

## Quality Gate

> 🛠 **Скиллы:** `always` + `lint-and-validate` + `verification-before-completion`

- [ ] `pnpm type-check` — Exit 0
- [ ] `pnpm build` — Exit 0
- [ ] `pnpm test` — Exit 0

### Ручные проверки

- [ ] PB Admin → Collections → seasons → поле `athlete_id` → target = `athletes` (не `users`)
- [ ] SeasonWizard → создать сезон с привязкой к атлету → запись создана, `athlete_id` = ID из `athletes`
- [ ] Страница пользовательских упражнений → список загружается без ошибок 400
- [ ] `grep -rn 'deleted = false' src/ --include="*.ts"` → 0 результатов
- [ ] Coach: создать сезон → назначить athlete → `listSeasons(athleteId)` возвращает именно этот сезон
- [ ] `getPublishedPlanForToday(athleteId)` находит сезон при наличии данных (тест после FK fix)
- [ ] `curl GET https://jumpedia.app/api/collections/athletes` → индекс `idx_athletes_user` существует

---

## Artifacts

- `conductor/tracks/track-4.16-db-integrity/gate.md` — этот файл
- `conductor/tracks/track-4.16-db-integrity/implementation_plan.md` — детальный план
- Источник аудита: `brain/d01deece-78ff-4888-96b1-6fdea1d8e1c0/implementation_plan.md`
