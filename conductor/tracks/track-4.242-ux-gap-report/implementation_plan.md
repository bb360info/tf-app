# Implementation Plan: Track 4.242 (Polish, UX Gaps & Tech Debt Zero)

## Goal

Устранить ложные элементы интерфейса (fake affordances), решить проблему UTC Drift, переработать UI тренировок атлета (добавив SeasonProgressTimeline) и погасить основной технический долг ("Монстры" объекты, `any`).

> Статус-аудит: 2026-02-25 (по фактическому состоянию кода).  
> Обозначения: `[x]` — сделано, `[~]` — частично, `[ ]` — не начато/не завершено.

## Architecture & Database Alignment (PocketBase)

- Все запросы к сезонам и фазам в `SeasonProgressTimeline` должны использовать PocketBase SDK и `expand` параметры (`expand="phases"`), чтобы избежать проблемы "N+1".
- Типизация для всех данных из БД должна использовать `Zod` (папка `validation`), строгое устранение `any`.
- Все манипуляции со временем (UTC Drift) должны решаться клиентской утилитой на базе данных браузера, а не тупым срезом по UTC.

---

## Tasks

### Phase 1: UX Gaps & Fake Affordances Removal

- [~] Task 1.1: Скрыть мертвый UI. В `more/page.tsx` убрать `(WIP)`. В `training/review` скрыть заглушку. В `PlanHistoryModal.tsx` скрыть `Restore version`. В `WeekConstructor` вырезать `Save PDF`. В Coach Dashboard скрыть `TrainingToday`.
  → Verify: Нерабочие/заимплементированные наполовину кнопки исчезли (YAGNI).
- [~] Task 1.2: Переработать бейджи, навигацию и i18n. В `BottomTabBar.tsx` удалить бейдж `review`. В `analytics/...` заменить `href="/dashboard"` на локализованный вид. Исправить баг ключа `[training.week]` на карточке назначения `Assigned to:`.
  → Verify: Ключ переведен, бейдж исчез, роутинг не скидывает локаль.
- [ ] Task 1.3: Шаблоны (Templates UX Polish). В `TemplatePanelContent.tsx` скрыть экшены `Copy/Edit/Delete`. Кнопку `+ Create` перенести наверх страницы к заголовку через Flexbox. Блоки "Warm-Ups | Training Days" стилизовать как Tabs, уменьшив визуальный вес.
  → Verify: Кнопка создания очевидна, интерфейс стал чище и легче.
- [ ] Task 1.4: UTC Drift Utility. В `src/lib/utils/date.ts` создать функцию `toLocalISODate(date)`. Найти `toISOString().slice(0, 10)` в `dashboard/page.tsx`, `QuickWorkout.tsx`, `readiness.ts` и заменить на `toLocalISODate()`.
  → Verify: Вывод даты совпадает с локальным днем атлета/тренера.
- [ ] Task 1.5: Онбординг атлета & PRs. В `AddAthleteModal.tsx` разделить UI на вкладки "Базовая инфа" и "Спортивный профиль" (вторая дисциплина, актуальный PR). На сабмите вызывать `addPersonalRecord`. Всю модалку перевести на Glassmorphism.
  → Verify: При добавлении атлета у него сразу появляется рекорд. Кнопки понятные и крупные.
- [ ] Task 1.6: Управление Группами (`groups/page.tsx`). Заменить иконки "Смена/Добавление" на модалку "Управление группой", объяснить тренеру последствия. На главном экране группы добавить кнопку `[+ Создать план для группы]`.
  → Verify: Логика добавления и перевода атлетов прозрачна, план создается в 1 клик.
- [ ] Task 1.7: Быстрая тренировка (`QuickWorkout.tsx`). Убрать сохранение локально. Оставить выбор: "В Библиотеку", "Атлету" или "Группе". Если назначаем (с датой), реализовать UI предупреждения (Replace / Add / Cancel), если тренировка в этот день уже есть. По успеху закрывать окно с Toast.
  → Verify: Конфликты решаются, окно всегда уходит, нет "подвисших" модалок.
