# Architecture — Энциклопедия Прыгуна v2

> This file contains detailed technical architecture. Referenced by GEMINI.md for AI agents.

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 15 App Router | Static Export (`output: 'export'`) |
| Backend | PocketBase | Self-hosted on HK VPS |
| Storage | Cloudflare R2 | Via PocketBase S3 adapter |
| Offline | Dexie.js (IndexedDB) | Mirrors PocketBase schema *(planned — Track 6)* |
| PWA | Serwist | Service worker for offline + push |
| i18n | next-intl | RU, EN, CN с разбиением на доменные словари |
| Validation | Zod | Schema for every collection |
| Video | FFmpeg WASM | Client-side compression to 720p |
| Pose | MediaPipe | Pose Landmarker (client-side) |
| Charts | Recharts | Training analytics |
| Push | Cloudflare Worker | `push.jumpedia.app` — VAPID web-push delivery |

## Internationalization (i18n)

Используется `next-intl` (App Router).
Для удобства работы разработчиков словари (`messages/`) **физически разбиты** на доменные зоны (`shared.json`, `auth.json`, `training.json` и т.д.).
Однако, в `src/i18n/request.ts` они **логически объединяются** в один объект.

**Почему так сделано:**
В Server Components статического экспорта Next.js размер словаря не влияет на клиентский бандл (Next.js запекает нужные строки в HTML). Глубокое прокидывание namespaces сильно усложняет `NextIntlClientProvider`. Поэтому `request.ts` отдает монолит, но разработчики редактируют удобные мелкие файлы.

## Hosting

```
┌─────────────────────────────────────────┐
│        UK VPS (Development env)         │
│                                         │
│  ┌──────────┐    ┌──────────────────┐   │
│  │  nginx   │    │   PocketBase     │   │
│  │ (static) │    │  :8090 (API)     │   │
│  │  :443    ├───►│  SQLite DB       │   │
│  └──────────┘    │  S3 → R2         │   │
│                  └──────────────────┘   │
└─────────────────────────────────────────┘
         ▼                    ▼
   Static HTML/JS        Cloudflare R2
   (Next.js export)      (file storage)
```

### VPS Details

| Parameter | Value |
|-----------|-------|
| IP | `209.46.123.119` |
| SSH Key | `~/.ssh/encyclopedia_jumper_vps` |
| PocketBase binary | `/opt/pocketbase/pocketbase` (v0.36.3) |
| PocketBase data | `/opt/pocketbase/pb_data/` |
| PocketBase hooks | `/opt/pocketbase/pb_hooks/` |
| PocketBase env | `/opt/pocketbase/.env` |
| Frontend static | `/var/www/encyclopedia-jumper/` |
| Process manager | `systemd` → `pocketbase.service` |
| nginx | `:443` → static files + reverse proxy to `:8090` |

**PocketBase systemd service** (`/etc/systemd/system/pocketbase.service`):

- `WorkingDirectory=/opt/pocketbase`
- `EnvironmentFile=/opt/pocketbase/.env`
- `ExecStart=/opt/pocketbase/pocketbase serve --http=0.0.0.0:8090`
- Auto-restarts on failure (`RestartSec=5s`)
- Auto-reloads hooks when files in `pb_hooks/` change (no manual restart needed)

**PB JSVM rules** (learned the hard way):

