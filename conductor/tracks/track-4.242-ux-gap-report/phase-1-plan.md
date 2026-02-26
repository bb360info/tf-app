# Phase 1 — UX Gaps & Fake Affordances (P0/P1)
> Дата: 2026-02-25 · Агент: [??] · Скиллы: [react-ui-patterns, i18n-localization, systematic-debugging, concise-planning, brainstorming]

## Контекст фазы

Цель фазы — убрать ложные affordance и незавершенные UX-сценарии (stub/disabled/no-op), закрыть приоритетные проблемы локализации и дат (UTC drift), и довести ключевые coach-flows до понятного поведения.

## Задачи и реализация

### 1) Скрыть заглушку `training/review`
**Файлы:**
- `src/app/[locale]/(protected)/training/review/page.tsx`
- `src/components/dashboard/coach/PendingReviews.tsx`

**Что делать:**
- Убрать доступ к stub-странице из пользовательского потока.
- В `training/review/page.tsx` заменить контент заглушки на безопасный сценарий (`redirect('/training')` или `notFound()`; приоритет — редирект).
- В `PendingReviews` оставить информирование, но без перехода в недоступный экран.

**Verify:**
- Пользователь не может попасть в пустую заглушку через UI.
- Прямой переход на `/training/review` не показывает stub-страницу.

---

### 2) Исправить hardcoded `/dashboard` в analytics (с учётом локали)
**Файл:**
- `src/app/[locale]/(protected)/analytics/page.tsx`

**Что делать:**
- Убрать hardcoded переходы на `"/dashboard"` и оставить только i18n-safe навигацию.
- Проверить `Link`/`backHref`/action-кнопки на сохранение текущей локали.

**Verify:**
- Переходы из analytics всегда в рамках текущей локали (`/ru`, `/en`, `/cn`).

---

### 3) Закрыть UTC drift через локальную дату
**Файлы (минимум фазы):**
- `src/lib/utils/dateHelpers.ts`
- `src/app/[locale]/(protected)/dashboard/page.tsx`
- `src/components/training/QuickWorkout.tsx`
- `src/lib/pocketbase/services/readiness.ts`

**Что делать:**
- Добавить утилиту `toLocalISODate(date?: Date): string` (локальная календарная дата без UTC-сдвига).
- Заменить приоритетные `toISOString().slice(0, 10)` в целевых файлах на `toLocalISODate`.
- После первичной замены пройти по остальным матчам и оценить, что критично для UI/алертов в этой фазе.

**Verify:**
- Значение “today” совпадает с локальной датой пользователя в разных timezone.

---

### 4) Templates UX polish (убрать fake-actions)
**Файлы:**
- `src/components/templates/TemplatePanelContent.tsx`
- `src/components/templates/TemplatePanel.module.css`

**Что делать:**
- Убрать no-op handlers `onCopy/onEdit/onDelete`.
- Привязать `Create first template` к реальному старту создания.
- Поднять `+ Create` в header блока шаблонов.
- Визуально упорядочить “Warm-Ups / Training Days” как явные tab-pattern.

**Verify:**
- Нет видимых кнопок без действия.
- Создание шаблона стартует из empty-state и из header.

---

### 5) Полностью убрать `Save PDF` stub
**Файл:**
- `src/components/training/WeekConstructor.tsx`

**Что делать:**
- Удалить пункт `Save PDF` из меню и связанный stub/TODO-код.

**Verify:**
- В more-menu конструктора недели отсутствует `Save PDF`.

---

### 6) Онбординг атлета с PR при создании
**Файлы:**
- `src/components/dashboard/AddAthleteModal.tsx`
- `src/components/dashboard/AddAthleteModal.module.css`
- `src/lib/pocketbase/services/personalRecords.ts`
- `src/lib/pocketbase/services/athletes.ts`
- `src/lib/pocketbase/types.ts`

**Что делать:**
- Добавить структуру модалки с шагом/вкладкой “Спортивный профиль”.
- Добавить поля: вторая дисциплина (`secondary_disciplines`) и стартовый PR.
- После `createAthlete` вызывать `addPersonalRecord` (условно, если PR заполнен).

**Verify:**
- Атлет создаётся.
- При заполненном PR запись появляется сразу в `personal_records`.

---

### 7) UI полишинг AddAthleteModal
**Файл:**
- `src/components/dashboard/AddAthleteModal.module.css`

**Что делать:**
- Привести визуал к glassmorphism через токены.
- Проверить touch targets (`>=44x44`) для интерактивов.
- Уточнить CTA-тексты для менее двусмысленного UX.

**Verify:**
- Мобильный сценарий без мелких/нечитабельных контролов.
- Соответствие токенам design-system.

---

### 8) Groups UX: единый сценарий “Управление группой”
**Файлы:**
- `src/app/[locale]/(protected)/settings/groups/page.tsx`
- `src/app/[locale]/(protected)/settings/groups/groups.module.css`

**Что делать:**
- Заменить россыпь мелких действий move/add на единый entry-point.
- Добавить диалог с выбором действия: “Добавить к новой” / “Перевести полностью”.
- Сохранить существующие сервисные операции (`handleMoveAttempt`/confirm flow), но упростить вход в них.

