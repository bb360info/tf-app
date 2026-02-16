# Architecture — Энциклопедия Прыгуна v2

> This file contains detailed technical architecture. Referenced by CLAUDE.md for AI agents.

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 15 App Router | Static Export (`output: 'export'`) |
| Backend | PocketBase | Self-hosted on HK VPS |
| Storage | Cloudflare R2 | Via PocketBase S3 adapter |
| Offline | Dexie.js (IndexedDB) | Mirrors PocketBase schema |
| PWA | Serwist | Service worker for offline |
| i18n | next-intl | RU, EN, CN with `[locale]` routing |
| Validation | Zod | Schema for every collection |
| Video | FFmpeg WASM | Client-side compression to 720p |
| Pose | MediaPipe | Pose Landmarker (client-side) |
| Charts | Recharts | Training analytics |

## Hosting

```
┌─────────────────────────────────────────┐
│          Hong Kong VPS (CN2 GIA)        │
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

## PocketBase Schema (21 Collections)

### Core
| Collection | Key Fields | UNIQUE | Notes |
|-----------|-----------|--------|-------|
| `users` | email, name, role, language, units | email | PocketBase auth collection |
| `athletes` | coach_id FK, name, birth_date, gender, height_cm | | Coach creates athletes |
| `groups` | coach_id FK, name, timezone | | Organizational groups |
| `group_members` | group_id FK, athlete_id FK | group_id+athlete_id | Junction table |
| `coach_preferences` | coach_id FK, default_plan_languages | coach_id | One per coach |

### Training
| Collection | Key Fields | UNIQUE | Notes |
|-----------|-----------|--------|-------|
| `seasons` | coach_id FK, name, start/end_date | | Macrocycle |
| `training_phases` | season_id FK, phase_type, order | | GPP→SPP→COMP→TRANSITION |
| `training_plans` | phase_id FK, week_number, status | | Weekly plans |
| `plan_exercises` | plan_id FK, exercise_id FK, order | | Exercises in plan |
| `plan_snapshots` | plan_id FK, snapshot JSON, version | | Version on publish |

### Exercises & Logs
| Collection | Key Fields | UNIQUE | Notes |
|-----------|-----------|--------|-------|
| `exercises` | name_ru/en/cn, level, unit_type, cns_cost | | 68+ exercises, seeded |
| `training_logs` | athlete_id FK, plan_id FK, date | athlete_id+plan_id+date | Daily log |
| `log_exercises` | log_id FK, exercise_id FK, sets_data JSON | | Flexible sets format |
| `daily_checkins` | athlete_id FK, date, sleep/pain/mood | athlete_id+date | Readiness input |
| `test_results` | athlete_id FK, test_type, value, date | athlete_id+test_type+date | Performance tests |

### Content & Media
| Collection | Key Fields | UNIQUE | Notes |
|-----------|-----------|--------|-------|
| `competitions` | season_id FK, name, date, priority | | A/B/C meets |
| `exercise_videos` | exercise_id FK, file, coach_id FK | | Video attachments |
| `achievements` | athlete_id FK, type, earned_at | | Gamification |
| `notifications` | user_id FK, type, message, read | | Push/in-app |
| `error_logs` | user_id, error, stack, device_info | | Client error telemetry |
| `custom_exercises` | coach_id FK, base fields like exercises | | Coach-created |

## Indexes (9 required)
```sql
-- FK indexes (PocketBase doesn't auto-create these)
CREATE INDEX idx_athletes_coach ON athletes(coach_id);
CREATE INDEX idx_training_logs_athlete ON training_logs(athlete_id);
CREATE INDEX idx_training_logs_date ON training_logs(date);
CREATE INDEX idx_daily_checkins_athlete_date ON daily_checkins(athlete_id, date);
CREATE INDEX idx_plan_exercises_plan ON plan_exercises(plan_id);
CREATE INDEX idx_log_exercises_log ON log_exercises(log_id);
CREATE INDEX idx_test_results_athlete ON test_results(athlete_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);
CREATE INDEX idx_training_phases_season ON training_phases(season_id);
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
@request.auth.id = athlete_id

// Athlete in coach's group:
@request.auth.id = athlete_id && 
  athlete_id.coach_id = @request.auth.id
```

## Security Headers (pb_hooks)
```javascript
// pb_hooks/security_headers.pb.js
routerUse((e) => {
  e.response.header().set("X-Content-Type-Options", "nosniff")
  e.response.header().set("X-Frame-Options", "DENY")
  e.response.header().set("Strict-Transport-Security", "max-age=31536000")
  e.response.header().set("X-XSS-Protection", "1; mode=block")
  return e.next()
})
```
