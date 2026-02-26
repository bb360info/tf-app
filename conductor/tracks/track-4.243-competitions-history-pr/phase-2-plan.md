# Phase 2 — Competitions Hub UI + Navigation
> Дата: 2026-02-25 · Агент: Codex GPT-5 · Скиллы: [concise-planning, lint-and-validate, react-patterns, react-ui-patterns, nextjs-best-practices, context-driven-development, jumpedia-design-system]

## Задача: Добавить entrypoint "Соревнования" на Dashboard (coach + athlete варианты)
**Файлы:** `src/app/[locale]/(protected)/dashboard/page.tsx`, `src/components/dashboard/AthleteDashboard.tsx`, `src/app/[locale]/(protected)/dashboard/dashboard.module.css`, `messages/*/common.json`
**Что делать:**
- Добавить CTA перехода на `/competitions` в coach и athlete dashboard.
- Добавить i18n-ключи для CTA.
- Стилизовать CTA токенами, mobile-first.
**Verify:** переход на `/competitions` доступен для обеих ролей.

## Задача: Добавить страницу `/competitions` с вкладками `Upcoming` и `History`
**Файлы:** `src/app/[locale]/(protected)/competitions/page.tsx`, `src/components/competitions/CompetitionsHub.tsx`, `src/components/competitions/CompetitionsHub.module.css`
**Что делать:**
- Создать route page и клиентский хаб.
- Добавить табы `Upcoming` и `History`.
- Добавить loading/error/empty states.
**Verify:** табы корректно переключают списки.

## Задача: Реализовать фильтры `season`, `discipline`, `season_type`, `athlete`, `status`
**Файлы:** `src/components/competitions/CompetitionsHub.tsx`, `src/lib/pocketbase/services/competitions.ts`
**Что делать:**
- Добавить controlled filters + синхронизацию с query string.
- Для coach: athlete filter доступен; для athlete: фильтр фиксируется по self profile.
- Подключить server-side filtering через `listCompetitions(filters)`.
**Verify:** single и combined фильтры работают без конфликтов.

## Задача: Сделать coach реестр стартов: строка старта + статусы/результаты всех участников
**Файлы:** `src/components/competitions/CompetitionsHub.tsx`, `src/lib/pocketbase/services/competitionParticipants.ts`
**Что делать:**
- Добавить coach-only registry list/table.
- Добавить batched helper загрузки участников по списку стартов.
- Показать сводку статусов и official_result.
**Verify:** coach видит roster summary по каждому старту.

## Задача: Добавить CTA "Добавить прошлый старт" в `History`
**Файлы:** `src/components/competitions/CompetitionsHub.tsx`, `messages/*/common.json`
**Что делать:**
- Добавить history-level CTA.
- Привязать CTA к существующему create flow/route соревнований.
**Verify:** CTA локализован и ведёт в рабочий маршрут.

## Задача: Сохранить в `training` только контекстные маркеры соревнований с переходом в карточку старта
**Файлы:** `src/app/[locale]/(protected)/training/page.tsx`, `src/components/training/SeasonDetail.tsx`
**Что делать:**
- Оставить lightweight competition markers.
- Сделать переход в `/competitions` с query params.
- Удалить emoji-иконки, заменить на Lucide.
**Verify:** переходы в `/competitions` работают из training.

## Задача: Использовать сортировку proposals по `proposed_at` во всех UI inbox/history выборках
**Файлы:** `src/lib/pocketbase/services/competitionProposals.ts`, `src/components/dashboard/coach/PendingReviews.tsx`, `src/components/competitions/CompetitionsHub.tsx`
**Что делать:**
- Гарантировать сортировку `-proposed_at,-created`.
- Переключить PendingReviews на pending proposals (не unread notifications).
**Verify:** новые pending сверху во всех местах UI.

## Задача: Проверить latency deep PB relation rules на объёмных данных для coach registry и proposal inbox
**Файлы:** `conductor/tracks/track-4.243-competitions-history-pr/walkthrough.md`
**Что делать:**
- Зафиксировать метрики p50/p95 по ключевым queries.
- Добавить вывод pass/fail и замечания по оптимизации.
**Verify:** latency check задокументирован.

## Задача: Добавить smoke-проверку фильтров `season`/`discipline`/`season_type`/`status` на реальных данных
**Файлы:** `conductor/tracks/track-4.243-competitions-history-pr/walkthrough.md`
**Что делать:**
- Прогнать smoke matrix для coach/athlete.
- Зафиксировать результаты и edge cases.
**Verify:** smoke matrix задокументирован и зелёный.

## Команды верификации фазы
- `pnpm type-check`
- `pnpm lint`
- `pnpm build`
