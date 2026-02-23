# Gate 4.6: Gamification — Achievements v2 + Celebration System

## Исследование
- [x] Анализ текущих 5 ачивок (binary, без прогресса)
- [x] Исследование психологии: dopamine loops, Zeigarnik, loss aversion, Octalysis
- [x] Анализ Duolingo/Strava/Nike Run Club — лучшие практики
- [x] Карта триггеров: 20+ метрик в PocketBase
- [x] Документ-исследование → `gamification_research.md`

## Фаза 1: Progress Engine + Types (backend)
- [x] Расширить `AchievementType` в `types.ts` (5 → 13 типов)
- [x] Создать `getProgress(athleteId, type)` — вычисление `{ current, target, percent }` для каждого типа
- [x] Рефакторинг `checkAndGrant()` — использовать `getProgress()` вместо дублирования логики
- [x] Удалить `season_complete` и `volume_1000` (не нужны по решению пользователя)
- [x] Добавить новые типы: `streak_3d`, `streak_100d`, `first_workout`, `workouts_10`, `workouts_50`, `workouts_100`, `first_test`, `pb_5`, `all_tests`, `first_competition`
- [x] Обновить `ACHIEVEMENT_META` с иконками и i18n (RU/EN/CN)
- [x] `computeStreak()` — экспортировать для использования в UI

## Фаза 2: Progress Bars в UI (AchievementBadge)
- [x] `AchievementBadge` — добавить progress bar (CSS, glassmorphism)
- [x] `AchievementsGrid` — обновить ALL_TYPES, передать progress data
- [x] Группировка по категориям (Streak / Training / Testing / Compete)
- [x] i18n ключи для новых ачивок (messages/ru/en/cn)

## Фаза 3: Streak Hero Card (Dashboard)
- [x] Компонент `StreakHeroCard` — стрик как hero-элемент
- [x] Показать: currentStreak, bestStreak, progress до следующей ачивки
- [x] Предупреждение «Не забудь сегодня!» (если вечер + нет чек-ина)
- [x] Интегрировать в `AthleteDashboard.tsx`

## Фаза 4: Celebration System
- [x] Компонент `CelebrationOverlay` — full-screen с confetti CSS animation
- [x] Компонент `CelebrationToast` — лёгкий popup для minor achievements
- [x] `useCelebration` hook — управление показом (toast vs full-screen)
- [x] Haptic feedback (`navigator.vibrate`)
- [x] Интегрировать в `AchievementsGrid` при newlyEarned

## Design System Compliance
- [x] Все компоненты используют CSS токены из `tokens.css`
- [x] Glassmorphism для карточек (`var(--glass-bg)`, `var(--glass-blur)`)
- [x] Mobile-first (375px base), touch targets 44×44px
- [x] Lucide icons only, no emoji as UI icons
- [x] `pnpm type-check` — Exit 0
- [x] `pnpm build` — Exit 0
- [x] `pnpm lint` — no new errors
