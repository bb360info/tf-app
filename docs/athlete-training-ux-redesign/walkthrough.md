# Walkthrough: Редизайн AthleteTrainingView — ЗАВЕРШЁН

> Дата: 2026-02-26 · Агент: G3H · 5 фаз · ~4 дня

---

## Статус финальный

| Фаза | Статус |
|---|---|
| Фаза 1 — CSS P0-фиксы | ✅ Завершена |
| Фаза 2 — Overview Mode | ✅ Завершена |
| Фаза 3 — Focus Mode | ✅ Завершена |
| Фаза 4 — Post-Workout Mode | ✅ Завершена |
| Фаза 5 — Полировка | ✅ Завершена |

**type-check ✅ · build ✅ · lint ✅ (0 errors)**

---

## Phase 1 — CSS P0-фиксы

Touch targets 44×44px на всех кнопках, opacity прошлых дней 0.7, ExerciseRow без blur, ⚡ Zap-бейдж для adjusted exercises (GAP-2), Sticky DayCardHeader.

---

## Phase 2 — Overview Mode

- **NEW** `DayTabNav.tsx` + CSS — 7 горизонтальных табов, Moon для отдыха, прогресс-дот
- **NEW** `ExerciseListItem.tsx` — компактная строка без SetLogger
- `AthleteTrainingView.tsx` — рефактор на `mode: overview|focus|post_*`, `selectedDay`, рендер одного дня
- `AthleteContextBanner` standalone-режим (GAP-1), weekNav скрыт для standalone (GAP-4)

---

## Phase 3 — Focus Mode

- **NEW** `FocusCard.tsx` (446 строк) + CSS — fullscreen overlay с медиа 180px, coach notes (📋/💡), SetLogger pre-filled из плана
- Свайп-навигация (30px edge guard), sessionStorage для позиции
- Skip BottomSheet (4 причины: Equipment/Pain/AlreadyDone/Other)
- Toast «Завершить 🎉» на последнем упражнении
- i18n fallback en→ru→cn для coach_cues, Lucide иконка fallback по training_category

---

## Phase 4 — Post-Workout Mode

- **NEW** `PostWorkoutSheet.tsx` + CSS — BottomSheet с 3 режимами
- **NEW** `QuickEditView.tsx` + CSS — ✓/~/✗ тоггл, `inputMode="decimal"` partial sets, `batchSaveLogExercises`
- `FocusCard.tsx` — новый `reviewMode` prop (без медиа/заметок) для Full Review
- `AthleteTrainingView.tsx` — `postLogId` state, `handleOpenPostFactum` / `handleExpressLog` / `handleOpenEdit`
- i18n: `training.postWorkout.*` в RU/EN/CN

---

## Phase 5 — Полировка

- **NEW** `useOnlineStatus.ts` hook — `addEventListener online/offline`
- **NEW** `Skeleton.module.css` — `@keyframes shimmer` gradient 200% background
- **NEW** `DayTabNavSkeleton.tsx` — 7 shimmer tabs
- **NEW** `cards/ExerciseListSkeleton.tsx` — N shimmer rows
- `FocusCard.tsx` — `slideDir` state + `keyframes slideInNext/Prev` (`translateX ±60px`), `WifiOff` badge + `var(--color-warning)`
- `FocusCard.module.css` — `.slideNext`, `.slidePrev`, `.offlineBadge`
- `QuickEditView.tsx` + `FocusCard.tsx` — `navigator.vibrate(50)` с guard
- `AthleteTrainingView.tsx` — skeleton вместо спиннера при `isLoading`

---

## Изменения схемы PocketBase

- `training_logs.log_mode` добавлено (Фаза 4) ✅

---

## Заметки для следующего агента

- `offlineMode` i18n ключ лежит в `training.offlineMode` (не вложен в `training.postWorkout`)
- `slideDir` сбрасывается через `requestAnimationFrame` — при мерцании можно заменить на `setTimeout(50ms)`
- `ExerciseListSkeleton` путь к CSS `../Skeleton.module.css` — учитывай при перемещении файлов
- CSS-класс `.spinner` в `AthleteTrainingView.module.css` больше не используется — убрать при рефакторинге
- Lint warning L473 в `AthleteTrainingView.tsx` — лишний `eslint-disable`, убрать при следующем касании
