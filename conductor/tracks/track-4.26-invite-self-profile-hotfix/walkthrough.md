# Walkthrough — Track 4.26: Invite Self-Profile Hotfix

## Что сделано

- Проверены runtime rules коллекции `athletes` через MCP PocketBase.
- Применён hotfix rules (coach-or-self для list/view/create/update; coach-only delete).
- Усилен `joinByInviteCode` в `groups.ts`:
  - переиспользование existing self-profile;
  - обновление `coach_id` вместо лишнего создания профиля;
  - создание нового athlete только при отсутствии self-profile.
- Синхронизирован `scripts/setup-collections.ts`:
  - добавлены `coachOrSelfRules`;
  - добавлен relation `user_id` в `athletes`;
  - добавлен уникальный индекс `idx_athletes_user`.

## Файлы

- `src/lib/pocketbase/services/groups.ts`
- `scripts/setup-collections.ts`
- `conductor/tracks/track-4.26-invite-self-profile-hotfix/*`
- `conductor/tracks.md`
- `CHANGELOG.md`

## Результат

Фикс закрывает рассинхрон между invite-flow и athlete-profile lookup и предотвращает откат при повторном применении schema setup script.

## Верификация

- `pnpm type-check` → ✅ Exit 0
- `pnpm build` → ✅ Exit 0
- `pnpm lint` → ✅ Exit 0 (14 warnings, 0 errors; вне scope hotfix)
- `pnpm test` → ✅ 94 passed, 0 failed

## Smoke Audit (MCP, production read-only)

- Athlete users (`role=athlete`): `4`
- Active athlete profiles: `5` (из них `3` с `user_id`)
- Group members: `3`
- Group members without `user_id` link on athlete profile: `0`
- Group members with empty `coach_id` on athlete profile: `0`
- Athlete users without athlete profile: `1` (не входит в `group_members`)

Вывод: после hotfix не обнаружено состояния "участник группы без self-profile link", которое и приводило к ложному `Athlete profile not found` при успешном join.
