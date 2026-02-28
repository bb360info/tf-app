# Context — Track 4.266: Pre-Video Tech Debt & Polish (v2)

## Why this track exists

Track 5 (Video + MediaPipe + WASM) — значительное усложнение. Фундамент должен быть крепким.
В ходе аудита кода (февраль 2026) выявлено 8 конкретных проблем. Этот трек их устраняет.

## Core Issues Addressed

1. **`log_mode` не передаётся при старте тренировки.**
   `AthleteTrainingView.handleStartFocus` и `handleOpenPostFactum` не передают `log_mode` в `getOrCreateLog`, хотя API уже поддерживает этот параметр. Контекст логирования теряется.

2. **Timezone UTC вместо IANA пользователя.**
   `planResolution.ts` вызывает `todayForUser()` без аргумента → UTC. Атлеты в Китае (+8) и на восточном побережье (-5) могут получить неверный план. `timezone` уже хранится в `notification_preferences`.

3. **DST-баг в `calcWeekNumber`.**
   Вычисление через `diffMs / 86400000` даёт неверный результат при переходе на летнее/зимнее время. Нужна calendar-day разница (T12:00Z трюк).

4. **`applyAdjustments` делает N+1 HTTP-запросов.**
   Один запрос на каждое упражнение плана (до 20+). Критично для производительности Track 5. Замена: один `getFullList` с OR-фильтром.

5. **Override план не имеет date boundary.**
   `getPublishedOverrideForAthlete` не фильтрует по неделе → старый override с прошлого месяца перекрывает актуальный план (высший приоритет Step 0).

6. **`PlanExerciseWithExpand` расширяет `RecordModel` → `[key: string]: any`.**
   TypeScript не ловит обращения к несуществующим полям. Уже скрывало баг с `is_warmup`.

7. **`getDayDate` дублируется** в `WeekConstructor` и `AthleteTrainingView`. Нарушение DRY.

8. **`WeekConstructor` — 906 строк.**
   Монолитный компонент без разбивки на хуки. Паттерн (`useOverrideModal`) уже введён — нужно распространить.

## Goals

- Ноль функциональных регрессий в тренировочном цикле.
- Строгая типобезопасность PocketBase-сервисов.
- Correct timezone resolution для всех геозон (CN, EU, US).
- WeekConstructor < 450 LOC через кастомные хуки.
- Unit-тесты для всего нового и исправленного кода.

## Out of Scope

- E2E browser tests / Playwright push-notification E2E (→ Track 6 backlog)
- CoachDashboard рефакторинг (401 строка, норма для page.tsx, risk > reward)
- Offline-first PWA / IndexedDB Dexie (→ отдельный трек)
- Branded Types (`AthleteId`, `PlanId` и т.п.) — лавина рефакторинга без срочности

## Key Files

| Файл | Изменение |
|------|-----------|
| `src/components/training/AthleteTrainingView.tsx` | log_mode в handleStartFocus/handleOpenPostFactum |
| `src/lib/pocketbase/services/planResolution.ts` | timezone + date boundary + N+1 batch |
| `src/lib/utils/dateHelpers.ts` | diffCalendarDays + getWeekDayDate |
| `src/lib/pocketbase/services/notificationPreferences.ts` | getUserTimezone() |
| `src/lib/pocketbase/services/plans.ts` | PlanExerciseStrict interface |
| `src/components/training/WeekConstructor.tsx` | → три хука |
| `src/components/training/hooks/useWeekNavigation.ts` | [NEW] |
| `src/components/training/hooks/useTemplatePicker.ts` | [NEW] |
| `src/components/training/hooks/useDayConstructor.ts` | [NEW] |
| `src/lib/utils/__tests__/dateHelpers.test.ts` | [NEW] unit-тесты |
| `src/lib/pocketbase/services/__tests__/planResolution.test.ts` | [NEW] unit-тесты |
| `scripts/qa-preview.sh` | [NEW] qa скрипт |
