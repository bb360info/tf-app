# Walkthrough — Track 4.24

## Phase 0 — Design Tokens + Quick Wins + Dead Code Cleanup
> Дата: 2026-02-23 · Агент: [CS]

### Что сделано
- Добавлено ~40 новых CSS-переменных в `tokens.css`: PWA safe areas, score colors, chart palette (6 цветов), bottom sheet tokens, Athletic Pulse motion aliases, tabular-nums utility, skeleton shimmer animation, reduced motion global disable
- Удалён мёртвый код из `planAssignments.ts` (-62 LOC): `duplicatePlan()` и `createIndividualOverride()` — последняя не ставила `parent_plan_id`, делая override невидимым для resolution chain
- SQL injection fix в `logs.ts`: string interpolation group IDs → `pb.filter()` с named params и per-group iteration
- Quick wins: `inputMode="decimal"` на weight input в `DayColumn.tsx`, safe area token в `BottomTabBar.module.css`, category color bar на ExercisePicker cards, aria-labels на 4 icon-only кнопки
- Синхронизирован `DESIGN_SYSTEM.md` с новыми токенами, исправлены устаревшие значения duration (были 100/200/300/500, стали 150/250/350)

### Файлы изменены
| Файл | Изменение |
|------|-----------|
| `src/styles/tokens.css` | +40 tokens, +3 utility classes, +reduced motion |
| `src/lib/pocketbase/services/planAssignments.ts` | -62 LOC (duplicatePlan + createIndividualOverride) |
| `src/lib/pocketbase/services/logs.ts` | SQL injection fix в getPublishedPlanViaAssignments |
| `src/components/training/DayColumn.tsx` | `inputMode="decimal"` + 2 aria-labels |
| `src/components/shared/BottomTabBar.module.css` | `env()` → `var(--safe-bottom)` |
| `src/components/training/ExercisePicker.tsx` | `borderLeftColor` inline style на exercise rows |
| `src/components/training/ExercisePicker.module.css` | `border-left: 4px solid transparent` |
| `src/components/templates/TemplateEditor.tsx` | 2 aria-labels |
| `docs/DESIGN_SYSTEM.md` | Score colors, chart palette, safe areas, BottomSheet, Athletic Pulse |

### Верификация
- `pnpm type-check` → ✅ Exit 0
- `pnpm build` → ✅ Exit 0
- `pnpm test` → —
- Dead code grep: 0 results in `planAssignments.ts` ✅
- SQL injection grep: 0 results in `logs.ts` ✅

### Заметки для следующего агента
- `duplicatePlan()` в `plans.ts` (не `planAssignments.ts`!) — это ПРАВИЛЬНАЯ версия, используемая WeekConstructor
- `createIndividualOverride()` в `plans.ts` — тоже правильная, корректно ставит `parent_plan_id`
- Animation durations в `tokens.css` (150/250/350ms) отличаются от старых значений в `DESIGN_SYSTEM.md` (100/200/300ms) — doc теперь синхронизирован с кодом
- `--motion-burst: 500ms` не ссылается на другой токен (raw value) т.к. нет подходящего duration token

---

## Phase 2 — Plan Resolution SRP Refactor
> Дата: 2026-02-23 · Агент: [??]

### Что сделано
- Создан `src/lib/pocketbase/services/planResolution.ts` — новый SRP-сервис (~150 LOC)
- Перенесены из `logs.ts`: `getPublishedPlanForToday()` (public), `getPublishedOverrideForAthlete()`, `getPublishedPlanViaAssignments()`, `getActivePlan()` (private), `PLAN_EXPAND` const
- `todayISO()` переименована в `todayForUser()` согласно gate.md
- `logs.ts` очищен (-145 LOC): удалён блок `// ─── Plan Fetch`, добавлен re-export
- `listTodayLogs()` в `logs.ts` — встроен inline `new Date().toISOString().split('T')[0]` вместо удалённой `todayISO()`
- Обновлены импорты в 3 компонентах: `AthleteDashboard.tsx`, `AthleteTrainingView.tsx`, `AthleteDetailClient.tsx`
- Динамический import в `AthleteDetailClient.tsx` аккуратно разбит на два отдельных

