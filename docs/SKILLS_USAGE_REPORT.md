# Skills Usage Report — Track 4.24 Phase 0
> Дата: 2026-02-23 · Агент: [CS] (Gemini 2.5 Pro)  
> Цель: аудит фактического использования скиллов для отладки skill-системы

---

## Контекст

Этот отчёт описывает, какие скиллы из `project_skills.json` фактически применялись (или должны были применяться) при выполнении Phase 0 Track 4.24. Отчёт разделён по этапам воркфлоу (`/phase` → execution → `/done`) и содержит честную оценку: что сработало, что было проигнорировано и почему.

---

## Установленные "always" скиллы (автозагрузка)

По правилу `project_skills.json["always"]` эти скиллы ДОЛЖНЫ загружаться при любой задаче:

| Скилл | Назначение | Фактически прочитан? |
|-------|-----------|----------------------|
| `concise-planning` | Краткость плана | ❌ Не прочитан явно |
| `lint-and-validate` | Линт + валидация перед commit | ❌ Не прочитан явно |
| `jumpedia-design-system` | Design system compliance | ❌ Не прочитан явно |
| `verification-before-completion` | Чеклист перед завершением | ❌ Не прочитан явно |

> ⚠️ **Проблема #1:** Ни один из `always`-скиллов не был загружен через `view_file` в течение сессии. Агент полагался на встроенные знания и `GEMINI.md`, а не на инструкции скиллов.

---

## Этап 1: Старт сессии (checkpoint из предыдущего чата)

**Что было:**  
Сессия началась с состояния checkpoint — предыдущий агент уже выполнил часть Phase 0.

**Скиллы, которые должны были загружаться при `/switch-agent`:**
- `concise-planning` — ✅ концептуально применён (краткие планы)
- `context-driven-development` (из группы `planning`) — ✅ применён через чтение `gate.md`, `implementation_plan.md`
- `conductor-validator` — ❌ не загружен

**Фактически прочитанные файлы скиллов:** нет (0 вызовов `view_file` на SKILL.md)

---

## Этап 2: Выполнение задач Phase 0

### 2.1 Aria-label аудит (`DayColumn.tsx`, `TemplateEditor.tsx`)

**Триггеры из `project_skills.json`:** `aria`, `accessibility`, `a11y`  
**Ожидаемый скилл:** `wcag-audit-patterns` (группа `accessibility`)  
**Фактически загружен:** ❌ нет  
**Что использовалось:** знание WCAG из предыдущего контекста + код-ревью глаза агента

### 2.2 CSS tokens (`tokens.css`)

**Триггеры:** `CSS`, `style`, `design`, `цвет`, `анимац`  
**Ожидаемые скиллы:**
- `react-ui-patterns` (группа `ui_design`)
- `ui-visual-validator` (группа `ui_design`)
- `jumpedia-design-system` (группа `always`)  

**Фактически загружен:** ❌ нет  
**Что использовалось:** `GEMINI.md` + прямое чтение `docs/DESIGN_SYSTEM.md` (mandatory_read из `ui_design`)  
> ✅ `mandatory_reads` из группы `ui_design` (`DESIGN_SYSTEM.md`, `tokens.css`) — **фактически выполнены** через `view_file` в предыдущей сессии.

### 2.3 Dead code removal (`planAssignments.ts`)

**Триггеры:** `refactor`, `clean`, `дубл`, `вынес`  
**Ожидаемые скиллы:** `code-refactoring-refactor-clean`, `react-patterns` (группа `refactoring`)  
**Фактически загружен:** ❌ нет  
**Что использовалось:** логический анализ кода + gate.md инструкции

### 2.4 SQL injection fix (`logs.ts`)

**Триггеры:** `security`, `fix`, `bug`, `исправ`, `SQL`  
**Ожидаемые скиллы:**
- `api-security-best-practices` (группа `auth_security`)
- `systematic-debugging` (группа `debugging`)  

**Фактически загружен:** ❌ нет  
**Что использовалось:** знание PocketBase `pb.filter()` API из предыдущего кода в проекте

### 2.5 ExercisePicker category colors

**Триггеры:** `component`, `UI`, `стиль`, `цвет`, `CSS`  
**Ожидаемые скиллы:** `react-ui-patterns`, `jumpedia-design-system`  
**Фактически загружен:** ❌ нет

---

## Этап 3: Верификация (`/done` воркфлоу)

**Что делал агент:**
- `pnpm type-check` ✅
- `pnpm build` ✅
- grep проверки на мёртвый код и SQL-инъекции ✅

**Ожидаемый скилл:** `verification-before-completion` (группа `always`)  
**Фактически загружен:** ❌ нет  
**Оценка:** Верификация была выполнена корректно, но без прочтения инструкций скилла — агент самостоятельно решил что проверять, опираясь на gate.md.

---

## Этап 4: CHANGELOG + Walkthrough

**Ожидаемые скиллы:** `docs-architect` (группа `docs`), `concise-planning`  
**Фактически загружен:** ❌ нет  
**Оценка:** Формат взят из `/done` воркфлоу (`.agent/workflows/done.md`) — воркфлоу сработал, скилл не нужен был.

