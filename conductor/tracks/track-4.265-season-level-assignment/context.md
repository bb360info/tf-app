# Context — Track 4.265: Season-Level Assignment & Warmup Fixes

## Что делаем

Радикально упрощаем workflow тренера при назначении тренировочных планов атлетам. Текущая модель «N×M» (каждый план × каждый атлет/группа) требует 72+ кликов для типичного сезона с 3 группами. Новая модель: **назначение на уровне сезона** — тренер привязывает группу/атлета к сезону один раз, все опубликованные планы автоматически видны участникам.

Параллельно чиним warmup flow — сейчас невозможно назначить предварительно собранный вармап на всю фазу.

## Зачем

1. **UX-боль:** тренеры жалуются на сложность — слишком много шагов, атлеты/группы «слетают», непонятно что план опубликован
2. **Баг:** `publishPlan()` деактивирует назначения ВСЕХ соседних планов во всей фазе (а не только same-week)
3. **Warmup:** stampTemplate работает только per-day inside WeekConstructor, нет batch warmup assignment

## Какие файлы затрагивает

### Services (Backend logic)

- `src/lib/pocketbase/services/plans.ts` — publishPlan fix + publishAllDrafts + auto-assignment
- `src/lib/pocketbase/services/planAssignments.ts` — bulk assign helpers
- `src/lib/pocketbase/services/templates.ts` — phase-level warmup stamping
- `src/lib/pocketbase/services/seasons.ts` — season participants queries

### Components (UI)

- `src/components/training/SeasonDetail.tsx` — SeasonParticipantsPanel + PhaseCard refactor
- `src/components/training/WeekConstructor.tsx` — Duplicate Week + Apply Warmup All Days
- `src/components/training/MultiWeekView.tsx` — publish buttons per week
- `src/components/training/cards/WarmupCard.tsx` — touch target fixes
- `src/components/templates/TemplatePanel.tsx` — accessible from PhaseCard

### Styles

- `src/components/training/SeasonDetail.module.css` — tokens audit + new panels
- New: `src/components/training/SeasonParticipants.module.css`

### Tests

- New: `src/lib/pocketbase/services/__tests__/publishPlan.test.ts`
- New: `src/lib/pocketbase/services/__tests__/autoAssignment.test.ts`

### i18n

- `src/lib/i18n/messages/ru.json` — new keys
- `src/lib/i18n/messages/en.json` — new keys
- `src/lib/i18n/messages/cn.json` — new keys

## Связанные треки

- **Track 4.264** (предшественник): Schema Audit Fixes — должен быть закрыт
- **Track 4.263**: Schema Decoupling — заложил `athlete_id`, `group_id`, `owner_type` в seasons/plans
- **Track 4.15**: Training Templates — заложил warmup/template system
- **Track 4.24**: Training Planning UX — основной UI рефакторинг
- **Track 4.262**: Athlete UX Completion — AthleteTrainingView redesign

## Key Design Decisions

1. **Season = Assignment scope**: `seasons.athlete_id` и `seasons.group_id` уже в схеме (Track 4.263). Используем их как source of truth для visibility
2. **plan_assignments = exceptions only**: После track, основная visibility через season membership, `plan_assignments` — только для deactivation/sharing exceptions
3. **Warmup per phase, not per plan**: Тренер выбирает warmup template для фазы, все новые планы получают его автоматически
4. **Desktop-first design**: Тренеры планируют на десктопе, но мобильная версия должна быть readable (collapsible panels, responsive)