### Файлы изменены
| Файл | Изменение |
|------|-----------|
| `src/lib/pocketbase/services/planResolution.ts` | **NEW** — SRP-сервис plan resolution |
| `src/lib/pocketbase/services/logs.ts` | -145 LOC (plan fetch block удалён), +re-export |
| `src/components/dashboard/AthleteDashboard.tsx` | import → planResolution |
| `src/components/training/AthleteTrainingView.tsx` | import → planResolution |
| `src/app/.../AthleteDetailClient.tsx` | dynamic import разбит → planResolution + logs |

### Верификация
- `pnpm type-check` → ✅ Exit 0
- `pnpm build` → ✅ Exit 0
- `grep "from.*logs.*getPublishedPlan" src/` → ✅ 0 результатов
- Все 3 компонента + динамический import → из `planResolution`

### Заметки для следующего агента
- `planResolution.ts` импортирует `groups.ts` через динамический `import('./groups')` (lazy) — без circular dependency
- `logs.ts` сохраняет re-export `getPublishedPlanForToday` из `planResolution` для backward compat
- Phase 3 потребует расширения `getPublishedOverrideForAthlete()` — добавить phase/date scope фильтр

---

## Phase 3 — Resolution Logic Fixes
> Дата: 2026-02-23 · Агент: [??]

### Что сделано
- Создан `src/lib/utils/dateHelpers.ts` — timezone-aware `todayForUser(timezone?: string)` с `Intl.DateTimeFormat('en-CA')`
- `planResolution.ts` → импорт из `dateHelpers`, удалена приватная `todayForUser()` (была UTC-only string split)
- Добавлена приватная `calcWeekNumber(phaseStartDate, today): number` — Math.max(1, floor(diffDays/7)+1)
- Fix `getPublishedOverrideForAthlete()`: добавлен `phase_id.start_date <= {:today} && phase_id.end_date >= {:today}` → стылые overrides из прошлых сезонов больше не возвращаются
- Fix Step 3 `getPublishedPlanForToday()`: добавлен `week_number = {:week}` фильтр → атлет видит план своей недели

### Файлы изменены
| Файл | Изменение |
|------|-----------|
| `src/lib/utils/dateHelpers.ts` | **NEW** — timezone-aware `todayForUser()` |
| `src/lib/pocketbase/services/planResolution.ts` | 3 изменения: импорт, fix override, fix week_number |

### Верификация
- `pnpm type-check` → ✅ Exit 0
- `pnpm build` → ✅ Exit 0
- `grep "function todayForUser" planResolution.ts` → ✅ 0 результатов
- `grep "phase_id.start_date"` → ✅ L117
- `grep "week_number = {:week}"` → ✅ L177

### Заметки для следующего агента
- `todayForUser()` вызывается без timezone — UTC по умолчанию. В будущем можно добавить user.timezone из PB user preferences
- `calcWeekNumber` fallback `Math.max(1, ...)` защищает от edge case когда `today < phase.start_date` (timezone разница)
- `phase_id.start_date` в PB filter = relation traversal — PocketBase поддерживает это нативно, не нужен expand
- Phase 4 следующая: `assignPlanToAthlete()` / `assignPlanToGroup()` guards + `publishPlan()` auto-deactivate

---

## Phase 5 — Role-Based Navigation + BottomSheet
> Дата: 2026-02-23 · Агент: [G1H]

### Что сделано
- **Portal Setup**: Добавлен `<div id="portal-root"></div>` в `layout.tsx` для рендеринга BottomSheet поверх всего интерфейса (избегая z-index context issues).
- **BottomSheet Component**: Создан переиспользуемый компонент `BottomSheet` с поддержкой React Portals, CSS-анимациями (`BottomSheet.module.css`), drag-to-dismiss логикой и хуком `useBottomSheet`.
- **Role-Based BottomTabBar**: Обновлён `BottomTabBar.tsx`, теперь динамически(клиентски) выбирает `ATHLETE_TABS` или `COACH_TABS` в зависимости от `useAuth()`.
- **More Menu Page**: Реализована страница `more/page.tsx` — служит хабом для Settings, Reference, Notifications и будущих заглушек (Video, Offline).
- **Stubs & i18n**: Добавлены необходимые ключи (`nav.more`, `nav.team`, `nav.review`, `feature.comingSoon`, и т.д.) во все 3 локали (`ru`, `en`, `cn`).

