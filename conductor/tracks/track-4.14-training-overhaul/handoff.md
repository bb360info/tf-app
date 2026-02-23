# Agent Handoff: Track 4.14 — Training System Overhaul

> Этот документ — для агента, который начнёт исполнение Track 4.14.
> Последнее обновление: 2026-02-21.

## Статус трека

**🔵 Active** — план утверждён пользователем, готов к исполнению.

## Файлы трека — что читать и в каком порядке

```
conductor/tracks/track-4.14-training-overhaul/
├── handoff.md                ← ВЫ ЗДЕСЬ — начни с этого файла
├── gate.md                   ← Чеклист по 4 фазам (~56 пунктов, 118 строк)
├── implementation_plan.md    ← Финальный план: скиллы, порядок, риски
├── plan.md                   ← Оригинальный план (diff-level, код) — СПРАВОЧНЫЙ
├── walkthrough.md            ← Отчёт предыдущего агента (ревью + дополнения)
└── analysis/
    ├── coach_flows_analysis.md    ← Глубокий анализ всех coach flows
    └── training_ux_deep_dive.md   ← Анализ Training UX + exercise input types
```

### Порядок чтения:
1. `handoff.md` (этот файл)
2. `gate.md` — чтобы видеть ВСЕ пункты
3. `implementation_plan.md` — чтобы знать порядок, скиллы, риски
4. `plan.md` — если нужны конкретные diff-ы и код
5. `analysis/` — если нужен полный контекст проблем

## Утверждённые решения

1. **Нумерация:** Track 4.14 (не 5.0)
2. **PB миграции:** Делать через PB MCP или browser_subagent → `https://jumpedia.app/_/`
3. **Обратная совместимость:** `session = 0` по умолчанию для существующих данных
4. **Порядок:** 4 фазы с точками остановки (`pnpm type-check && pnpm build` после каждой)
5. **`plan_assignments`** — отдельная коллекция (не поле в `training_plans`)
6. **Авто-создание athletes record** для self-registered атлетов (добавлено в Фазу 3)

## Быстрый старт — Фаза 1

```bash
# 1. Запусти /switch-agent для контекста
# 2. Подключи скиллы: always + database-architect + typescript-expert
# 3. Начни с PB Admin — добавь поля в коллекции (см. gate.md Фаза 1)
# 4. Обнови types.ts, collections.ts
# 5. Добавь Zod schema
# 6. pnpm type-check && pnpm build
```

## PB Admin credentials
- Stored in `.env.local` as `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD`
- Admin panel: `https://jumpedia.app/_/`

## Предупреждения

- **НЕ удалять `trainingLogs.ts` до Фазы 3** — AthleteTrainingView зависит от него
- **`getSelfAthleteId()` будет рефакториться** после добавления `user_id` → не ломать до Фазы 3
- **Track 4.13 SeasonWizard fix** — coach обязан выбрать атлета (не "Myself"). Учесть в Фазе 4
- **Фаза 3 — самая рискованная** (удаление файла + рефактор + авто-создание athletes). Делать пошагово
- **UNIQUE index `training_logs`** нужно обновить ДО загрузки данных с session > 0

## Скиллы по фазам (краткая сводка)

| Фаза | Скиллы |
|------|--------|
| 1: Data Model | `always` + `database-architect` + `typescript-expert` |
| 2: Multi-Session | `always` + `react-best-practices` + `react-ui-patterns` + `i18n-localization` |
| 3: Unified Logging | `always` + `code-refactoring` + `react-best-practices` + `react-ui-patterns` + `i18n-localization` |
| 4: Overrides + Groups | `always` + `architect-review` + `react-best-practices` + `core-components` + `i18n-localization` |

> **mandatory_reads для Фаз 2-4:** `docs/DESIGN_SYSTEM.md` + `src/styles/tokens.css`
