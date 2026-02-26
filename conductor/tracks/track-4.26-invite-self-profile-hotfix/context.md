# Context — Track 4.26: Invite Self-Profile Hotfix

## Что делаем

Точечный hotfix для кейса: атлет после регистрации/инвайта попадает на Dashboard с `Athlete profile not found`, хотя join-flow уже прошёл.

## Почему

Проблема связана с несинхронностью слоёв:
- правила доступа `athletes` в runtime могут расходиться с кодовой схемой;
- invite-flow должен корректно переиспользовать существующий self-athlete профиль и связывать его с coach.

## Scope

- PocketBase API rules для коллекции `athletes`.
- Логика `joinByInviteCode` в `groups.ts`.
- Синхронизация инфраструктурного скрипта `scripts/setup-collections.ts`.
- Документация Conductor и changelog.

## Out of Scope

- Полный рефактор auth/onboarding.
- Изменения UI дизайна dashboard.
- Новые продуктовые сценарии тренер/атлет.

## Критерий успеха

1. `athletes` rules: coach-or-self для list/view/create/update, coach-only для delete.
2. Invite-flow не теряет self-profile при присоединении к группе.
3. Локальная схема (`setup-collections.ts`) не откатывает фикс при повторном применении.
4. Проект проходит обязательную верификацию (`type-check`, `build`, `lint`, `test`).
