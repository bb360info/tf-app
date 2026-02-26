# Gate 4.22 — Invite Links & Group Management

> **Цель:** Инвайт-ссылки для вступления в группу (без ручного ввода кода) + перемещение атлетов между группами тренера + QR-код бонус.
> 
> **Review v3 (2026-02-23, CS deep brainstorm):** Интегрированы все находки из ревью v2 + brainstorm: self-athlete fix, deleted_at фильтр, alreadyMember дифференциация, sessionStorage fallback, OG-теги, invite expiry check, coach_id validation, QR filename, TODO для 4.23.

## Phase 0: Pre-Track Fixes + Pending Invite Utility ✅
**Скиллы:** `concise-planning`, `lint-and-validate`, `verification-before-completion`

- [x] Fix `joinByInviteCode` — добавить `first_name`/`last_name` при создании athlete record
- [x] Fix `joinByInviteCode` — добавить `deleted_at = ""` в фильтр поиска группы (soft-deleted группа не должна принимать инвайты)
- [x] Fix `joinByInviteCode` — дифференцировать `alreadyMember` от нового join (re-throw как `invite.alreadyMember`)
- [x] Fix `OnboardingWizard.handleFinish` — если `getSelfAthleteProfile()` → null и роль athlete → автосоздать athlete record (без coach_id, self-athlete) перед specialization save
- [x] Создать `src/lib/utils/pendingInvite.ts` — `savePendingInvite`, `getPendingInvite`, `clearPendingInvite`
- [x] Добавить `sessionStorage` fallback в `savePendingInvite`/`getPendingInvite` (Safari Private Mode)
- [x] Добавить `consumePendingInvite()` (get-then-clear паттерн)
- [x] Добавить `joinWithPendingInvite()` — consumePendingInvite + joinByInviteCode + сохранение `sessionStorage.joinedGroup`
- [x] Auto-cleanup stale invites >24h

## Phase 1: /join Page ✅
**Скиллы:** `concise-planning`, `nextjs-app-router-patterns`, `nextjs-best-practices`, `auth-implementation-patterns`, `jumpedia-design-system`

- [x] Создать `/join` page (`src/app/[locale]/(public)/join/page.tsx`) — client-side route
- [x] **Обязательно:** обернуть в `<Suspense>` для `useSearchParams()` (Static Export)
- [x] Логика: извлечь `?code=` из URL → определить статус auth
- [x] Coach detection **до** join attempt — если `user.role === 'coach'` → показать info card
- [x] Если залогинен (athlete) → сразу `joinByInviteCode(code)` → показать результат
- [x] Обработка `alreadyMember` — показать «Вы уже в этой группе» (отличать от success)
- [x] Если НЕ залогинен → `savePendingInvite(code)` → показать выбор: Register (primary) + Login (secondary)
- [x] Success page: добавить expectations hint (заполнить профиль, тренер назначит план, чек-ин)
- [x] Обработка ошибок: `join.invalidLink`, `join.codeExpired`, `join.coachCannotJoin`, `join.alreadyMember`
- [x] Generic OG meta tags для link preview в мессенджерах (без конкретного group name — static export limitation)
- [x] i18n ×3 (RU/EN/CN): join page keys (~15 ключей)

## Phase 2: Register + Login + Onboarding Integration ✅
**Скиллы:** `concise-planning`, `react-best-practices`, `auth-implementation-patterns`, `lint-and-validate`

