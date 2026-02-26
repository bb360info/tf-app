---
description: Обязательный workflow для любой UI/component/CSS работы в Jumpedia
---
// turbo-all

## UI Work Workflow

Выполни ВСЕ шаги по порядку перед написанием кода.

### Режимы выполнения

- `full` (по умолчанию): первый запуск в сессии или после изменений дизайн-доков
- `light`: повторный запуск в той же сессии, когда дизайн-доки не менялись

### Шаг 0: Определи активный трек и файл состояния

1. Read `conductor/tracks.md` и найди `🔵 Active`.
2. Вычисли путь `conductor/tracks/track-N-<slug>/workflow_state.md`.
3. Если файла нет — создай его по шаблону из `conductor/workflow_state.template.md`.
4. Зафиксируй текущие версии файлов (sha256):
   - `docs/DESIGN_SYSTEM.md`
   - `src/styles/tokens.css`
   - `src/app/globals.css`

### Шаг 1: Выбери режим (`full` или `light`)

Сравни текущие sha с `last_read_docs_versions` в `workflow_state.md`:

- Если хотя бы один hash изменился или это первый запуск → `full`
- Если все hash совпали → `light`

### Шаг 2: Чтение документации

`full` режим:

1. Read `docs/DESIGN_SYSTEM.md` (полностью — все секции: tokens, glassmorphism, breakpoints, components, anti-patterns, pre-delivery checklist)
2. Read `src/styles/tokens.css` (актуальные CSS-переменные — source of truth)
3. Read `src/app/globals.css` (самохостинг шрифтов, glass utility class, base reset)

`light` режим:

1. Прочитай только quick checklist:
   - Tokens only (`var(--color-*)`, `var(--space-*)`, `var(--radius-*)`, `var(--shadow-*)`)
   - Glass only via project vars
   - Touch targets >= 44x44
   - Mobile-first
   - Lucide React only
2. Полные файлы не перечитывай, если hashes совпали.

### Шаг 3: Загрузка скиллов (бюджет)

Базовый бюджет: **2-4 SKILL.md на задачу**.

Обязательный минимум для UI:

1. Load skill `.agent/skills/skills/jumpedia-design-system/SKILL.md` (Iron Law + violations + pre-delivery checklist)
2. Load skill `.agent/skills/skills/react-ui-patterns/SKILL.md` (loading/error/empty states, button states)

Опционально (только high-risk UI / сложный perf):

3. Load skill `.agent/skills/skills/react-best-practices/SKILL.md` (45 правил Vercel: waterfalls, bundle, rerenders)

7. ❌ BLOCKED — НИКОГДА не загружать: `frontend-design`, `tailwind-design-system`, `web-artifacts-builder`

8. Реализуй компонент/страницу:
   - Все цвета: `var(--color-*)`
   - Все отступы: `var(--space-*)`
   - Все радиусы: `var(--radius-*)`
   - Все тени: `var(--shadow-*)`
   - Glass: `var(--glass-bg)`, `var(--glass-border)`, `var(--glass-blur)`, `var(--glass-shadow)`
   - Шрифты: `var(--font-body)`, `var(--font-display)`, `var(--font-mono)`
   - Иконки: только Lucide React — НИКОГДА emoji
   - Touch targets: минимум 44×44px
   - Mobile-first: base styles для 375px, затем `@media (min-width: 768px)`

9. Пройди Pre-Delivery Checklist из `jumpedia-design-system` SKILL.md перед сдачей

### Шаг 10: Обнови `workflow_state.md`

После выполнения:

- Обнови `last_read_docs_versions` (sha для DESIGN_SYSTEM/tokens/globals)
- Обнови `last_loaded_skills` (фактически прочитанные SKILL.md)
- Обнови `last_ui_work_mode` (`full`/`light`)
- Обнови `last_ui_work_run_at`
