# Context — Track 4.25: Plan Resolution & Assignment Fixes

## Что делаем

Хирургический фикс критических багов в системе «Атлет видит план». Удаление дублирующей override-логики, фикс SQL injection в plan resolution, добавление week-scoping и phase-scoping в `getPublishedPlanForToday()`, валидация при assign, и UX-улучшения видимости assignments.

## Зачем

1. **Дублирующийся `createIndividualOverride`** — две несовместимые реализации в `plans.ts` и `planAssignments.ts`. Версия в `planAssignments.ts` НЕ ставит `parent_plan_id` → оверрайд невидим для Step 0 в resolution chain. Любой будущий код рискует импортировать «сломанную» версию.
2. **SQL injection** в `getPublishedPlanViaAssignments()` — строковая интерполяция group IDs прямо в PB filter. Хотя IDs приходят из PB, это anti-pattern.
3. **Неправильный план для атлета** — `getPublishedPlanForToday()` не фильтрует по `week_number`. Если в фазе несколько published планов разных недель → атлет получит произвольный.
4. **Stale overrides** — `getPublishedOverrideForAthlete()` не scoped по фазе/сезону → старые оверрайды из прошлых сезонов перекрывают текущий план.
5. **SRP нарушение** — план resolution логика живёт в `logs.ts` — файле для Training Logs. Нарушает Single Responsibility.
6. **Assign UX** — тренер не видит, какой конкретно план назначается, и не видит текущие активные assignments. Нет unassign из UI.
7. **Timezone** — `todayISO()` использует UTC, а не timezone атлета → для Китая (UTC+8) может показать вчерашний план утром.

## Предпосылки

- Track 4.22 завершён — invite links и group management готовы
- Track 4.23 завершён — SQL injection в `planAssignments.ts` и `plans.ts` фильтрах (4+3 queries) уже исправлен. Осталась **одна** injection в `logs.ts:getPublishedPlanViaAssignments`
- Track 4.24 — параллельный трек (UX Redesign тренировочного планирования)

## Аудит: текущее состояние plan resolution

```
getPublishedPlanForToday(athleteId):
  Step 0: Override  → ❌ Не scoped по phase/season
  Step 1: Direct assign → ✅ OK
  Step 2: Group assign → ⚠️ SQL injection risk
  Step 3: Season fallback → ❌ Не фильтрует по week_number
```

## Scope

**Включено:**
- Удаление `createIndividualOverride` и `duplicatePlan` из `planAssignments.ts`
- SQL injection fix в `logs.ts:getPublishedPlanViaAssignments`
- Week-number scoping в `getPublishedPlanForToday` (Step 3)
- Phase/date scoping в `getPublishedOverrideForAthlete` (Step 0)
- Вынос plan resolution в отдельный `planResolution.ts`
- Валидация при assign: только published планы
- Timezone-aware `todayForUser()` helper
- UI: показать assignments на PhaseCard, unassign кнопка
- Auto-deactivate старых assignments при новой публикации

**Отложено (Track 4.24 scope или далее):**
- Навигация по неделям в AthleteTrainingView (большая фича)
- Compliance таблица для тренера (новый компонент)
- «Персонализировать» из карточки атлета (требует UI redesign)

## Затрагиваемые файлы

| Файл | Изменение |
|------|-----------|
| `planAssignments.ts` | DELETE: `createIndividualOverride`, `duplicatePlan` |
| `logs.ts` | MOVE: plan resolution → `planResolution.ts`, fix SQL injection |
| `planResolution.ts` | NEW: extracted plan resolution with fixes |
| `plans.ts` | +auto-deactivate old assignments on publish |
| `groups.ts` | +timezone-aware date helpers import |
| `types.ts` | Без изменений |
| `SeasonDetail.tsx` | +active assignments display, +unassign, +plan name preview |
| `AthleteDashboard.tsx` | Update import: `logs` → `planResolution` |
| `AthleteTrainingView.tsx` | Update import: `logs` → `planResolution` |
| `AthleteDetailClient.tsx` | Update import: `logs` → `planResolution` |
| `lib/utils/dateHelpers.ts` | +`todayForUser(timezone)` helper |
| i18n ×3 | +assign/unassign labels |

## Зависимости

- **Track 4.23** — ✅ ЗАВЕРШЁН. SQL injection fixes в `planAssignments.ts` и `plans.ts` уже применены. Наш scope — только `logs.ts`.
- **Track 4.24** — Параллельный. Нет прямых конфликтов: 4.24 работает с WeekConstructor/QuickPlanBuilder UI, мы — с plan resolution backend и assign UX.
- **Нет зависимости от Track 5/6.**
