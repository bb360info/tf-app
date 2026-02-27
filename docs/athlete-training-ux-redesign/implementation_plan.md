# 📐 Implementation Plan: Редизайн AthleteTrainingView

> ✅ **Утверждён.** Все решения финализированы по комментариям пользователя.

---

## 1. Схемы всех экранов

### Экран A: Overview — Обзор дня (режим по умолчанию)

```
375px ──────────────────────────────────
│                                       │
│  📊 GPP Phase · 12 дн до старта [▼]  │ 48px  ← collapsed banner
│                                       │
│  ←────── Фев 23 – Мар 1, 2026 ──────→│ 44px  ← week nav
│                                       │
│ ┌────┬────┬────┬────┬────┬────┬────┐  │ 52px  ← DayTabNav
│ │ Пн │ Вт●│▶Ср │ Чт │ Пт │ 💤 │ 💤│  │
│ └────┴────┴────┴────┴────┴────┴────┘  │
│                                       │
│ ● Среда 25 февр  [Сегодня]    0/15   │ 44px sticky ← day header
│ ───────────────────────────────────── │
│ ● 3-Point Start        3×8      ○    │ 48px
│ ● Back Arch Drill      Reps     ✓    │ 48px
│ ● Block Start          5×4      ○    │ 48px
│ ● Sprint 60m           3×       ○    │ 48px
│ ● High Knee Run        4×30m    ○    │ 48px
│ ● Hurdle Drill         5×       ✓    │ 48px
│ ● Box Jump             4×8      ○    │ 48px
│      ... (ещё 8 упражнений)          │
│                                       │
│ ┌─────────────────────────────────┐   │ 52px fixed bottom
│ │  ▶ Начать тренировку            │   │
│ └─────────────────────────────────┘   │
│ ┌─────────────────────────────────┐   │ 44px
│ │  ✓ Залогировать пост-фактум     │   │
│ └─────────────────────────────────┘   │
└───────────────────────────────────────┘
```

### Экран A2: Overview — Развёрнутый баннер (тап на [▼])

```
375px ──────────────────────────────────
│                                       │
│  GPP Phase                      [▲]  │
│  ────────────────────────────────     │
│  Сезон:  Зима 2026                   │ 120px total
│  Фаза:   Общефизическая подготовка   │ expanded
│  ████████░░░░░░░  12 дн до старта    │
│                                       │
│  Нед 4 из 8  ·  Прогресс: 62%       │
│                                       │
│  [── остальной UI ──]                 │
```

### Экран A3: Overview — Прошедший день (read-only)

```
│ ───────────────────────────────────── │
│ ● Вт, 24 февр                  2/3   │ ← past day tab выбран
│ ───────────────────────────────────── │
│  ✓ Back Arch Drill  Reps        ✓    │ opacity: 0.85
│  ✓ Block Start      5×4  [5×4] ✓    │ actual=plan → зелёный
│  ~ Sprint 60m       2/3 сделано ~    │ частично → жёлтый
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  ✏️  Редактировать               │  │ ← если лог есть
│  └─────────────────────────────────┘  │
```

---

### Экран B: Focus Mode — Упражнение в процессе

```
375px ──────────────────────────────────
│                                       │
│  ✕ Обзор          Ср · 3/15   ← →  │ 44px ← nav (кнопки + свайп)
│ ─────────────────────────────────── │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │                                  │ │ 180px
│ │   [📷 Превью видео / illustration]│ │ ← тап = видео inline
│ │                [▶ Play]          │ │
│ └──────────────────────────────────┘ │
│                                      │
│  Block Start                         │ ← название
│  Стартовый блок  ·  CNS: ●●●○○      │ ← категория + нагрузка
│                                      │
│ ┌ 📋 план ─────────────────────────┐ │ ← plan_exercises.notes
│ │ «Старт с блока. 3 полных вдоха» │ │   (если есть)
│ └──────────────────────────────────┘ │
│ ┌ 💡 техника ───────────────────────┐│ ← exercises.coach_cues
│ │ «Держи бёдра высоко на выходе»  ││   (если есть)
│ └──────────────────────────────────┘│
│                                      │
│  Подход 1:  [─ 4 ─]  ×  [─ 60 kg─] │ ← 44px touch inputs
│  Подход 2:  [─ 4 ─]  ×  [─ 60 kg─] │
│  Подход 3:  [─   ─]  ×  [─      ─] │
│  Подход 4:  [─   ─]  ×  [─      ─] │
│                                      │
│  RPE: ○─────────────●──  8          │ ← 44px hit-area обёртка
│                                      │
│ ┌──────────────┐ ┌─────────────────┐ │ 52px
│ │  ↩ Пропустить│ │  Сохранить →   │ │
│ └──────────────┘ └─────────────────┘ │
└──────────────────────────────────────┘
```

