# Track 4.6: Gamification v2 — Уточнённый план

## Контекст

Рефакторинг системы ачивок: 5 бинарных → 13 с прогрессом. Новые компоненты: StreakHeroCard, CelebrationOverlay, CelebrationToast. Bugfixes: race condition в AchievementsGrid, timezone в computeStreak.

> [!IMPORTANT]
> **6 улучшений после полного анализа кода и дизайн-системы**, описаны ниже.

---

## Что улучшено в плане (vs. предыдущая версия)

| # | Было | Стало | Почему |
|---|------|-------|--------|
| 1 | Phase 1 = один большой блок | Phase 1a (types) + 1b (logic) | Слишком много изменений в одном коммите. 1 commit = 1 task |
| 2 | Нет `prefers-reduced-motion` в celebrations | Добавлен `@media (prefers-reduced-motion: reduce)` | DESIGN_SYSTEM.md §6 — обязательно |
| 3 | z-index: "какой-нибудь высокий" | `--z-overlay: 40` для CelebrationOverlay, `--z-toast: 60` для Toast | tokens.css строки 86-92 определяют шкалу |
| 4 | Нет `@supports` fallback для backdrop-filter | Добавлен для StreakHeroCard и CelebrationOverlay | DESIGN_SYSTEM.md §2 — mandatory |
| 5 | Нет empty/error states для новых компонентов | Добавлены по react-ui-patterns SKILL | Loading → Skeleton, Error → silent degrade, пустые данные → streak=0 |
| 6 | PostWorkoutSummary + Pre-training checkin как отдельные фазы | **Убраны из плана Track 4.6** | gate.md их не содержит, это Track 5+ |

---

## Scope: что входит, что НЕТ

### ✅ В Track 4.6 (по gate.md)
- Phase 1: Progress Engine + Types (backend)
- Phase 2: Progress Bars в UI
- Phase 3: Streak Hero Card
- Phase 4: Celebration System
- Design System compliance

### ❌ НЕ в Track 4.6

> [!WARNING]
> Pre-training checkin prompt, PostWorkoutSummary — **не в gate.md**. Переносим в backlog, не реализуем в этом треке.

---

## Phase 1a: Types + Meta (backend)

**1 commit. Скиллы:** `typescript-expert` + `always`

### [MODIFY] [types.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/types.ts)

```diff
-export type AchievementType =
-  | 'streak_7d' | 'streak_30d' | 'volume_1000' | 'first_pb' | 'season_complete';
+export type AchievementType =
+  | 'streak_3d' | 'streak_7d' | 'streak_30d' | 'streak_100d'
+  | 'first_workout' | 'workouts_10' | 'workouts_50' | 'workouts_100'
+  | 'first_test' | 'first_pb' | 'pb_5' | 'all_tests'
+  | 'first_competition';
```

### [MODIFY] [achievements.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/achievements.ts) — только META + типы

Новые интерфейсы:

```typescript
export type AchievementCategory = 'streak' | 'training' | 'testing' | 'compete';

export interface AchievementProgress {
  type: AchievementType;
  current: number;
  target: number;
  percent: number; // 0-100
  isComplete: boolean;
}

export interface CheckAndGrantResult {
  allEarned: AchievementsRecord[];
  newlyEarned: AchievementsRecord[];
  progress: Map<AchievementType, AchievementProgress>;
}
```

Обновлённый `AchievementMeta`:
```typescript
export interface AchievementMeta {
  type: AchievementType;
  category: AchievementCategory;
  target: number;
  celebrationType: 'toast' | 'fullscreen';
  icon: 'Flame' | 'Zap' | 'Trophy' | 'Star' | 'Award' | 'Target' | 'Dumbbell' | 'Medal' | 'Flag';
  labels: { ru: string; en: string; cn: string };
  descriptions: { ru: string; en: string; cn: string };
}
```

`ACHIEVEMENT_META` → 13 записей (без `volume_1000`, `season_complete`).

---

## Phase 1b: Logic + Bug Fixes (backend)

**1 commit. Скиллы:** `typescript-expert` + `always`

### [MODIFY] [achievements.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/achievements.ts)

**FIX `computeStreak()`** — timezone-safe (экспортируемая):
```typescript
// Парсим как локальную дату — new Date(y, m-1, d) вместо new Date(dateString)
export function computeStreak(sortedDateStrings: string[]): number { ... }
```

**`getProgress(athleteId)`** — 4 батч-запроса:
```typescript
async function getProgress(athleteId: string): Promise<Map<AchievementType, AchievementProgress>>
// Promise.all: daily_checkins, training_logs count, test_results, competitions count
```

