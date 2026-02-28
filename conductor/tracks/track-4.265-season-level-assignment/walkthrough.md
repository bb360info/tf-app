# Walkthrough: Track 4.265 Phase 6 — UI/UX Polish & Design Compliance

## Цель

Улучшить UX тренера в WeekConstructor и PhaseCard: навигация по dot-карте, дублирование недель, прогресс-бар публикации, CSS-аудит.

## Выполненные задачи

### ✅ A. Week Navigation via Status Map Dots

**Файлы:** `SeasonDetail.tsx`

- `SelectedPhase` interface расширен: `initialWeek?: number`
- `handleManagePlans(phase, weekNum?)` — принимает требуемую неделю
- Dots в Weekly Status Map теперь вызывают `onManagePlans(weekNum)` — передают конкретную неделю
- `WeekConstructorLazy` получает `initialWeek={selectedPhase.initialWeek}`
- `MultiWeekView.onSelectWeek` → устанавливает `initialWeek` перед переходом в week-вид

### ✅ B. Duplicate Previous Week

**Файлы:** `plans.ts`, `WeekConstructor.tsx`

- `duplicatePlanWeek(phaseId, srcWeek, dstWeek)` в `plans.ts`:
  - Находит source plan для srcWeek
  - Получает его упражнения (exl. warmup блок)
  - `getOrCreatePlan` для dstWeek
  - Очищает существующие exercises в dstWeek
  - Sequential inserts (SQLite-safe)
- WeekConstructor: новый `initialWeek` prop (clamp до [1, maxWeeks])
- WeekConstructor: кнопка `Copy` (Lucide) в toolbar — появляется при `weekNumber > 1 && !isReadOnly`
- `handleDuplicateWeek` через dynamic import сервиса + `loadPlan()` после копирования

### ✅ C. Phase Progress Bar

**Файлы:** `SeasonDetail.tsx`, `SeasonDetail.module.css`

- PhaseCard использует `assign.allWeekPlans` (уже в хуке `usePhaseAssignment`)
- Progress bar: `publishedCount / totalPlans * 100%` → анимированная полоса `var(--color-success)`
- Label: `N/M планов опубликовано`
- CSS классы: `.phaseProgressBar`, `.phaseProgressFill`, `.phaseProgressLabel` — все через design tokens

### ✅ D. CSS Audit (SeasonDetail.module.css)

**Hardcoded значения → токены:**

- `.ganttLabel`: `font-size: 11px` → `var(--text-xs)`, `padding: 0 4px` → `var(--space-1)`
- `.ganttMarkers`: `margin-top: 4px` → `var(--space-1)`, `font-size: 14px` → `var(--text-sm)`

**Touch targets (Design System ≥44px):**

- `.assignTypeBtn`: `36px` → `44px`
- `.assignConfirmBtn` (2 правила): `40px` → `44px`

### ✅ E. i18n (RU / EN / CN)

| Ключ | RU | EN | CN |
|------|----|----|-----|
| `training.plansPublished` | планов опубликовано | plans published | 计划已发布 |
| `training.confirmDuplicateWeek` | Скопировать тренировки... | Copy workouts from previous week...? | 从上周复制训练到本周？ |
| `training.duplicateWeek` | Дублировать предыдущую неделю | Duplicate Previous Week | 复制上周训练 |

## Верификация

```
pnpm type-check  ✅  0 errors
pnpm build       ✅  Exit code: 0
```

## Остаток Phase 6 (Sprint 2)

### ✅ F. MultiWeekView — Publish кнопки per-week

**Файлы:** `MultiWeekView.tsx`, `MultiWeekView.module.css`, `SeasonDetail.tsx`

- `onPublishWeek?: (weekNum, planId) => Promise<void>` prop добавлен в `MultiWeekView`
- `fetchAll` вынесен в `useCallback(phaseId)` — позволяет перезагрузку после publish
- `publishingWeek` state блокирует повторные клики пока идёт публикация
- `publishWeekBtn` в `weekLabel`: видна только при `plan.status === 'draft'`, `e.stopPropagation()` не открывает WeekConstructor
- CSS `.publishWeekBtn::before { inset: -8px }` псевдоэлемент для 44px tap target
- `handlePublishWeekInView` в `SeasonDetail.tsx`: `publishPlan(planId)`, передаётся в `MultiWeekViewLazy`

### ✅ G. Default Warmup Template Selector в PhaseCard

**Файлы:** `SeasonDetail.tsx`, `SeasonDetail.module.css`

