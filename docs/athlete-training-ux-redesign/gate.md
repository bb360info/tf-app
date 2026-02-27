# Gate: Редизайн AthleteTrainingView

> Sandbox-трек. Не входит в глобальный Conductor.

---

## Фаза 1 — CSS P0-фиксы (~2-3ч)

- [x] `stepBtn` → `width: 44px; height: 44px`
- [x] `weekNavBtn` → `min-width: 44px; min-height: 44px`
- [x] `skipChip` → `min-height: 44px`
- [x] `rpeInput` — обёртка `44px` с `touch-action: none`
- [x] `dayCardPast { opacity: 0.7 }` (было 0.5)
- [x] Прогресс-чип `0/N` показывать всегда (убрать `loggedCount > 0`)
- [x] `coachNoteIcon` → `size={16}` (было 11)
- [x] `ExerciseRow`: убрать `backdrop-filter: blur` → `background: var(--surface-1)`
- [x] Sticky `DayCardHeader`: `position: sticky; top: 0; z-index: var(--z-raised)`
- [x] **[GAP-2]** `ExerciseRow`: ⚡ бейдж если `planEx._adjusted === true` (Zap icon size={12}, `var(--accent-warning)`)

**Gate 1:** `pnpm type-check && pnpm build && pnpm lint` — ✅ зелёный

---

## Фаза 2 — Overview Mode (~1 день)

- [x] `DayTabNav.tsx` — 7 адаптивных таблеток (`Пн`/`П`), Moon для отдыха, прогресс-дот
- [x] `DayTabNav.module.css` — overflow-x:auto, scrollbar-width:none, scrollIntoView
- [x] `ExerciseListItem.tsx` — компактный вид без SetLogger (Overview-only)
- [x] `AthleteTrainingView` рефактор:
  - [x] State: `mode: 'overview' | 'focus' | 'post_quick' | 'post_full'`
  - [x] State: `selectedDay: number` (по умолчанию todayIdx)
  - [x] Рендер только одного выбранного дня (не все 7)
- [x] Compact RestDay в DayTabNav (нет карточки)
- [x] `AthleteContextBanner` collapsed mode
- [x] FAB «▶ Начать тренировку»
- [x] Кнопка «✓ Залогировать пост-фактум» (скрыта если уже есть live-лог)
- [x] Кнопка «✏️ Редактировать» для залогированных дней
- [x] **[GAP-1]** `AthleteContextBanner`: standalone-режим — мини-баннер «📅 Разовая тренировка · даты» когда `activeSeason=null` но `plan` есть
- [x] **[GAP-4]** `weekNav`: скрывать навигацию по неделям для `plan.plan_type='standalone'` (показывать диапазон дат плана)

**Gate 2:** `pnpm type-check && pnpm build && pnpm lint` — зелёный  
**Gate 2 QA:** DayTabNav переключает дни, прошлые дни read-only, 320px не ломается

---

## Фаза 3 — Focus Mode (~1.5 дня)

- [x] `FocusCard.tsx` — полный экран: медиа, заметки, SetLogger, навигация
- [x] `FocusCard.module.css`
- [x] Медиа-блок: превью + тап → BottomSheet с галереей (свайп между видео)
- [x] Заметки: `plan_exercises.notes` (📋) + `exercises.coach_cues_[locale]` (💡)
- [x] i18n fallback: `en → ru → cn` для `coach_cues`
- [x] Fallback если нет медиа: Lucide иконка по `training_category`
- [x] Custom_text упражнение (нет `exercise_id`): скрытый SetLogger, кнопка «Выполнено»
- [x] SetLogger pre-filled из плана, редактирует значения
- [x] Свайп-навигация: `touchstart/touchend`, зона от 30px до (width-30px)
- [x] Кнопки ← → (оба способа навигации)
- [x] `sessionStorage` для `focusIndex` — позиция сохраняется при reload
- [x] «Сохранить →» — сохранение + переход к следующему
- [x] Skip BottomSheet — 4 причины: Equipment / Pain / Already done / Other
- [x] Возврат `✕ Обзор` в любой момент
- [x] Последнее упражнение → «Завершить 🎉» → toast → возврат в Overview

**Gate 3:** `pnpm type-check && pnpm build && pnpm lint` — зелёный  
**Gate 3 QA (browser_subagent):**

- Focus Mode: свайп и кнопки работают на 375px
- Видео открывается в BottomSheet галерее
- Возврат в Overview сохраняет позицию

---

## Фаза 4 — Post-Workout Mode (~1 день)

- [x] `PostWorkoutSheet.tsx` — BottomSheet с 3 опциями
- [x] **Express**: batch write план→факт для всех упражнений
- [x] **Quick Edit** `QuickEditView.tsx`:
  - [x] `QuickEditView.module.css`
  - [x] ✓/~/✗ тоггл по тапу на иконку
  - [x] `inputMode="decimal"` для весов/повторений
  - [x] `~` показывает кол-во выполненных подходов
  - [x] Кнопка «Сохранить (N/M ✓)»
- [x] **Full Review**: `FocusCard` с `reviewMode` (без медиа, без заметок)
- [x] Редактирование live-лога через `handleOpenEdit` → `mode='post_full'`
- [x] Поле `training_logs.log_mode` добавить в PocketBase

**Gate 4:** `pnpm type-check && pnpm build && pnpm lint` — зелёный ✅

---

## Фаза 5 — Полировка (~0.5 дня)

- [x] Slide-анимации в FocusCard: `translateX` prev/next
- [x] Skeleton loading для DayTabNav + ExerciseRow
- [x] `navigator.vibrate(50)` haptic при Save (с проверкой `if ('vibrate' in navigator)`)
- [x] Offline-индикатор в FocusCard

**Gate 5:** Итоговый smoke test на реальном мобильном устройстве ✅

---

## Walkthrough (заполнить после завершения)

После закрытия всех фаз → создать `walkthrough.md` в этой папке.