- All `const`, `function`, `var` declarations at module top-level are NOT accessible inside `cronAdd()` / `onRecord*()` callbacks
- Inline everything inside the callback body
- Use `record.id` (property), not `record.getId()` (method doesn't exist)
- Use `$app.findRecordsByFilter(collection, filterString, sort, limit, offset, params)` — NOT `$app.pbql()`

### Push Delivery Pipeline

```
Client → PB notification (delivered=false)
         ↓ (every 60s cron)
pb_hooks/push-delivery.pb.js
         ↓ POST /push-batch
Cloudflare Worker (push.jumpedia.app)
         ↓ web-push VAPID
Browser/iOS Push → Service Worker (sw.ts) → OS notification
```

## PocketBase Schema (31 Collections)

### Core

| Collection | Key Fields | UNIQUE | Notes |
|-----------|-----------|--------|-------|
| `users` | email, name, first_name, last_name, role, language, units, avatar | email | PocketBase auth collection |
| `athletes` | coach_id FK→users, user_id FK→users, name, birth_date, gender, height_cm, primary_discipline, secondary_disciplines | user_id (WHERE != '') | SoftDeletable. user_id links to self for athlete-role users |
| `groups` | coach_id FK→users, name, timezone, invite_code, invite_expires | | SoftDeletable. invite_code: 6 chars, +7d TTL |
| `group_members` | group_id FK→groups, athlete_id FK→athletes | group_id+athlete_id | Junction table |
| `coach_preferences` | coach_id FK→users, default_plan_languages, auto_adaptation_enabled, onboarding_complete | coach_id | One per coach |

### Training

| Collection | Key Fields | UNIQUE | Notes |
|-----------|-----------|--------|-------|
| `seasons` | coach_id FK→users, athlete_id FK→athletes, group_id FK→groups, name, start/end_date | | SoftDeletable. Macrocycle |
| `training_phases` | season_id FK→seasons, phase_type, order, start/end_date, focus | | SoftDeletable. GPP→SPP→COMP→TRANSITION |
| `training_plans` | plan_type, phase_id FK→phases (optional), week_number (optional), start/end_date, status, notes, athlete_id FK→athletes, parent_plan_id FK→self, day_notes (JSON) | | SoftDeletable+Syncable. Discriminator plan_type (phase_based/standalone/override) |
| `plan_exercises` | plan_id FK→plans, exercise_id FK→exercises (nullable), order, day_of_week, session (0=AM/1=PM), block (warmup/main), sets, reps, intensity, notes, weight, duration, distance, rest_seconds, custom_text_ru/en/cn, source_template_id FK→templates | | SoftDeletable. exercise_id nullable for free-text warmup steps |
| `exercise_adjustments` | plan_exercise_id FK→plan_exercises, athlete_id FK→athletes, sets, reps, intensity, weight, duration, distance, rest_seconds, notes, skip | plan_exercise_id+athlete_id | SoftDeletable. Per-athlete overrides for a plan exercise |
| `plan_snapshots` | plan_id FK→plans, snapshot (JSON), version | | Version on publish |
| `plan_assignments` | plan_id FK→plans (cascade), athlete_id FK→athletes, group_id FK→groups, status | | Assignment of plan to athlete or group |

### Templates

| Collection | Key Fields | UNIQUE | Notes |
|-----------|-----------|--------|-------|
| `training_templates` | coach_id FK→users, name_ru/en/cn, type (warmup/training_day), total_minutes, is_system, description_ru/en/cn | | is_system=true for seed data (read-only) |
| `template_items` | template_id FK→templates (cascade), order, block (warmup/main), exercise_id FK (nullable), custom_text_ru/en/cn, duration_seconds, sets, reps, intensity, weight, distance, rest_seconds, notes | | Ordered items within template |

### Exercises & Logs

| Collection | Key Fields | UNIQUE | Notes |
|-----------|-----------|--------|-------|
| `exercises` | name_ru/en/cn, level, unit_type, cns_cost, training_category, training_quality, phase_suitability, equipment, muscles | | 68+ seeded exercises |
| `custom_exercises` | coach_id FK→users, base fields like exercises, visibility, approved_by, approved_at, rejection_reason | | SoftDeletable. Visibility: personal→pending→approved→rejected |
| `training_logs` | athlete_id FK→athletes, plan_id FK→plans, date, session (0=AM/1=PM), notes, readiness_score, log_mode | athlete_id+plan_id+date+session | Syncable. Modes: live/post_express/post_quick/post_detailed |
| `log_exercises` | log_id FK→logs, exercise_id FK→exercises, sets_data (JSON), rpe (1-10), skip_reason | | flexible SetData[] format |
| `daily_checkins` | athlete_id FK→athletes, date, sleep_hours, sleep_quality, pain_level, mood, notes | athlete_id+date | Syncable. Readiness input |
| `test_results` | athlete_id FK→athletes, test_type, value, date, notes | athlete_id+test_type+date | Performance tests |

### Personal Records

| Collection | Key Fields | UNIQUE | Notes |
|-----------|-----------|--------|-------|
| `personal_records` | athlete_id FK→athletes, discipline, season_type, result (meters), date, competition_name, source, is_current, notes, competition_id FK→competitions | | is_current flipped on new PR add |

### Content & Media

| Collection | Key Fields | UNIQUE | Notes |
|-----------|-----------|--------|-------|
| `competitions` | owner_type (season/athlete/group), season_id FK→seasons (optional), athlete_id FK→athletes, group_id FK→groups, name, date, priority, discipline, season_type, status, official_result, official_updated_by, location, notes | | SoftDeletable. Polymorphic ownership |
| `competition_participants` | competition_id FK→competitions, athlete_id FK→athletes, status, lane_or_order, bib_number, result_note | | SoftDeletable. Participants for group competitions |
| `competition_proposals` | competition_id FK→competitions, athlete_id FK→athletes, kind, payload, status, proposed_at, athlete_comment, review_comment, reviewed_fields, reviewed_by | | SoftDeletable. Athlete updates to official results |
| `competition_media` | competition_id FK→competitions, uploader_athlete_id FK→athletes, subject_athlete_id FK→athletes, file, kind, visibility, moderation_status | | SoftDeletable. User-generated media |
| `exercise_videos` | exercise_id FK→exercises, file, coach_id FK→users, description | | Video attachments |
| `achievements` | athlete_id FK→athletes, type (13 types), earned_at, title, description | | Gamification: streak/training/testing/compete |
| `notifications` | user_id FK→users, type (8 types), message, message_key, message_params, read, link, priority, expires_at, delivered | | Push/in-app. Cron delivers undelivered |
| `error_logs` | user_id, error, stack, device_info, url | | Client error telemetry |

### Push & Notification Preferences

| Collection | Key Fields | UNIQUE | Notes |
|-----------|-----------|--------|-------|
| `push_subscriptions` | user_id FK→users, endpoint, p256dh, auth_key, user_agent | | Web Push subscription data |
| `notification_preferences` | user_id FK→users, push_enabled, email_enabled, disabled_types, quiet_hours_start/end (HH:MM), timezone (IANA) | user_id | Per-user notification settings |

## Indexes

```sql
-- Core FK indexes
CREATE INDEX idx_athletes_coach ON athletes(coach_id);
CREATE UNIQUE INDEX idx_athletes_user ON athletes(user_id) WHERE user_id != '';

-- Training indexes
CREATE INDEX idx_training_phases_season ON training_phases(season_id);
CREATE INDEX idx_planex_plan_deleted ON plan_exercises(plan_id, deleted_at);
CREATE INDEX idx_planex_block ON plan_exercises(block);
CREATE UNIQUE INDEX idx_exercise_adjustments_uniq ON exercise_adjustments(plan_exercise_id, athlete_id);

-- Competitions & Proposals indexes
CREATE INDEX idx_comp_proposals_inbox ON competition_proposals(competition_id, status, proposed_at);
CREATE INDEX idx_comp_proposals_athlete ON competition_proposals(athlete_id, status, proposed_at);

-- Templates indexes
CREATE INDEX idx_templates_coach ON training_templates(coach_id);
CREATE INDEX idx_items_template ON template_items(template_id);

-- Logs & Checkins indexes  
CREATE INDEX idx_training_logs_athlete ON training_logs(athlete_id);
CREATE INDEX idx_training_logs_date ON training_logs(date);
CREATE INDEX idx_daily_checkins_athlete_date ON daily_checkins(athlete_id, date);
CREATE INDEX idx_log_exercises_log ON log_exercises(log_id);
CREATE INDEX idx_test_results_athlete ON test_results(athlete_id);

-- Notifications & Push indexes
CREATE INDEX idx_notifications_user ON notifications(user_id, read);
CREATE INDEX idx_notifications_expires ON notifications(expires_at);
CREATE INDEX idx_notifications_delivered ON notifications(delivered);
CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);
CREATE INDEX idx_notif_prefs_tz_enabled ON notification_preferences(timezone, push_enabled);

-- Plan Assignments indexes (3)
-- See plan_assignments collection definition in PocketBase admin
```

## Smart Sync Protocol

```
Client (IndexedDB)              Server (PocketBase)
     │                                │
     │  1. GET /api/collections/X     │
     │     ?filter=updated>'T'        │
     │────────────────────────────────►│
     │                                │
     │  2. Server records since T     │
     │◄────────────────────────────────│
     │                                │
     │  3. Merge into IndexedDB       │
     │     (server wins on conflict)  │
     │                                │
     │  4. POST local changes         │
     │     with sync_id (idempotent)  │
     │────────────────────────────────►│
     │                                │
     │  5. Server deduplicates        │
     │     by sync_id                 │
     │◄────────────────────────────────│
```

## API Rules Pattern

```
// Coach: see own data only
@request.auth.id = coach_id

// Athlete: see own data only  
@request.auth.id = athlete_id.user_id

// Coach sees athlete's data via relation chain:
athlete_id.coach_id = @request.auth.id

// Athlete sees own training data via relation chain:
phase_id.season_id.coach_id = @request.auth.id || athlete_id.user_id = @request.auth.id

// Group-aware rules (plan_assignments):
plan_id.phase_id.season_id.coach_id = @request.auth.id || athlete_id.user_id = @request.auth.id
```

## Server Hooks (pb_hooks)

```javascript
// pb_hooks/security_headers.pb.js
routerUse((e) => {
  e.response.header().set("X-Content-Type-Options", "nosniff")
  e.response.header().set("X-Frame-Options", "DENY")
  e.response.header().set("Strict-Transport-Security", "max-age=31536000")
  e.response.header().set("X-XSS-Protection", "1; mode=block")
  return e.next()
})

// pb_hooks/ownership_integrity.pb.js
// Validation hook: checks FK consistency for owner_type (season/athlete/group)
onModelBeforeCreate((e) => { /* ownership logic */ }, "competitions")
onModelBeforeUpdate((e) => { /* ownership logic */ }, "competitions")
```
