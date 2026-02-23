# Gate 4.10: Full DS Polish Completion

Этот трек является финальным этапом дизайн-аудита ("Вариант C"), направленным на внедрение продвинутых UX-улучшений в строгом соответствии с `docs/DESIGN_SYSTEM.md` и `src/styles/tokens.css`.

> **Context для агента:** 
> Перед началом выполнения ОБЯЗАТЕЛЬНО ознакомься с:
> 1. `docs/DESIGN_SYSTEM.md` (Особенно разделы: Glassmorphism, Breakpoints, Touch Targets, Z-Index)
> 2. `src/styles/tokens.css`
> 3. `.agent/workflows/ui-work.md`
> 
> **Жесткие правила (Iron Law):**
> - Mobile-first CSS (`min-width` media queries только).
> - Значения из CSS-переменных (`var(--color-*)`, `var(--space-*)`, `var(--radius-*)`).
> - Touch targets минимум `44px` для кнопок и иконок взаимодействия.
> - Использование fallback для glassmorphism (`@supports not (backdrop-filter)`).
> - Никаких сторонних библиотек для анимаций и тостов.

## Фаза 1: Структурные визуальные доработки
- [x] **Page Transition**: создать `src/app/[locale]/(protected)/template.tsx` с CSS-анимацией Fade-in/Slide-up (`var(--duration-normal)`). Учесть `@media (prefers-reduced-motion: reduce)`.
- [x] **Header Gradient (iOS)**: добавить градиент сверху (`pointer-events: none`, `z-index: var(--z-sticky)`), интегрировать через `PageWrapper.tsx` или корневой лэйаут.
- [x] **Stat Cards Redesign**: применить адаптивный CSS-grid (mobile 1fr -> 768px 2fr -> 1024px 3fr) к карточкам дашборда (`Dashboard` и `AthleteDetail`).

## Фаза 2: Новые базовые компоненты
- [x] **Глобальный Toast Provider**: написать `ToastProvider.tsx` и базовый хук `useToast()`. Использовать `var(--glass-bg)`, `z-index: var(--z-toast)`. Кнопка закрытия ≥44x44px.
- [x] **Компонент EmptyState**: написать универсальный `EmptyState.tsx` (Glass card, Lucide size=32, CTA кнопка ≥44px height).

## Фаза 3: Внедрение и Рефакторинг
- [x] **Аналитика и Графики**: заменить старые текстовые заглушки в `ProgressChart` и `TrainingLoadPie` на новый `<EmptyState>`.
- [x] **Обернуть Layout**: интегрировать `<ToastProvider>` в корневой `layout.tsx` защищенной зоны (`protected`).
- [x] **Toast Testing**: заменить хотя бы 1 вызов "сырых" уведомлений об успехе (например, в настройках или где-то еще) на `useToast()`.

## Фаза 4: Final QA Check
- [x] **Dark Mode Audit**: проверить `tokens.css` и новые компоненты на отсутствие hardcoded цветов.
- [x] **Консистентность иконок**: только `lucide-react`, никаких эмодзи.
- [x] **Build & Lint**: запуск `pnpm type-check`, `pnpm lint`, `pnpm build`. Все команды должны завершиться с Exit 0.
