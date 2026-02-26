# Context: Track 4.262 — Athlete UX Completion + Historical PR Onboarding

## Происхождение

Объединяет **Track 4.244** (Historical PR Onboarding) и **Track 4.261** (Athlete UX Overhaul + Tech Debt Closure), а также закрывает остатки **Track 4.242** (Phase 2–4). Оба трека работают с атлетским UX, и их естественно делать вместе.

## Проблемы, которые решаем

### 1. Атлет не может задать свой PR (Product Blocker)

В Track 4.243 был удалён ручной ввод Personal Records. PR теперь считается из `competitions.official_result` через `prProjectionService`. Но новому атлету негде создать "прошлый старт" — кнопка `Add Past` в `CompetitionsHub` была ограничена `isCoach`. Это приводит к `My PR: —` и пустым графикам.

**Решение:** Открыть pastForm для атлетов, добавить поля `official_result` + `discipline` + `season_type`, автоматически создавать `competition_participant`. На Dashboard — Onboarding CTA виджет.

### 2. Страница тренировки атлета — "мусор" и пустота

`AthleteSeasonsList` ("My Seasons") не даёт ценности. ScoreCard содержит хардкод EN. Empty state неинформативен. Нет контекста фазы, прогресса сезона, ближайшего старта.

### 3. Tech Debt

- `WeekConstructor.tsx`: 813 LOC, нужна hook-extraction
- `AthleteDetailClient.tsx`: 724 LOC, 4× `t: any`
- UTC Drift: 2 места с `toISOString().slice(0,10)` вместо `toLocalISODate()`
- `getTeamReadinessAlerts`: не учитывает пропуски ≥2 дней подряд

## Ключевые Решения

1. **PR считается из `competitions.official_result`** (строка 29 в `prProjection.ts`). Для пересчёта PR при создании прошлого старта атлету ОБЯЗАТЕЛЬНО нужно заполнить `official_result`, `discipline` и `season_type`.

2. **API Rules уже готовы.** `competitions.createRule` и `competition_participants.createRule` позволяют атлету создавать записи в своём сезоне (проверено в PB Admin 2026-02-25).

3. **pastForm должна создавать 2 записи подряд:** `competition` → `competition_participant` (status: `finished`).

## Затронутые файлы (основные)

### Phase 1 (P0 Quick Fixes)

- `src/app/[locale]/(protected)/training/page.tsx` — удалить AthleteSeasonsList
- `src/components/training/AthleteSeasonsList.tsx` + `.module.css` — удалить файлы
- `src/components/dashboard/athlete/ScoreCard.tsx` — i18n
- `src/components/training/AthleteTrainingView.tsx` — empty state
- `src/lib/i18n/messages/*.json` — новые ключи

### Phase 2 (Historical PR Onboarding)

- `src/components/dashboard/AthleteDashboard.tsx` — CTA виджет
- `src/components/competitions/CompetitionsHub.tsx` — searchParams, открыть для атлетов, official_result
- `src/lib/pocketbase/services/competitionParticipants.ts` — вызов upsert из handleCreatePast

### Phase 3 (Context Banner)

- `src/components/training/AthleteContextBanner.tsx` + `.module.css` — НОВЫЙ файл
- `src/components/training/AthleteTrainingView.tsx` — интеграция
- `src/lib/pocketbase/services/seasons.ts` — getActiveSeasonForAthlete

### Phase 4 (7 Days + Progress)

- `src/components/training/AthleteTrainingView.tsx` — 7-дневная сетка, RestDayCard, progress
- `src/components/training/WeekConstructor.tsx` → `WeekSummary` — draft indicator

### Phase 5 (Groups UX)

- `src/app/[locale]/(protected)/settings/groups/page.tsx` — button UX
- `src/components/training/SeasonDetail.tsx` — Weekly Status Map

### Phase 6 (Tech Debt)

- `src/lib/pocketbase/services/readinessHistory.ts:79` — toLocalISODate
- `src/lib/pocketbase/services/logs.ts:330` — toLocalISODate  
- `src/components/training/WeekConstructor.tsx` — hook extraction
- `src/app/[locale]/(protected)/dashboard/athlete/[id]/AthleteDetailClient.tsx` — split + any
- `src/components/analytics/PRTimelineChart.tsx` — any
- `src/components/training/SeasonDetail.tsx` — any
- `src/components/training/TrainingLog.tsx` — any ×2
- `src/lib/pocketbase/services/readiness.ts` — getTeamReadinessAlerts
