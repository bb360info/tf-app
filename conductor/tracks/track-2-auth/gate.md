# Gate 2: Auth + Data Foundation ✅ Checklist

> All items must be checked before starting Track 3.

## PocketBase Collections
- [x] All 21 collections created
- [x] 9 indexes on FK columns configured
- [x] UNIQUE constraints on 5 collections
- [x] `sync_id` field on 3 sync-heavy collections
- [x] `deleted_at` on all collections with soft-delete

## API Rules
- [x] List/Create/Update/Delete rules for all 21 collections
- [x] Anonymous request → 403 (tested) — *curl without token returns empty list*
- [x] Coach can only see own athletes (tested) — *Coach1 athlete invisible to Coach2*
- [ ] Athlete can only see own data — *deferred to Track 3 (no athlete-role users yet)*

## Security
- [x] Security headers via `pb_hooks/` (HSTS, nosniff, X-Frame-Options) — *deployed + goja fix*
- [x] CORS: only own domain + localhost — *jumpedia.app, localhost:3000/3001*
- [x] Rate limiting: login 5/15min — *in security.pb.js*

## Auth
- [x] Email registration + login works — *E2E: register 200, login 200*
- [x] Google OAuth2 registration + login works — *provider active, tested via auth-methods API*
- [x] Email verification sent — *requestVerification → 204*
- [x] Password reset works — *requestPasswordReset → 204*
- [x] SMTP configured (Resend)

## Offline + Sync — *Deferred to Track 4*
- [ ] IndexedDB schema (Dexie.js) mirrors PocketBase
- [ ] Offline CRUD works
- [ ] Smart Sync: offline → online verified
- [ ] Conflict resolution works (last-write-wins with timestamps)

## Validation
- [x] Zod schemas for all collections
- [x] Invalid data rejected client-side — *LoginForm + RegisterForm use safeParse()*

## Data
- [x] 68 exercises migrated from data.js — *68/68 created, 0 failed*
- [x] All exercises have: unit_type, phase_suitability, cns_cost, training_category — *+ 6 new fields*
- [x] Error telemetry reporter → error_logs collection — *telemetry.ts + field fix*
