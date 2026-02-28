---
description: Automatically select and apply relevant skills from the installed skill library for every task
---

# Auto-Skill Selection Workflow

Before starting any task, the agent MUST:

1. **Read the full preset** at `.agent/skills/project_skills.json` to identify available skills and the `_blocklist`.

2. **Match the task to a group** using these rules:
   - Read the task description and identify keywords (both English and Russian triggers are defined in `project_skills.json`)
   - Match against `project_skills.json` to find the relevant skill group(s)
   - Always include the `always` group (`concise-planning`, `lint-and-validate`) for any code changes
   - **UI/CSS задачи:** обязательно загрузи файлы `docs/DESIGN_SYSTEM.md`, `src/styles/tokens.css` и скилл `jumpedia-design-system` напрямую
   - **Перед сдачей кода:** загрузи `verification-before-completion` (не нужен при старте планирования)
   - Select **1-3 groups maximum** (2-4 skills total by default; up to 5 for high-risk)
   - ⚠️ Check `_blocklist` — NEVER load blocked skills regardless of keyword match

3. **If no match in preset** → use the `find_by_name` tool (or similar) to search for relevant skills in the `.agent/skills/skills/` directory. Do not use complex nested catalogs to prevent context bloat.

4. **Follow mandatory_reads** — if the matched group has a `mandatory_reads` field, read those files BEFORE loading skills.

5. **Load the matched SKILL.md** file(s) by reading `.agent/skills/skills/<skill-id>/SKILL.md`.

6. **Follow the skill instructions** as part of your task execution.

7. **Announce which skills you are using** at the start of your response so the user knows.

## Skill Selection Rules

- Select **2-4 skills maximum** per task to avoid overload.
- Use **5 skills only** for high-risk tasks (security/auth/data migration/critical infra).
- **Always include** `concise-planning` for multi-step tasks.
- **Always include** `lint-and-validate` for any code changes.
- For multi-step creative work, include `brainstorming` or `behavioral-modes`.
- For debugging, include `systematic-debugging`.
- For security-related tasks, include `auth-implementation-patterns` or `api-security-best-practices`.
- For new features, include `brainstorming`.
- For refactoring, include `code-refactoring-refactor-clean`.

## Priority Order

```
project_skills.json (curated skills, with triggers + blocklist)
       ↓ not found
Search locally in `.agent/skills/skills/`
```

## Blocked Skills (NEVER Load)

Check `_blocklist` in `project_skills.json` FIRST. These skills MUST NEVER be loaded:

| Skill | Reason |
|-------|--------|
| `frontend-design` | Blocks Inter font — our primary typeface |
| `tailwind-design-system` | Wrong stack — we use Vanilla CSS + CSS Modules |
| `web-artifacts-builder` | Tailwind-based, conflicts with design system |

**If you match keywords that could lead to these skills → skip them. Use `jumpedia-design-system` instead.**

## Mandatory Reads

If the matched group has `mandatory_reads`, read those files BEFORE loading any skills:

- `frontend` group → read `docs/DESIGN_SYSTEM.md` + `src/styles/tokens.css`
- `ui_design` group → read `docs/DESIGN_SYSTEM.md` + `src/styles/tokens.css`

## Group Matching Quick Reference

| Task type | Groups to load |
|---|---|
| UI/component/CSS work | `always` + `frontend` + `ui_design` |
| New page/route | `always` + `frontend` + `typescript` |
| Database/schema | `always` + `architecture` + `typescript` |
| Auth/security | `always` + `auth_security` |
| PWA/offline | `always` + `pwa_offline` |
| Testing | `always` + `testing` |
| Deploy/CI | `always` + `deploy` |
| Planning/research | `planning` |
| Bug fixing | `always` + `debugging` |
| Performance | `always` + `performance` |
| i18n/translation | `always` + `i18n` |
| Video/MediaPipe | `always` + `video_media` + `frontend` |
| API design | `always` + `api` + `auth_security` |
| Refactoring | `always` + `refactoring` |
