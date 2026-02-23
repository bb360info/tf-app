# Architecture Review Report: Track 4.19 — Coach-Athlete & Notifications

**Date:** 22 February 2026
**Reviewers:** [CS] Claude Sonnet 4.6 (initial review) + [CS] Claude Sonnet 4.6 (deep review)
**Skills:** `database-architect`, `architect-review`, `api-security-best-practices`, `error-handling-patterns`

---

## 1. Summary

Two rounds of architecture review were performed on Track 4.19:
1. **Initial review** — identified 4 risk areas, proposed action items
2. **Deep review** — confirmed findings, code-verified SQL injection, proposed corrected architecture

All findings have been incorporated into updated `implementation_plan.md` and `gate.md`.

---

## 2. Critical Issues Found & Fixed

### 2.1 Blocking `$http.send()` in PB Hooks → Non-Blocking Cron
**Severity:** 🔴 Critical (UX degradation)
**Problem:** `onAfterCreate('daily_checkins')` → synchronous `$http.send()` to CF Worker. User waits 1-3s. If Worker down → timeout up to 30s.
**Fix (ADR-6):** Hooks only write to `notifications` table (delivered=false). Separate Cron (60s) batches undelivered notifications → single `$http.send()` → mark delivered=true.
**Status:** ✅ Applied to `implementation_plan.md` and `gate.md`

### 2.2 `.workers.dev` Blocked in China → Custom Domain
**Severity:** 🔴 Critical (China users get zero push)
**Problem:** `PUSH_WORKER_URL=https://push.jumpedia.workers.dev` — GFW blocks `*.workers.dev`. Server-to-server PB→Worker call fails.
**Fix (ADR-7):** Custom Domain `push.jumpedia.app` in CF Workers Dashboard. Free. GFW doesn't block your own domain.
**Status:** ✅ Applied to `implementation_plan.md`, `context.md`, `gate.md`

### 2.3 SQL Injection in `notifications.ts`
**Severity:** 🔴 Critical (Security)
**Problem:** 4 locations with direct string interpolation:
```typescript
filter: `user_id = "${userId}" && read = false`
```
**Fix:** Replace with `pb.filter('user_id = {:userId} && read = false', { userId })`
**Status:** ✅ Listed as first task in Phase 1 gate

---

## 3. Medium Issues Found & Fixed

### 3.1 Batch Push (Rate Limit Avoidance)
**Problem:** Publishing plan for 20-athlete group → 20 separate HTTP calls → rate limit 10 req/s → 10 athletes miss push.
**Fix:** CF Worker accepts batch endpoint `/push-batch` with array of notifications. One Coach operation = one HTTP call.
**Status:** ✅ Applied to `implementation_plan.md`

### 3.2 SW Foreground Dedup
**Problem:** Plan mentions "dedup by notification ID" but no concrete pattern.
**Fix:** SW `push` event checks `clients.matchAll()` — if app visible (`visibilityState === 'visible'`), skip system push, send `postMessage` instead. SSE already delivered in-app.
**Status:** ✅ Applied to `implementation_plan.md` and `gate.md`

### 3.3 Missing Indexes for Cron Operations
**Problem:** Cron queries `notification_preferences` by timezone (full table scan on 50+ users) and `notifications` by `expires_at` (cleanup).
**Fix:** 3 new indexes added:
- `idx_notif_prefs_tz_enabled ON notification_preferences(timezone, push_enabled)`
- `idx_notifications_expires ON notifications(expires_at)`
- `idx_notifications_delivered ON notifications(delivered, created)`
**Status:** ✅ Applied to `gate.md` Phase 1

### 3.4 markAllRead N+1 → Batch Endpoint
**Problem:** Current code: `listUnread(userId)` → `Promise.all(map(markRead))` = N+1 HTTP calls.
**Fix:** Custom endpoint `pb_hooks/mark-all-read.pb.js` with batch SQL via `dbx.Params`. Single request.
**Status:** ✅ Already in Phase 3 gate; priority raised.

---

## 4. Observability Improvements

- All non-200/non-410 CF Worker responses → logged to `error_logs` collection
- NotificationBell: `catch {}` → `reportError()` (error tracking)
- CF Worker health check: `curl https://push.jumpedia.app/health` → 200

---

## 5. What Was Confirmed as Correct

| Aspect | Assessment |
|---|---|
| ADR-1: JS pb_hooks (not Go rebuild) | ✅ Correct — don't modify PB binary |
| ADR-2: day_notes as JSON | ✅ Correct for MVP |
| ADR-3: Client-side compliance | ✅ Sufficient for 50 users |
| ADR-5: IANA timezone | ✅ DST-aware, only correct choice |
| TDD approach Phase 2 | ✅ compliance.test.ts before compliance.ts |
| SSE via PB Realtime | ✅ Zero infrastructure, instant in-app |
| BG Sync China fallback | ✅ Pragmatic, 15min is acceptable |
| Skills-per-phase mapping | ✅ Clear, minimizes overload |

---

*All findings have been applied to the track artifacts. This document serves as the audit trail.*
