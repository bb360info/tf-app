# Энциклопедия Прыгуна v2 — AGENTS (Codex-Compatible)

Этот файл задаёт единый режим работы для агентов в репозитории (включая Codex), максимально близкий к процессу Gemini.

## 1) Язык и артефакты

- Общение с пользователем: **только русский**.
- `implementation_plan.md` и `walkthrough.md`: **только русский**.
- Техническая документация и комментарии в коде: **английский**.

## 2) Базовая архитектура (не отклоняться)

- Frontend: Next.js 15 App Router + TypeScript + static export (`output: 'export'`)
- Backend: PocketBase
- Styling: Vanilla CSS + CSS Modules (Tailwind запрещён)
- i18n: `next-intl` (ru/en/cn)
- Validation: Zod
- PWA: Serwist

## 3) Iron Law: Skill Loading

Перед ЛЮБОЙ задачей (код, планирование, дебаг, ревью, деплой):

1. Прочитать `.agent/skills/project_skills.json`.
2. Выбрать релевантные группы по триггерам.
3. Загрузить `SKILL.md` для выбранных скиллов из `.agent/skills/skills/<id>/SKILL.md`.
4. Проверить `_blocklist` и НЕ загружать заблокированные скиллы.
5. Лимит: 2-7 скиллов на задачу.

Формат начала рабочего ответа:

`🛠 Скиллы: [skill-1, skill-2, ...]`

Если скиллы не загружены, работу не начинать.

## 4) Workflow Mapping (обязательно)

Слеш-команды трактуются как запуск соответствующего workflow-файла:

- `/switch-agent` -> `.agent/workflows/switch-agent.md`
- `/phase` -> `.agent/workflows/phase.md`
- `/auto-skills` -> `.agent/workflows/auto-skills.md`
- `/ui-work` -> `.agent/workflows/ui-work.md`
- `/qa` -> `.agent/workflows/qa.md`
- `/review` -> `.agent/workflows/review.md`
- `/done` -> `.agent/workflows/done.md`
- `/debt` -> `.agent/workflows/debt.md`
- `/deploy` -> `.agent/workflows/deploy.md`
- `/dev` -> `.agent/workflows/dev.md`

Если агент не умеет "вызов слеш-команды" нативно, он обязан:

1. Открыть соответствующий `.md` вручную.
2. Выполнить шаги по порядку как чеклист.
3. Отчитаться по тому же формату, что в workflow.

## 5) Conductor Discipline

- Source of truth по статусу: `conductor/tracks/track-N-<slug>/gate.md`.
- Не начинать Track N+1, пока Gate N не закрыт.
- Активный/следующий трек смотреть в `conductor/tracks.md`.
- Для активного трека обязательны: `gate.md`, `context.md`, `implementation_plan.md`, `walkthrough.md`.
- Новые идеи во время трека -> `conductor/backlog.md` (не внедрять mid-track).

## 6) UI Rules (обязательно перед UI-задачами)

Перед любыми UI/CSS/component задачами обязательно пройти `.agent/workflows/ui-work.md`.

Ключевые требования:

- Источник истины: `docs/DESIGN_SYSTEM.md` и `src/styles/tokens.css`.
- Только токены (`var(--color-*)`, `var(--space-*)`, и т.д.).
- Glassmorphism через проектные переменные.
- Иконки: Lucide React.
- Mobile-first + touch targets >= 44x44.
- Самохост шрифтов в `/public/fonts`.
- Никогда не загружать скиллы:
  - `frontend-design`
  - `tailwind-design-system`
  - `web-artifacts-builder`

## 7) Verification Before Completion

Запрещено писать "готово", "исправлено", "работает", пока не выполнена верификация.

Минимум для JS/TS задач:

- `pnpm type-check`
- `pnpm build`
- `pnpm lint`
- `pnpm test` (если релевантно фазе/gate)

В отчёте указывать статусы команд (успех/ошибка и ключевые детали).

Перед финальной сдачей загрузить:

- `.agent/skills/skills/verification-before-completion/SKILL.md`

## 8) Track Completion (/done)

При завершении фазы обязательно:

1. Пройти `.agent/workflows/done.md`.
2. Обновить `gate.md` (только фактически выполненные пункты в `[x]`).
3. Дополнить `walkthrough.md` (append-only).
4. Обновить `CHANGELOG.md`.
5. Удалить `phase-N-plan.md`, если фаза закрыта.

## 9) Security + Secrets

- Секреты не хардкодить.
- Использовать `.env.local` и переменные окружения.
- Не публиковать токены/пароли в репозитории и отчётах.

## 10) Команды проекта

```bash
pnpm dev
pnpm build
pnpm test
pnpm type-check
pnpm lint
```
