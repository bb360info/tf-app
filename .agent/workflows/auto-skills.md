---
description: Automatically select and apply relevant skills from the installed skill library for every task
---

# Auto-Skill Selection Workflow

Before starting any task, the agent MUST:

1. **Read compact trigger index first** at `conductor/trigger_groups.min.json` (lightweight map: triggers -> groups -> skills).

2. **Read the full preset only when needed** at `.agent/skills/project_skills.json`:
   - mandatory for `_blocklist` validation
   - mandatory if matched group has `mandatory_reads`
   - mandatory for fallback disambiguation when compact index is insufficient

3. **Match the task to a group** using these rules:
   - Read the task description and identify keywords (both English and Russian triggers are defined in `project_skills.json`)
   - Match against compact index first (`conductor/trigger_groups.min.json`)
   - If ambiguous/no match -> verify with `project_skills.json`
   - Always include the `always` group (`concise-planning`, `lint-and-validate`) for any code changes
   - **UI/CSS задачи:** дополнительно запусти `/ui-work` — он загрузит `jumpedia-design-system` и другие UI-скиллы
   - **Перед сдачей кода:** загрузи `verification-before-completion` (не нужен при старте планирования)
   - Select **1-3 groups maximum** (2-4 skills total by default; up to 5 for high-risk)
   - ⚠️ Check `_blocklist` — NEVER load blocked skills regardless of keyword match

4. **If no match in compact index/full preset** → read the tiered catalog at `.agent/skills/skills_catalog.md` (~100 lines, grouped by domain).

5. **If still no match** → search the full index at `.agent/skills/data/skills_index.json` (559 skills).

6. **Load the matched SKILL.md** file(s) by reading `.agent/skills/skills/<skill-id>/SKILL.md` (use the `path` field from `skills_index.json` if loading from the full index).

7. **Follow mandatory_reads** — if the matched group has a `mandatory_reads` field, read those files BEFORE loading skills.

8. **Follow the skill instructions** as part of your task execution.

9. **Announce which skills you are using** at the start of your response so the user knows.

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
skills_catalog.md (grouped markdown, ~40 skills)
       ↓ not found
data/skills_index.json (559 skills, full search)
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
