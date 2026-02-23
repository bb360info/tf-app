# Merge Analysis: 4.17 + 4.18 → 4.19

> Reference document. Full analysis of the merge with 12 skills applied.
> Date: 2026-02-22, Agent: [CS] Claude Sonnet 4.6

## Skills Applied
`brainstorming`, `architecture` (+trade-off-analysis, +pattern-selection), `architect-review`, `database-architect`, `kaizen`, `plan-writing`, `mobile-developer`, `api-design-principles`, `api-security-best-practices`, `error-handling-patterns`, `test-driven-development`

## Gaps Found & Fixed

### Critical (3)
1. **SQL Injection** in `notifications.ts` — string interpolation → `pb.filter()`. Also discovered: 40+ similar issues project-wide (→ backlog)
2. **`getExerciseComparison()`** spec lost from 4.17 — added to Phase 2
3. **`compliance.test.ts`** missing from gate — added to Phase 2 with TDD order

### Medium (7)
4. iOS A2HS prompt — added to Phase 4
5. Zod schemas for new collections — added to Phase 1
6. API Rules for push_subscriptions — added to Phase 1
7. Multi-device push — added to Phase 3
8. SSE/BG Sync coordination — added to Phase 4 (dedup by ID)
9. NotificationType expansion (4→8) — added to Phase 1
10. INDEX on log_exercises(log_id) — added to Phase 1

### Skill-discovered (6)
11. CF Worker rate limiting — added to Phase 3 (api-security)
12. Stale push cleanup (410 Gone) — added to Phase 3 (mobile-developer)
13. SSE reconnect + backoff — added to Phase 4 (error-handling)
14. Error swallowing in NotificationBell — added to Phase 5 (error-handling)
15. TDD order enforcement — Phase 2 reordered (test-driven-development)
16. Project-wide pb.filter() migration — added to backlog (api-security)

## ADRs
1. JS pb_hooks + CF Worker (not Go rebuild) — don't modify PB binary
2. day_notes as JSON (not FK collection) — YAGNI
3. Compliance client-side (not PB view) — sufficient for 50 users
4. CF Worker shared secret auth — simple, cross-region
5. IANA timezone (not UTC offset) — DST-aware

## YAGNI Cuts (deferred)
- 17 notification types → 8 sufficient for MVP
- Notification grouping → Track 6
- Email/SMS → not needed
- Admin notification management → not needed
- Branded types for IDs → Track 6+ backlog
