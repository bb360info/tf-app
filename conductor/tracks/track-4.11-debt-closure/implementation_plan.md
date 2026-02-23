# Track 4.11: Debt Closure — Implementation Plan

> **Скиллы:** `concise-planning`, `kaizen`, `i18n-localization`, `jumpedia-design-system`, `verification-before-completion`
> **Подход:** Kaizen — малые инкрементальные улучшения, каждое проверяемое.

## Решения (утверждены пользователем)

1. **PWA иконки** → в стиле сайта (Athletic Minimal, dark bg `#0F172A`, accent `#6366F1`)
2. **PB cascade delete** → через PocketBase MCP (admin: `admin@encyclopedia-jumper.app` / `NewJumper2026!`)
3. **ErrorBoundary i18n** → через props (errorTitle, errorFallbackMessage, retryLabel)

## Scope

**In:**
- Lint fix (1 error + 1 warning)
- Emoji → Lucide/CSS (10+ мест)
- Hardcoded RU/EN → i18n (~30 строк, ~20 новых ключей × 3 локали)
- Hardcoded hex → CSS vars (2 места)
- PWA иконки + Infrastructure updates
- PB cascade delete через MCP

**Out:**
- Offline/Dexie.js (→ Track 6)
- Unit-тесты (→ Track 6)
- Exercise illustrations (→ backlog)

---

## Фаза 0: Lint Fix (2 мин)

### [MODIFY] `src/app/[locale]/(protected)/dashboard/page.tsx`
- Line 51: `let groupMap` → `const groupMap`

### [MODIFY] `src/app/[locale]/(protected)/layout.tsx`
- Line 15: remove unused `eslint-disable` directive

---

## Фаза 1: DS Compliance — Emoji + Hex (~20 мин)

### [MODIFY] `SeasonWizard.tsx` + `SeasonWizard.module.css`

Emoji 🔺🔸🔹 → CSS `.priorityDot`:
- Lines 422-424: `<option>` — emoji → текстовый `●` (HTML entities не работают в option)
- Lines 470, 587: `{c.priority === 'A' ? '🔺' : ...}` → `<span className={styles.priorityDot} data-priority={c.priority} />`

CSS:
```css
.priorityDot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  margin-right: var(--space-1);
  vertical-align: middle;
}
.priorityDot[data-priority="A"] { background: var(--color-danger); }
.priorityDot[data-priority="B"] { background: var(--color-warning); }
.priorityDot[data-priority="C"] { background: var(--color-accent-primary); }
```

### [MODIFY] `SeasonDetail.tsx` + `SeasonDetail.module.css`
- Lines 231, 271: same emoji → `.priorityDot`

### [MODIFY] `AthleteDetailClient.tsx`
- Line 155: `♂/♀` → Lucide `User` icon or remove (gender context already present)

### [MODIFY] `TestResultCard.tsx`
- Line 31: `▲/▼` → Lucide `TrendingUp`/`TrendingDown` (size=12)

### [MODIFY] `ShowAthleteOverlay.module.css`
- Lines 56, 79: `color: #ffffff` → `color: var(--color-text-inverse)`

---

## Фаза 2: i18n Cleanup (~40 мин)

### [MODIFY] `analytics/page.tsx`
| Line | Was | Key |
|------|-----|-----|
| 69 | `'Не удалось загрузить данные'` | `analytics.loadError` |
| 82 | `'Не удалось загрузить результаты'` | `analytics.loadResultsError` |
| 137 | `Перейти к Дашборду` | `analytics.goToDashboard` |
| 156 | inline style div | → CSS `.headerActions` |
| 167 | massive inline style | → CSS `.headerAddBtn` |

### [MODIFY] `ErrorBoundary.tsx`
Add props: `errorTitle?: string`, `errorFallbackMessage?: string`, `retryLabel?: string`
- Line 65: `Что-то пошло не так` → `{this.props.errorTitle ?? 'Something went wrong'}`
- Line 67: `Произошла непредвиденная ошибка` → `{this.props.errorFallbackMessage ?? 'An unexpected error occurred'}`
- Line 75: `Попробовать снова` → `{this.props.retryLabel ?? 'Try again'}`