- [ ] Task 1.8: Сезоны для групп. Добавить `group_id` (`relation` -> `groups`) в `seasons` коллекцию через админку PocketBase. В `SeasonWizard.tsx` добавить радио-выбор: "Сезон для Атлета" или "Сезон для Группы", с подгрузкой ID.
  → Verify: При создании сезона можно привязать его ко всей выбранной группе сразу.

### Phase 2: Athlete `/training` UI Overhaul (Hero-блок)

- [ ] Task 2.1: Очистка старья. В `AthleteTrainingView.tsx` изменить заголовок на `training.title` ("My Training") и удалить компонент `AthleteSeasonsList`.
- [ ] Task 2.2: Создание `AthleteContextBanner`. Обновить запрос `fetchActiveSeason` на `expand="phases,competitions"`. Сверстать новый Glass-контейнер объединяющий: `SeasonProgressTimeline`, `PhaseFocus` (из поля `focus`), и `NearestCompetition` (обратный отсчет).
  → Verify: Вверху `AthleteTrainingView.tsx` красивый блок с контекстом сезона и целью атлета.
- [ ] Task 2.3: Умный статус дней (Glow & Opacity). В компоненте `DayColumn` (или `DayCard`) стилизовать дни ДО сегодняшнего (сделать их матовыми/`opacity: 0.6`). Для карточки текущего дня (Today) добавить свечение `glow` и более выраженную границу.
  → Verify: "Сегодня" сразу притягивает взгляд.
- [ ] Task 2.4: Empty State "Draft". Если план в статусе "draft", вместо пустоты отображать текст "Тренер прямо сейчас составляет для вас план".
  → Verify: Снимается тревожность "у меня нет плана".
- [ ] Task 2.5: Circular Progress & Localization. В `DayCard.tsx` заменить "Record Result" бейдж на текстовый чип "Today". Добавить Circular Progress для заполненного дня. В `ScoreCard.tsx` внедрить `next-intl` (ru/en/cn). Убедиться, что touch targets у кнопок >= 44x44px.

### Phase 3: Tech Debt Zero

- [ ] Task 3.1: Debt Scanner. Запустить `/debt`, удалить неиспользуемые файлы (`ActivityFeed`, `NotificationPreferences`, старый `DailyCheckin`).
- [~] Task 3.2: Дробление `AthleteDetailClient.tsx`. Разделить 700+ строк на `OverviewTab`, `TrainingTab`.
- [~] Task 3.3: Дробление `WeekConstructor.tsx` и UX Toggle.
  1. Разбить хук и UI.
  2. Заменить статичный статус "DRAFT" в шапке на интерактивный `StatusToggle` (на клик спрашивать Confirm и менять на `published`).
  3. Изменить цвета бейджей "0 упражнений" слева от дней с красного на серый (var(--color-neutral-*)). Красный использовать только как индикатор ошибок.
  → Verify: Конструктор работает, план публикуется в 1 клик через шапку, UI стал менее агрессивным.
- [ ] Task 3.4: Weekly Status Map (Карта Недель для Тренера). В карточку фазы (`PhasePhaseCard`) добавить рендер статусов недель: цепочку цветовых точек (зеленый - published, желтый - draft, серый - пусто). Обернуть точки в ссылки напрямую на нужную неделю.
- [ ] Task 3.5: Clean Lint & Typed. Убрать `t: any` из компонентов. Исправить `TODO` и warnings.

### Phase 4: Final Verification & QA

- [ ] Task 4.1: Сборка и проверка. Запустить `pnpm type-check && pnpm lint && pnpm build && pnpm test`.
  → Verify: 0 errors на всех чек-шагах.
- [ ] Task 4.2: Smoke Testing. Вызвать `/qa` с использованием `browser_subagent` для прогона потока.
  → Verify: Пройден.
- [ ] Task 4.3: Закрытие. Вызвать `/done` для завершения трека и генерации `walkthrough.md`.

## Done When

- [ ] `gate.md` P0-P2 пункты выполнены.
- [ ] Мертвые элементы дизайна скрыты или удалены.
- [ ] В `AthleteTrainingView.tsx` есть новый `SeasonProgressTimeline`.
- [ ] Проект строго типизирован (no `any`), проходит билд и работает корректно в offline (Сервисы PocketBase).
