# Track 4.20: UX Audit & Coach-Athlete Communication Fixes (v2)

## Что делаем
Комплексное исправление UX-проблем, багов и архитектурных рисков. Включает: security fixes (SQL injection, API rules), пропущенные фичи из 4.17/4.18 (Today's Plan, Adaptation Banner), UX broken assign, individual plan override, гибридный UI шаблонов (Templates в Training + Reference), миграцию warmup page на PB, двустороннюю коммуникацию тренер↔спортсмен, и массовую замену 50+ silent catch блоков.

## Зачем
1. **SQL injection** — `getPublishedPlanForToday()` использует raw string interpolation (critical security bug)
2. Атлеты **не видят сезоны** на training page и dashboard (баг `listSeasons()` без athleteId)
3. AthleteDashboard показывает **заглушку** вместо реального плана дня
4. **Assign UX сломан** — тренер должен вводить UUID группы вручную (raw text input)
5. **Дыра безопасности**: `training_phases` API rules позволяют менять фазы чужих сезонов
6. Коммуникация **только в одну сторону** — атлет не может дать feedback тренеру
7. `getPublishedPlanForToday()` не знает про individual override
8. **Warmup page дублирует данные** — hard-coded protocols vs PB system templates
9. **Templates недоступны** из Training — тренер должен навигировать в Reference и обратно
10. 50+ пустых `catch {}` блоков скрывают ошибки

## Архитектурное решение: Templates Hybrid (Вариант C)
- CRUD шаблонов **остаётся** в Reference → Templates
- **Quick-access picker** (`TemplateQuickApply`) добавляется в DayColumn/WeekConstructor
- QuickPlanBuilder получает «Save to PB» + «Insert into Plan»
- Warmup page **мигрирует** с hard-coded на PB templates

## Какие файлы затрагивает

### Security fixes
- `src/lib/pocketbase/services/logs.ts` — SQL injection fix + override resolution
- PocketBase `training_phases` — API rules hardening

### Core UX fixes
- `src/components/dashboard/AthleteDashboard.tsx` — Today's Plan + seasons
- `src/components/training/SeasonDetail.tsx` — assign dropdown + override badge + delete
- `src/app/[locale]/(protected)/training/page.tsx` — athlete seasons + season delete
- `src/app/[locale]/(protected)/settings/groups/page.tsx` — error handling

### New features
- `src/components/shared/ConfirmDialog.tsx` — reusable glassmorphism dialog
- `src/components/training/TemplateQuickApply.tsx` — template picker in DayColumn
- `src/components/training/QuickPlanBuilder.tsx` — save to PB + insert into plan
- `src/components/training/DayColumn.tsx` — save as template + template picker
- `src/components/training/WeekConstructor.tsx` — override button + readiness badges
- `src/components/training/AthleteTrainingView.tsx` — notes auto-save + skip reason + adaptation
- `src/lib/utils/errors.ts` — error/success utility

### Warmup migration
- `src/app/[locale]/(protected)/reference/warmup/page.tsx` — PB templates instead of hard-coded

### PocketBase (admin)
- `training_phases` — API rules hardening (coach-only CUD)
- `log_exercises` — add `skip_reason` text field (max 255)
- `plan_exercises` — composite index `(plan_id, deleted_at)` replacing single `(plan_id)`

## Зависимости
- Track 4.19 ✅ Done (notifications, compliance, day_notes)
- Track 4.16 ✅ Done (DB integrity, FK fixes)
- Track 4.15 ✅ Done (training templates — schema, service, UI)
- Track 4.14 ✅ Done (training overhaul — plan assignments, groups)

## Статус
✅ **Done** — все 7 фаз выполнены, Quality Gate пройден, QA smoke test (coach + athlete) пройден.
