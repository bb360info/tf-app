# Implementation Plan: Track 4.244 - Historical PR Onboarding

## Фаза 1: PocketBase Data Permissions

1. Запросить изменение API Rule в PocketBase Admin для коллекции `competitions`:
   - `create`: `@request.auth.id != "" && (season_id.coach_id = @request.auth.id || season_id.athlete_id.user_id = @request.auth.id)`
   - `update`: `@request.auth.id != "" && (season_id.coach_id = @request.auth.id || season_id.athlete_id.user_id = @request.auth.id)`
2. Запросить изменение API Rule для `competition_participants`:
   - `create`: `@request.auth.id != "" && (competition_id.season_id.coach_id = @request.auth.id || (athlete_id.user_id != "" && athlete_id.user_id = @request.auth.id))` (уже позволяет атлетам создавать свое участие)
     *Стоит проверить, что атлет может создавать `competition_participants`, если `competition_id` валидный.*

## Фаза 2: Athlete Dashboard

1. Проверить значение `prValue` в компоненте `AthleteDashboard`.
2. Если `profileMissing` == `false` и `lastScore !== null` , но `prValue === null`: отрендерить новый компонент `HistoricalOnboardingWidget`.
3. `HistoricalOnboardingWidget` стилизовать стекляным дизайном с карточной структурой, добавить текст об установке точки отсчета и кнопку `Link href="/competitions?tab=history&action=create"`.

## Фаза 3: Competitions Hub & Past Form

1. В `CompetitionsHub` извлечь параметры `tab` и `action` из `useSearchParams()`.
2. В `useEffect` установить состояние, если `searchParams.get('tab') === 'history'`, то открывать вкладку `History`. Если `searchParams.get('action') === 'create'`, то устанавливать `setShowPastForm(true)`.
3. Убрать `isCoach &&` перед кнопкой `Add Past` в табе `history`, разрешить её всем атлетам. Убедиться, что форма рендерится для `isCoach || isAthlete(в своем сезоне)`.
4. В `pastForm` добавить поле для `official_result` (число).
5. В обработчик `handleCreatePast` добавить логику:
   - Если пользователь атлет `!isCoach` и скоуп установлен `athleteScopeId`:
     Сначала вызывается `createCompetition` с переданными значениями `name`, `date`, `priority="C"`, `status="completed"`, `official_result`.
     Потом создается участие `upsertCompetitionParticipant(competition_id, athlete_id, "finished")`.
     Мы обновим `createCompetition` сервис, либо сделаем это 2-мя отдельными вызовами.

## Фаза 4: QA & Polish

1. Запустить сервер, проверить флоу с новым аккаунтом атлета.
2. Проверить загрузку медиа в только что созданную карточку `CompetitionCard`.
3. Запустить `pnpm type-check` и `pnpm lint`. Очистить баги.