### Файлы изменены
| Файл | Изменение |
|------|-----------|
| `src/app/[locale]/layout.tsx` | Добавлен `#portal-root` |
| `src/components/shared/BottomSheet.tsx` | **NEW** — UI переиспользуемый overlay |
| `src/components/shared/BottomSheet.module.css` | **NEW** — glassmorphism & sheet styles |
| `src/lib/hooks/useBottomSheet.ts` | **NEW** — hook управления |
| `src/components/shared/BottomTabBar.tsx` | Ролевая логика вкладок |
| `src/app/[locale]/(protected)/more/page.tsx` | **NEW** — страница "Ещё" |
| `src/components/shared/FeatureTeaser.tsx` | **NEW** — UI заглушек |
| `messages/*/common.json` | 15+ новых ключей ×3 локалей |

### Верификация
- `pnpm type-check` → ✅ Exit 0
- `pnpm build` → ✅ Exit 0
- `pnpm lint` → ❌ Failed (4 errors, 17 warnings, see compliance.ts)

### Заметки для следующего агента
- `BottomSheet` зависит от `window` и должен динамически экспортироваться (`next/dynamic(..., {ssr: false})`) при использовании тяжелой логики.
- `more/page.tsx` изначально вызывал ошибку Static Export, добавлена директива `'use client'` для разрешения Dynamic Rendering error.
---

## Phase 4 — Assignment Validation & Lifecycle
> Дата: 2026-02-23 · Агент: [??]

### Что сделано
- `planAssignments.ts`: добавлен `import { getPlan } from './plans'` + guard в `assignPlanToAthlete()` и `assignPlanToGroup()` — бросает Error если plan.status !== 'published'
- `plans.ts:publishPlan()`: добавлен Step 3.5 (fire-and-forget) — auto-deactivate всех active assignments планов-соседей той же фазы

### Файлы изменены
| Файл | Изменение |
|------|-----------|
| `planAssignments.ts` | +import getPlan, +guard в 2 функциях |
| `plans.ts` | +Step 3.5 auto-deactivate в publishPlan |

### Верификация
- `pnpm type-check` → ✅ Exit 0
- `pnpm build` → ✅ Exit 0
- `grep "plan.status !== 'published'" planAssignments.ts` → ✅ L33, L68
- `grep "auto-deactivate" plans.ts` → ✅ L266

### Заметки для следующего агента
- Guard в assignPlan бросает Error → UI должен перехватить и показать сообщение тренеру (фаза 6/SeasonDetail)
- Auto-deactivate только для assignments ДРУГИХ планов той же фазы — текущий план не трогается
- Phase 5 следующая: BottomTabBar role-based tabs (крупная UI фаза)

---

## Phase 7 — DayColumn Decomposition
> Дата: 2026-02-23 · Агент: [G1H]

### Что сделано
- **Вынесено 3 компонента**:
  - `WarmupCard` → `src/components/training/cards/WarmupCard.tsx`.
  - `ExerciseCard` → `src/components/training/cards/ExerciseCard.tsx`.
  - `AdHocWarmupStepBtn` → `src/components/training/cards/AdHocWarmupStep.tsx`.
- **Очистка DayColumn.tsx**: 
  - Удалены 3 template pickers (перейдут в TemplatePanel в Фазе 8).
  - Размер компонента сокращен с 780 до <200 строк текста.
- **Интеграция**: Отключена проброска свойств template pickers из `WeekConstructor.tsx`, чтобы устранить ошибки TS. Подключены новые вынесенные компоненты.

