# Gate 4.26 — Invite Self-Profile Hotfix

> Цель: устранить рассинхрон invite-flow и athlete-profile lookup без расширения product-scope.

## Phase 1: Runtime + Code Sync

- [x] Проверить runtime правила коллекции `athletes` через PocketBase admin/MCP.
- [x] Применить/подтвердить rules `coach_id || user_id` для `list/view/create/update`.
- [x] Оставить `deleteRule` coach-only.
- [x] Обновить `joinByInviteCode` в `src/lib/pocketbase/services/groups.ts`:
  - [x] сначала искать профиль `user_id + coach_id`;
  - [x] затем fallback на `user_id` (self-profile);
  - [x] при необходимости обновлять `coach_id` существующего self-profile;
  - [x] создавать новую athlete-запись только если профиля нет.
- [x] Синхронизировать `scripts/setup-collections.ts` с runtime rules для `athletes`.
- [x] Добавить `user_id` relation в описание `athletes` в setup script.
- [x] Синхронизировать индексы `athletes` в setup script (`idx_athletes_user`).

## Phase 2: Verification

- [x] `pnpm type-check` — успех.
- [x] `pnpm build` — успех.
- [x] `pnpm lint` — успех.
- [x] `pnpm test` — успех.

## Phase 3: Conductor Completion

- [x] Обновить `conductor/tracks.md` (добавить Track 4.26 как ✅ Done).
- [x] Обновить `walkthrough.md` (append-only).
- [x] Обновить `CHANGELOG.md`.
