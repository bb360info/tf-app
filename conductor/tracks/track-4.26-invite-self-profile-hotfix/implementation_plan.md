# Implementation Plan — Track 4.26: Invite Self-Profile Hotfix

## Подход

Исправить проблему на двух слоях одновременно:
1. Runtime access rules (`athletes`) через PocketBase admin.
2. Защитная логика invite join в коде, чтобы корректно работать с self-profile.

## Изменения

### 1) PocketBase rules (`athletes`)

- `listRule/viewRule/createRule/updateRule`:
  `@request.auth.id != "" && (coach_id = @request.auth.id || user_id = @request.auth.id)`
- `deleteRule`:
  `@request.auth.id != "" && coach_id = @request.auth.id`

### 2) Invite flow (`groups.ts`)

- Добавить многошаговое разрешение athlete-профиля:
  - поиск по `user_id + coach_id`;
  - fallback на профиль по `user_id`;
  - при несовпадении coach — обновить `coach_id` существующего self-profile;
  - создание новой записи только при полном отсутствии профиля.

### 3) Schema script sync (`setup-collections.ts`)

- Ввести `coachOrSelfRules` и назначить их коллекции `athletes`.
- Добавить relation `user_id` в `athletes` schema.
- Добавить уникальный индекс `idx_athletes_user` в indexes `athletes`.

## Верификация

- `pnpm type-check`
- `pnpm build`
- `pnpm lint`
- `pnpm test`
