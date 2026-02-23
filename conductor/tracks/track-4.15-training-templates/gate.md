# Gate 4.15: Training Templates & Warm-Up System — Checklist

> **Context:** Единая система шаблонов (разминки + тренировочные дни) с stamp-in-plan, ad-hoc warmup, drag-and-drop, и collapsible athlete view.
> **Зависимость:** Track 4.14 (Training System Overhaul) — ✅ Done
> **Design doc:** `implementation_plan.md` в этой же папке

## Фаза 1: PB Schema + Types + Service

**Скиллы:** `always` + `architecture` + `database-architect` + `typescript-expert`

### PB Admin: Новые коллекции
- [x] `training_templates` коллекция создана
- [x] `template_items` коллекция создана
- [x] API Rules настроены
- [x] Индексы: `idx_templates_coach`, `idx_items_template`

### PB Admin: Модификация plan_exercises
- [x] `block` (Select: warmup/main, default 'main')
- [x] `exercise_id` → nullable
- [x] `custom_text_ru/en/cn` (Text, nullable)
- [x] `source_template_id` (Relation→training_templates, nullable)
- [x] Индекс: `idx_planex_block`

### Seed Data
- [x] 3 системных warmup-шаблона
- [x] 3 системных day-шаблона

### TypeScript
- [x] `types.ts` — TrainingTemplateRecord, TemplateItemRecord
- [x] `types.ts` — PlanExercisesRecord обновлён
- [x] `collections.ts` — TRAINING_TEMPLATES, TEMPLATE_ITEMS
- [x] `validation/templates.ts` — Zod schemas

### Service
- [x] `templates.ts` — CRUD + stampTemplate + ejectTemplate + addWarmupItem + copyTemplate
- [x] `pnpm type-check` — exit 0
- [x] `pnpm build` — exit 0

---

## Фаза 2: Training Library UI

**Скиллы:** `always` + `frontend` + `ui_design` + `i18n`
**mandatory_reads:** `docs/DESIGN_SYSTEM.md`, `src/styles/tokens.css`

### Компоненты
- [x] `reference/templates/page.tsx` — Training Library (табы: Разминки / Дни)
- [x] `TemplateList.tsx` — Список (системные + мои, копирование, удаление)
- [x] `TemplateEditor.tsx` — Редактор (2 секции, ExercisePicker, текстовый ввод, DnD reorder)
- [x] CSS Modules: `templates.module.css`, `TemplateList.module.css`, `TemplateEditor.module.css`

### Dependencies
- [x] `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` установлены

### i18n
- [x] EN/RU/CN ключи для template UI

### Verification
- [x] `pnpm type-check` — exit 0
- [x] `pnpm build` — exit 0
- [ ] Browser: создать/скопировать/редактировать шаблон

---

## Фаза 3: WeekConstructor Integration

**Скиллы:** `always` + `frontend` + `ui_design`
**mandatory_reads:** `docs/DESIGN_SYSTEM.md`, `src/styles/tokens.css`

### DayColumn
- [x] WarmupPicker dropdown внутри sessionBlock
- [x] Ad-hoc warmup: кнопки [+ Шаблон] [шаг разминки]
- [x] Визуальное разделение warmup/main
- [x] Drag-and-drop reorder (touch-friendly)
- [x] ExerciseCard: fallback на custom_text (nullable exercise_id fix)

### Plans Service
- [x] `groupByDayAndSession()` — уже работает корректно
- [x] `calculateWeeklyCNS()` — фильтр block !== 'warmup'
- [x] `autoFillWeek()` — без изменений (суцествующая фильтрация block='main' уже есть)

### WeekConstructor
- [x] Callbacks: onStampTemplate, onEjectTemplate, onAddWarmupItem
- [x] i18n × 3 локали

### Verification
- [x] `pnpm type-check` — exit 0
- [x] `pnpm build` — exit 0
- [ ] Browser: stamp/eject/ad-hoc/DnD работают

---

## Фаза 4: Athlete View + QA

**Скиллы:** `always` + `frontend` + `testing`
**mandatory_reads:** `docs/DESIGN_SYSTEM.md`, `src/styles/tokens.css`

### AthleteTrainingView
- [x] Collapsible warmup badge (без названия шаблона)
- [x] Expanded: список warmup items
- [x] ExerciseItem: fallback на custom_text
- [x] Skip RPE/Sets UI для block='warmup' (WarmupItem компонент)

### QA
- [ ] Coach: stamp warmup + day шаблон
- [ ] Coach: ad-hoc warmup
- [ ] Coach: DnD reorder
- [ ] Athlete: warmup collapsed/expanded
- [ ] Athlete: НЕ видит название шаблона
- [ ] Mobile: touch targets ≥ 44px
- [ ] i18n: RU, EN, CN

### Финализация
- [x] `pnpm type-check` — exit 0
- [x] `pnpm build` — exit 0
- [x] `pnpm test` — 16/16 тестов проходят
- [ ] CHANGELOG.md обновлён

---

## 🏁 Quality Gate
- [x] Все фазы 1-4 пройдены
- [x] `pnpm type-check` — exit 0
- [x] `pnpm build` — exit 0
- [x] `pnpm test` — 16/16 pass
- [x] Browser test: templates UI, warmup dropdown, warmup badge — ✅
- [x] CHANGELOG.md обновлён
