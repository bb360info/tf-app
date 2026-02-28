# Track 4.268 — Tech Debt Zero (Pre-Video Prep)

## Gate Checklist

### Phase 1 — Security & Types (Data Layer)
>
> Скиллы: `api-security-best-practices`, `typescript-expert`

- [ ] 1.1 `pb.filter()` migration: Заменить строковую интерполяцию в фильтрах (SQL injection risk) на безопасный `pb.filter()` во всех сервисах.
- [ ] 1.2 Строгие типы DTO: Избавиться от унаследованного `[key: string]: any` из `RecordModel` для типов вроде `PlanExercisesRecord`.

### Phase 2 — Integrations & Architecture
>
> Скиллы: `database-architect`, `mobile-developer`

- [ ] 2.1 DB Cascade Delete: Ручная настройка в PocketBase Admin — сменить `restrict` на `cascade` для полей `athlete_id` в коллекциях `training_logs`, `test_results`, `daily_checkins`, `seasons`, `achievements`.
- [ ] 2.2 Push delivery via CF Worker: Интеграция создания уведомлений (PocketBase/Next.js) с задеплоенным CF Worker для доставки Web-Push.

### Phase 3 — UI Maintainability
>
> Скиллы: `react-patterns`

- [ ] 3.1 `CoachDashboard` refactor: Вынести инлайн-логику тренера из `app/[locale]/(protected)/dashboard/page.tsx` (400+ строк) в изолированный компонент `CoachDashboard.tsx`.

### Phase 4 — QA + Delivery
>
> Скиллы: `code-review-checklist`, `conductor-validator`, `playwright-skill`

- [ ] 4.1 `pnpm type-check` ✅
- [ ] 4.2 `pnpm test` ✅
- [ ] 4.3 `pnpm build` ✅
- [ ] 4.4 Manual QA (включая проверку доставки Web Push)
- [ ] 4.5 QA Ports Automation: Зафиксировать порт (например, 50782) для `pnpm preview`, чтобы тесты не падали на CI из-за занятых портов
- [ ] 4.6 Update CHANGELOG.md
- [ ] 4.7 Write walkthrough.md

## Goals

- Подготовить кристально чистую кодовую базу (Tech Debt Zero) перед масштабным обновлением Трека 5 (Video + Biomechanics).
- Закрыть дыры в безопасности (pb.filter) и потенциальные утечки памяти в БД (cascade delete).
- Замкнуть цикл Push Notifications.
