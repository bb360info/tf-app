# Context — Track 4.241: Bug Fixes & Gap Closure (Track 4.24 Audit)

## 🚀 Quick Start — Agent Guide

> Трек готов к исполнению. Все ~25 багов верифицированы по реальному коду (2026-02-24).

### Файлы трека

```
track-4.241-bug-fixes/
  gate.md             ← чеклист задач (source of truth)
  context.md          ← контекст + скиллы (ты здесь)
  bug-report.md       ← точные локации всех багов
  implementation_plan.md ← технические решения + шаблоны кода
```

### Скиллы по фазам

| Фаза | Скиллы (помимо always-группы) |
|------|-------------------------------|
| **Phase 1** — Route/data/schema | `systematic-debugging` · `nextjs-app-router-patterns` · `react-best-practices` · `typescript-expert` |
| **Phase 2** — Feature completion | `react-best-practices` · `react-ui-patterns` · `systematic-debugging` · `api-design-principles` |
| **Phase 3** — UI component rewrite | `react-ui-patterns` · `ui-visual-validator` · `nextjs-app-router-patterns` · `sql-optimization-patterns` |
| **Phase 4** — Security sweep | `api-security-best-practices` · `auth-implementation-patterns` · `code-refactoring-refactor-clean` |
| **Phase 5** — i18n + QA + deploy | `i18n-localization` · `e2e-testing-patterns` · `deployment-engineer` |

**Always (все фазы):** `concise-planning` · `lint-and-validate` · `jumpedia-design-system` · `verification-before-completion`

### Ключевые ограничения

- **Static Export** (`output: 'export'`): все новые страницы — `'use client'` + data через `useEffect`. NO server components.
- **Перед Phase 2/3:** запустить `/ui-work` (reads DESIGN_SYSTEM.md + tokens.css)
- **Phase 5 smoke tests:** запускать через `/qa` workflow (`browser_subagent`)
- **После каждой фазы:** `pnpm type-check && pnpm build` → Exit 0
- **Deploy:** `bash scripts/deploy.sh` (rsync на 209.46.123.119)

---

## Problem

После завершения трека 4.24 ("Training Planning UX") проведён глубокий аудит кода (rev.1 + rev.2).
Обнаружено **~25 реальных проблем**: 5 критических, 8 высоких, 9 средних, 3 низких.
Из оригинальных 19 пунктов — **3 оказались ложными** (ревизия 2 исправила).

Полный список — в `bug-report.md` этой директории.

## Key Issues

**A. Нерабочие маршруты (3 CRITICAL):**

- `/training/review` → 404 (Coach Review вкладка в BottomTabBar)
- `/training/today` → 404 (Start Workout CTA в TodayWorkoutCard)
- `/dashboard/notifications` → 404 (View all в RecentNotifications)

**B. Нереализованные функции (2 CRITICAL):**

- Template Panel: `TemplateList.tsx` не имеет кнопки Apply и prop `onApply` (цепочка Panel→Content работает)
- DnD reorder: `onReorderDrag` prop не передаётся из WeekConstructor в DayConstructor

**C. Schema mismatch (1 CRITICAL — NEW):**

- `TodayWorkoutCard.tsx` обращается к `plan.name` и `plan.focus` — эти поля **не существуют** в PB collection `training_plans` (подтверждено через PB MCP admin). Также неверный expand path для plan_exercises.

**D. Логические ошибки (5 HIGH):**

- `value="self"` в фильтре → `listSeasons("self")` → пустой результат
- `is_read` вместо `read` в RecentNotifications (подтверждено PB schema)
- `listSeasons()` без athleteId в AthleteDashboard
- `WeeklyHeatmap` — volume delta card вместо 7-cell heatmap
- `StatsStrip` — Date/Volume/Competitions вместо PR/Streak/CNS%

**E. Security & Deprecation (NEW — 3 HIGH):**

- `todayISO()` → UTC вместо timezone-aware `todayForUser()` (Китай UTC+8)
- **25 мест строковой интерполяции** в PB filter (10 сервисных файлов) — injection vector
- **5 файлов** используют deprecated `pb.authStore.model` (PB v0.23+)

**F. Прочее (12 MEDIUM/LOW):**

- i18n: hardcoded EN в 7+ компонентах (включая TeamAlerts "Attention Needed")
- `PendingReviews` / `TrainingToday` — заглушки без данных
- Badge count в BottomTabBar = 0
- `pnpm lint` FAIL
- "Create first template" без onClick
- `getTeamReadinessAlerts` — нет "missed >2 days"
- Нет partial unique index на plan_assignments
- Нет composite index (plan_id, status)

**G. Исправлены ложные баги (из rev.1):**

- ~~Assign UX отсутствует~~ → **полностью реализован** в SeasonDetail.tsx (300+ LOC)
- ~~Нет duplicate check~~ → **есть** в planAssignments.ts (reactivate existing)
- ~~TemplatePanelContent не передаёт onApply~~ → **передаёт** (через TemplatePanel.tsx)

## Strategy

**Фазы 1-5 (backend-first):**

1. **Route fixes + data bugs + schema fixes** — маршруты, is_read→read, TodayWorkoutCard schema, todayISO
2. **Feature completion** — TemplateList Apply кнопка, DnD save
3. **WeeklyHeatmap + StatsStrip** — переделка компонентов на реальные данные
4. **Security + deprecation** — pb.filter() migration (25 мест), pb.authStore.record, PB indexes
5. **i18n + coach stubs + lint + QA** — полировка и smoke tests

## Files Affected

### Route fixes

- `src/components/dashboard/athlete/TodayWorkoutCard.tsx` — href + schema fix
- `src/components/dashboard/athlete/RecentNotifications.tsx` — href + is_read→read
- `src/app/[locale]/(protected)/training/review/` — создать страницу или изменить таб

### Schema + data fixes

- `src/components/dashboard/athlete/TodayWorkoutCard.tsx` — plan.name/focus не существуют, expand path
- `src/components/dashboard/AthleteDashboard.tsx` — listSeasons()→listSeasonsForAthlete(), todayISO()→todayForUser(), StatsStrip данные
- `src/app/[locale]/(protected)/training/page.tsx` — убрать "self" option

### Feature completion

- `src/components/templates/TemplateList.tsx` — добавить Apply кнопку + onApply prop
- `src/components/templates/TemplatePanelContent.tsx` — onClick "Create first template"
- `src/components/training/WeekConstructor.tsx` — передать onReorderDrag → DayConstructor

### Component rewrites

- `src/components/dashboard/athlete/WeeklyHeatmap.tsx` — переделать в 7-cell heatmap
- `src/components/dashboard/athlete/StatsStrip.tsx` — подключить PR/Streak/CNS%

### Security migration (Phase 4)

- `src/lib/pocketbase/services/` — 10 файлов: string interpolation → pb.filter()
- 5 файлов: pb.authStore.model → .record

### Quality

- `src/components/dashboard/coach/PendingReviews.tsx` — реальные данные
- `src/components/dashboard/coach/TrainingToday.tsx` — реальные данные
- `src/components/dashboard/coach/TeamAlerts.tsx` — i18n
- `src/components/shared/BottomTabBar.tsx` — unreviewedCount
- i18n-файлы (ru/en/cn) — ключи для 7+ компонентов
- `scripts/clear_pb.ts`, `scripts/clear_users.ts`, `scripts/test_users.ts` — lint

## Cross-Track

- **Track 4.24** — прямое продолжение, закрываем баги
- **Track 4.25** — уже поглощён в 4.24, не касаемся
- PocketBase schema изменения: partial unique indexes + composite index на plan_assignments
