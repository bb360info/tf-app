# Track 4.16: DB Integrity — Implementation Plan

**Трек:** 4.16 — DB Integrity & FK Fixes  
**Приоритет:** High (2 критических бага влияют на рабочий функционал)  
**Оценка:** 1.5-2 дня  
**Скиллы по фазам:** см. ниже

---

## Контекст проблем

Аудит PocketBase схемы (Февраль 2026) выявил несогласованность в FK-связях и фильтрах. Серьёзность: Фаза 1 — критические баги, Фаза 2 — security, Фаза 3 — polish.

---

## Фаза 1: Critical Fixes

### 🛠 Скиллы: `always` + `architecture` + `database-architect`

---

### [MODIFY PB] seasons — athlete_id FK target

**Почему критично:**
- `SeasonWizard` пишет `athlete.id` в `seasons.athlete_id`
- PB ожидает `user.id` (FK → users)
- При попытке привязать сезон → PB error `relation record not found`
- `getPublishedPlanForToday(athleteId)` ищет season по athlete id → всегда пустой результат
- `hardDeleteAthleteWithData()` не удалит сезоны атлета (найдёт 0 записей)

**Команда исправления:**
```bash
# Получить admin token
TOKEN=$(curl -s -X POST https://jumpedia.app/api/collections/_superusers/auth-with-password \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$PB_ADMIN_EMAIL\",\"password\":\"$PB_ADMIN_PASSWORD\"}" | jq -r '.token')

# Проверить текущую схему
curl -s https://jumpedia.app/api/collections/seasons -H "Authorization: $TOKEN" \
  | jq '.fields[] | select(.name=="athlete_id")'

# Обновить FK target
curl -X PATCH https://jumpedia.app/api/collections/seasons \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": [
      {
        "id": "relation4268477323",
        "name": "athlete_id",
        "type": "relation",
        "collectionId": "pbc_401194191",
        "cascadeDelete": false,
        "maxSelect": 1,
        "minSelect": 0,
        "required": false,
        "presentable": false,
        "hidden": false
      }
    ]
  }'
```

> ⚠️ **Важно:** `cascadeDelete: false` — удаление athlete не должно каскадно удалять сезоны.
> Сезон может одновременно принадлежать тренеру и быть назначен athlete.

**Проверка:**
```bash
curl -s https://jumpedia.app/api/collections/seasons -H "Authorization: $TOKEN" \
  | jq '.fields[] | select(.name=="athlete_id") | {collectionId, cascadeDelete}'
# Ожидаем: {"collectionId": "pbc_401194191", "cascadeDelete": false}
```

**Влияние на данные:** Все 17 существующих сезонов имеют `athlete_id = ""` → миграция данных не нужна.

---

### [MODIFY] `src/lib/pocketbase/types.ts`

```diff
 export interface SeasonsRecord extends BaseRecord, SoftDeletable {
     coach_id: string;  // FK → users
-    athlete_id?: string; // FK → users (if assigned to specific athlete)
+    athlete_id?: string; // FK → athletes (individual season assignment)
     name: string;
     start_date: string;
     end_date: string;
 }
```

---

### [MODIFY] `src/lib/pocketbase/services/customExercises.ts`

```diff
-        filter: `coach_id = "${coachId}" && deleted = false`,
+        filter: `coach_id = "${coachId}" && deleted_at = ""`,
```

```diff
-        filter: `visibility = "approved" && deleted = false`,
+        filter: `visibility = "approved" && deleted_at = ""`,
```

**Почему критично:** Поля `deleted` (bool) не существует в PB-коллекции `custom_exercises`.
Есть только `deleted_at` (date). PB может вернуть ошибку или пустой результат.

---

## Фаза 2: API Rules Hardening

### 🛠 Скиллы: `always` + `auth_security` + `database-architect`

**Текущая проблема:** 4 коллекции — `training_logs`, `daily_checkins`, `training_plans`, `plan_assignments` — имеют правило `@request.auth.id != ""`, что означает **любой авторизованный пользователь может читать ВСЕ данные**.

**Архитектурный принцип:** Row-level security через PocketBase rules.

**Шаблон правил для athlete-related данных:**
```
@request.auth.id != "" && 
  (athlete_id.coach_id = @request.auth.id || athlete_id.user_id = @request.auth.id)
```

### Таблица изменений для PB Admin