**Verify:**
- Один понятный UX-путь управления участником группы.

---

### 9) Кнопка `+ Создать план для группы`
**Файлы:**
- `src/app/[locale]/(protected)/settings/groups/page.tsx`
- `src/app/[locale]/(protected)/training/page.tsx`
- `src/components/training/SeasonWizard.tsx`

**Что делать:**
- Добавить CTA в groups.
- Пробросить preselect-group в flow создания сезона/плана (query/state).
- Отобразить предвыбранную группу в wizard.

**Verify:**
- Из groups можно перейти к созданию плана/сезона с уже выбранной группой.

---

### 10) QuickWorkout: убрать local save, оставить 3 целевых сценария
**Файлы:**
- `src/components/training/QuickWorkout.tsx`
- `src/components/training/QuickWorkout.module.css`
- сервисы назначений/планов (`planAssignments`, `plans`, `groups`)

**Что делать:**
- Убрать localStorage-history сценарий.
- Оставить 3 действия: “Сохранить в Библиотеку”, “Назначить Атлету”, “Назначить Группе”.
- Добавить дату назначения и conflict resolution: Replace / Add / Cancel.
- После успешного действия закрывать модалку и показывать toast.

**Verify:**
- Конфликты дня решаются явно.
- После успеха модалка закрывается.

---

### 11) Сезоны для групп (`group_id`)
**Файлы/слои:**
- PocketBase schema: `seasons` (добавить relation `group_id`)
- `src/lib/pocketbase/types.ts`
- `src/lib/validation/training.ts`
- `src/lib/pocketbase/services/seasons.ts`
- `src/components/training/SeasonWizard.tsx`

**Что делать:**
- Добавить `group_id` в schema `seasons` (через PB admin/MCP при авторизации).
- Обновить TS-типы и Zod-схемы.
- В `SeasonWizard` добавить режим “для атлета / для группы” с выбором группы тренера.

**Verify:**
- Сезон создаётся и сохраняет `group_id` для группового сценария.

---

### 12) Технический пролог: починить текущий TS blocker
**Файл:**
- `src/app/[locale]/(protected)/notifications/NotificationsClientPage.tsx`

**Что делать:**
- Убрать/заменить `@ts-expect-error`, который сейчас невалиден (unused directive).

**Verify:**
- Ошибка `TS2578` исчезла.

---

### 13) Унификация `AthleteForm` для Create/Edit/Settings (Dashboard + Settings)
**Файлы:**
- `src/components/athletes/form/types.ts`
- `src/components/athletes/form/AthleteForm.tsx`
- `src/components/athletes/form/AthleteForm.module.css`
- `src/components/athletes/form/index.ts`
- `src/components/athletes/index.ts`
- `src/components/dashboard/AddAthleteModal.tsx`
- `src/components/dashboard/EditAthleteModal.tsx`
- `src/components/settings/AthleteProfileSettingsPanel.tsx`
- `src/lib/validation/athleteForm.ts`
- `src/lib/validation/index.ts`
- `messages/ru/common.json`
- `messages/en/common.json`
- `messages/cn/common.json`

**Что сделано:**
- Вынесен единый переиспользуемый `AthleteForm` с режимами `create/edit/settings`.
- Submit/IO логика оставлена в контейнерах (`Add/Edit/Settings`), UI-компонент чисто формовый.
- Добавлен общий payload `AthleteFormSubmitPayload` (`athletePatch`, `newPRs`, `replacePRs`) и общая Zod-валидация.
- В `edit` и `settings` подключены текущие PR (`getCurrentPRs`) с inline replace.
- Перезапись PR ведётся только через `addPersonalRecord` (история сохраняется).
- Удаление PR доступно только в `settings/profile` через `onDeletePR`.
- Secondary disciplines расширены до 2 значений, с запретом дублировать primary.
- Создан общий i18n namespace `athleteForm` (ru/en/cn), подключён в Dashboard и Settings.

**Verify:**
- `pnpm type-check` → ✅
- `pnpm lint` → ✅ (0 errors, 14 warnings вне зоны задачи)
- `pnpm test` → ✅
- `pnpm build` → ✅

## Порядок выполнения

1. TS blocker (`NotificationsClientPage`)  
2. `training/review` скрытие + routing cleanup analytics  
3. UTC utility + замены дат (приоритетные места)  
4. Templates + WeekConstructor (`Save PDF`)  
5. AddAthlete onboarding + PR + UI polish  
6. Groups UX + CTA “создать план для группы”  
7. QuickWorkout rework  
8. Group seasons (`group_id`) и интеграция в wizard

## Риски и зависимости

- PB schema (`group_id`) требует авторизации и согласованного изменения типов+валидации+UI.
- Грязное рабочее дерево: правки должны быть строго точечными, без затрагивания несвязанных изменений.
- UTC-замены нужно делать аккуратно, чтобы не сломать серверные/исторические фильтры.

## Проверка фазы (минимум)

- `pnpm type-check`
- `pnpm lint`
- `pnpm build`

После выполнения всех пунктов Phase 1:
- `gate.md`: все `[/]` по Phase 1 -> `[x]`
- запуск `/done` workflow.
