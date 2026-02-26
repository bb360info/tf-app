# UI Functional Audit (excluding 4.242 findings)

Дата: 2026-02-25  
Формат: deep static audit + validation commands

## Контекст

Этот отчёт фиксирует функции, которые:

1. реализованы в коде, но не работают в UI-сценарии;
2. реализованы, но вообще не отображаются в текущем интерфейсе;
3. создают UX/функциональные риски в проде.

Важно: проблемы, уже описанные в `track-4.242-ux-gap-report/analysis.md`, намеренно исключены.

## Верификация

- `pnpm type-check` → ✅ успех
- `pnpm lint` → ✅ успех (warnings only, без errors)
- `pnpm build` → ✅ успех

## Findings (вне 4.242)

| Priority | Проблема | Где |
|---|---|---|
| P0 | Карточка `TrainingToday` в coach dashboard остаётся статичной (нет загрузки реальных данных, нет action для перехода в рабочий сценарий). | `src/components/dashboard/coach/TrainingToday.tsx` |
| P0 | В `WeekConstructor` есть состояние и рендер `TrainingLog` modal, но нет ни одного пути, который вызывает `setLogActiveDay(...)`. Функционал логирования из этого экрана недостижим. | `src/components/training/WeekConstructor.tsx` |
| P1 | В `analytics` используется `next/link` + `href="/dashboard"` при локализованном static export. Риск навигации на несуществующий роут без locale-префикса. | `src/app/[locale]/(protected)/analytics/page.tsx` |
| P1 | Полноценный `ExerciseConstructor` (создание custom упражнений + submit на review) не подключён ни к одному экрану. Функционал существует, но не доступен пользователю. | `src/components/exercises/ExerciseConstructor.tsx` |
| P1 | Ветка community/custom exercises частично «мертвая»: каталог читает только `exercises`, при этом логика review/visibility живёт в `customExercises`. Поток submit->pending_review->approved не доведён до UI каталога. | `src/lib/pocketbase/services/exercises.ts`, `src/lib/pocketbase/services/customExercises.ts`, `src/components/exercises/ExerciseCatalog.tsx` |
| P2 | `ReadinessCheckin` (новый компонент) не встроен в UI-потоки. | `src/components/dashboard/ReadinessCheckin.tsx` |
| P2 | `DailyCheckin` (старый компонент) не встроен в UI-потоки. Имеется дублирование готовых check-in UI, но ни один не подключён как явная отдельная страница/модалка. | `src/components/readiness/DailyCheckin.tsx` |
| P2 | `ActivityFeed` реализован, но не используется ни в одной странице/компоненте. | `src/components/notifications/ActivityFeed.tsx` |
| P2 | `NotificationPreferences` (компонентный виджет) реализован, но не используется; вместо него есть отдельная страница настроек уведомлений с другой реализацией. | `src/components/notifications/NotificationPreferences.tsx` |
| P2 | `ComingSoonCard` реализован, но нигде не подключён. | `src/components/shared/ComingSoonCard.tsx` |
| P2 | В `QuickWorkout` сохраняется история в localStorage, но нет UI для просмотра/выбора истории. Пользователь не видит сохранённые quick-workouts. | `src/components/training/QuickWorkout.tsx` |
| P2 | В ряде мест используется дата через `new Date().toISOString().slice(0, 10)` (UTC-срез), что может давать «сдвиг дня» для пользователей вне UTC. | `src/lib/pocketbase/services/readiness.ts`, `src/app/[locale]/(protected)/dashboard/page.tsx`, `src/components/training/QuickWorkout.tsx` |

## Технические заметки

1. Отчёт не включает пункты из 4.242 (training/review stub, disabled notifications in More, dead template actions, Save PDF disabled, PlanHistory restore, и т.д.).
2. Часть найденного — продуктовый техдолг (не падения), но напрямую влияет на доступность функций в UI.
3. Для следующего трека уместно разделить задачи на два блока:
   - `runtime UX blockers` (P0/P1),
   - `hidden/unwired features` (P2 cleanup).