---

## Сводная таблица

| Задача | Триггер | Ожидаемый скилл | Загружен? | Компенсация |
|--------|---------|-----------------|-----------|-------------|
| Tokens + DS | `CSS`, `design` | `ui-visual-validator`, `jumpedia-design-system` | ❌ | GEMINI.md + прямое чтение файлов |
| Dead code | `refactor`, `clean` | `code-refactoring-refactor-clean` | ❌ | gate.md инструкции |
| SQL injection | `security`, `fix` | `api-security-best-practices` | ❌ | Знание PB API из кодобазы |
| aria-label | `aria`, `a11y` | `wcag-audit-patterns` | ❌ | Знание WCAG |
| Верификация | — | `verification-before-completion` | ❌ | gate.md + самостоятельно |
| Walkthrough | `docs` | `docs-architect` | ❌ | `/done` воркфлоу |
| /done flow | `conductor`, `gate` | `conductor-validator` | ❌ | Воркфлоу sрed |
| Все задачи | always | `concise-planning`, `lint-and-validate` | ❌ | Встроенные знания |

---

## Выводы и проблемы

### Проблема #1: "Always" скиллы не загружаются

**Факт:** ни один из 4 скиллов из группы `always` не был загружен через `view_file` за всю сессию.  
**Причина:** В `GEMINI.md` написано, что они «Auto-loaded», но у агента нет механизма автоматической загрузки — он должен вызвать `view_file` вручную. Если этот шаг пропускается в начале сессии (особенно при resume из checkpoint), скиллы остаются непрочитанными.  
**Влияние:** Умеренное. Агент компенсировал через `GEMINI.md` и прямое чтение `DESIGN_SYSTEM.md`. Задачи выполнены корректно.  
**Рекомендация:** В `/switch-agent` и `/phase` воркфлоу добавить явный шаг: `view_file` для каждого скилла из `always`.

### Проблема #2: Триггерная система не активируется автоматически

**Факт:** Скиллы в `project_skills.json` привязаны к триггерным словам, но нет механизма, который бы сказал агенту «обнаружен триггер 'aria' — загрузи `wcag-audit-patterns`».  
**Причина:** Триггеры — это подсказки для выбора скиллов в `/auto-skills` воркфлоу, но агент не запускал `/auto-skills`.  
**Рекомендация:** В `/phase` воркфлоу добавить обязательный шаг выбора скиллов по триггерам задач фазы.

### Проблема #3: `mandatory_reads` у групп frontend и ui_design

**Факт:** Группы `frontend` и `ui_design` имеют `mandatory_reads: ["docs/DESIGN_SYSTEM.md", "src/styles/tokens.css"]`. Эти файлы В ПРЕДЫДУЩЕЙ СЕССИИ были прочитаны, но только потому что задача требовала их изменения — не из-за `mandatory_reads`.  
**Оценка:** Случайно правильный результат, но не системный.

### Что работало хорошо

| Элемент | Оценка |
|---------|--------|
| `/done` воркфлоу | ✅ Строго соблюдён: audit → gate check → walkthrough → CHANGELOG → cleanup → прогресс |
| `GEMINI.md` как замена скиллов | ✅ Достаточный для Phase 0 (фундаментальные задачи) |
| Прямое чтение gate.md и implementation_plan.md | ✅ Заменяет `context-driven-development` скилл |
| Сам воркфлоу `/done` | ✅ Прочитан через `view_file` и выполнен пошагово |

---

## Рекомендации по улучшению системы

### 1. Обязательная загрузка `always`-скиллов в воркфлоу

Добавить в начало `/phase`, `/switch-agent` и `/done`:

```markdown
### Шаг 0: Загрузка обязательных скиллов
Выполни `view_file` для каждого из:
- `.agent/skills/concise-planning/SKILL.md`
- `.agent/skills/lint-and-validate/SKILL.md`
- `.agent/skills/jumpedia-design-system/SKILL.md`
- `.agent/skills/verification-before-completion/SKILL.md`
```

### 2. Явный триггерный выбор скиллов в `/phase`

Перед выполнением каждой задачи фазы — анализ триггеров и загрузка ≤2 скиллов группы:

```markdown
Проанализируй задачи фазы. Для каждой найди совпадение с triggers в project_skills.json.
Загрузи 1-2 наиболее релевантных скилла через view_file.
```

### 3. Checkpoint-resume проблема

При продолжении сессии из checkpoint агент получает сжатый контекст и **не** знает, какие скиллы читались раньше. Решение: добавить в `context.md` трека поле `loaded_skills_checkpoint: [...]` с последними загруженными скиллами.

### 4. Разделить "концептуально применён" и "прочитан SKILL.md"

Сейчас `GEMINI.md` содержит краткие правила дизайн-системы, что позволяет агенту применять их без чтения `jumpedia-design-system/SKILL.md`. Это хорошая компенсация, но означает, что расширенные инструкции из скилла (например, pre-delivery checklist) могут быть пропущены.

---

*Отчёт создан для отладки skill-системы Antigravity. Время: 2026-02-23T18:08 EST.*
