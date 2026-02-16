# 🏃 Энциклопедия Прыгуна — Project Context

> This file describes the real-world context, users, constraints, and goals of the project.
> Update this file as the project evolves.

## 🎯 What Is This?

A **training management platform for high jump athletes and their coaches**, designed to work across language barriers in China.

## 👥 Users

### Coach (Тренер / 教练)
- **Language**: Russian (primary), English (secondary)
- **Location**: China
- **Role**: Creates training plans, manages athletes, tracks progress, runs the group
- **Needs**: Beautiful plans (PDF/digital), coaching phrases in athlete's language, exercise library, technique reference, analytics for club management

### Athletes (Спортсмены / 运动员)
- **Ages**: 17–21 years old
- **Language**: Chinese (primary), some English
- **Location**: China
- **Role**: View training plans, log completed work (sets, reps, weights), provide feedback, view progress
- **Needs**: Simple interface in their language, ability to record results, see their statistics

### Club Management (руководство клуба)
- **Role**: View aggregate statistics, monitor athlete progress and training volumes
- **Needs**: Beautiful reports, group analytics

### Super-Admin (Bogdan / Antigravity)
- **Role**: System administrator, adds exercises/content via Antigravity + NotebookLM
- **Needs**: Tools to batch-add exercises with auto-translation and auto-generated illustrations

## 🌍 Key Constraints

### Language Barrier
- Coach speaks **Russian**, athletes speak **Chinese**, common ground is **English**
- Exercise names should always show **English** (educational purpose), with option to switch to athlete's language
- Coach phrases must be available in athlete's language so coach can show them on screen
- Auto-translation of new content is critical

### China Internet Environment
- **Google services are BLOCKED** (no Firebase, no Google Sign-In, no Google Fonts CDN)
- No ICP license → host **outside mainland** (Hong Kong preferred for low latency)
- Use **Cloudflare CDN** with China Network (JD Cloud partnership) for performance
- WeChat ecosystem is dominant → consider WeChat login in future
- Phone number / email auth works everywhere

### Budget Sensitivity
- Infrastructure costs must stay **minimal** (small sports club, not a commercial product)
- Prefer free tiers and pay-as-you-go pricing
- Video storage must be cheap (Cloudflare R2: $0.015/GB, zero egress)

### Device Environment
- Athletes primarily use **Android phones** (Xiaomi, Huawei common in China)
- Some may use **iPhones**
- Coach uses both desktop and mobile
- PWA is the delivery mechanism (no app stores needed)
- Xiaomi Mi Band integration possible via Health Connect bridge (future)

## 📋 Current Features (v1 — Static HTML/JS)

| Feature | Status |
|---|---|
| Exercise encyclopedia (68 exercises, 7 categories) | ✅ |
| Trilingual support (RU/EN/CN) | ✅ |
| Filters by category, equipment, level | ✅ |
| Technique errors analysis (23 errors, 6 phases) | ✅ |
| Technique checklist (21 items) | ✅ |
| Reference: periodization, injuries, mental prep, benchmarks | ✅ |
| Warmup protocols (3 types) | ✅ |
| Daily training planner | ✅ |
| Weekly training planner | ✅ |
| PDF export | ✅ |
| Text-to-speech | ✅ |
| Dark/light theme, font scaling | ✅ |
| Favorites & workout list | ✅ |
| Custom exercise bank | ✅ |
| Illustration gallery | ✅ |
| Motivational content | ✅ |

## 🚀 Planned Features (v2 — Full Platform)

- [ ] Multi-user system (coach/athlete roles)
- [ ] Group management (coach invites athletes)
- [ ] Online sync (plans, logs, etc.)
- [ ] Training log (sets, reps, weights, test results)
- [ ] Beautiful statistics & analytics (individual + group)
- [ ] Competition calendar & cycle planning
- [ ] Video attachments per athlete/exercise
- [ ] Drag-and-drop warmup builder
- [ ] Auto-translation for new exercises
- [ ] PWA with offline support
- [ ] NotebookLM knowledge base for coaches
- [ ] Automated exercise creation pipeline (super-admin)

## 🔧 Technology Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Frontend | Next.js 15 + React 19 | App Router, Static Export (`output: 'export'`), PWA via Serwist |
| Database | PocketBase (HK VPS) | SQLite, self-hosted, single binary, zero cost |
| Auth | PocketBase Auth (email + OAuth2) | Email primary for China, Google OAuth for VPN users |
| Video storage | Cloudflare R2 | $0.015/GB, zero egress, via PocketBase S3 adapter |
| Hosting | HK VPS (CN2 GIA) + nginx | Low latency to China, full control, ~$10/mo |
| Styling | Vanilla CSS + design tokens | See `docs/DESIGN_SYSTEM.md`, Athletic Minimal + Glass |
| Offline | Dexie.js (IndexedDB) | Mirrors PocketBase schema, smart sync |
| i18n | next-intl | Type-safe, App Router compatible, RU/EN/CN |
| Charts | Recharts | React-friendly charts, lightweight |
| PDF | jsPDF + html2canvas | Already proven in v1 |
| Icons | Lucide React | Lightweight, tree-shakeable, consistent |
| Video | FFmpeg WASM + MediaPipe | Client-side compression + pose detection |

---
*Last updated: 2026-02-15*