- [x] `RegisterForm.tsx` — при pending invite: role=athlete автоматически, скрыть role selector, показать banner
- [x] `LoginForm.tsx` — `handleSubmit`: `joinWithPendingInvite()` после логина → toast
- [x] `LoginForm.tsx` — `handleGoogleLogin`: тот же `joinWithPendingInvite()` после OAuth
- [x] `OnboardingWizard.tsx` — `handleFinish()`: `joinWithPendingInvite()` **ПЕРЕД** specialization save
- [x] `OnboardingWizard.tsx` — проверить `sessionStorage.joinedGroup` для StepDone feedback (если код потреблён LoginForm'ом)
- [x] `OnboardingWizard.tsx` — redirect на `/dashboard` (не `/training`) если joined group
- [x] `StepDone` — показать «Вы добавлены в группу X» если joined
- [x] **НЕ трогать** `AuthProvider.tsx` — убран из плана (race condition risk)
- [x] Тест: pendingInvite utils (save, get, clear, stale cleanup, consumePendingInvite, sessionStorage fallback)

## Phase 3: Coach Share UI ✅
**Скиллы:** `concise-planning`, `jumpedia-design-system`, `react-best-practices`, `cc-skill-frontend-patterns`

- [x] `settings/groups/page.tsx` — кнопка «Share Link» (Share2 icon) рядом с Copy code
- [x] `handleShareLink()` — Web Share API (мобильные) → fallback clipboard + toast
- [x] URL формат: `${origin}/${locale}/join?code=${code}` (locale отправителя — LocaleSwitcher доступен получателю)
- [x] Auto-check invite expiry перед share: если < 24h → показать warning «Код истекает, сгенерировать новый?»
- [x] В share message добавить «Ссылка действует 7 дней»
- [x] Hint в manual code entry: «Или попросите тренера ссылку-приглашение»
- [x] i18n ×3: shareLink, linkCopied, inviteTitle, inviteText, inviteHint, linkExpiry, linkExpiringSoon

## Phase 4: Move Athletes Between Groups ✅
**Скиллы:** `concise-planning`, `jumpedia-design-system`, `react-best-practices`, `code-refactoring-refactor-clean`

- [x] `groups.ts` — `moveAthleteToGroup()` сервис (**create-first, delete-second** стратегия!)
- [x] `groups.ts` — guard: проверка что обе группы принадлежат текущему тренеру (`coach_id`)
- [x] `groups.ts` — `hasActiveGroupPlan(groupId)` helper
- [x] `settings/groups/page.tsx` — 2 отдельных действия: «Переместить» (🔄) и «Добавить в группу» (➕)
- [x] При move: проверять планы **ОБЕИХ** групп (from и to) → показать обе в ConfirmDialog
- [x] Warning dialog при наличии активного группового плана → `ConfirmDialog`
- [x] TODO comment: `// TODO(Track 4.23): Notify athlete when moved between groups`
- [x] i18n ×3: moveTo, addTo, moveWarning, moveWarningBoth, moveWarningGain, moveSuccess, addSuccess

## Phase 5: QR Code ✅
**Скиллы:** `concise-planning`, `jumpedia-design-system`, `react-best-practices`

- [x] Install `qrcode` package (npm, MIT, client-side)
- [x] QR button (QrCode icon из Lucide) рядом с Share Link
- [x] Modal с QR image (toDataURL, **dark mode aware** colors) + group name + code text + «Download PNG»
- [x] Download filename: `jumpedia-{group-name}-invite.png` (human-readable)
- [x] i18n ×3: showQR, downloadQR

## Phase 6: Tests + Build Verification ✅
**Скиллы:** `lint-and-validate`, `verification-before-completion`

- [x] Unit tests: `pendingInvite.ts` utils (save/get/clear/stale/consumePendingInvite/sessionStorage fallback) — 14 тестов
- [ ] Unit tests: `moveAthleteToGroup` (create-first order, coach_id guard, keepInOriginal flag) — отложено: требует PocketBase mock
- [ ] Unit tests: `joinByInviteCode` — alreadyMember, deleted group, first_name/last_name — отложено: требует PocketBase mock
- [ ] Unit tests: `/join` page rendering (no code, valid code, coach user, alreadyMember) — отложено: требует msw setup
- [ ] Unit tests: `RegisterForm` с pending invite (role lock, banner) — отложено
- [x] `pnpm type-check` → Exit 0 ✅
- [x] `pnpm build` → Exit 0 ✅
- [x] `pnpm test` → 86/86 passed ✅
- [x] Обновить CHANGELOG.md
- [x] TODO в joinByInviteCode для Track 4.23 notification trigger