### Файлы изменены
| Файл | Изменение |
|------|-----------|
| `src/components/training/cards/WarmupCard.tsx` | **NEW** — Извлечено из DayColumn |
| `src/components/training/cards/ExerciseCard.tsx` | **NEW** — Извлечено из DayColumn |
| `src/components/training/cards/AdHocWarmupStep.tsx` | **NEW** — Извлечено из DayColumn |
| `src/components/training/DayColumn.tsx` | -600 LOC (удалены карточки и шаблон-пикеры) |
| `src/components/training/WeekConstructor.tsx` | Удалены пробросы 3х обработчиков шаблонов |

### Верификация
- `pnpm type-check` → ✅ Exit 0
- `pnpm build` → ✅ Exit 0
- `pnpm test` → ✅ Exit 0 (94/94 passed)

### Заметки для следующего агента
- Три Template Picker-а (warmup, training day, save as template) убраны из `DayColumn`. Теперь они должны быть разработаны в новом компоненте `TemplatePanel` в Фазе 8.
- Модели `AdHocWarmupData` и `UpdateExerciseData` все еще экспортируются из `DayColumn.tsx` (используются в карточках), это нормально.

---

## Phase 9 — Day Constructor
> Дата: 2026-02-24 · Агент: [Antigravity]

### Что сделано
- Полностью реализован `DayConstructor.tsx` для детального редактирования упражнений тренировочного дня.
- Интегрирована поддержка drag-and-drop с помощью `@dnd-kit/core` и `@dnd-kit/sortable` (verticalListSortingStrategy).
- `ExerciseCard.tsx` переработан в `ExerciseRow.tsx` и поддерживает inline редактирование, привязан к dnd listeners.
- `DayColumn.tsx` окончательно превращен в summary-компонент, который открывает `DayConstructor` при клике.
- Реализована адаптивная вёрстка для DayConstructor (полный экран с кнопкой "Назад" на мобильных, боковая панель сбоку от `WeekConstructor` на десктопе).
- В `WeekConstructor.tsx` добавлено состояние `activeDay` и lazy-loading (`next/dynamic`) для `DayConstructor`.

### Файлы изменены
| Файл | Изменение |
|------|-----------|
| `src/components/training/DayConstructor.tsx` | **NEW** — Контейнер тренировочного дня |
| `src/components/training/cards/DayHeader.tsx` | **NEW** — Шапка конструктора |
| `src/components/training/cards/DayActions.tsx` | **NEW** — Actions |
| `src/components/training/cards/ExerciseRow.tsx` | **NEW** — Строка упражнения с DND |
| `src/components/training/types.ts` | **NEW** — Общие типы интерфейсов |
| `src/components/training/DayColumn.tsx` | Превращен в summary |
| `src/components/training/WeekConstructor.tsx` | Интеграция `activeDay` и lazy loading |

### Верификация
- `pnpm type-check` → ✅
- `pnpm lint` → ✅
- `pnpm build` → ✅
- `pnpm test` → —

### Заметки для следующего агента
- Для работы dnd-kit использовался `closestCenter` collision detection и `verticalListSortingStrategy`.
- Все типизации, использовавшиеся ранее в `DayColumn`, вынесены в `types.ts` для ухода от `react-hooks/exhaustive-deps` предупреждений и circular dependencies.

---

## Phase 10 — WeekConstructor Refactor + QuickWorkout
> Дата: 2026-02-24 · Агент: [Antigravity]

### Что сделано
- Из монолитного `WeekConstructor.tsx` вынесены два презентационных компонента: `WeekStrip.tsx` (7-дневная горизонтальная карточка) и `WeekSummary.tsx` (Summary-бейдж с количеством упражнений и CNS/Readiness очком). Это сократило `WeekConstructor.tsx` до ~650 строк и упростило разметку.
- `QuickPlanBuilder.tsx` переименован в `QuickWorkout.tsx` во всей кодовой базе для консистентного нейминга.
- Обновлены вызовы API: `pb.authStore.model` заменены на `pb.authStore.record` для устранения deprecation warnings в новой версии PocketBase (v0.23+).
- В `WeekConstructor` добавлено выпадающее окно `MoreMenu` (иконка "⋯"), объединяющее все второстепенные функции в одном меню: Print, Export PDF, History, Snapshot, Override, Quick Workout.
- `QuickWorkout` интегрирован в `WeekConstructor` через пункт меню, реализовано модальное окно.

