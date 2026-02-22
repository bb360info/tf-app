---
description: Обязательный workflow для любой UI/component/CSS работы в Jumpedia
---
// turbo-all

## UI Work Workflow

Выполни ВСЕ шаги по порядку перед написанием кода.

1. Read `docs/DESIGN_SYSTEM.md` (полностью — все секции: tokens, glassmorphism, breakpoints, components, anti-patterns, pre-delivery checklist)

2. Read `src/styles/tokens.css` (актуальные CSS-переменные — это source of truth для значений)

3. Read `src/app/globals.css` (самохостинг шрифтов, glass utility class, base reset)

4. Load skill `.agent/skills/skills/jumpedia-design-system/SKILL.md` (Iron Law + violations + pre-delivery checklist)

5. Load skill `.agent/skills/skills/react-ui-patterns/SKILL.md` (loading/error/empty states, button states)

6. Load skill `.agent/skills/skills/react-best-practices/SKILL.md` (45 правил Vercel: waterfalls, bundle, rerenders)

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
