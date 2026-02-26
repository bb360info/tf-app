# Walkthrough — Track 4.22: Invite Links & Group Management

**Дата:** 2026-02-23  
**Статус:** ✅ Трек завершён + пост-аудит пройден  
**Верификация:** `pnpm build Exit 0` · `pnpm type-check Exit 0` · `86/86 тестов`

---

## Что реализовано (Phases 0–5)

### Phase 0 — Баги в `groups.ts`

| Баг | Исправление |
|-----|-------------|
| Soft-deleted группы принимали инвайты | `deleted_at = ""` фильтр в `joinByInviteCode` |
| Новый athlete record без first/last name | `first_name`/`last_name` при auto-create |
| `alreadyMember` молча проглатывался | Re-throw как `Error('invite.alreadyMember')` |
| `pb.authStore.model` (deprecated) | → `pb.authStore.record` в `listMyGroups` |
| `pb.authStore.model` (deprecated) | → `pb.authStore.record` в `createGroup` *(найдено при аудите)* |

Добавлено:
- `moveAthleteToGroup()` — create-first стратегия + coach_id guard + deleted_at guard
- `hasActiveGroupPlan()` — проверка активных планов для предупреждений
- `TODO(Track 4.23)` в `joinByInviteCode` и `moveAthleteToGroup`

### Phase 1 — `/join` Page

**Файлы:** `join/page.tsx`, `join/JoinContent.tsx`, `join.module.css`

State machine (8 состояний): `loading` → `joining` → `success` | `alreadyMember` | `codeExpired` | `invalidLink` | `coachCannotJoin` | `registerPrompt`

- Suspense wrapper (обязателен для `useSearchParams` в Static Export)
- Coach detection до join attempt (не ждём ответа сервера)
- `Link` из `@/i18n/navigation` — locale добавляется автоматически
- Generic OG meta tags

### Phase 2 — Auth Integration

- **RegisterForm:** lazy `getPendingInvite()` → role lock + `infoBanner`
- **LoginForm:** `joinWithPendingInvite()` после email + Google OAuth
- **OnboardingWizard:** `joinWithPendingInvite()` ПЕРВЫМ в `handleFinish()`, `getJoinedGroupName()` как fallback, redirect `/dashboard`, `StepDone` banner

### Phases 3–5 — Coach UI (в `settings/groups/page.tsx`)

- **Share Link:** Web Share API → clipboard fallback, expiry check <24h
- **Move/Add athletes:** ArrowRightLeft (move) + UserPlus (add to), `ConfirmDialog` с warnings о планах
- **QR Code:** `qrcode` (MIT, lazy), dark mode aware, download PNG

### i18n

Добавлено ×3 (RU/EN/CN):
- `join.*` — ~17 ключей
- `groups.shareLink/linkCopied/inviteTitle/inviteText/linkExpiry/linkExpiringSoon/moveTo/addTo/moveConfirm/addConfirm/moveWarning*/moveSuccess/addSuccess/showQR/downloadQR/inviteHint`
- `auth.inviteBanner`
- `onboarding.done.joinedGroup`

---

## Баги найдены при пост-аудите (исправлены)

| # | Файл | Баг | Исправление |
|---|------|-----|-------------|
| 1 | `groups.ts` L43 | `createGroup` использовал deprecated `pb.authStore.model` | → `pb.authStore.record` |
| 2 | `JoinContent.tsx` L192 | Кнопка регистрации показывала `t('registerFirst')` (описательный текст) вместо лейбла кнопки | Добавлены ключи `join.register` + `join.loginExisting` |
| 3 | `JoinContent.tsx` L172, L217 | `href={\`/${locale}/dashboard\`}` давал **двойной locale prefix** `/ru/ru/dashboard` — `Link` из `@/i18n/navigation` И ТАК добавляет locale | → `href="/dashboard"` |
| 4 | `JoinContent.tsx` L26 | `useLocale` импортировался но не использовался после фикса #3 | Убран неиспользуемый импорт |
| 5 | `groups/page.tsx` L613 | `t('moveSuccess', { name: '' }).replace(' «»', '')` — хрупкий хак привязан к русскому форматированию | Добавлены ключи `groups.moveConfirm` + `groups.addConfirm` |

---

## Отложено (backlog)

- Unit tests для `moveAthleteToGroup`, `joinByInviteCode`, `/join` page rendering, `RegisterForm` invite — требуют MSW или PocketBase mock setup (не было в скоупе трека)

---

## Состояние трека: ЗАВЕРШЁН ✅

Следующему агенту: трек 4.22 закрыт, начинай с `/switch-agent` для получения текущего статуса.
