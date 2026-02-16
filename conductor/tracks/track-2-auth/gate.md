# Gate 2: Auth + Data Foundation ✅ Checklist

> All items must be checked before starting Track 3.

## PocketBase Collections
- [ ] All 21 collections created
- [ ] 9 indexes on FK columns configured
- [ ] UNIQUE constraints on 5 collections
- [ ] `sync_id` field on 3 sync-heavy collections
- [ ] `deleted_at` on all collections with soft-delete

## API Rules
- [ ] List/Create/Update/Delete rules for all 21 collections
- [ ] Anonymous request → 403 (tested)
- [ ] Coach can only see own athletes (tested)
- [ ] Athlete can only see own data (tested)

## Security
- [ ] Security headers via `pb_hooks/` (HSTS, nosniff, X-Frame-Options)
- [ ] CORS: only own domain + localhost
- [ ] Rate limiting: login 5/15min

## Auth
- [ ] Email registration + login works
- [ ] Google OAuth2 registration + login works
- [ ] Email verification sent
- [ ] Password reset works
- [ ] SMTP configured

## Offline + Sync
- [ ] IndexedDB schema (Dexie.js) mirrors PocketBase
- [ ] Offline CRUD works
- [ ] Smart Sync: offline → online verified
- [ ] Conflict resolution works (last-write-wins with timestamps)

## Validation
- [ ] Zod schemas for all collections
- [ ] Invalid data rejected client-side

## Data
- [ ] 68 exercises migrated from data.js
- [ ] All exercises have: unit_type, phase_suitability, cns_cost, training_category
- [ ] Error telemetry reporter → error_logs collection
