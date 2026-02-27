# Context: Редизайн страницы тренировки атлета

> 📁 Sandbox-трек. Не трогает глобальный Conductor.  
> Цель — спланировать и реализовать редизайн `AthleteTrainingView`.

---

## Что и зачем

**Страница тренировки атлета** — единственный экран, где спортсмен видит свой тренировочный план и логирует результаты. Текущая реализация не справляется с нагрузкой: при 10-15 упражнениях в день атлет теряется в бесконечном скролле, CTA-кнопка скрыта под списком упражнений, touch targets нарушены.

**Цель редизайна:** три режима на одном экране:

1. **Overview** — обзор дня + навигация по неделям
2. **Focus Mode** — live-тренировка: 1 экран = 1 упражнение
3. **Post-Workout** — ретроспективное логирование (3 уровня)

---

## Статус

- [x] UX-анализ проведён (`athlete-training-ux-analysis.md.resolved`)
- [x] Брейншторминг завершён (`brainstorming_ux_athlete.md.resolved`)
- [x] Все вопросы закрыты с пользователем
- [x] Implementation Plan утверждён (`implementation_plan.md`)
- [ ] Реализация не начата

---

## Стек и ограничения

| Параметр | Значение |
|---|---|
| **Frontend** | Next.js 15 App Router, Static Export, TypeScript |
| **Стили** | Vanilla CSS + CSS Modules, НЕТ Tailwind |
| **Дизайн-система** | `src/styles/tokens.css` + `docs/DESIGN_SYSTEM.md` (читать обязательно) |
| **Icons** | Lucide React only — NO emojis как иконки |
| **Touch targets** | Минимум 44×44px (Iron Law) |
| **Backend** | PocketBase (Гонконг VPS) |
| **Storage** | Cloudflare R2 через PocketBase S3 |
| **Offline** | IndexedDB (Dexie.js) — Focus Mode должен работать без сети |
| **i18n** | next-intl, RU/EN/CN. Китай: NO CDN, NO Google Fonts via CDN |

---

## Ключевые архитектурные решения (утверждены)

| # | Решение |
|---|---|
| ARCH-1 | `ExerciseRow.tsx` (компакт, Overview) + `FocusCard.tsx` (полный, Focus/Post) — два отдельных компонента |
| PWA-1 | Свайп (зона 30px от краёв) + кнопки ← → (оба способа навигации) |
| UX-1 | DayTabNav: адаптивные лейблы `Пн`/`П` по ширине экрана + scrollIntoView |
| PERF-1 | Solid color для `ExerciseRow` (без `backdrop-filter: blur`) |
| UX-2 | Медиа-галерея при тапе на превью: BottomSheet со свайпом между видео/фото |
| UX-3 | Lucide иконка по `training_category` если нет медиа |
| UX-4 | `inputMode="decimal"` (не `type="number"`) для числовых полей |
| ARCH-2 | Редактирование разрешено для всех типов лога (live + post) |
| STATE-1 | `sessionStorage` для `focusIndex` (позиция в Focus Mode сохраняется при reload) |
| I18N-1 | Fallback chain coach_cues: `en → ru → cn` |

---

## Источники данных (что уже есть в PocketBase)

```
exercises
  ├── name_ru/en/cn
  ├── coach_cues_ru/en/cn   ← техника выполнения (до 2000 симв.)
  ├── illustration           ← fallback медиа
  ├── training_category      ← для fallback-иконки
  └── cns_cost               ← отображается в FocusCard

exercise_videos
  ├── exercise_id FK→exercises
  ├── file                   ← R2 видео/GIF
  └── description

plan_exercises
  ├── exercise_id (nullable) ← если null — custom_text упражнение
  ├── notes                  ← указание тренера на эту тренировку
  └── custom_text_ru/en/cn   ← free-text упражнение без exercise_id

training_logs
  └── log_mode (NEW)         ← 'live'|'post_express'|'post_quick'|'post_detailed'
```

**Одно новое поле** в PocketBase: `training_logs.log_mode` (добавить в Фазе 4).

---

## Файлы для реализации

### Существующие (трогать)

| Файл | Строк | Что делать |
|---|---|---|
| `src/components/training/AthleteTrainingView.tsx` | 662 | Главный рефактор: state machine, single-day render |
| `src/components/training/AthleteTrainingView.module.css` | 768 | P0-фиксы touch targets, blur→solid |
| `src/components/training/cards/ExerciseItem.tsx` | 174 | → переименовать в `ExerciseRow.tsx`, убрать SetLogger |
| `src/components/training/cards/ExerciseItem.module.css` | ~100 | рефактор под compact view |
| `src/components/training/AthleteContextBanner.tsx` | ? | добавить collapsed режим |
| `src/components/shared/BottomSheet.tsx` | 156 | реиспользовать для медиа-галереи и skip-меню |

### Новые компоненты

| Файл | Назначение |
|---|---|
| `src/components/training/DayTabNav.tsx` | Горизонтальные табы 7 дней |
| `src/components/training/DayTabNav.module.css` | |
| `src/components/training/FocusCard.tsx` | Полный экран Focus Mode + Post Review |
| `src/components/training/FocusCard.module.css` | |
| `src/components/training/PostWorkoutSheet.tsx` | BottomSheet выбора Express/Quick/Full |
| `src/components/training/QuickEditView.tsx` | Быстрое пост-логирование |
| `src/components/training/QuickEditView.module.css` | |

---

## Полный план с фазами

См. `implementation_plan.md` в этой папке.

---

## С чего начинать следующему агенту

1. Прочитать `implementation_plan.md` (этот трек)
2. Прочитать `docs/DESIGN_SYSTEM.md` и `src/styles/tokens.css`
3. Запустить `/ui-work` workflow
4. Начать с **Фазы 1** (CSS P0-фиксы, ~2-3ч, нулевой риск)
5. После каждой фазы: `pnpm type-check && pnpm build && pnpm lint`

---

## Что НЕ трогать

- Структуру PocketBase коллекций `exercise_adjustments`, `competitions`, `training_plans` — уже изменены в Track 4.263, схема стабильна
- Допустимые изменения PocketBase: добавить `training_logs.log_mode` в Фазе 4
- Логику `ensureLog`, `createLog`, `updateSessionResult`
- `SetLogger` компонент (реиспользуем внутри `FocusCard`)
- `WeekSummary` компонент
- Глобальный Conductor (`conductor/tracks.md`)
- `planResolution.ts` — `applyAdjustments()` и приоритет планов уже реализованы в Track 4.263
