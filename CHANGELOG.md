# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/)

## [Unreleased]

### 2026-02-15 — Pre-Track 0: Audit & Design System

#### Added
- `docs/DESIGN_SYSTEM.md` — Athletic Minimal + Glassmorphism design system (tokens, glass, mobile-first, components, accessibility, China rules)
- `docs/SECURITY.md` — Auth flow, API rules matrix, security headers, CORS, rate limiting
- `docs/PERIODIZATION.md` — Season structure, phases, CNS system, readiness score, plan lifecycle
- `.gitignore` — Next.js + PocketBase + PWA ignores
- Git repository initialized (commit `9c7ce7b`)

#### Changed
- `CLAUDE.md` — Added Design System section, added `DESIGN_SYSTEM.md` to docs list
- `GEMINI.md` — Expanded from stub to full agent rules (mirrors CLAUDE.md)
- `PROJECT_CONTEXT.md` — Fixed Technology Decisions table (Supabase → PocketBase, Vercel → VPS, Tailwind → vanilla CSS)

#### Fixed
- `ui-ux-pro-max` CLI — f-string backslash error in `design_system.py:437` (Python 3.9 compat)
