# Workflow State Template

> Track-local artifact for token-aware workflow runs.
> Copy to: `conductor/tracks/track-N-<slug>/workflow_state.md`

## meta

- updated_at: `YYYY-MM-DDTHH:mm:ssZ`
- updated_by: `[MODEL_CODE]`

## last_loaded_skills

- `skill-id-1`
- `skill-id-2`

## last_read_docs_versions

- project_skills_json: `sha256:...`
- gate_md: `sha256:...`
- context_md: `sha256:...`
- changelog_tail: `tail-30@YYYY-MM-DD`
- design_system_md: `sha256:...`
- tokens_css: `sha256:...`
- globals_css: `sha256:...`

## last_switch_agent_context

- mode: `full|light`
- summary: `<short summary>`

## last_phase_context

- phase: `N`
- used_mode: `full|light`
- plan_file: `phase-N-plan.md`
- notes: `<optional>`

## last_ui_work

- mode: `full|light`
- run_at: `YYYY-MM-DDTHH:mm:ssZ`
- checklist_version: `v1`