**FIX `checkAndGrant()`** → возвращает `CheckAndGrantResult`:
- Внутри: `listAchievements` → `getProgress` → create новые → return всё
- **Устраняет race condition** — AchievementsGrid больше НЕ вызывает `listAchievements` отдельно

### [NEW] [computeStreak.test.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/__tests__/computeStreak.test.ts)

Vitest unit test:
- Пустой массив → 0
- Один вчерашний день → 1
- 3 подряд с сегодня → 3
- Пропуск → streak = 0
- UTC+8 edge case (дата меняется в другом timezone)

---

## Phase 2: Progress Bars в UI

**1 commit. Скиллы:** `frontend` + `jumpedia-design-system` + `react-ui-patterns` + `always`

### [MODIFY] [AchievementBadge.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/analytics/AchievementBadge.tsx)

- Новые Lucide иконки: `Target`, `Dumbbell`, `Medal`, `Flag`
- Новый проп: `progress?: AchievementProgress`
- Для locked ачивок: progress bar + текст `current/target` (font: `--font-mono`)

### [MODIFY] [AchievementBadge.module.css](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/analytics/AchievementBadge.module.css)

```css
.progressBar {
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--color-bg-tertiary);
  overflow: hidden;
}
.progressFill {
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--color-accent-primary);
  transition: width var(--duration-slow) var(--ease-default);
}
.progressText {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
}
```

### [MODIFY] [AchievementsGrid.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/analytics/AchievementsGrid.tsx)

1. `ALL_TYPES` → 13 типов
2. `Promise.all([checkAndGrant, listAchievements])` → один `checkAndGrant()` → `CheckAndGrantResult`
3. Группировка по 4 категориям с заголовком + счётчик `3/4`
4. Передать `progress` в каждый `AchievementBadge`
5. **Empty/error states** по react-ui-patterns: loading && !data → skeleton, error → silent degrade

### [MODIFY] [AchievementsGrid.module.css](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/analytics/AchievementsGrid.module.css)

Добавить: `.categorySection`, `.categoryHeader`, `.categoryTitle`, `.categoryCount`

---

## Phase 3: Streak Hero Card

**1 commit. Скиллы:** `frontend` + `jumpedia-design-system` + `react-ui-patterns` + `always`

### [NEW] [StreakHeroCard.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/dashboard/StreakHeroCard.tsx)

Props: `{ athleteId: string }`

Загружает:
- `computeStreak()` из daily_checkins
- `getProgress()` для streak-ачивок

Рендер:
- Hero-цифра стрика (font-display, extrabold, pulse animation)
- Лучший стрик ever
- Progress bar до следующего milestone (3→7→30→100)
- Вечернее предупреждение: `new Date().getHours() >= 18` && нет чек-ина → `AlertCircle` + текст

**Стейты:** loading → spinner, error → silent degrade (streak не критично), streak=0 → мотивационный текст

### [NEW] [StreakHeroCard.module.css](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/dashboard/StreakHeroCard.module.css)

```css
/* Glassmorphism card */
.card {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--glass-shadow);
  padding: var(--space-5);
}

/* @supports fallback */
@supports not (backdrop-filter: blur(1px)) {
  .card { background: var(--color-bg-elevated); box-shadow: var(--shadow-md); }
}

/* Pulse animation for streak number */
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
.streakNumber { animation: pulse 2s var(--ease-spring) infinite; }

@media (prefers-reduced-motion: reduce) {
  .streakNumber { animation: none; }
}
```

### [MODIFY] [AthleteDashboard.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/dashboard/AthleteDashboard.tsx)

Добавить lazy import `StreakHeroCard`. Разместить **между** Readiness Checkin card (строка ~176) и Stats mini-cards (строка ~178):

```tsx
{athleteId && checkinDone && (
  <Suspense fallback={<div className={styles.analyticsLoading}><div className={styles.spinner} /></div>}>
    <StreakHeroCard athleteId={athleteId} />
  </Suspense>
)}
```

---

## Phase 4: Celebration System

**1 commit. Скиллы:** `frontend` + `jumpedia-design-system` + `react-best-practices` + `always`

### [NEW] [useCelebration.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/hooks/useCelebration.ts)

Hook с очередью celebarations:
- `celebrate(type, meta)` → добавить в queue
- Обрабатывает по одной: fullscreen → 5 сек или dismiss, toast → 3 сек auto
- `activeCelebration`, `dismiss()`

### [NEW] [CelebrationOverlay.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/gamification/CelebrationOverlay.tsx)