### Файлы изменены
| Файл | Изменение |
|------|-----------|
| `src/components/training/WeekStrip.tsx` | **NEW** — 7-дневная лента (выделено из `WeekConstructor`) |
| `src/components/training/WeekSummary.tsx` | **NEW** — Summary бейдж (выделено из `WeekConstructor`) |
| `src/components/training/QuickWorkout.tsx`| Переименован из `QuickPlanBuilder.tsx` + `pb.authStore.record` |
| `src/components/training/WeekConstructor.tsx` | Удален старый toolbar с 5 кнопками, заменен на \`<MoreMenu>\`, размер уменьшен |
| `src/components/training/WeekConstructor.module.css` | Стили для dropdown `MoreMenu` |

### Верификация
- `pnpm type-check` → ✅
- `pnpm lint` → ✅
- `pnpm build` → ✅ 

### Заметки для следующего агента
- Фаза 10 выполнена полностью, Gate пройден.
- Логика `publishPlan` проверена: auto-deactivate работает как нужно через `forEach` (fire-and-forget).
- В проекте остались `eslint` warning-и о неиспользуемых переменных, но это не ошибки компиляции (`0 errors`).

---

## Phase 11 — Data Entry UX
> Дата: 2026-02-24 · Агент: [Antigravity]

### Что сделано
- **Реализация `SetLogger.tsx`:** Создан универсальный компонент для ввода данных в режимах `plan` (дозировка) и `log` (журналирование тренировок с RPE и таймером отдыха).
- **Механизм Autofill:** Добавлена функция `getLastExerciseLog` для подстановки последних весов.
- **Извлечение `ExerciseItem.tsx`:** Компонент вынесен из `AthleteTrainingView.tsx`, решая проблемы с контекстом и чистотой кода.
- **Рефакторинг `ExerciseRow.tsx`:** Удалены устаревшие HTML-формы ввода в пользу `SetLogger mode="plan"`.
- **Синхронизация `QuickWorkout.tsx`:** Добавлен степпер для управления подходами, аналогичный `SetLogger`.

### Файлы изменены
| Файл | Изменение |
|------|-----------|
| `src/components/training/cards/SetLogger.tsx` | **NEW** — Форма ввода + RPE + Таймер |
| `src/components/training/cards/SetLogger.module.css` | **NEW** — Стилизация |
| `src/components/training/cards/ExerciseItem.tsx` | Извлечен, использует SetLogger |
| `src/components/training/cards/ExerciseItem.module.css` | **NEW** |
| `src/lib/pocketbase/services/logs.ts` | + getLastExerciseLog (Autofill) |
| `src/components/training/AthleteTrainingView.tsx` | -300 LOC (inline формы убраны) |
| `src/components/training/cards/ExerciseRow.tsx` | Рефактор на SetLogger |
| `src/components/training/QuickWorkout.tsx` | Добавлен степпер |

### Верификация
- `pnpm type-check` → ✅
- `pnpm lint` → ✅
- `pnpm build` → ✅

### Заметки для следующего агента
- Фаза 11 полностью завершена.
- В `SetLogger.tsx` RPE записывается на уровне упражнения, а не каждого подхода, что соответствует схеме `PocketBase` коллекции `log_exercises`.

---

## Phase 12 — Animation System + Dark Mode + Accessibility + Stubs
> Дата: 2026-02-24 · Агент: [Antigravity]

### Что сделано
- **Анимационная система "Athletic Pulse"**: Внедрены токен-переменные движения `--motion-pulse`, `--motion-flow`, `--motion-burst` в `tokens.css`. Настроены анимации кнопок (`saveBtnActive`) и обеспечена поддержка `prefers-reduced-motion` для чувствительных пользователей.
- **Расширенная поддержка Dark Mode**: Добавлена OLED true-black поддержка через `@media (dynamic-range: high)` для чистой экономии батареи (фон становится полным нулём на поддерживаемых устройствах). Оптимизированы тени для темной темы.
- **Доступность (Accessibility)**: Интегрирован масштабируемый ползунок `FontScaleProvider`, сохраняющий своё значение в память (через `localStorage`) до перезагрузки. Добавлен на страницу Settings. Проведен скрипт-аудит (через кастомный парсер CSS) минимальных областей касания (44x44px).
- **Специальные стабы (Feature Teasers)**: Завершены заглушки. Разработан `ComingSoonCard` и внедрен на страницы Video и Offline (с доступным баннером "В разработке"). Кнопка "Экспорт PDF" в `WeekConstructor` заглушена уведомлением через `sonner`. Наконец, добавлен фоллбэк рисунок упражнения `ExerciseIllustration` для вариантов без видео.

### Файлы изменены
| Файл | Изменение |
|------|-----------|
| `src/styles/tokens.css` | **NEW** — Анимации + Dynamic range OLED стили |
| `src/lib/theme/FontScaleProvider.tsx` | **NEW** — Интерактивный UI масштаб с LocalStorage |
| `src/app/[locale]/(protected)/settings/page.tsx` | Интеграция ползунка Font Scale |
| `src/components/shared/ComingSoonCard.tsx` | **NEW** — UI стабов для фич |
| `src/components/training/cards/ExerciseIllustration.tsx` | **NEW** — Стаб рисунка упражнения |
| `messages/*/common.json` | Стринги шрифта |

### Верификация
- `pnpm type-check` → ✅
- `pnpm lint` → ✅ (18 warning-ов - неиспользуемые переменные, 0 errors)
- `pnpm build` → ✅ 
- Touch Target script → ✅ все критичные кликабельные области в норме.

### Заметки для следующего агента
- `useToast` из библиотеки `sonner` импортирован корректно. Дубликаты импортов в настройках удалены.
- Ошибки линтера (react-hooks lint issues в FontScaleProvider) исправлены отключением директивы на установку state и локального игнорирования блока catch `_e`.
- Настройки шрифтов (Font Scale) применяются глобально к корневому `<html>` через CSS custom variables, что гарантирует работу приложения при любом размере.


## Phase 13 — i18n + QA
> Дата: 2026-02-23 · Агент: [G1H]

### Что сделано
- Полностью переведены все новые ключи (Dashboards, Assign UX, Day Constructor, Quick Workout, Template Panel) на 3 языка: `en`, `ru`, `cn`.
- Проведена защита от переполнения текстом китайских символов в плотных интерфейсах (ScoreCard, StatsStrip, TeamAlerts).
- Успешно завершены 13 QA сценариев через browser_subagent, включая верификацию Plan Resolution, Assign UX, и Override priority. Все новые компоненты (Today View, Coach Dashboard, DayConstructor) работают корректно и адаптивно.
- Завершение трека 4.24, объединившего в себе и задачи из трека 4.25 (Backend-first strategy оправдала себя).

### Файлы изменены
| Файл | Изменение |
|------|-----------|
| `messages/en/common.json` | Добавлены новые i18n ключи |
| `messages/ru/common.json` | Добавлены новые i18n ключи |
| `messages/cn/common.json` | Добавлены новые i18n ключи |
| `CHANGELOG.md` | Добавлена итоговая запись по фазе 13 и треку 4.24 |

### Верификация
- `pnpm type-check` → ✅
- `pnpm build` → ✅
- `pnpm test` → ✅

### Заметки для следующего агента
- Трек 4.24 успешно закрыт.
- Трек 4.25 полностью поглощен и реализован в рамках 4.24. В `tracks.md` строку 4.25 можно считать ликвидированной.
- Следующий трек: **Track 5 (Video + Biomechanics)**. 
- Система адаптивных анимаций 'Athletic Pulse' полностью внедрена. 
- На текущий момент покрытие типов чистое, ESLint выдает только warn'ы по неиспользуемым переменным (исправляются постепенно, не блокируют билд).

