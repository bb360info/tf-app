# Track 4.268 Context: Tech Debt Zero (Pre-Video Prep)

## Зачем этот трек?

Следующий крупный этап проекта — **Track 5 (Video + Biomechanics)**. Он привнесёт భారీ зависимостей (FFmpeg WASM, MediaPipe, Canvas overlays), нагрузит клиентскую производительность и значительно усложнит стейт.
Входить в Трек 5 с накопившимся техническим долгом — верный путь к нестабильным сборкам и сложным дебагам. Поэтому выделен промежуточный сервисный трек для зачистки критических долгов из `backlog.md`.

## Исключённые (уже выполненные) задачи из бэклога

В процессе аудита выяснилось, что часть долга уже погашена в предыдущих треках:

1. **Migrate PB from Onboarding to Competitions Hub**: Уже реализовано через `HistoricalOnboardingWidget` в `AthleteDashboard.tsx` (Track 4.262).
2. **WeekConstructor hooks extraction**: Компонент уже был сожмят до <450 строк в Track 4.266.

## Выбранные задачи

1. **`pb.filter()` migration**: В ~40 местах используется конкатенация строк `filter: "athlete_id = '" + id + "'"`. Это уязвимость (аналог SQL Injection для PocketBase). Требуется безопасный `pb.filter()`.
2. **Strict Types для DTO**: Типы как `PlanExerciseWithExpand` наследуют `RecordModel`, что позволяет обращаться к несуществующим полям без ошибок TypeScript. Нужно ужесточить типы.
3. **Cascade Delete**: Удаление атлета оставляет мусорные записи в `training_logs`, `test_results` и др. Нужна ручная смена behavior с `restrict` на `cascade` в PB Admin.
4. **Push delivery**: Cloudflare Worker для Web Push написан, но не вызывается. Нужно связать создание `Notification` с HTTP-запросом к воркеру.
5. **CoachDashboard refactor**: `dashboard/page.tsx` содержит 400 строк инлайн-логики (Coach). Нужно вынести её в отдельный компонент по аналогии с `AthleteDashboard.tsx`.
6. **`user_id` on athletes**: Сейчас система ищет профиль атлета по `coach_id` или сложным связям. Прямой relation `user_id` на athlete record сильно упростит RLS в БД.
7. **IANA Timezones in `planResolution`**: `todayForUser` и генерация планов должны учитывать реальную таймзону пользователя (например, `Asia/Shanghai`), а не серверную UTC, чтобы планы не съезжали на 1 день у мобильных юзеров.
8. **QA Ports Automation**: `pnpm preview` иногда берет случайный порт, если 3000 занят, что ломает тесты и CI. Нужно зафиксировать порты для тестов.

## Связанные файлы

- `/src/lib/pocketbase/services/**/*.ts` (pb.filter migration)
- `/src/lib/pocketbase/types/` (strict DTOs)
- `/src/app/[locale]/(protected)/dashboard/page.tsx` (CoachDashboard)
- `/cloudflare-worker/push-service/` (Push delivery)
