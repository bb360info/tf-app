# Gate 4.7: Bug Fixes + DS Polish — Audit Results

## Фаза 1: Критические баги (функциональность)

### 🔴 P0: Broken Logic
- [x] `types.ts` → Добавить `user_id?: string` в `AthletesRecord`
- [x] `readiness.ts` → `_getSelfAthleteIdImpl()` — устанавливать `user_id: user.id` при создании self-athlete
- [x] `groups.ts` → `joinByInviteCode()` — заменить lookup через `coach_id` на `getSelfAthleteId()`
- [x] `groups.ts` → sanitize invite code input (strip `"` chars — PB filter injection)
- [x] `EditAthleteModal.tsx` → hardcoded RU string → i18n ключ `dashboard.updateFailed` ×3 locale

### 🟡 P1: Missing Token
- [x] `tokens.css` → добавить `--color-text-on-accent: #ffffff` в `:root` и `[data-theme="dark"]`

## Фаза 2: Design System Violations
- [x] `groups.module.css` → `.backLink` 36×36px → 44×44px
- [x] `groups.module.css` → `.iconBtn` 28×28px → min 44×44px
- [x] `groups.module.css` → `.input` font-size `--text-sm` → `--text-base` (16px, iOS zoom)
- [x] `groups.module.css` → `@supports not (backdrop-filter)` fallback для `.createForm` / `.groupCard`
- [x] Аудит touch targets (AuthForms — соответствует DS; training.module.css — нет backLink)

## Фаза 3: Build Fix + Inline Styles
- [x] Создать `src/app/[locale]/not-found.tsx` + CSS Module (glassmorphism + `@supports` fallback)
- [x] `not-found.tsx` → `'use client'` + `useTranslations()` (NextIntlClientProvider доступен из locale layout)
- [x] `forgot-password/page.tsx` → убрать 2 inline styles → `.submitBtnBlock` / `.iconLabel` в AuthForms.module.css
- [x] i18n ключи `app.notFound`, `app.notFoundDescription`, `app.goHome` ×3 locale

## Фаза 4: DX / Code Quality
- [x] `EmailVerificationBanner.tsx` → `t('sendResetLink')` → `t('resendVerification')`
- [x] i18n ключ `auth.resendVerification` ×3 locale
- [x] Аудит `useAuth` imports — два хука с разными API задокументированы JSDoc (не взаимозаменяемы)

---

## Extension: Hardcoded Strings → i18n (из аудита)
- [x] `AddTestResultModal.tsx` → 4 hardcoded RU строки → i18n ключи (`invalidValue`, `futureDateError`, `saveFailed`, `notesPlaceholder`)
- [x] `AddTestResultModal.tsx` → inline spinner style → CSS class `.spinIcon`
- [x] `AthleteCard.tsx` → hardcoded confirm → `t('deleteConfirm', {name})`
- [x] `AthleteCard.tsx` → `лет` → `t('yearsOld', {age})`
- [x] `ProgressChart.tsx` → hardcoded `'ru-RU'` locale → prop `locale` из `useLocale()`
- [x] `ProgressChart.tsx` → 2 hardcoded строки → props (`noDataMessage`, `loadingLabel`)
- [x] `training/page.tsx` → 4 hardcoded strings → i18n (`checkin`, `checkinDone`, `checkinCreateFailed`, `checkinSaveFailed`)

## Extension: Inline Styles → CSS Classes
- [x] `training/page.tsx` → 5 inline styles → CSS classes в `training.module.css`
- [x] `training/page.tsx` → SeasonWizardLazy/DetailLazy loading → `.wizardLoadingOverlay`, `.wizardLoadingBox`, `.detailLoadingBox` CSS

## Extension: UX Quick Wins (из loading_states_brainstorm.md)
- [x] `AthleteDashboard.module.css` → fade-in animation (staggered `.card`) + `prefers-reduced-motion`
- [x] `AthleteDashboard.module.css` → CLS fix (`min-height` на loading секциях)
- [x] `AthleteDashboard` → shimmer skeleton для Suspense fallback (`.shimmerBar`)

## Extension: i18n ключи
- [x] ~15 новых ключей в `messages/{ru,en,cn}/common.json`

## Criteria
- [x] `pnpm type-check` — Exit 0
- [x] `pnpm build` — Exit 0
- [x] `pnpm test` — 16/16 passed
- [x] `pnpm lint` — no NEW errors (1 pre-existing warning: exhaustive-deps in AddTestResultModal)