### Экран B2: Focus Mode — Упражнение только текст (custom_text, нет exercise_id)

```
│  ─────────────────────────────────── │
│                                      │
│  [Без названия из базы]              │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │  📋 «Разминочный бег 800м        │ │ ← plan_exercises.custom_text
│ │      в лёгком темпе»             │ │
│ └──────────────────────────────────┘ │
│                                      │
│  (SetLogger скрыт — нет сетов)       │
│                                      │
│ ┌──────────────┐ ┌─────────────────┐ │
│ │  ↩ Пропустить│ │  Выполнено →   │ │
│ └──────────────┘ └─────────────────┘ │
```

### Экран B3: Focus Mode — Skip меню (BottomSheet)

```
│ ═══════════════ (drag handle) ══════ │
│                                      │
│  Почему пропускаешь?                 │
│                                      │
│  ┌─────────────┐  ┌───────────────┐ │
│  │ 🔧 Инвентарь│  │ 😣 Боль/травма│ │ 44px chips
│  └─────────────┘  └───────────────┘ │
│  ┌─────────────┐  ┌───────────────┐ │
│  │ ✅ Уже сделал│  │ ✏️   Другое   │ │
│  └─────────────┘  └───────────────┘ │
│                                      │
│  ┌─────────────────────────────────┐ │
│  │  Отмена                         │ │
│  └─────────────────────────────────┘ │
```

---

### Экран C: Post-Workout — Выбор режима (BottomSheet)

```
│ ═══════════════ (drag handle) ══════ │
│                                      │
│  Как прошла тренировка?              │
│                                      │
│  ┌───────────────────────────────┐   │ 64px
│  │  ✅  Всё по плану             │   │ → Express (1 тап)
│  └───────────────────────────────┘   │
│  ┌───────────────────────────────┐   │ 64px
│  │  ✏️  Были отличия             │   │ → Quick Edit
│  └───────────────────────────────┘   │
│  ┌───────────────────────────────┐   │ 64px
│  │  📋  Детально по упражнениям  │   │ → Full Review
│  └───────────────────────────────┘   │
│                                      │
│  Отмена                              │
```

### Экран C2: Post-Workout — Quick Edit