| Коллекция | Rule | Было | Станет |
|-----------|------|------|--------|
| `training_logs` | list/view | `auth != ""` | `auth != "" && (athlete_id.coach_id = @req || athlete_id.user_id = @req)` |
| `training_logs` | create | `auth != ""` | то же |
| `training_logs` | update | `auth != ""` | то же |
| `training_logs` | delete | `auth != ""` | `auth != "" && athlete_id.coach_id = @req` |
| `daily_checkins` | list/view/create/update | `auth != ""` | `auth != "" && (athlete_id.coach_id = @req || athlete_id.user_id = @req)` |
| `daily_checkins` | delete | `auth != ""` | `auth != "" && athlete_id.coach_id = @req` |
| `training_plans` | all | `auth != ""` | `auth != "" && phase_id.season_id.coach_id = @req` |
| `plan_assignments` | all | `auth != ""` | `auth != "" && plan_id.phase_id.season_id.coach_id = @req` |

> ⚠️ **Перед применением:** Протестировать через PB Admin Rule Tester с реальными данными. Relation-chain глубиной 3+ (phase_id.season_id.coach_id) поддерживается PocketBase v0.23+, но стоит проверить.

---

## Фаза 3: Medium & Low Fixes

### 🛠 Скиллы: `always` + `typescript` + `architecture`

---

### [MODIFY] `src/lib/pocketbase/services/seasons.ts` — `listSeasons()` семантика

**Текущее поведение:**
```ts
if (athleteId === 'self') {
    filter += ` && athlete_id = ""`;  // показывает сезоны БЕЗ привязки, не "мои"
}
```

**Правильное поведение:** Вызывающий код передаёт реальный `athleteId`, функция фильтрует.

```ts
// NEW: убрать специальный кейс 'self'
if (athleteId) {
    filter += ` && athlete_id = "${athleteId}"`;
}
// Без athleteId → все сезоны coach (текущее поведение для тренера)
```

**Найти все вызовы `listSeasons('self')`** и заменить на вызов с реальным athlete ID.

---

### [MODIFY PB] seasons — добавить athlete в listRule/viewRule

```
listRule: @request.auth.id != "" && (coach_id = @request.auth.id || athlete_id.user_id = @request.auth.id)
viewRule: то же
```

---

### [MODIFY PB] athletes — UNIQUE index на user_id

```sql
CREATE UNIQUE INDEX idx_athletes_user ON athletes (user_id) WHERE user_id != ''
```

**Через PB Admin UI:** Collections → athletes → Indexes → Add → вставить SQL выше.

Или через API в gate.md проверку:
```bash
curl -X PATCH https://jumpedia.app/api/collections/athletes \
  -H "Authorization: $TOKEN" \
  -d '{"indexes": ["CREATE INDEX idx_athletes_coach ON athletes (coach_id)", "CREATE UNIQUE INDEX idx_athletes_user ON athletes (user_id) WHERE user_id != ''"]}'
```

---

### [DECISION] `hardDeleteAthleteWithData()` — сезоны

После FK fix (Фаза 1.1) сезоны найдутся корректно по athlete ID.

**Вопрос:** При удалении athlete должны ли удаляться сезоны или только сниматься привязка?

**Рекомендация:** Снимать привязку (`athlete_id = ""`), не удалять — сезон создан тренером и принадлежит ему. Тренер может переназначить другому athlete.

```diff
 // 3. Seasons owned by this athlete
 const seasons = ...
-for (const season of seasons) {
-    // delete competitions, phases, plans, season
-}
+// Снять привязку athlete от сезонов (не удалять)
+await Promise.all(
+    seasons.map(s => pb.collection(Collections.SEASONS).update(s.id, { athlete_id: null }))
+);
```

---

## Verification Plan

### Automated
```bash
pnpm type-check   # 0 errors
pnpm build         # static export success
pnpm test          # all tests pass
grep -rn 'deleted = false' src/ --include="*.ts"  # 0 results
```

### Manual
1. **FK Fix:** PB Admin → seasons → athlete_id field → collectionId = `pbc_401194191`
2. **SeasonWizard:** Создать новый сезон, выбрать athlete → сохранить без ошибки
3. **Custom exercises:** Открыть страницу с кастомными упражнениями → нет 400 ошибок в консоли
4. **Training View (athlete):** Залогиниться как athlete → `/training` → `getPublishedPlanForToday()` находит план (если есть assigned season)
5. **API Security:** Попробовать `GET /api/collections/training_logs/records` с чужим токеном → 0 результатов
