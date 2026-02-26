# Phase 7 — QA + Deploy
> Дата: 2026-02-25 · Агент: [M37] · Скиллы: lint-and-validate, verification-before-completion, deployment-engineer

## Задача 1: Проверить все i18n
**Что делать:**
- Убедиться, что `src/lib/i18n/messages/` (RU/EN/CN) не содержат missing keys.
**Verify:** `pnpm type-check` (покрывает типизацию next-intl).

## Задача 2: Запустить /qa workflow (Smoke)
**Что делать:**
- Выполнить HTTP-чек локального билда: `npx serve out -p 3000`
- Запустить browser_subagent для smoke-теста `/ru/dashboard/athlete/<id>` (AthleteDetailClient был разделен, нужно убедиться, что ленивые табы рендерятся без крашей).
**Verify:** Subagent возвращает успешный ответ и скриншот.

## Задача 3: Type-check, lint, build
**Что делать:**
- Финальный прогон перед деплоем.
**Verify:** `pnpm type-check`, `pnpm lint`, `pnpm build` (`exit 0`).

## Задача 4: Deploy на VPS
**Что делать:**
- Выполнить `bash scripts/deploy.sh`
**Verify:** `curl -s -o /dev/null -w "%{http_code}" https://jumpedia.app/en/dashboard` возвращает 200.

## Задача 5: Закрыть связанные треки
**Что делать:**
- Отредактировать `conductor/tracks/track-4.242-athlete-training-ux/gate.md` → пометить Done.
- Отредактировать `conductor/tracks/track-4.244-historical-pr-onboarding/gate.md` → пометить Done (если еще не закрыт).
- Вызвать `/done` для текущего трека 4.262.
