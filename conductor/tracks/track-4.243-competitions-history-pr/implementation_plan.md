# Implementation Plan: Track 4.243

## Название
**Competitions Hub + History + Auto-PR**

## Подход

Реализация идёт снизу вверх:
1. сначала схема данных и API rules;
2. затем хаб соревнований и карточка старта;
3. затем proposal/approval workflow;
4. затем авто-PR и выпиливание ручного PR UI.

Это минимизирует регрессы и упрощает проверку прав доступа.

## In/Out Scope

### In
- `/competitions` (Upcoming/History)
- coach registry по всем участникам старта
- participant assignment per competition
- athlete proposals + coach approval with corrections
- competition media collaboration/moderation
- auto-PR projection from official results

### Out
- biomechanical video analysis
- тяжёлая media gallery логика
- перенос historical workflow обратно в training

## Целевые изменения по слоям

### 1) PocketBase schema
- expand `competitions`
- new `competition_participants`
- new `competition_proposals`
- new `competition_media`
- indexes + rules

### 2) Service layer
- CRUD + workflow сервисы
- projection сервис для PR

### 3) UI
- dashboard entrypoint
- `/competitions` hub
- competition card
- coach inbox
- PR widgets/charts migration

### 4) Data migration
- runtime sunset для `personal_records`
- migration notes + archival guidance

## Phased Delivery

## Phase 1 — Data Foundation
**Artifacts**
- schema updates
- rules matrix
- typings + zod
- index definitions

**Acceptance**
- типы/линт/билд зелёные
- rules позволяют role-safe CRUD без обходов

## Phase 2 — Hub and Navigation
**Artifacts**
- dashboard competitions entrypoint
- `/competitions` page with tabs
- history filters
- coach registry

**Acceptance**
- coach/athlete навигация работает
- фильтры и реестр корректно отображают данные

## Phase 3 — Proposal Workflow
**Artifacts**
- single competition card form
- athlete proposal submit
- coach approve/reject with corrections
- status timeline

**Acceptance**
- конфликтные кейсы обрабатываются через pending proposals
- official данные не перезаписываются атлетом напрямую

## Phase 4 — Media Collaboration
**Artifacts**
- media attach to competition
- author/coach edit rights
- moderation controls

**Acceptance**
- права доступа соблюдаются по visibility/moderation

## Phase 5 — Auto-PR Migration
**Artifacts**
- `prProjectionService`
- athlete card PB widgets (primary/secondary, indoor/outdoor)
- PB timeline chart
- remove manual PR UI paths

**Acceptance**
- PR совпадает с official competition results
- ручной PR поток недоступен в UI

## Phase 6 — QA and Handoff
**Artifacts**
- smoke checklist
- updated walkthrough/changelog
- final gate completion

**Acceptance**
- `pnpm type-check`, `pnpm lint`, `pnpm build`, `pnpm test` зелёные
- role-based сценарии покрыты smoke прогоном

## Risk Register

1. **Data consistency risk**
- Mitigation: unique/foreign key constraints + approve-only official writes.

2. **Permission leakage**
- Mitigation: explicit PB rules + negative tests (athlete cannot approve official).

3. **Performance on history pages**
- Mitigation: composite indexes + server-side filtered queries.

4. **Legacy PR dependencies**
- Mitigation: phased removal + explicit migration checklist.

## QA Matrix (обязательный минимум)

1. Coach creates competition and assigns subset of group.
2. Athlete submits pre-event metadata proposal.
3. Coach enters official result directly.
4. Athlete submits correction proposal after official exists.
5. Coach approves with edited value.
6. Coach rejects proposal with reason.
7. Media visibility and moderation scenarios.
8. PR projection correctness for indoor/outdoor filters.