### [MODIFY] `layout.tsx`
Pass i18n strings: `<ErrorBoundary errorTitle={t('errors.title')} retryLabel={t('errors.retry')} errorFallbackMessage={t('errors.fallback')}>`

### [MODIFY] `NotificationBell.tsx`
- Line 100: aria-label RU → `{labels?.title ?? 'Notifications'}` + count
- Lines 120,124,132,139: RU fallbacks → EN fallbacks

### [MODIFY] `ThemeToggle.tsx`
- Lines 10-12: `labelRu` → accept `labels` prop from parent OR add `useTranslations`
- Line 19: `aria-label="Выбор темы"` → i18n

### [MODIFY] `LocaleSwitcher.tsx`
- Line 30: aria-label → EN universal or i18n

### [MODIFY] `ExerciseConstructor.tsx`
- Line 184: placeholder RU → `t('exercises.constructor.namePlaceholder')`
- Line 320: placeholder RU → `t('exercises.constructor.tipsPlaceholder')`

### [MODIFY] `CnsHeatmap.tsx`
- Lines 152,159: `'Мало'/'Много'` → `t('cnsHeatmap.low')` / `t('cnsHeatmap.high')`

### [MODIFY] `TestResultCard.tsx`
- Line 29: RU aria-label → `t('analytics.increased')` / `t('analytics.decreased')`

### [MODIFY] `AchievementsGrid.tsx`
- Lines 21-24: inline category labels → `t('achievements.category.streak')` etc.

### [MODIFY] `SeasonDetail.tsx` lines 19,22 + `WeekConstructor.tsx` line 29
- `'Loading...'` → `t('app.loading')`

### [MODIFY] `messages/{ru,en,cn}/common.json`
~20 new keys × 3 locales. Key list:
```
analytics.loadError, analytics.loadResultsError, analytics.goToDashboard
errors.title, errors.fallback, errors.retry
settings.themeLight, settings.themeAuto, settings.themeDark, settings.themeSelect
settings.languageSelect
exercises.constructor.namePlaceholder, exercises.constructor.tipsPlaceholder
cnsHeatmap.low, cnsHeatmap.high
analytics.increased, analytics.decreased
achievements.category.streak, .training, .testing, .compete
```

---

## Фаза 3: Инфраструктура (~15 мин)

### [NEW] PWA Icons
Generate via `generate_image` tool:
- `public/icons/icon-192.png` — 192×192, Athletic Minimal style, dark bg (#0F172A), accent (#6366F1), stylized jumper silhouette
- `public/icons/icon-512.png` — 512×512, same
- `public/icons/icon-maskable-512.png` — 512×512, extra padding for maskable safe zone

### PB Cascade Delete via MCP
Authenticate: `mcp_pocketbase_auth_admin(admin@encyclopedia-jumper.app, NewJumper2026!)`

Update collections with `athlete_id` relation → set cascade on delete:
- `training_logs` — athlete_id cascade
- `test_results` — athlete_id cascade
- `daily_checkins` — athlete_id cascade
- `seasons` — athlete_id cascade (optional relation)
- `achievements` — athlete_id cascade

### [MODIFY] `docs/ARCHITECTURE.md`
Line 12: `| Offline | Dexie.js (IndexedDB) | Mirrors PocketBase schema |`
→ `| Offline | Dexie.js (IndexedDB) | **Planned — Track 6** |`

### [MODIFY] `conductor/tracks.md`
Add row: `| 🔵 Active | 4.11 | Debt Closure | 1 | [Gate 4.11](tracks/track-4.11-debt-closure/gate.md) |`

### [MODIFY] `CHANGELOG.md`
Add Track 4.11 entry at top of Unreleased.

---

## Verification

```bash
pnpm type-check  # Exit 0
pnpm build       # Exit 0
pnpm lint        # Exit 0, 0 errors, 0 warnings
pnpm test        # Exit 0, 16/16 pass

# Emoji audit
grep -rn '🔺\|🔸\|🔹\|♂\|♀' src/ --include="*.tsx"  # → 0 results

# Hardcoded hex (outside fallbacks)
grep -rn '#[0-9a-fA-F]\{3,8\}' src/ --include="*.module.css" | grep -v 'var('  # → 0 results
```