- **z-index:** `var(--z-overlay)` (40) — ниже toast/tooltip
- 30 CSS `<span>` для confetti (China-safe, без библиотек)
- Badge reveal: `scale(0) → scale(1.2) → scale(1)` через `@keyframes`
- `navigator.vibrate?.([100, 50, 200])` — haptic
- `new Audio('/sounds/celebration.mp3').play().catch(() => {})` — graceful
- Auto-dismiss 5 сек
- **`prefers-reduced-motion`**: без confetti, без scale-анимации

### [NEW] [CelebrationOverlay.module.css](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/gamification/CelebrationOverlay.module.css)

```css
.overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

/* Confetti: 30 spans, random position + color + delay */
@keyframes confettiFall {
  0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

/* Badge reveal */
@keyframes badgeReveal {
  0% { transform: scale(0); opacity: 0; }
  70% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .confetti { display: none; }
  .badge { animation: none; opacity: 1; transform: scale(1); }
}
```

### [NEW] [CelebrationToast.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/gamification/CelebrationToast.tsx)

- **z-index:** `var(--z-toast)` (60) — выше overlay
- Position: `bottom: calc(64px + var(--space-4))` — над BottomTabBar
- Slide-up animation: `translateY(100%) → translateY(0)`
- `navigator.vibrate?.([50])`
- Auto-dismiss 3 сек

### [NEW] [CelebrationToast.module.css](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/gamification/CelebrationToast.module.css)

### [MODIFY] [AchievementsGrid.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/analytics/AchievementsGrid.tsx)

Интеграция useCelebration: при `newlyEarned.length > 0` → `celebrate()` для каждой

### [NEW] [celebration.mp3](file:///Users/bogdan/antigravity/skills%20master/tf/public/sounds/celebration.mp3)

Короткий ding (<1 сек), self-hosted, royalty-free

---

## Phase 5: i18n

**1 commit. Скиллы:** `i18n` + `always`

### [MODIFY] messages/ru|en|cn/common.json

- `achievements.*` — 13 ачивок × label + description
- `achievements.categories.*` — 4 категории
- `celebration.*` — awesome, streakWarning, workoutDone
- `streakHero.*` — currentStreak, bestStreak, milestone, eveningWarning

---

## Скиллы по фазам (итого)

| Фаза | Скиллы |
|------|--------|
| 1a — types + meta | `typescript-expert`, `always` |
| 1b — logic + fixes | `typescript-expert`, `always` |
| 2 — progress bars UI | `frontend`, `jumpedia-design-system`, `react-ui-patterns`, `always` |
| 3 — StreakHeroCard | `frontend`, `jumpedia-design-system`, `react-ui-patterns`, `always` |
| 4 — celebration system | `frontend`, `jumpedia-design-system`, `react-best-practices`, `always` |
| 5 — i18n | `i18n`, `always` |

> [!NOTE]
> Перед фазами 2, 3, 4 — `/ui-work` workflow (DESIGN_SYSTEM.md + tokens.css + 3 скилла). Уже выполнен в этом чате.

---

## Design System Compliance Checklist

Каждый новый `.module.css`:
- [ ] Все цвета через `var(--color-*)`
- [ ] Все отступы через `var(--space-*)`
- [ ] Все радиусы через `var(--radius-*)`
- [ ] Glass: `var(--glass-bg)` + `var(--glass-blur)` + `@supports` fallback
- [ ] `@media (prefers-reduced-motion: reduce)` для анимаций
- [ ] z-index из шкалы tokens.css
- [ ] Touch targets ≥ 44×44px
- [ ] Mobile-first (375px base)
- [ ] Lucide React only, нет emoji
- [ ] Light + Dark mode

---

## Verification Plan

### Automated (обязательно после каждой фазы)
```bash
pnpm type-check   # 0 ошибок
pnpm build        # Exit 0
pnpm lint         # нет новых ошибок
pnpm test         # включая computeStreak.test.ts (Phase 1b)
```

### Browser Testing (после всех фаз)

1. **Dashboard** → StreakHeroCard между Readiness и Stats
2. **StreakHeroCard** → pulse animation + progress bar + вечернее предупреждение (hours≥18)
3. **AchievementsGrid** → 13 бейджей, 4 секции (Streak/Training/Testing/Compete), счётчики
4. **Progress bars** → locked ачивки: fill bar + `current/target`
5. **CelebrationOverlay** → confetti + badge reveal + haptic + sound
6. **CelebrationToast** → slide-up toast, auto-dismiss 3 сек
7. **Dark mode** — все компоненты корректны
8. **Reduced motion** — анимации отключены
9. **375px width** — всё помещается, нет horizontal scroll

### Edge Cases

- Атлет без данных → все locked, progress 0%, streak 0
- Старые DB-записи `volume_1000`, `season_complete` → не в UI, не ломаются
- Множественные ачивки → очередь по одной
- Sound play fail → `.catch(() => {})`, graceful
