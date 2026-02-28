# Context — Track 4.267: Constructor Bugs, Assignment Fixes & Planning UX

## Why this track exists

В ходе глубокого аудита системы конструктора (февраль 2026) выявлено 9 багов в жизненном цикле планов и назначений. Одновременно обнаружены критические UX-пробелы: невозможность добавить разминку из шаблона в WeekConstructor, отсутствие UI для `exercise_adjustments`, отсутствие редактирования сезона. Также выявлено, что **трек `track-4-266-quick-workouts` не был закрыт**: `QuickWorkout.tsx` L242–244 по-прежнему бросает `noSeasonForDate` при отсутствии сезона — `ensureStandalonePlan`, `getStandalonePlansForPeriod`, `resolveStandaloneConflict` не реализованы.

**Решение расширить трек на UX-задачи:** они напрямую связаны с bagами и невозможны без исправления lifecycle assignments.

## Подтверждённые баги (из аудита)

### Критические (потеря атлетов)

1. **`duplicatePlanWeek` нет guard на published + нет сброса assignments.**
   Функция молча перезаписывает опубликованный план не меняя статус. `PlanAssignment` продолжают указывать на устаревший контент.

2. **Смена участника сезона не переназначает published планы.**
   `clearSeasonAssignments()` удаляет все назначения, `updateSeasonParticipant()` меняет `athlete_id/group_id`, но `reassignPublishedPlans()` не вызывается (и функция ещё не создана).

### Высокие

1. **`revertToDraft` не деактивирует `PlanAssignment`.**  
   Подтверждено в `plans.ts` L437–441: только меняет статус, атлет продолжает видеть план.

2. **`getOrCreatePlan` создаёт пустые draft-планы** при каждом открытии недели → загрязняет прогресс-бар.

### Средние

1. **`onBack` из WeekConstructor не вызывает `loadSeason()`.**  
   Подтверждено `SeasonDetail.tsx` L173–175 — PhaseCard dots показывают устаревший статус.

2. **Деактивация sibling assignments — fire-and-forget.**  
   `void (async () => {...})()` — UI показывает "опубликовано" до завершения деактивации.

3. **PhaseCard не обновляется при выходе из WeekConstructor.**

### Низкие

1. **SeasonWizard — timezone баг.**  
   `handleSave` L197–198: `new Date(startDate).toISOString()` → записывает UTC midnight.  
   `toLocalISODate` уже импортирован (L18) но НЕ используется в `handleSave`, только в `generateDefaultPhases`.

2. **`getPhaseWeeks()` — не использует UTC-нормализацию.** `±1 неделя` в некоторых тайм-зонах.

## UX-пробелы (расширение скоупа)

### Шаблоны разминок в WeekConstructor (Phase 5)

Сейчас только "+ Warm-Up Step" (free text). Picker шаблонов через `listTemplates('warmup')` + `template_items` → `plan_exercises`.

### Exercise Adjustments UI (Phase 6)

`exercise_adjustments` в PB — per-athlete overrides (sets/reps/intensity/weight/skip). В UI полностью отсутствует. Атлет видит adjusted значения через `applyAdjustments()` в planResolution (уже реализовано), но тренер не может создавать adjustments через UI.

### Inline редактирование сезона (Phase 7)

Минимум: inline edit name + dates в SeasonDetail. Полный Wizard edit mode — в backlog.

## Goals

- Исправить все 9 багов lifecycle `PlanAssignment`.
- Добавить шаблоны разминок в WeekConstructor (Phase 5).
- Реализовать UI для `exercise_adjustments` — индивидуальное дозирование в WeekConstructor (Phase 6).
- Добавить inline редактирование сезона (Phase 7).

## Out of Scope

- E2E Playwright тесты (→ Track 6 backlog)
- Полный edit mode SeasonWizard (→ backlog)
- Групповые overrides на уровне плана (→ backlog)
- Lazy plan creation — не создавать пустые drafts в getOrCreatePlan (→ backlog, рискованно)

## Key Files

| Файл | Изменение |
|------|-----------|
| `src/lib/pocketbase/services/plans.ts` | `duplicatePlanWeek` + `revertToDraft` |
| `src/lib/pocketbase/services/seasons.ts` | `clearSeasonAssignments` + `reassignPublishedPlans` |
| `src/lib/pocketbase/services/planAssignments.ts` | `deactivatePlanAssignments` helper |
| `src/lib/pocketbase/services/exerciseAdjustments.ts` | НОВЫЙ — CRUD для exercise_adjustments |
| `src/lib/pocketbase/services/templates.ts` | `applyWarmupTemplateToDay` |
| `src/components/training/SeasonParticipants.tsx` | вызов reassignPublishedPlans после смены |
| `src/components/training/SeasonDetail.tsx` | `loadSeason()` при onBack, inline season edit |
| `src/components/training/WeekConstructor.tsx` | Warmup template picker, adjustment button |
| `src/components/training/ExerciseAdjustmentPanel.tsx` | НОВЫЙ компонент |
| `src/components/training/WarmupTemplatePicker.tsx` | НОВЫЙ компонент |
| `src/components/training/hooks/usePlanData.ts` | Исправить `loggedDays` |
| `src/components/training/SeasonWizard.tsx` | `toLocalISODate()` в handleSave |
