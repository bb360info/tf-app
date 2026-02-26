# Walkthrough: Track 4.241 Phase 4

## Phase 4 — Security + Deprecation Fixes
>
> Дата: 2026-02-24 · Агент: [G1H]

### Что сделано

- Миграция строковой интерполяции на `pb.filter()` в 25 местах: `exercises.ts`, `achievements.ts`, `seasons.ts`, `trainingLoad.ts`, `templates.ts`, `snapshots.ts`, `customExercises.ts`, `readinessHistory.ts`, `preferences.ts` (предотвращение SQL-инъекций).
- Замена deprecated свойства `pb.authStore.model` на `pb.authStore.record` в `seasons.ts`, `athletes.ts`, `preferences.ts`, `QuickWorkout.tsx` и `WeekConstructor.tsx`.
- Добавлены 2 уникальных частичных индекса и 1 композитный индекс для коллекции `plan_assignments` через PocketBase MCP Admin API.

### Файлы изменены

| Файл | Изменение |
|------|-----------|
| `src/lib/pocketbase/services/exercises.ts` | 5 замен строковой интерполяции на pb.filter() |
| `src/lib/pocketbase/services/achievements.ts` | 4 замены на pb.filter() |
| `src/lib/pocketbase/services/seasons.ts` | 4 замены на pb.filter() и замена pb.authStore.model на .record |
| `src/lib/pocketbase/services/trainingLoad.ts` | 3 замены на pb.filter() |
| `src/lib/pocketbase/services/templates.ts` | 3 замены на pb.filter() |
| `src/lib/pocketbase/services/snapshots.ts` | 2 замены на pb.filter() |
| `src/lib/pocketbase/services/customExercises.ts` | 1 замена на pb.filter() |
| `src/lib/pocketbase/services/readinessHistory.ts` | 1 замена на pb.filter() |
| `src/lib/pocketbase/services/preferences.ts` | 1 замена на pb.filter(), 2 замены authStore.model на .record |
| `src/lib/pocketbase/services/athletes.ts` | 3 замены authStore.model на .record |
| `src/components/training/QuickWorkout.tsx` | Замена authStore.model на .record |
| `src/components/training/WeekConstructor.tsx` | Замена authStore.model на .record |
| `conductor/tracks/track-4.241-bug-fixes/gate.md` | Отмечены выполненные задачи |

### Верификация

- `pnpm type-check` → ✅ Exit 0
- `pnpm build` → ✅ Exit 0

### Заметки для следующего агента

- Большая часть проблем с `pb.filter()` и `pb.authStore.model` в коде устранена, но при написании новых сервисов PocketBase нужно строго использовать `pb.filter()` и `pb.authStore.record`.
- В `RecentNotifications.tsx` замена не потребовалась, так как она была произведена в предыдущих фазах.

## Phase 5 — i18n + Coach Stubs + Lint + QA
> Дата: 2026-02-24 · Агент: [G1H]

### Что сделано
- Добавлены недостающие ключи i18n (`pullToRefresh`, `refreshing`, `attentionNeeded`, `reviewTitle`, `reviewSubtitle`, `weekLabel`) во все три локали (ru, en, cn).
- Реализованы минимальные заглушки для компонентов `PendingReviews.tsx` и `TrainingToday.tsx` на дашборде тренера с подключением `countUnread()` для отображения количества непроверенных логов.
- Обновлён `BottomTabBar.tsx` с использованием `@/i18n/navigation` Link и реальным значением `unreviewedCount`.
- Исправлено 25 ESLint ошибок и предупреждений (убраны `any` в `clear_pb.ts`, `clear_users.ts`, `test_users.ts`, и `prefer-const` в `useNotifications.ts`).
- Проведен QA Smoke Test с использованием `browser_subagent`. Успешно проверены логины, дашборды, навигация по табам и отображение новых компонентов.

### Файлы изменены
| Файл | Изменение |
|------|-----------|
| `messages/*/common.json` | Добавлены новые ключи для i18n |
| `src/components/dashboard/coach/PendingReviews.tsx` | Подключение useTranslations и countUnread() |
| `src/components/dashboard/coach/TrainingToday.tsx` | Подключение useTranslations |
| `src/components/shared/BottomTabBar.tsx` | Миграция на @/i18n/navigation Link и интеграция countUnread |
| `scripts/*.ts` | Устранены TS linting errors для any-типов |
| `src/lib/hooks/useNotifications.ts` | Устранена ESLint prefer-const ошибка |
| `conductor/tracks/track-4.241-bug-fixes/gate.md` | Все задачи фазы отмечены выполненными |

### Верификация
- `pnpm type-check` → ✅ Exit 0
- `pnpm build` → ✅ Exit 0
- `pnpm lint` → ✅ Exit 0
- `pnpm test` → ✅ Exit 0

### Заметки для следующего агента
- Это завершающая фаза по Track 4.241. При QA Smoke-тестах обнаружено, что `pnpm preview` может использовать другой порт (например, 50782), если 3000 занят. Рекомендуется использовать `port` флаг явно `serve out -p 3000` и убивать процесс перед стартом.
- Все QA Smoke-тесты успешно пройдены браузерным сабагентом.
