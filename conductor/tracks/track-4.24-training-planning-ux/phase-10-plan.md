# Phase 10 — WeekConstructor Refactor + QuickWorkout
> Дата: 2026-02-23 · Агент: [G1H] · Скиллы: `react-patterns`, `react-ui-patterns`, `code-refactoring-refactor-clean`, `jumpedia-design-system`

### Задача 1: Исправление устаревшего `pb.authStore.model` в `QuickPlanBuilder` и `WeekConstructor`
**Файлы:**
- `src/components/training/QuickPlanBuilder.tsx`
- `src/components/training/WeekConstructor.tsx`
**Что делать:**
- Найти использование `pb.authStore.model?.id` в `QuickPlanBuilder.tsx` (строка ~209) и `WeekConstructor.tsx` (строка ~278).
- Заменить на `(pb.authStore.record?.id || pb.authStore.model?.id)`.

### Задача 2: Переименование `QuickPlanBuilder` в `QuickWorkout`
**Файлы:**
- Переименовать `src/components/training/QuickPlanBuilder.tsx` → `src/components/training/QuickWorkout.tsx`
- Переименовать `src/components/training/QuickPlanBuilder.module.css` → `src/components/training/QuickWorkout.module.css`
**Что делать:**
- Выполнить переименование файлов.
- Обновить экспорт/импорт (использовать `grep`, чтобы найти все упоминания `QuickPlanBuilder`, скорее всего в `WeekConstructor` и `DayColumn`).

### Задача 3: Рефакторинг `WeekConstructor`: Извлечение `WeekSummary`
**Файлы:**
- `src/components/training/WeekSummary.tsx` [NEW]
- `src/components/training/WeekConstructor.tsx` [MODIFY]
**Что делать:**
- Создать новый компонент `WeekSummary`, который будет принимать `status`, `exerciseCount`, и `readinessScore` (для Adaptation Warning).
- Вынести `statusRow` (строки ~644-659 из `WeekConstructor.tsx`) в этот компонент.

### Задача 4: Рефакторинг `WeekConstructor`: Извлечение `WeekStrip`
**Файлы:**
- `src/components/training/WeekStrip.tsx` [NEW]
- `src/components/training/WeekConstructor.tsx` [MODIFY]
**Что делать:**
- Создать компонент `WeekStrip`, отвечающий за рендеринг колонки из 7 `DayColumn`.
- Вынести логику рендеринга `div id="week-grid-container"` в этот компонент.
- Передать пропсы: мапу упражнений, `hasLog`, `groupReadiness`, `onOpenDay`, и `getDayDate`.

### Задача 5: Рефакторинг `WeekConstructor`: More Menu (Dropdown) в Toolbar
**Файлы:**
- `src/components/training/WeekConstructor.tsx` [MODIFY]
**Что делать:**
- Заменить группу кнопок `exportControls` (Print, PDF, History, Save, Override) на единое компактное **More menu (`...`)** (например, с иконкой `MoreVertical`).
- Реализовать выпадающее меню (dropdown) для хранения вторичных действий, уменьшая визуальную перегрузку toolbar.

### Задача 6: Проверка логики `publishPlan()`
**Файлы:**
- `src/lib/pocketbase/services/plans.ts`
**Что делать:**
- Код авто-деактивации старых ассайнментов (`unassignPlan`) уже присутствует в строках ~267-287.
- Задача закрывается без изменений в коде (функционал реализован в Фазе 4).
