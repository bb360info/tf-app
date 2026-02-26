# Gate 4.243: Competitions Hub + History + Auto-PR

## 🎯 Цель трека

Сделать соревнования единым источником истины для результатов и прогрессии:

- отдельный модуль `/competitions` для истории и предстоящих стартов;
- workflow "атлет предлагает → тренер утверждает/отклоняет (с правкой)";
- автоматический PR из официальных результатов (`official_result`) без ручного ввода PR.

> Старт трека разрешен только после полного закрытия Gate 4.242.

## Product Decisions (зафиксированы)

- [x] Базовый старт в сезоне создаёт тренер (для группы/подмножества группы).
- [x] Разные старты внутри сезона закрепляются за разными атлетами через participants-таблицу.
- [x] Атлет может предложить правку, даже если тренер уже внёс результат.
- [x] Тренер при approve/reject может корректировать результат и метаданные старта.
- [x] История прошлых стартов живёт в `/competitions`, а не в тренировочном плане.
- [x] PR вручную не вводится: считается только из подтверждённых результатов соревнований.

## Phase 1: Data Foundation (PocketBase schema + rules)

**Skills:** `concise-planning`, `lint-and-validate`, `architecture`, `database-architect`, `api-security-best-practices`

- [x] Расширить `competitions`: `discipline`, `season_type`, `website`, `status`, `official_result`, `official_updated_by`, `official_updated_at`.
- [x] Добавить `competition_participants` с UNIQUE (`competition_id`, `athlete_id`) и статусами участия.
- [x] Добавить `competition_proposals` (payload JSON, status, reviewed fields) для athlete->coach workflow.
- [x] Добавить `competition_media` (visibility, moderation fields) для вложений по старту.
- [x] Спроектировать и задокументировать PB API rules для coach/athlete доступа ко всем новым коллекциям.
- [x] Обновить TypeScript типы/валидацию (`src/lib/pocketbase/types.ts`, `src/lib/validation/*`) под новые поля.
- [x] Добавить индексы под основные выборки: coach registry, pending proposals, history filters.

**Gate 1:** `pnpm type-check && pnpm lint && pnpm build` -> Exit 0

## Phase 2: Competitions Hub UI + Navigation

**Skills:** `concise-planning`, `lint-and-validate`, `react-patterns`, `react-ui-patterns`, `nextjs-best-practices`
**Mandatory reads:** `docs/DESIGN_SYSTEM.md`, `src/styles/tokens.css`

- [x] Добавить entrypoint "Соревнования" на Dashboard (coach + athlete варианты).
- [x] Добавить страницу `/competitions` с вкладками `Upcoming` и `History`.
- [x] Реализовать фильтры `season`, `discipline`, `season_type`, `athlete`, `status`.
- [x] Сделать coach реестр стартов: строка старта + статусы/результаты всех участников.
- [x] Добавить CTA "Добавить прошлый старт" в `History` (единый формат формы).
- [x] Сохранить в `training` только контекстные маркеры соревнований с переходом в карточку старта.
- [x] Использовать сортировку proposals по `proposed_at` во всех UI inbox/history выборках (не `created`).
- [x] Проверить latency deep PB relation rules на объёмных данных для coach registry и proposal inbox.
- [x] Добавить smoke-проверку фильтров `season`/`discipline`/`season_type`/`status` на реальных данных.

**Gate 2:** `pnpm type-check && pnpm lint && pnpm build` -> Exit 0 + smoke фильтров пройден + latency check зафиксирован

## Phase 3: Competition Card + Proposal Workflow

**Skills:** `concise-planning`, `lint-and-validate`, `react-patterns`, `typescript-expert`, `systematic-debugging`

- [x] Реализовать единую Competition Card форму (coach/athlete роль-зависимое поведение).
- [x] Для тренера: create/update official данных старта и участников.
- [x] Для атлета: submit proposal (`result|metadata|pre_event_info|media_meta`) без прямого overwrite official.
- [x] Реализовать coach inbox pending proposals на странице `/competitions`.
- [x] Реализовать действия `approve`, `approve with corrections`, `reject`.
- [x] Логировать review action и хранить audit trail в `competition_proposals`.
- [x] Добавить post-event CTA: `Добавить результат` (если official пуст) / `Предложить правку` (если official есть).

**Gate 3:** `pnpm type-check && pnpm lint && pnpm build` -> Exit 0

## Phase 4: Media Collaboration + Moderation

**Skills:** `concise-planning`, `lint-and-validate`, `auth-implementation-patterns`, `api-security-best-practices`

- [x] Добавить загрузку media в карточку старта с привязкой к `competition_id`.
- [x] Реализовать права: редактирование автор/тренер, просмотр по `visibility`, модерация тренером.
- [x] Реализовать сценарий "атлет добавил контент про другого атлета": хранить `subject_athlete_id` и правила видимости.
- [x] Добавить hide/unhide moderation actions тренера.
- [x] Покрыть security edge-cases (чужие записи/чужое медиа) тестовыми сценариями.

**Gate 4:** `pnpm type-check && pnpm lint && pnpm build` -> Exit 0

## Phase 5: Auto-PR Projection + UI Migration

**Skills:** `concise-planning`, `lint-and-validate`, `sql-optimization-patterns`, `react-patterns`

- [x] Реализовать `prProjectionService`: текущие PB по дисциплине + indoor/outdoor из `official_result`.
- [x] Обновить карточку атлета: основной/2-й/3-й вид + Indoor PB/Outdoor PB + "где/когда установлен".
- [x] Добавить PR timeline график с фильтрами `all|indoor|outdoor` и маркерами соревнований.
- [x] Удалить ручные UI потоки ввода PR (create/edit/settings/detail формы).
- [x] Удалить runtime-зависимость от `personal_records` в dashboard/analytics/profile потоках.
- [x] Подготовить migration note по legacy `personal_records` (экспорт/архив).

**Gate 5:** `pnpm type-check && pnpm lint && pnpm build && pnpm test` -> Exit 0

## Phase 6: QA + Handoff

**Skills:** `concise-planning`, `lint-and-validate`, `playwright-skill`, `verification-before-completion`

- [x] Smoke: coach flow (create start -> assign participants -> approve with correction).
- [x] Smoke: athlete flow (pre-event proposal -> result proposal -> media upload).
- [x] Regression: `training` page keeps lightweight competition context links only.
- [x] Проверить локализации RU/EN/CN для новых страниц и статусов.
- [x] Обновить `walkthrough.md` и `CHANGELOG.md`, закрыть gate чекбоксы по факту.

**Gate 6 (Track Complete):** все smoke/validation команды зелёные, docs/handoff обновлены.
