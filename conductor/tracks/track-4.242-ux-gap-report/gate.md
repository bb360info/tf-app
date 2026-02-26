# Gate 4.242: Polish, UX Gaps & Tech Debt Zero

## 🎯 Цели трека

1. Устранить "fake affordances" (нерабочие кнопки) и UX-разрывы из базового и дополнительных отчётов.
2. **Улучшить интерфейс атлета (`/training`)**: убрать мусор ("My Seasons"), переименовать заголовки, добавить визуальный контекст текущего сезона (таймлайн фаз) и индикатор выполнения дня.
3. Закрыть технический долг (крупные компоненты, `any`, `TODOs`, мёртвый код, баги дат).

> Статус-аудит: 2026-02-25 (факт по коду, без предположений).  
> Отмечено `[x]` только то, что реально уже присутствует в текущей рабочей копии.

## Phase 1: UX Gaps & Fake Affordances (P0/P1)

**Skills before start:** `concise-planning`, `lint-and-validate`, `react-patterns`, `react-ui-patterns`, `systematic-debugging`, `typescript-expert`  
**Workflow note:** для UI/CSS подзадач обязательно прогнать `/ui-work` перед правками.

- [x] Уведомления: убрать метку `(WIP)` в меню `More` (`more/page.tsx`).
- [x] Уведомления: внедрить маппинг `message_key` на локализованные строки.
- [x] `training/review`: **Полностью скрыть заглушку** (YAGNI), так как фича ревью еще не готова.
- [x] Бейдж `review` в табах: **Удалить бейдж**, чтобы не путать пользователя (YAGNI).
- [x] **Coach Dashboard**: **Удалить/скрыть** статичную заглушку карточки `TrainingToday`.
- [x] **Навигация**: исправить хардкод роутинг `href="/dashboard"` в `analytics` (нужен учет локали).
- [x] **Баг i18n назначения**: Исправить непереведенный ключ `[training.week]` на карточке назначенного плана (в сезонном/фазовом представлении тренера).
- [/] **Баги времени (UTC Drift)**: Создать утилиту `toLocalISODate` (в `src/lib/utils/date.ts`). Найти и заменить все `toISOString().slice(0, 10)` на вычисление локальной даты, чтобы избежать сдвига дня.
- [x] Шаблоны (Templates - UX Polish): **Скрыть** действия `Copy/Edit/Delete`. Привязать `Create first template` к функции. **Поднять кнопку `+ Create`** на уровень заголовка страницы (через Flex). Превратить огромные блоки "Warm-Ups | Training Days" во вкладки (Tabs) для экономии места.
- [x] История плана: **Скрыть/удалить** кнопку `Restore version` (YAGNI).
- [x] Конструктор недели: **Полностью вырезать** хардкод кнопку `Save PDF` (YAGNI).
- [x] **Онбординг атлета (PRs)**: В `AddAthleteModal.tsx` добавить таб "Спортивный профиль" для указания второй дисциплины и начального личного рекорда (PR). Сохранять рекорд сразу при создании атлета (вызов `addPersonalRecord`).
- [x] **UI Онбординга**: Перевести модалку скаутинга/добавления на Glassmorphism, укрупнить touch targets, сделать текстовые кнопки вместо неочевидных иконок.
- [x] **Единый `AthleteForm` (Create/Edit/Settings)**: Убран дублирующий markup/state из `AddAthleteModal`, `EditAthleteModal`, `AthleteProfileSettingsPanel`; вынесен общий `src/components/athletes/form/AthleteForm.tsx` с единым UX. PR replace идёт через `addPersonalRecord`, delete PR оставлен только в `settings/profile`, secondary disciplines ограничены до 2.
- [/] **Управление группами (`groups/page.tsx`)**: Заменить мелкие иконки перевода/добавления на единую кнопку "Управление группой" с диалогом выбора ("Добавить к новой" или "Перевести полностью").
- [/] **Планы для групп (`groups/page.tsx`)**: Добавить явную кнопку `[+ Создать план для группы]`, перенаправляющую в конструктор плана с предвыбранной группой.
- [/] **Быстрая тренировка (`QuickWorkout.tsx`)**: Убрать локальное сохранение. Оставить 3 опции: "Сохранить в Библиотеку", "Назначить Атлету", "Назначить Группе" (с выбором даты). Добавить умное разрешение конфликтов (диалог "Заменить или добавить упражнения?", если план на день уже существует). Закрывать модалку сразу после успеха (с Toast-уведомлением).
- [x] **Сезоны для групп**: Через MCP (pocketbase админку) добавить поле `group_id` (relation) в коллекцию `seasons`. В `SeasonWizard.tsx` добавить выбор типа привязки: "Для атлета" или "Для группы" (подгружать список своих групп).

