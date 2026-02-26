# Bug Report — Track 4.24 (2026-02-24)

Источник: аудит реализации трека 4.24 по коду, маршрутам, сервисам и проверочным командам.

## Найденные проблемы

1. `[CRITICAL]` Нерабочий маршрут Review из нижней навигации.
- Файл: `src/components/shared/BottomTabBar.tsx:35`
- Проблема: таб ведет на `/training/review`, но такой страницы нет в `src/app/[locale]/(protected)`.
- Риск: 404 в сценарии coach-review.

2. `[CRITICAL]` Нерабочий CTA `Start Workout`.
- Файл: `src/components/dashboard/athlete/TodayWorkoutCard.tsx:26`
- Проблема: переход на `/training/today`, страницы нет.
- Риск: ломается основной путь старта тренировки.

3. `[CRITICAL]` Нерабочая ссылка `View all` в `RecentNotifications`.
- Файл: `src/components/dashboard/athlete/RecentNotifications.tsx:34`
- Проблема: ссылка на `/dashboard/notifications`, фактический маршрут — `/notifications`.
- Риск: 404 при переходе к уведомлениям.

4. `[CRITICAL]` `Template Panel` не реализует `Apply` фактически.
- Файлы: `src/components/templates/TemplatePanelContent.tsx:31`, `src/components/templates/TemplatePanelContent.tsx:121`, `src/components/templates/TemplateList.tsx:17`
- Проблема: `onApply/isApplying` есть в props, но не используются; в списке нет apply-action, только copy/edit/delete.
- Риск: заявленный UX "apply template to day" не работает.

5. `[CRITICAL]` Drag-and-drop reorder в `DayConstructor` не подключен к сохранению.
- Файлы: `src/components/training/DayConstructor.tsx:126`, `src/components/training/DayConstructor.tsx:143`, `src/components/training/WeekConstructor.tsx:690`
- Проблема: `DayConstructor` вызывает `onReorderDrag`, но `WeekConstructor` этот prop не передает.
- Риск: пользователь перетаскивает элементы, но порядок не сохраняется.

6. `[HIGH]` Конфликт по фильтру `self` в сезонах (логика рассинхронизирована).
- Файлы: `src/app/[locale]/(protected)/training/page.tsx:177`, `src/lib/pocketbase/services/seasons.ts:38`
- Проблема: UI отправляет `value="self"`, а сервис явно ожидает реальный `athlete_id` (special-case `self` удален).
- Риск: пустые/неверные результаты фильтрации.

7. `[HIGH]` `RecentNotifications` фильтрует по несуществующему полю `is_read`.
- Файлы: `src/components/dashboard/athlete/RecentNotifications.tsx:17`, `src/lib/pocketbase/services/notifications.ts:139`
- Проблема: в проекте используется `read`, а не `is_read`.
- Риск: блок recent показывает данные некорректно или пусто.

8. `[HIGH]` В athlete-контексте вызывается coach-scoped `listSeasons()`.
- Файлы: `src/components/dashboard/AthleteDashboard.tsx:111`, `src/app/[locale]/(protected)/analytics/page.tsx:74`, `src/lib/pocketbase/services/seasons.ts:36`
- Проблема: `listSeasons()` фильтрует по `coach_id = current user`; для athlete это неверный контекст.
- Риск: у атлета не грузятся или грузятся неверные сезоны/соревнования.

9. `[HIGH]` Coach dashboard частично на заглушках.
- Файлы: `src/components/dashboard/coach/PendingReviews.tsx:3`, `src/components/dashboard/coach/TrainingToday.tsx:3`, `src/components/shared/BottomTabBar.tsx:47`
- Проблема: `PendingReviews`/`TrainingToday` статичны, badge review захардкожен в `0`.
- Риск: ключевой функционал coach dashboard фактически не реализован.

10. `[MEDIUM]` Несоответствие заявленным правилам team alerts.
- Файлы: `conductor/tracks/track-4.24-training-planning-ux/gate.md:132`, `src/lib/pocketbase/services/readiness.ts:108`
- Проблема: в gate заявлено "low readiness или missed >2 days", реализация покрывает только readiness `<= 40` за сегодня.
- Риск: часть критичных случаев не поднимается в алерты.

11. `[MEDIUM]` i18n-gap: hardcoded EN-строки в новых компонентах.
- Файлы: `src/components/dashboard/coach/PendingReviews.tsx:6`, `src/components/dashboard/coach/TrainingToday.tsx:6`, `src/components/dashboard/athlete/TodayWorkoutCard.tsx:10`, `src/components/dashboard/athlete/RecentNotifications.tsx:33`, `src/components/dashboard/athlete/WeeklyHeatmap.tsx:18`
- Проблема: часть UI не использует `next-intl`.
- Риск: RU/CN локали отображаются частично на английском.

12. `[MEDIUM]` В `TemplatePanel` есть кнопка "create first template" без действия.
- Файл: `src/components/templates/TemplatePanelContent.tsx:110`
- Проблема: кнопка рендерится, но handler отсутствует.
- Риск: тупиковый UX-сценарий.

13. `[MEDIUM]` Целостность `plan_assignments`: нет DB-уникальности активных назначений.
- Источник: живая схема PB (MCP/admin-проверка индексов) — только неуникальные индексы `plan`, `athlete`, `group`.
- Проблема: нет уникального ограничения на активные assignment.
- Риск: дубли при race-condition, неконсистентный plan resolution.

14. `[MEDIUM]` `pnpm lint` не проходит (quality gate красный).
- Файлы: `scripts/clear_pb.ts:75`, `scripts/clear_users.ts:19`, `scripts/test_users.ts:13`
- Проблема: `no-explicit-any` и related lint errors.
- Риск: формально track quality gate не закрыт.

15. `[LOW]` Нарушение DS-правила "без emoji-иконок" в UI.
- Файлы: `src/components/training/SeasonDetail.tsx:300`, `src/components/training/WeekConstructor.tsx:635`
- Проблема: используются emoji (`📍`, `🚧`) вместо Lucide.
- Риск: визуальная/дизайн-системная неконсистентность.

16. `[LOW]` В `listSeasons` используется строковая интерполяция filter вместо `pb.filter(...)`.
- Файл: `src/lib/pocketbase/services/seasons.ts:40`
- Проблема: неединообразный подход по сравнению с остальными сервисами.
- Риск: более хрупкая и потенциально небезопасная фильтрация.

## Статус проверок на момент отчета

- `pnpm lint` -> FAIL (errors present)
- `pnpm type-check` -> PASS
- `pnpm test` -> PASS
- `pnpm build` -> PASS