```
375px ──────────────────────────────────
│  ✕  ПОСТ-ФАК · Ср 25 февр           │ 44px
│ ─────────────────────────────────── │
│  ✓  Block Start    5×[4]×[ 60kg]    │ 48px
│                      ↑ тап = edit   │
│  ✓  Sprint 60m     3×               │ 48px
│  ~  Back Arch      [2]/3 выполнено  │ 52px expanded
│        └─ [1]  [2]  3               │
│  ✗  Тяга           пропущено        │ 48px
│  ✓  Box Jump       4×[8]×[bodyweight]│ 48px
│  ...                                 │
│ ─────────────────────────────────── │
│  ┌─────────────────────────────────┐ │ 52px
│  │  Сохранить  (12/15 ✓)          │ │
│  └─────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### Экран C3: Post-Workout — Full Review (ExerciseItem mode="post")

```
375px ──────────────────────────────────
│  ✕ Обзор    [ПОСТ-ФАК]  3/15  ← → │ 44px ← same nav as Focus Mode
│ ─────────────────────────────────── │
│  Block Start  ·  5×4  ·  CNS: ●●●  │
│                                      │
│  (нет медиа, нет заметок тренера)   │
│                                      │
│  Подход 1: [─ 4 ─] × [─ 60 kg ─]  │ ← pre-filled из плана
│  Подход 2: [─ 4 ─] × [─ 60 kg ─]  │    редактируешь только отличия
│  Подход 3: [─ 4 ─] × [─ 60 kg ─]  │
│  Подход 4: [─ 4 ─] × [─ 60 kg ─]  │
│                                      │
│  RPE: ○──────────────●──  8        │
│                                      │
│ ┌──────────────┐ ┌─────────────────┐ │
│ │  ✗ Пропустить│ │    Дальше →    │ │
│ └──────────────┘ └─────────────────┘ │
└──────────────────────────────────────┘
```

---

## 2. Аудит плана по скиллам

### 🔴 Критические проблемы (нужно решить до старта кода)

#### [ARCH-1] Конфликт: `ExerciseItem mode` vs Single Responsibility

**Скилл: architect-review, react-best-practices**

`ExerciseItem` уже 174 строки. Добавление `mode='focus'|'post'` с медиа, SetLogger, свайпом и заметками тренера сделает его >450 строк — God Component.

**Варианты:**

| Вариант | Плюсы | Минусы |
|---|---|---|
| **A. Composition через children** | ExerciseItem тонкий, фокус-режим — отдельный slot | Сложнее props drilling |
| **B. ExerciseCard / FocusCard — два отдельных компонента** | Чистое SRP, легко тестировать | +1 компонент |
| **C. mode prop но с lazy slots** | Один импорт, медиа lazy | Сложный CSS-модуль |

👉 **Рекомендация:** Вариант B — `ExerciseRow.tsx` (компакт для Overview) + `FocusCard.tsx` (полный для Focus/Post). Разделение по ответственности.

---

#### [PWA-1] Свайп в Focus Mode конфликтует с iOS Safari back-swipe

**Скилл: mobile-developer**

На iPhone при свайпе вправо (← пред.упражнение) может срабатывать системный жест «назад» iOS Safari.

**Варианты:**

| Вариант | Суть |
|---|---|
| **A. Только кнопки ← →** | 100% безопасно. Свайп не реализуем. |
| **B. Свайп только по центральной зоне** | `touchstart` проверяет `clientX > 30 && clientX < 345` — игнорируем края |
| **C. Вертикальный свайп вместо горизонтального** | Нет конфликта с iOS back. Но менее интуитивно. |

👉 **Рекомендация:** Вариант B — зона безопасного свайпа с отступом 30px от краёв экрана.

---

#### [UX-1] DayTabNav: 7 таблеток не помещаются на 320px (Samsung A-серия)

**Скилл: ui-visual-validator**

7 × min 44px = 308px + gap × 6 = ~340px. Не помещается на 320px экранах.

**Варианты:**

| Вариант | Суть |
|---|---|
| **A. overflow-x: auto** | Горизонтальный скролл таба — пользователь не знает что есть ещё дни |
| **B. Сокращённые лейблы** | `Пн Вт Ср` → `П В С` (1 буква) + min-width: 40px |
| **C. 2 ряда: пн-ср-пт + вт-чт-сб-вс** | Некрасиво, занимает 88px |

👉 **Решение (утверждено):** Адаптивные лейблы:

- `375px+` → 2 буквы: `Пн Вт Ср`
- `<375px` → 1 буква: `П В С`
- `overflow-x: auto`, `scrollbar-width: none`, активный таб всегда `scrollIntoView`

---

#### [PERF-1] backdrop-filter на ExerciseRow × 15 = лаги на Android

**Скилл: web-performance-optimization**

`backdrop-filter: blur(X)` на 15 карточках одновременно вызывает GPU overdraw. На бюджетных Android (Redmi Note, Samsung A03) — видимые тормоза скролла.

**Решение ✅:** Static Export не помогает — это SSR→client, runtime CSS работает так же.

- `ExerciseRow`: `background: var(--surface-1)` (solid color, no blur)
- blur только для: sticky header, DayTabNav, BottomSheet, FAB

---

#### [STATE-1] Состояние Focus Mode при return в Overview и обратно

**Скилл: react-best-practices**

Если атлет в Focus Mode на упражнении 7, нажал `✕ Обзор`, прочитал план, вернулся в Focus Mode — он должен вернуться на упражнение 7, а не 1.

**Варианты:**

| Вариант | Суть |
|---|---|
| **A. `focusIndex` в URL query** | `?mode=focus&ex=7` — сохраняется при навигации, но Static Export теряет при reload |
| **B. `focusIndex` в parent state** | Persists пока компонент живой. Теряется при перезагрузке страницы. |
| **C. `focusIndex` в sessionStorage** | Persists даже при reload. Очищается при закрытии вкладки. |

👉 **Рекомендация:** Вариант C — `sessionStorage` даёт лучший UX при случайном reload.

---

### 🟢 Остальные решения (утверждены)

**[UX-2] Медиа в Focus Mode ✅** — BottomSheet с галереей (свайп между видео/фото). SetLogger остаётся видимым.

**[UX-3] Fallback если нет медиа ✅** — Lucide иконка по `training_category` (крупная, по центру).

**[UX-4] Числовые поля ✅** — `inputMode="decimal"` (не `type="number"`) — нет спиннеров, нужная клавиатура.

**[ARCH-2] Редактирование live-лога ✅** — Да, кнопка «Редактировать» работает для всех типов лога.

**[I18N-1] Fallback chain ✅** — `en → ru → cn` (английский как основной техн. язык базы).

---

## 3. Компоненты (финальный список)

### Новые

| Компонент | Ответственность |
|---|---|
| `DayTabNav.tsx` + `.module.css` | 7 таблеток дней, 1-буквенные лейблы, scrollIntoView |
| `FocusCard.tsx` + `.module.css` | Полный режим (Focus+Post): медиа, заметки, SetLogger, nav |
| `PostWorkoutSheet.tsx` | BottomSheet выбора уровня логирования |
| `QuickEditView.tsx` + `.module.css` | Список с ✓/~/✗ тогглом + inline input |

### Изменяемые

| Компонент | Что меняется |
|---|---|
| `ExerciseItem.tsx` | Переименовать в `ExerciseRow.tsx` — только компактный вид для Overview |
| `AthleteTrainingView.tsx` | State machine: `mode`, `selectedDay`, `focusIndex` + sessionStorage |
| `AthleteTrainingView.module.css` | P0-фиксы + убрать blur с ExerciseRow |
| `AthleteContextBanner.tsx` | Collapsed режим |

### Удаляется

| Что | Чем заменяется |
|---|---|
| `RestDayCard` | Иконка Moon в DayTabNav |
| `startLogBtn` (под упражнениями) | FAB + sticky header кнопка |
| Инлайн SetLogger в ExerciseItem | `FocusCard.tsx` |

---

## 4. Схема данных

> Одно новое поле. Всё остальное уже есть.

```typescript
// НОВОЕ: training_logs.log_mode
type LogMode = 'live' | 'post_express' | 'post_quick' | 'post_detailed';

