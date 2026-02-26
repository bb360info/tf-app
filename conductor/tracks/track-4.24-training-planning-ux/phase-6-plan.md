# Phase 6 Plan - Today View + Coach Dashboard + Assign UX

## Обзор (Overview)
Реализация Phase 6 из трека 4.24 (с учетом миграций из 4.25). Цель: построить полноценный UI дашбордов для атлета и тренера, а также внедрить Assign UX в `SeasonDetail`, используя backend-first доработки из предыдущих фаз.

## Action Items

### 1. Data Source Helpers
*   **Файл:** `src/lib/pocketbase/services/logs.ts` (или вынести в analytics service, если логичнее, но начнём с logs.ts расширения).
    *   `getWeeklyVolumeDelta(athleteId: string, weekStart: string)`: Сравнивает количество сетов (или completed exercises) за текущую и прошлую неделю. Использует `listWeekLogs`. Возвращает дельту (`{ current: number, previous: number, delta: number }`).
*   **Файл:** `src/lib/pocketbase/services/readiness.ts`
    *   `getTeamReadinessAlerts(coachId: string)`: Получает `getTodayCheckin` для всех атлетов тренера (батчами или через expand). Фильтрует тех, у кого readiness score < 40. Возвращает список `AthleteWithStats[]` с низким readiness.
*   **Файл:** `src/lib/hooks/usePullToRefresh.ts`
    *   Новый хук для pull-to-refresh жеста (touchstart, touchmove, touchend), применяющий CSS `transform: translateY` и вызывающий переданный `onRefresh()`. Возвращает `{ pullState, pullStyle, onTouchStart, onTouchMove, onTouchEnd }`.

### 2. Athlete Today View
*   **Файл:** `src/components/dashboard/AthleteDashboard.tsx`
    *   Рефакторинг текущего `AthleteDashboard.tsx`.
    *   Внедрение `usePullToRefresh`.
    *   Обернуть секции в `<DashboardErrorBoundary>`.
    *   Создать:
        *   `ScoreCard.tsx`: Акцентный glassmorphism (`var(--glass-bg)`, accent color). Показывает готовность и рекомендацию на день.
        *   `TodayWorkoutCard.tsx`: Средней яркости glass. Показывает данные `todayPlan`. Кнопка старта тренировки (QuickWorkout или Day Constructor view).
        *   `StatsStrip.tsx`: Компактный ряд метрик (пульс, сон и т.д.).
        *   `WeeklyHeatmap.tsx`: Плоский дизайн. График активности за неделю. Опирается на `getWeeklyVolumeDelta`.
        *   `RecentNotifications.tsx`: Последние 2-3 непрочитанных уведомления, встраиваются над или под `TodayWorkoutCard`.

### 3. Coach Dashboard
*   **Файл:** `src/app/[locale]/(protected)/dashboard/page.tsx` (это и есть Coach Dashboard).
    *   Добавить `<DashboardErrorBoundary>` для изоляции секций.
    *   Внедрить `usePullToRefresh`.
    *   Создать новые секции (компоненты):
        *   `TeamAlerts.tsx`: Акцентная панель сработавших триггеров у команды (из `getTeamReadinessAlerts`).
        *   `TrainingToday.tsx`: Обзор назначенных планов на сегодня по атлетам/группам.
        *   `PendingReviews.tsx`: Subtle glassmorphism. Показывает ожидающие review логи тренировок (если применимо по модели данных, иначе stub).
        *   `WeekSummaryBar.tsx`: Прогресс-бар выполнения планов за неделю по команде.
    *   **Visual Polish:** `AthleteCard.tsx` (update). WHOOP-style. Больше фокуса на readiness (цветные индикаторы), упрощение отступов.

### 4. Assign UX (миграция из 4.25)
*   **Файл:** `src/components/training/SeasonDetail.tsx` (в частности, `PhaseCard`).
    *   **Active Assignments List:** Новый список под формой назначения. Показывает бейджи "Assigned to: Group A" или "Assigned to: Athlete X". (Для этого нужно загрузить активные планы и их `plan_assignments` для данной фазы).
    *   **Duplicate Check:** При попытке assign показать preview: «Assigning: [Plan Name]».
    *   **Unassign Button:** Иконка X или "Unassign" возле каждого бейджа active assignment. Клик удаляет запись из `plan_assignments`.
    *   **i18n:** Добавить ключи для assign/unassign labels в `ru.json`, `en.json`, `cn.json`.

### 5. Обертки и утилиты
*   **Файл:** `src/components/shared/DashboardErrorBoundary.tsx`
    *   Стандартный React Error Boundary для дашбордов, показывающий fallback UI вместо поломки всего экрана.

## Этапы выполнения (Verification Plan)
1. **Реализация Date/Analytics Utils:** Пишем `getWeeklyVolumeDelta` и `getTeamReadinessAlerts`. Проверяем компиляцию (`pnpm type-check`).
2. **Assign UX:** Обновляем `SeasonDetail.tsx`. Проверяем работу UI.
3. **Компоненты Athlete Dashboard:** Делаем `ScoreCard`, `TodayWorkoutCard` и прочие. Интегрируем в `AthleteDashboard.tsx`.
4. **Компоненты Coach Dashboard:** Делаем `TeamAlerts`, `TrainingToday`, обновляем `AthleteCard`. Внедряем в `dashboard/page.tsx`.
5. **Тестирование (QA Smoke Test):**
    *   Зайти под тренером → убедиться что дашборд рендерится, AthleteCard обновлен.
    *   Зайти в Training → Season → PhaseCard: проверить список assignments и работу кнопки Unassign.
    *   Зайти под атлетом → проверить отображение ScoreCard и TodayWorkoutCard.
    *   Протестировать pull-to-refresh (через devtools mobile-mode).
    *   Выполнить `pnpm type-check`, `pnpm build`, `pnpm lint`.

## Зависимости (Design System & UI Patterns)
- Использовать ТОЛЬКО классы/переменные из `tokens.css` и `globals.css` (напр. `.glass`, `var(--glass-bg)`).
- Никакого TailwindCSS. Стили через CSS Modules (`.module.css`).
- Иконки Lucide React (никаких emoji).
- Обработка Error и Loading states согласно паттерну (скелетоны, локальные ошибки).
