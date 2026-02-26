# Анализ и улучшения Track 4.21 — Athlete Specialization & PR

## Контекст

Track 4.21 добавляет систему дисциплин (TJ/LJ/HJ), личных рекордов, разделение `first_name`/`last_name` и упрощение онбоардинга. Провёл полный code review всех файлов, затронутых треком.

**Скиллы:** `concise-planning`, `architect-review`, `jumpedia-design-system`, `verification-before-completion`, `lint-and-validate`

**Текущий статус проекта:** `pnpm type-check` ✅ Exit 0 — проект собирается.

---

## 🐛 Баги и проблемы в текущем плане

### 1. SQL Injection — `listMyAthletes()` не использует `pb.filter()`

В [athletes.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/athletes.ts#L30-L32):

```typescript
filter: `coach_id = "${user.id}" && deleted_at = ""`,
```

Двойная интерполяция. Уже было исправлено в `notifications.ts` (Track 4.19) — нужно мигрировать на `pb.filter()`.

> [!WARNING]
> Аналогичная проблема в `hardDeleteAthleteWithData()` (3+ raw interpolations), `getLatestCheckin()`, `getLatestTestResult()`, `listMyGroups()`, `listGroupMembers()`.

### 2. `window.confirm()` всё ещё используется

Найдено **4 места** с `window.confirm()`:
- `AthleteCard.tsx:73` — не заменён на `ConfirmDialog`
- `QuickPlanBuilder.tsx:174` — `confirmClear`
- `WeekConstructor.tsx:181` — `confirmAutoFill`
- `WeekConstructor.tsx:474` — `confirmPublish`

> [!IMPORTANT]
> ConfirmDialog уже создан (Track 4.20), но не внедрён повсеместно. Track 4.21 добавит новые модалки — нужно использовать `ConfirmDialog` сразу.

### 3. `RegisterSchema` — нет поддержки `first_name` / `last_name`

В [core.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/validation/core.ts#L33-L38):

```typescript
export const RegisterSchema = z.object({
    email: z.email(),
    name: z.string().min(1).max(255),  // ← нужно first_name + last_name
    password: z.string().min(8),
    passwordConfirm: z.string().min(8),
});
```

**План предусматривает** split, но нужно обновить и `RegisterSchema`, и `UsersSchema`, и `AthletesSchema`.

### 4. `updateAthlete()` — жёстко типизирован без дисциплин

```typescript
data: Partial<Pick<AthletesRecord, 'name' | 'birth_date' | 'gender' | 'height_cm'>>
```

Нужно добавить `'primary_discipline' | 'secondary_disciplines'` в `Pick`.

### 5. `joinByInviteCode()` — использует `user.name` без fallback на `first_name`/`last_name`

```typescript
name: user.name || user.email?.split('@')[0] || 'Athlete',
```

После миграции нужно: `\`${user.first_name || ''} ${user.last_name || ''}\`.trim() || user.name || ...`

---

## 📐 Архитектурные улучшения

### 6. `personal_records` — отсутствует каскадное удаление

В `hardDeleteAthleteWithData()` нет строки для удаления PRs. После создания коллекции `personal_records` нужно добавить:

```typescript
// After test_results, before achievements
await deleteAll(Collections.PERSONAL_RECORDS, `athlete_id = "${athleteId}"`);
```

### 7. Дисциплины — `triple_jump` vs `TJ` несогласованность

В implementation_plan PB select `(TJ/LJ/HJ)`, но TypeScript: `'triple_jump' | 'long_jump' | 'high_jump'`. **Нужно решить:**
- **Рекомендация:** в PB использовать человекочитаемые `triple_jump`, `long_jump`, `high_jump` — как уже сделано для `phase_type`, `test_type` etc. 
  
### 8. `is_current` flip logic — потенциальная гонка

`addPersonalRecord()` должен одновременно:
1. Установить `is_current = false` для предыдущего PR (того же `athlete_id + discipline + season_type`)
2. Создать новый PR с `is_current = true`

Без транзакции возможно 2 текущих PR. **Решение:** update → create (в этом порядке), ошибка create → откатить update.

### 9. `secondary_disciplines` — JSON array vs PB multi-select

PB поддерживает multi-select нативно (type: `select`, maxSelect > 1). Это лучше JSON array:
- Валидация на уровне PB (только из списка)
- Индексация работает
- API фильтрация `secondary_disciplines ~ "long_jump"` 

**Рекомендация:** Использовать PB multi-select вместо JSON.

---

## 🎨 UX/UI улучшения

### 10. Онбоардинг — StepSpecialization только для athletes

Бланк корректно описан, но нужно учитывать UI:
- **Карточки дисциплин** — не карточки `<button>` шириной в row, а **3 selectable cards** (как в Dribbble). Иконки: кастомные SVG прыжков или fallback Lucide (`Maximize2` для triple, `MoveRight` для long, `ArrowUpRight` для high).
- **PR inputs** — должны быть inline с unit badge `м`, placeholder `0.00`. Поддержка float: `<input type="number" step="0.01">`.
- **Skip hint** — «Рекорды можно добавить позже» → prominent, не мелким текстом.

### 11. Settings → Discipline Selector — повтор UI онбоардинга

Нужно извлечь общий компонент `DisciplineSelector`:
- Используется в `StepSpecialization` (onboarding)
- Используется в `settings/page.tsx`
- Используется в `AthleteDetailClient.tsx` (coach edit)

### 12. PR Table — не хватает empty state

Когда у атлета нет PR, нужно:
- Пустое состояние с иконкой `Trophy` и текстом «Добавьте свой первый рекорд»
- CTA кнопка → открыть AddPRModal

### 13. `AthleteCard.tsx` — initials() нужно обновить

Текущая реализация:
```typescript
function initials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase();
}
```

После миграции должна использовать `getInitials(record)` helper с fallback.

### 14. Athlete Dashboard — discipline badge positioning

Badge дисциплины нужно показывать рядом с именем (в hero area), не внизу. Паттерн — chip рядом с greeting: `«Привет, Иван! 🏋️ Triple Jump»` (Lucide icon + text, не emoji).

---

## 🏗️ Недостающие пункты в плане

### 15. `EditAthleteModal.tsx` не упомянут

Coach может редактировать атлета — нужно добавить discipline fields в модалку.

### 16. `hardDeleteAthleteWithData()` — нет удаления PRs

Уже описано в п.6, но нет в gate.md.

### 17. `AddAthleteModal.tsx` — нет discipline при создании

Coach создаёт атлета → нужно optional discipline selector при создании.

### 18. `coach_preferences` → нет сохранения предпочтения дисциплин

Если тренер специализируется (только прыжки в высоту), было бы полезно сохранить default discipline для auto-fill при создании атлетов.

---

## ✅ Что хорошо в текущем плане

- **Разделение по фазам** — логичный порядок (schema → types → services → UI → i18n → QA)
- **Backward compatibility** — `name` сохраняется, fallback через `getDisplayName()`
- **PR всегда в метрах** — правильное решение, как `testUnit()`
- **separate `personal_records` collection** — правильная нормализация
- **API rules** — coach OR athlete access pattern уже описан

---

## Verification Plan

### Автоматические тесты

```bash
pnpm type-check && pnpm build && pnpm test
```

### Новые unit тесты (рекомендуемые)

1. **`personalRecords.test.ts`** — `is_current` flip logic: создать PR, создать второй → первый автоматически `is_current = false`
2. **`validation/personalRecords.test.ts`** — Zod schema: result 0-30, discipline enum, secondary ≠ primary refine
3. **`getDisplayName.test.ts`** — fallback logic: `first+last` → `name` → `email`

### Browser QA (ручное тестирование)

1. Регистрация → `first_name` + `last_name` → проверить что `name` = concatenated
2. Онбоардинг athlete → StepSpecialization → выбрать discipline → optional PR → Done
3. Settings → изменить discipline → добавить PR → проверить history
4. Coach → AthleteDetail → discipline + PR видны
5. Invite flow → athlete join → проверить что athlete record создан с first/last name

---

## Приоритет исправлений

| # | Проблема | Приоритет | Когда |
|---|----------|-----------|-------|
| 1 | SQL injection в athletes.ts | 🔴 Critical | Перед track 4.21 |
| 7 | Дисциплины naming `TJ` vs `triple_jump` | 🔴 Critical | Phase 1 |
| 9 | JSON vs PB multi-select | 🟡 Medium | Phase 1 (design decision) |
| 6 | PRs в hardDelete | 🔴 Critical | Phase 2 |
| 8 | is_current race condition | 🟡 Medium | Phase 2 |
| 3 | RegisterSchema update | 🔴 Critical | Phase 3 |
| 4 | updateAthlete types | 🟡 Medium | Phase 2 |
| 5 | joinByInviteCode name fallback | 🟡 Medium | Phase 5 |
| 11 | DisciplineSelector shared component | 🟢 Nice-to-have | Phase 3-4 |
| 15 | EditAthleteModal discipline | 🟡 Medium | Phase 4 |
| 2 | window.confirm → ConfirmDialog | 🟢 Nice-to-have | Отдельный PR |