// НОВОЕ (Track 4.263): training_plans.plan_type
type PlanType = 'phase_based' | 'standalone' | 'override';
// training_plans.start_date / end_date — для standalone планов

// НОВОЕ (Track 4.263): exercise_adjustments
// plan_exercise_id FK, athlete_id FK, sets/reps/weight/intensity/duration/distance/rest_seconds/notes, skip
// _adjusted: true флаг проставляется через applyAdjustments() в planResolution.ts

// УЖЕ ЕСТЬ — используем:
// exercises.coach_cues_ru/en/cn        ← техника в Focus Mode
// exercises.illustration               ← fallback медиа
// exercise_videos (коллекция)          ← видео по тапу
// plan_exercises.notes                 ← указание тренера на тренировку
// plan_exercises.custom_text_ru/en/cn  ← free-text упражнение
```

---

## 5. Фазы реализации

### Фаза 1 — CSS P0-фиксы *(~2-3ч, нулевой риск)*

- [ ] Touch targets 44px: `stepBtn`, `weekNavBtn`, `skipChip`
- [ ] `rpeInput` — обёртка 44px
- [ ] `dayCardPast { opacity: 0.7 }`
- [ ] Прогресс-чип `0/N` всегда
- [ ] `coachNoteIcon size={16}`
- [ ] Убрать `backdrop-filter: blur` с ExerciseRow (→ solid color)
- [ ] **[GAP-2]** `ExerciseRow`: ⚡ бейдж если `planEx._adjusted === true`

### Фаза 2 — Overview Mode *(~1 день)*

- [ ] `DayTabNav.tsx` (1-буквенные лейблы, scrollIntoView, overflow-x:auto)
- [ ] `ExerciseItem → ExerciseRow.tsx` (compact, no inline SetLogger)
- [ ] `AthleteTrainingView` рефактор: `selectedDay`, single-day render
- [ ] Compact RestDay в DayTabNav
- [ ] `AthleteContextBanner` collapsed
- [ ] FAB кнопка «Начать» + кнопка «Пост-фактум»
- [ ] Кнопка «Редактировать» для залогированных дней
- [ ] **[GAP-1]** `AthleteContextBanner`: standalone-режим — мини-баннер когда `activeSeason=null` но `plan` есть
- [ ] **[GAP-4]** `weekNav`: скрывать для standalone планов (показывать диапазон дат)

### Фаза 3 — Focus Mode *(~1.5 дня)*

- [ ] `FocusCard.tsx`: медиа-блок, заметки (plan + coach_cues), SetLogger, nav
- [ ] Свайп: touch API с зоной безопасности 30px от краёв
- [ ] `sessionStorage` для `focusIndex`
- [ ] custom_text упражнение (скрытый SetLogger, кнопка «Выполнено»)
- [ ] Skip BottomSheet (4 причины)
- [ ] Видео в BottomSheet по тапу на превью
- [ ] Fallback: Lucide иконка по `training_category` если нет медиа
- [ ] i18n fallback chain: `en → ru → cn` для coach_cues

### Фаза 4 — Post-Workout *(~1 день)*

- [ ] `PostWorkoutSheet.tsx` (3 опции)
- [ ] Express: batch write план→факт, `log_mode = 'post_express'`
- [ ] `QuickEditView.tsx`: ✓/~/✗ тоггл, `inputMode="decimal"` для весов
- [ ] Full Review: `FocusCard` с `mode='post'` (без медиа, pre-filled)
- [ ] Редактирование залогированного лога
- [ ] `log_mode` → добавить поле в PocketBase

### Фаза 5 — Полировка *(~0.5 дня)*

- [ ] Slide-анимации в FocusCard (translate 0→prev, 0→next)
- [ ] Skeleton loading DayTabNav + ExerciseRow
- [ ] `navigator.vibrate(50)` haptic при Save (только если supported)
- [ ] Offline-индикатор в FocusCard

---

## 6. Финализированные решения ✅

| # | Решение |
|---|---|
| ARCH-1 | `ExerciseRow` (Overview) + `FocusCard` (Focus/Post) |
| PWA-1 | Свайп (зона 30px от краёв) + кнопки ← → (оба) |
| UX-1 | Адаптивные лейблы: `Пн`/`П` по ширине экрана + scrollIntoView |
| PERF-1 | Solid color для ExerciseRow (без blur) |
| UX-2 | Медиа-галерея в BottomSheet: свайп между видео/фото |
| UX-3 | Lucide иконка по `training_category` если нет медиа |
| UX-4 | `inputMode="decimal"` для числовых полей |
| ARCH-2 | Редактирование разрешено для live-логов тоже |
| I18N-1 | Fallback: `en → ru → cn` |

---

## 7. Верификация

```bash
pnpm type-check   # TypeScript — новые props в ExerciseRow, FocusCard
pnpm build        # Static export — нет SSR импортов
pnpm lint         # ESLint
pnpm test         # Vitest — существующие тесты
```

**Browser smoke test (browser_subagent):**

1. Overview: DayTabNav переключает дни, прошлые дни read-only
2. Focus Mode: свайп и кнопки ← → работают, видео по тапу
3. Post-Workout Express: один тап → все упражнения ✓
4. Quick Edit: ✓/~/✗ тоггл, inline edit числа
5. Viewport 375px: нет горизонтального скролла кроме DayTabNav
6. Viewport 320px: DayTabNav скроллится, активный таб в зоне видимости
