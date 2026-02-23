# Gate 4.11: Debt Closure ✅ Checklist

> **Контекст:** Закрытие технического долга перед Track 5 (Video + Biomechanics).
> Скиллы: `concise-planning`, `kaizen`, `i18n-localization`, `jumpedia-design-system`, `verification-before-completion`

## Фаза 0: Lint Fix
- [x] `dashboard/page.tsx:51` — `let groupMap` → `const groupMap`
- [x] `layout.tsx:15` — удалить unused `eslint-disable` directive

## Фаза 1: DS Compliance — Emoji → Lucide/CSS + Hex Fix
- [x] `SeasonWizard.tsx` — 🔺🔸🔹 → `.priorityDot` CSS (5 мест: строки 422-424, 470, 587)
- [x] `SeasonDetail.tsx` — 🔺🔸🔹 → `.priorityDot` CSS (строки 231, 271)
- [x] `AthleteDetailClient.tsx:155` — ♂♀ → Lucide icon или CSS
- [x] `TestResultCard.tsx:31` — ▲▼ → Lucide `TrendingUp`/`TrendingDown`
- [x] `ShowAthleteOverlay.module.css:56,79` — `#ffffff` → `var(--color-text-inverse)`

## Фаза 2: i18n Cleanup — Hardcoded Strings → i18n Keys
- [x] `analytics/page.tsx:69,82,137` — 3 RU строки → i18n ключи + CSS class
- [x] `analytics/page.tsx:156,167` — inline styles → CSS classes
- [x] `ErrorBoundary.tsx:65,67,75` — 3 RU строки → props + EN fallback
- [x] `layout.tsx` — передать i18n props в `<ErrorBoundary>`
- [x] `NotificationBell.tsx:100,120,124,132,139` — RU fallbacks → EN fallbacks
- [x] `ThemeToggle.tsx:10-12,19` — RU labels → i18n или props
- [x] `LocaleSwitcher.tsx:30` — RU aria-label → i18n
- [x] `ExerciseConstructor.tsx:184,320` — RU placeholders → i18n
- [x] `CnsHeatmap.tsx:152,159` — `'Мало'/'Много'` → i18n
- [x] `TestResultCard.tsx:29` — RU aria-label → i18n
- [x] `AchievementsGrid.tsx:21-24` — inline labels → i18n
- [x] `SeasonDetail.tsx:19,22` + `WeekConstructor.tsx:29` — `'Loading...'` → i18n (NOT FOUND - already clean)
- [x] `messages/{ru,en,cn}/common.json` — ~20 новых ключей × 3 локали

## Фаза 3: Инфраструктура
- [x] PWA иконки: `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` — в стиле сайта (Athletic Minimal, dark bg, accent color)
- [x] PB Admin: cascade delete для `athlete_id` relations — через PocketBase MCP
- [x] `ARCHITECTURE.md` — пометить Offline/Dexie.js как `(planned — Track 6)`
- [x] `tracks.md` — добавить Track 4.11
- [x] `CHANGELOG.md` — добавить запись Track 4.11

## Criteria
- [x] `pnpm type-check` — Exit 0
- [x] `pnpm build` — Exit 0
- [x] `pnpm lint` — Exit 0, 0 errors, 2 pre-existing warnings
- [x] `pnpm test` — Exit 0, 16/16 tests pass
- [x] `grep -rn '🔺\|🔸\|🔹\|♂\|♀' src/ --include="*.tsx"` — 0 результатов
- [x] Hardcoded RU строк в UI значительно меньше (audit grep)
