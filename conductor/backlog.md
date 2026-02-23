# Backlog — Энциклопедия Прыгуна v2

> **Rule:** If a new idea comes during track execution, add it here. Do NOT implement it mid-track.

## Ideas to Evaluate Later

<!-- Add ideas below in the format:
| Date | Idea | Estimated track | Priority |
-->

| Date | Idea | Track | Priority |
|------|------|-------|----------|
| 2026-02-19 | PDF export (multi-language columns) for Training Plans | Track 5 or 6 | Medium |
| 2026-02-19 | ~~**BUG:** `pnpm build` fails — `reference/[slug]/page` uses both `"use client"` and `generateStaticParams()`.~~ **FIXED:** split into server wrapper + client component | Track 6 | ~~High~~ Done |
| 2026-02-19 | **Admin Exercise Review UI** — модерация пользовательских упражнений (approve/reject pending_review → approved/rejected). Visibility model создан в Track 4.5, admin UI — в Track 6 | Track 6 | Medium |
| 2026-02-20 | **PB Admin: Cascade behaviour для athlete_id relations** — сменить `restrict` → `cascade` на коллекциях: training_logs, test_results, daily_checkins, seasons, achievements. Нужна ручная настройка в PB Admin | ~~Track 4.5~~ **Track 4.14 Phase 1** | High |
| 2026-02-20 | **`user_id` field на athletes** — прямое связывание user ↔ athlete record (сейчас lookup через coach_id + getSelfAthleteId workaround) | ~~Track 6~~ **Track 4.14 Phase 1** | Medium |
| 2026-02-20 | **Иллюстрации упражнений** — нет поля illustration в UI, нет загрузки картинок (незакрытый пункт Gate 4.5 Phase 1) | Track 5 or 6 | Medium |
| 2026-02-20 | **Coach Notifications при ачивках атлета** — когда атлет получает ачивку (особенно streak_100d), тренеру приходит notification через существующий `notifications.ts` сервис | ~~Track 5 or 6~~ **Track 4.19 Phase 3** | ~~Medium~~ Planned |
| 2026-02-22 | **Project-wide `pb.filter()` migration** — 40+ мест в 15 сервисах используют string interpolation вместо `pb.filter()`. SQL injection risk. Skills: `api-security-best-practices`, `lint-and-validate` | Track 5 (tech debt) | 🔴 High |
| 2026-02-22 | **Notification analytics** — open rate, click-through для оценки эффективности уведомлений. Нужны поля `opened_at`, `clicked_at` в notifications | Track 6+ | Low |
| 2026-02-22 | **E2E test: coach publishes plan → athlete gets push** — полный flow verification с Playwright. Skills: `e2e-testing-patterns`, `playwright-skill` | Track 5 | Medium |
| 2026-02-22 | **Branded types для PB IDs** — `AthleteId`, `PlanId`, `SeasonId` и т.д. вместо голых `string`. Poka-Yoke через type system. Skills: `typescript-expert` | Track 6+ | Low |

