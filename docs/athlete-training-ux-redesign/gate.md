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

- [ ] `DayTabNav.tsx` — 7 адаптивных таблеток (`Пн`/`П`), Moon для отдыха, прогресс-дот
- [ ] `DayTabNav.module.css` — overflow-x:auto, scrollbar-width:none, scrollIntoView
- [ ] `ExerciseItem.tsx` → `ExerciseRow.tsx` — компактный вид без SetLogger
- [ ] `AthleteTrainingView` рефактор:
  - [ ] State: `mode: 'overview' | 'focus' | 'post_quick' | 'post_full'`
  - [ ] State: `selectedDay: number` (по умолчанию todayIdx)
  - [ ] Рендер только одного выбранного дня (не все 7)
- [ ] Compact RestDay в DayTabNav (нет карточки)
- [ ] `AthleteContextBanner` collapsed mode
- [ ] FAB «▶ Начать тренировку»
- [ ] Кнопка «✓ Залогировать пост-фактум» (скрыта если уже есть live-лог)
- [ ] Кнопка «✏️ Редактировать» для залогированных дней
- [ ] **[GAP-1]** `AthleteContextBanner`: standalone-режим — мини-баннер «📅 Разовая тренировка · даты» когда `activeSeason=null` но `plan` есть
- [ ] **[GAP-4]** `weekNav`: скрывать навигацию по неделям для `plan.plan_type='standalone'` (показывать диапазон дат плана)

**Gate 2:** `pnpm type-check && pnpm build && pnpm lint` — зелёный  
**Gate 2 QA:** DayTabNav переключает дни, прошлые дни read-only, 320px не ломается

---

## Фаза 3 — Focus Mode (~1.5 дня)

- [ ] `FocusCard.tsx` — полный экран: медиа, заметки, SetLogger, навигация
- [ ] `FocusCard.module.css`
- [ ] Медиа-блок: превью + тап → BottomSheet с галереей (свайп между видео)
- [ ] Заметки: `plan_exercises.notes` (📋) + `exercises.coach_cues_[locale]` (💡)
- [ ] i18n fallback: `en → ru → cn` для `coach_cues`
- [ ] Fallback если нет медиа: Lucide иконка по `training_category`
- [ ] Custom_text упражнение (нет `exercise_id`): скрытый SetLogger, кнопка «Выполнено»
- [ ] SetLogger pre-filled из плана, редактирует значения
- [ ] Свайп-навигация: `touchstart/touchend`, зона от 30px до (width-30px)
- [ ] Кнопки ← → (оба способа навигации)
- [ ] `sessionStorage` для `focusIndex` — позиция сохраняется при reload
- [ ] «Сохранить →» — сохранение + переход к следующему
- [ ] Skip BottomSheet — 4 причины: Equipment / Pain / Already done / Other
- [ ] Возврат `✕ Обзор` в любой момент
- [ ] Последнее упражнение → «Завершить 🎉» → toast → возврат в Overview

**Gate 3:** `pnpm type-check && pnpm build && pnpm lint` — зелёный  
**Gate 3 QA (browser_subagent):**

- Focus Mode: свайп и кнопки работают на 375px
- Видео открывается в BottomSheet галерее
- Возврат в Overview сохраняет позицию

---

## Фаза 4 — Post-Workout Mode (~1 день)

- [ ] `PostWorkoutSheet.tsx` — BottomSheet с 3 опциями
- [ ] **Express**: batch write план→факт для всех упражнений
- [ ] **Quick Edit** `QuickEditView.tsx`:
  - [ ] `QuickEditView.module.css`
  - [ ] ✓/~/✗ тоггл по тапу на иконку
  - [ ] `inputMode="decimal"` для весов/повторений
  - [ ] `~` показывает кол-во выполненных подходов
  - [ ] Кнопка «Сохранить (N/15 ✓)»
- [ ] **Full Review**: `FocusCard` без медиа, без заметок, поля pre-filled из плана
- [ ] Редактирование live-лога через ту же кнопку «Редактировать»
- [ ] Поле `training_logs.log_mode` добавить в PocketBase

**Gate 4:** `pnpm type-check && pnpm build && pnpm lint` — зелёный  
**Gate 4 QA:** Express за 1 тап, Quick Edit — ✓/~/✗ работают, inline edit числа

---

## Фаза 5 — Полировка (~0.5 дня)

- [ ] Slide-анимации в FocusCard: `translateX` prev/next
- [ ] Skeleton loading для DayTabNav + ExerciseRow
- [ ] `navigator.vibrate(50)` haptic при Save (с проверкой `if ('vibrate' in navigator)`)
- [ ] Offline-индикатор в FocusCard

**Gate 5:** Итоговый smoke test на реальном мобильном устройстве

---

## Walkthrough (заполнить после завершения)

После закрытия всех фаз → создать `walkthrough.md` в этой папке.
