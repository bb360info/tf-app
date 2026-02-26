# Gate 4.23 — Notification System & App Badge

> **Цель:** Unified notification service с preference check + message_key i18n pattern, реальные триггеры для 3 типов уведомлений, app icon badge (iOS 16.4+, Desktop PWA), SQL injection fix в planAssignments.ts и plans.ts.

## Phase 0: Foundation — Unified Service + Security
**Скиллы:** `concise-planning`, `lint-and-validate`, `typescript-expert`, `architect-review`

- [x] SQL injection fix: `planAssignments.ts` — 4 raw filter interpolations → `pb.filter()` (L20, L36, L67, L99)
- [x] SQL injection fix: `plans.ts` — 3 raw filter interpolations → `pb.filter()` (L37, L90, L106)
- [x] Cleanup: `plans.ts:L42` — удалить stale `console.log('[listPlansForPhase]...')`
- [x] PB schema: `notifications` — +`message_key` (text, max 100), +`message_params` (json)
- [x] `types.ts`: +`message_key?: string`, +`message_params?: Record<string, string | number>` в `NotificationsRecord`
- [x] `notifications.ts`: новая функция `sendNotification({ userId, type, messageKey, messageParams?, link?, priority? })` с проверкой `disabled_types`
- [x] `notifications.ts`: рефакторить `sendCoachNote()` → wrapper вокруг `sendNotification()`, resolve `athlete.user_id`, **strict mode — throw при ошибке resolve** (без fallback `userId = athleteId`)
- [x] `notifications.ts`: `sendCoachNote()` — сохранить кастомный текст тренера через `messageParams: { text: message }` (НЕ терять UX)
- [x] `dashboard/page.tsx:handleNotify` — передавать `messageKey: 'coachNoteSent'`, сохранять текст
- [x] Проверить `notifications` collection API rules (createRule)

## Phase 1: Notification Triggers
**Скиллы:** `concise-planning`, `lint-and-validate`, `react-best-practices`, `typescript-expert`

- [x] `GroupMember` interface в `groups.ts` — добавить `user_id?: string` в expand typing
- [x] `plans.ts:publishPlan()` — после publish → batch notify атлетов через `listActivePlanAssignments` + `listGroupMembers` + `batchCheckPreferences`
- [x] `notifications.ts`: `batchCheckPreferences(userIds, type)` → `Set<string>` разрешённых userId (1 HTTP вместо N)
- [x] `plans.ts:publishPlan()` — использовать `batchCheckPreferences()` ПЕРЕД отправкой notifications
- [x] `AchievementsGrid.tsx` — после `newlyEarned.length > 0` → `sendNotification({ type: 'achievement', messageKey: 'achievementEarned' })`
- [x] `groups.ts:joinByInviteCode()` — заменить TODO → notify атлету (system/joinedGroup) + тренеру (invite_accepted/inviteAccepted)
- [x] `groups.ts:moveAthleteToGroup()` — заменить TODO → notify атлету (system/movedToGroup)
- [x] i18n ×3 (RU/EN/CN): `coachNoteDefault`, `coachNoteSent`, `planPublished`, `achievementEarned`, `inviteAccepted`, `movedToGroup`

## Phase 2: NotificationBell i18n Render
**Скиллы:** `concise-planning`, `lint-and-validate`, `i18n-localization`, `react-best-practices`

- [x] `NotificationBell.tsx` — рендерить `message_key` + `message_params` через `useTranslations()` с fallback на `message`, try/catch + console.warn
- [x] `NotificationBell.tsx` — убраны props `labels` → компонент самодостаточен через `useTranslations('notifications')`
- [x] `NotificationBell.tsx` — click на notification → `markRead` + `router.push(n.link)` если есть link
- [x] `useNotifications.ts:loadInitial` — filter expired: `n.expires_at && new Date(n.expires_at) < now → skip`
- [x] `/notifications` page (`NotificationsClientPage.tsx`) — i18n resolver + navigation link при click

## Phase 3: App Icon Badge
**Скиллы:** `concise-planning`, `lint-and-validate`, `mobile-developer`, `verification-before-completion`

- [x] `sw.ts` — после `showNotification()` добавить `if ('setAppBadge' in self.navigator) self.navigator.setAppBadge(1)`
- [x] `sw.ts` — при `notificationclick` → `clearAppBadge()` с feature detection
- [x] `useNotifications.ts` — `useEffect` на `unreadCount` → `setAppBadge(count)` / `clearAppBadge()`
- [x] Feature detection: guard все badge API вызовы через `if ('setAppBadge' in navigator)`

## Phase 4: Badge Icon Asset
**Скиллы:** `concise-planning`, `jumpedia-design-system`

- [x] Создан `/public/icons/badge-72.png` — монохромный 72×72 значок (white J on transparent), 3630 bytes
- [x] Verify: `sw.ts:84` badge path `/icons/badge-72.png` соответствует реальному файлу

## Phase 5: Tests + Build Verification
**Скиллы:** `lint-and-validate`, `verification-before-completion`, `unit-testing-test-generate`

- [x] Unit test: `sendNotification()` — muted type → null
- [x] Unit test: `sendNotification()` — создание записи с message_key + message_params
- [x] Unit test: `sendNotification()` — missing userId → throw
- [x] Unit test: `sendNotification()` — type NOT in disabled → creates
- [x] Unit test: `sendNotification()` — default priority = normal
- [x] Unit test: `sendCoachNote()` — verify custom text preserved in messageParams.text
- [x] Unit test: `sendCoachNote()` — athlete no user_id → null
- [x] Unit test: `sendCoachNote()` — empty message → empty messageParams
- [x] `pnpm type-check` → Exit 0
- [x] `pnpm build` → Exit 0
- [x] `pnpm test` → 94/94 passed (8 новых + 86 существующих)
- [x] Обновить CHANGELOG.md