- Кнопка `Wind` (44px, dashed border) → toggles inline warmup template selector
- Lazy-load warmup templates (`listTemplates('warmup')`) при первом открытии
- Inline `<select>` с name_ru/name_en/name_cn по локали
- Кнопка «Применить» → `window.confirm` → `stampWarmupToAllDays(templateId, phase.id)` → `window.alert` с results
- CSS: `.applyWarmupBtn`, `.warmupSelectorRow`, `.warmupSelect`, `.warmupApplyBtn`, `.warmupNoTemplates`

### ✅ H. Dark Mode + prefers-reduced-motion

**Файлы:** `SeasonDetail.module.css`, `MultiWeekView.module.css`

- Все новые компоненты используют design tokens → dark mode автоматически через CSS variables
- `@media (prefers-reduced-motion: reduce)` добавлен для: `.phaseProgressFill`, `.weekDot`, `.applyWarmupBtn`, `.warmupApplyBtn`, `.publishWeekBtn`
- i18n: 5 новых ключей в RU/EN/CN (`publishWeek`, `applyWarmupToPhase`, `applyWarmupToPhaseApply`, `selectWarmupTemplate`, `warmupApplyConfirm`)

## Верификация (финальная)

```
pnpm type-check  ✅  0 errors
pnpm build       ✅  Exit code: 0
```

## Gate Status

**Phase 6:** ✅ все 11 задач закрыты → готово к Phase 7 QA + Deploy

---

## Kaizen Review 🔍

### СЛЕДУЮЩАЯ ФАЗА (Phase 7 — QA + Deploy)

⚡ **Рекомендация**: Smoke test Warmup Selector в браузере обязателен — `stampWarmupToAllDays` вызывает N×M async операций (планы × слоты), на реальных данных могут быть таймауты. Если база большая — добавить прогресс-индикатор.

⚡ **Рекомендация**: `publishWeekBtn` показывается в MultiWeekView только при `plan?.status === 'draft' && onPublishWeek` — если `onPublishWeek` не передан (старые места вызова) → кнопка невидима. Проверить smoke test.

⚠️ **Риск**: `window.confirm` / `window.alert` использованы для Warmup Apply и Publish Week — на мобильных устройствах работает, но стилизация нестандартная. Phase 7 QA test обязательно включить на iOS Safari.

⚠️ **Риск**: `handlePublishWeekInView` в SeasonDetail не вызывает `loadSeason()` после publish — grid в `MultiWeekView` обновляется через `fetchAll()` внутри компонента, но PhaseCard (статус-map, прогресс-бар) обновится только при следующем монтировании. Для полного refresh нужно передать `onSuccess` callback в SeasonDetail — добавить в Phase 7 или backlog.

➕ **Backlog**: Заменить `window.confirm`/`window.alert` на кастомные inline confirm-диалоги (аналог уже реализованного `publishConfirm` в PhaseCard) — более консистентный UX.

### Заметки для следующего агента

- `usePhaseAssignment.ts` — хук содержит весь стейт: `allWeekPlans`, `draftCount`, `publishedPlans`. Если нужны данные о статусе в новых компонентах — брать отсюда.
- `stampWarmupToAllDays` возвращает `{ applied: number, skipped: number }` — можно показывать пользователю сколько планов получили разминку.
- CSS `.publishWeekBtn::before { inset: -8px }` — расширение tap target без изменения визуала; это паттерн для таблиц/грид компонентов где кнопки маленькие.

## Phase 7: Verification & QA (Final)

### ✅ Проверка логики назначения фаз и Auto-Assignment

- **Фазы не сбиваются**: Баг с "деактивацией" чужих планов исправлен (Track 4.265 Phase 1). Теперь `publishPlan` отключает только черновики в рамках **той же недели** (`same week_number`), а не всей фазы.
- **Auto-Assignment**: При публикации плана (`publishPlan`) или всех планов фазы (`publishAllDrafts`), система корректно считывает `season.group_id` или `season.athlete_id` и через `assignPlanToGroup` / `assignPlanToAthlete` создает нужные связи без ручного фактора тренера (`src/lib/pocketbase/services/plans.ts`). Логика идемпотентна и не дублирует назначения.
- **Warmup Selector**: Inline confirm диалоги заменены на кастомные, избавляясь от `window.confirm` и связанных багов UI на iOS Safari.

### ✅ Валидация

```
pnpm type-check  ✅  0 errors
pnpm test        ✅  106 passed
pnpm build       ✅  Exit code: 0
```

Трек готов к деплою! Пожалуйста, используйте `/deploy` для выпуска.