## Phase 2: Улучшение интерфейса атлета (`/training` Hero-блок)

**Skills before start:** `concise-planning`, `lint-and-validate`, `react-patterns`, `react-ui-patterns`, `nextjs-best-practices`, `typescript-expert`  
**Workflow note:** обязательно выполнить `/ui-work` (design-system/tokens) перед изменениями UI.

- [ ] **Очистка UI**: Удалить компонент `AthleteSeasonsList` ("My Seasons") с главной страницы атлета. Атлету не нужен список всех сезонов под ежедневным планом.
- [ ] **Нейминг**: Изменить перевод `training.title` с "Training Seasons" на "My Training" (Мои тренировки).
- [ ] **Athlete Context Banner (Hero-блок)**: Проверить запрос `fetchActiveSeason` на `expand=phases,competitions`. Создать единый красивый Glass-модуль, содержащий:
  - `Season Progress Timeline`: bar с поделенными фазами и маркером "Сегодня".
  - `Phase Focus`: вывод поля `focus` текущей фазы.
  - `Nearest Competition`: обратный отсчет до турнира.
- [ ] **Умный статус дней (Focus Visuals)**:
  - Дни в прошлом (до сегодня) — полупрозрачные (`opacity: 0.6` или матовый `glass-bg`).
  - Сегодняшний день (Today) — подсвечен легким `glow` (свечением) или рамкой.
- [ ] **Прогресс дня (Circular Progress)**: Добавить графический индикатор завершенности (например, "2/5 exercises") в шапку `DayCard`. Заменить фальшивую кнопку "Record Result" на текстовый чип "Today".
- [ ] **Empty State "В разработке"**: Если статус редактируемой недели `draft` или план пустой — выводить дружелюбную заглушку: *"Тренер прямо сейчас составляет для вас план"*, чтобы снизить тревожность атлета.
- [ ] **Локализация и Touch Targets**: Убрать хардкод EN из `ScoreCard.tsx` (Readiness). Соблюдать Iron Law: touch targets (>= 44x44px).

## Phase 3: Tech Debt Zero & Component Refactoring

**Skills before start:** `concise-planning`, `lint-and-validate`, `code-refactoring-refactor-clean`, `architect-review`, `systematic-debugging`, `typescript-expert`

- [ ] **Сканирование долга**: Выполнить `/debt` workflow для поиска `any`, TODO/FIXME и мёртвого кода (перед удалением компонентов).
- [ ] **Сборка мусора (Dead Code)**: Сразу удалить найденные через `/debt` дубликаты и неподключенные компоненты.
- [ ] **Расщепление "Монстров" (`AthleteDetailClient`)**: Раздробить `AthleteDetailClient.tsx` на хуки/tabs (`OverviewTab`, `TrainingTab`).
- [ ] **Refactoring `WeekConstructor.tsx` (UI & Logic)**:
  - Раздробить на `useWeekConstructor` hook и UI-компоненты.
  - Вырезать стейт модалки `TrainingLog`.
  - **Draft/Published Toggle**: Заменить статичный текст "DRAFT" в шапке на интерактивную кнопку-переключатель статуса плана (публикация для атлета).
  - **Нейтральные нули**: Убрать агрессивный красный бейдж "0" количества упражнений у дней без тренировок, заменить на серый (нейтральный), применять цвет, только когда упражнения есть.
- [ ] **Карта Недель для Тренера (Weekly Status Map)**: На карточке фазы вывести статусность недель (зеленый кружок — `published`, желтый — `draft`, серый — пусто). Сделать кликабельными (ссылка прямо в конструктор нужной недели).
- [ ] **Strict Typed (Any Elimination)**: Убрать все `t: any` из компонентов.
- [ ] **Clean Lint**: Исправить warnings ESLint. Удалить/разрешить TODO.

## Phase 4: QA & Deploy

**Skills before start:** `concise-planning`, `lint-and-validate`, `e2e-testing-patterns`, `playwright-skill`, `deployment-engineer`, `verification-before-completion`

- [ ] Проверить все локализации (RU/EN/CN) на отсутствие missing translations.
- [ ] Запустить `/qa` workflow для Smoke Report.
- [ ] `pnpm type-check` && `pnpm lint` -> 0 errors, 0 warnings.
- [ ] Выполнить `pnpm build` и убедиться в успехе.
- [ ] Вызвать `/done` workflow для завершения трека.
