# Phase 12 + 13 Plan — Animation, Dark Mode, Accessibility, Stubs & QA
> Дата: 2026-02-23 · Агент: G1H · Скиллы: `react-ui-patterns`, `ui-visual-validator`, `jumpedia-design-system`, `concise-planning`, `verification-before-completion`, `lint-and-validate`

## Общий прогресс трека 4.24
📊 Phase 12 из 13 · 11/13 фаз · ~85% трека завершено

## Введение и зависимости
Обе фазы (12 и 13) из `gate.md` будут выполнены последовательно: добавление визуального полишинга, заглушек фич, и внедрение `next-intl` переводов для всех новых функций треков 4.24 и 4.25 (особенно assign/unassign логики).
- **TypeScript:** ✅ Без ошибок
- **Git:** ⚠️ Uncommitted changes (остались с предыдущей фазы, это нормально)
- **Скиллы:** Загружены все необходимые UI и планировочные скиллы.
- **Риски:** CSS-анимации должны быть легковесны и использовать GPU. Отсутствие переводов сломает Static Export.

---
━━━━━━━━━━━━━━━━━━━━━━━━
📐 ДЕТАЛЬНЫЙ ПЛАН
━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 12 — Animation System + Dark Mode + Accessibility + Stubs (1.5d)

### Задача 1: "Athletic Pulse" Animation System 
**Файлы:**
- `src/styles/tokens.css`
- `src/components/training/cards/SetLogger.module.css`
- `src/components/training/DayConstructor.module.css`
- `src/components/dashboard/AthleteCard.module.css`
**Что делать:**
- [x] В `tokens.css` уже есть алиасы: `--motion-pulse`, `--motion-flow`, `--motion-burst`.
- Настроить классы-анимации в глобальном или утилитном файле (или применять напрямую).
- Добавить Pulse-анимацию на сохранение сета в `SetLogger.tsx` (`scale 1 → 1.03 → 1`, `duration: var(--motion-pulse)`, `easing: var(--ease-spring)`).
- Добавить анимацию `flow` (slide in / fade) для открытия `DayConstructor` (уже есть базовые, нужно отладить под tokens).
- Обернуть все новые keyframes в `tokens.css` в media-query `prefers-reduced-motion` уже сделано глобально.
**Verify:** Визуальный тест через browser_subagent.

### Задача 2: Dark Mode & OLED Auto-detect
**Файл:** `src/styles/tokens.css`
**Что делать:**
- Проверить наличие более мягких success/danger цветов в `[data-theme="dark"]`. (Уже частично сделано, нужно убедиться, что они применяются в `ScoreCard` и алертах).
- Добавить поддержку OLED: `@media (dynamic-range: high) and (prefers-color-scheme: dark)`: установить `--color-bg-primary: #000000;`.
**Verify:** Проверка контрастности.

### Задача 3: Accessibility
**Файлы:**
- `src/styles/tokens.css` / `src/app/globals.css`
- (Различные компоненты)
**Что делать:**
- Внедрить CSS-переменную `--fs-scale: 1` в `:root`.
- Создать утилитный класс/привязку в Settings (в `more/page.tsx` Settings заглушка).
- Сделать audit контрастности на Category Chips (`ExercisePicker`). 
- Убедиться, что stepper buttons в `SetLogger` имеют размер ≥ 44px. (Уже 44px, verify).
**Verify:** WCAG Contrast checker / `ui-visual-validator`.

### Задача 4: Feature Stubs
**Файлы:**
- `src/components/shared/FeatureTeaser.tsx`
- `src/app/[locale]/(protected)/more/page.tsx`
- `src/components/training/WeekConstructor.tsx` (PDF Export)
**Что делать:**
- Уточнить дизайн `FeatureTeaser` (уже создан, нужно расширить/внедрить).
- Создать `ComingSoonCard.tsx` (или использовать `FeatureTeaser` как карточку).
- В `more/page.tsx` добавить Video / Offline пункты с `FeatureTeaser`.
- В `WeekConstructor.tsx` обесточить кнопку PDF Export (установить `disabled={true}` и показать toast "Coming Soon").
- Добавить `ExerciseIllustration.tsx` — компонент-заглушку с fallback иконкой для отсутствующих картинок упражнений.
**Verify:** `pnpm build` и визуальный клик.

---

## Phase 13 — i18n + QA (1.5d)

### Задача 5: Внедрение i18n (RU, EN, CN)
**Файлы:**
- `messages/ru/common.json` 
- `messages/en/common.json`
- `messages/cn/common.json`
**Что делать:**
- Добавить ключи для новых функций из 4.24: Dashboard заголовки (Team Alerts, Pending Reviews), Day Constructor (Add Exercise, Save as Template), SetLogger (Rest, RPE, Last 3).
- Добавить ключи из объединённого 4.25: Label для Assign / Unassign логики на `PhaseCard` (`training.assignGroup`, `training.unassign`, `training.assigningWeek`).
- Заменить хардкод текста в `SeasonDetail.tsx`, `DayConstructor.tsx`, `SetLogger.tsx` на `useTranslations()`.
**Verify:** `pnpm type-check` (если strict-типизация ключей включена).

### Задача 6: Browser Smoke Tests
**Что делать:**
Выполнить 13 тестов из `gate.md` через `browser_subagent` (или описать шаги для ручногоQA):
1-2. Логины тренера и атлета.
3-4. Дашборды.
5-9. Конструкторы и логгеры.
11. **Plan resolution:** создать план → publish → assign группе → войти как атлет → увидеть правильный план.
12. **Override:** создать override → проверить старые overrides.
13. **Assign UX:** видимость assignments на PhaseCard, unassign.
**Verify:** Формальный отчет по всем 13 пунктам.

### Задача 7: Финализация Трека
**Файлы:**
- `CHANGELOG.md`
- `conductor/tracks/track-4.24-training-planning-ux/walkthrough.md`
- `conductor/tracks/track-4.24-training-planning-ux/gate.md`
**Что делать:**
- Обновить changelog новыми фичами.
- Обновить чекбоксы `gate.md`.
- Дописать `walkthrough.md`.
**Verify:** Вызов workflow `/done`. 

━━━━━━━━━━━━━━━━━━━━━━━━
Подтверди план — начну исполнение.
