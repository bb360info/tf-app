---
description: Automatically select and apply relevant skills from the installed skill library for every task
---

# Auto-Skill Selection Workflow

Before starting any task, the agent MUST:

1. **Read the project preset** at `.agent/skills/project_skills.json` — 32 curated skills grouped by task type with trigger keywords.

2. **Match the task to a group** using these rules:
   - Read the task description and identify keywords (both English and Russian triggers are defined in `project_skills.json`)
   - Match against the `triggers` arrays in each skill group
   - Always include the `always` group (`concise-planning`, `lint-and-validate`, `jumpedia-design-system`) for any code changes
   - Select **1-3 groups maximum** (2-5 skills total)
   - ⚠️ Check `_blocklist` — NEVER load blocked skills regardless of keyword match

3. **If no match in preset** → read the tiered catalog at `.agent/skills/skills_catalog.md` (~100 lines, grouped by domain).

4. **If still no match** → search the full index at `.agent/skills/data/skills_index.json` (559 skills).

5. **Load the matched SKILL.md** file(s) by reading `.agent/skills/skills/<skill-id>/SKILL.md` (use the `path` field from `skills_index.json` if loading from the full index).

6. **Follow mandatory_reads** — if the matched group has a `mandatory_reads` field, read those files BEFORE loading skills.

7. **Follow the skill instructions** as part of your task execution.

8. **Announce which skills you are using** at the start of your response so the user knows.

## Skill Selection Rules

- Select **2-5 skills maximum** per task to avoid overload.
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
