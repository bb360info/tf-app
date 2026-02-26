# Gate 4.244: Historical PR Onboarding

## 🎯 Цель трека

Обеспечить атлетам возможность централизованно и удобно добавлять исторические результаты (Personal Records) за прошлые сезоны через единую точку входа — `/competitions`.
На Дашборде будет добавлен Onboarding CTA, перенаправляющий на добавление, а сама форма создания "прошлого старта" будет открыта для атлетов.

## Product Decisions

- [x] Ввод исторических рекордов происходит через создание полноценного соревнования со статусом `completed` во вкладке `History`.
- [x] Атлет имеет право создать соревнование в сезоне, к которому он привязан.
- [x] При создании старта атлетом он автоматически добавляется в участники (`competition_participants`).
- [x] Форма "Добавить прошлый старт" доступна спортсменам в `/competitions`, а на `AthleteDashboard` выводится стильный Onboarding CTA, если у атлета нет PR.
- [x] Созданный старт рендерится через `CompetitionCard`, что дает атлету возможность сразу же добавить медиа (видео/фото) исторического рекорда.

## Phase 1: Back-end API Rules (PocketBase)

**Skills:** `concise-planning`, `database-architect`, `auth-implementation-patterns`

- [x] Расширить `createRule` и `updateRule` для `competitions`: разрешить атлету создавать и ред. старты внутри своего сезона.
- [x] Расширить `createRule` и `updateRule` для `competition_participants`: разрешить атлету добавлять себя как участника.
- [x] Описать изменения в `architecture.md` (или `context.md` трека).

**Gate 1:** Backend Check Exit 0

## Phase 2: The Onboarding Widget (Dashboard)

**Skills:** `concise-planning`, `react-ui-patterns`, `nextjs-best-practices`

- [ ] Создать компонент `HistoricalOnboardingWidget` (UI-стекло, красивый призыв к действию).
- [ ] Встроить его в `AthleteDashboard`.
- [ ] Показывать виджет только если `prValue === null` (у атлета нет рекордов).
- [ ] Кнопка в виджете перенаправляет на `/competitions?tab=history&action=create`.

**Gate 2:** UI Smoke (Виджет отображается, если PR пусто)

## Phase 3: Athlete "Past Form" Flow

**Skills:** `react-patterns`, `typescript-expert`, `systematic-debugging`

- [ ] Настроить парсинг `searchParams` в `CompetitionsHub` (открытие вкладки `history` и формы создания, если `action=create`).
- [ ] Открыть кнопку `Add Past` в `CompetitionsHub` для `!isCoach`.
- [ ] Обновить саму форму `pastForm`: добавить поле "Официальный результат" (чтобы старт сразу шел в зачет как PR).
- [ ] Обновить хэндлер создания старта атлетом (`handleCreatePast`): он должен создать `competition`, а затем под капотом вызвать `upsertCompetitionParticipant` со статусом `finished`, привязывая атлета к старту.

**Gate 3:** Type-check && E2E Smoke для флоу атлета (Создание -> Появление карточки)

## Phase 4: Final Verification & UX Polish

**Skills:** `verification-before-completion`, `playwright-skill`

- [ ] Убедиться, что как только старт создается, `CompetitionCard` позволяет атлету загрузить видео из-за наличия полного состава данных.
- [ ] Проверить пересчет и обновление PR на Dashboard (PR Projection service учитывает этот новый старт).
- [ ] Закрыть трек в `CHANGELOG.md` и обновить `walkthrough.md`.

**Gate 4 (Track Complete):** Полный QA Smoke Pass.
