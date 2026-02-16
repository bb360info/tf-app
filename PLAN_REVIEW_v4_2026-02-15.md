# 🛡️ Analysis & Review: Энциклопедия Прыгуна v2

**Date:** 2026-02-15
**Reviewer:** Antigravity (Agentic AI)
**Context:** Implementation Plan v4 Review

---

## 1. Executive Summary

The **"Hong Kong Monolith"** architecture is a highly pragmatic, cost-effective, and technically sound choice for the specific constraints of this project (China accessibility, 20-50 users, ~$10/mo budget). The decision to avoid microservices and use a single optimized VPS is correct.

However, the **"Offline-first"** requirement introduces significant complexity that is currently under-specified in the plan. Specifically, **Data Synchronization** and **Storage Scalability** are the two highest-risk areas.

## 2. Critical Weaknesses & Risks

### 🔴 1. Storage Scalability (The VPS Limit)
**Risk:** The plan relies on the VPS disk for `pb_public/` and potentially user uploads before backup.
- **Scenario:** 20 athletes uploading 10 videos/month. Even with compression, this will consume the VPS disk (usually 20-50GB) quickly.
- **Current Plan:** "Cron backup SQLite → R2". This only backs up data *after* it's on disk.
- **Risk Level:** **HIGH**. Disk full = Service Down.

### 🔴 2. Data Synchronization (The "Offline" Trap)
**Risk:** "Offline-first... cannot be added later" is true, but the *strategy* for conflict resolution is missing.
- **Scenario:**
    1. Coach edits a plan online (v1 → v2).
    2. Athlete (offline) logs a result against v1.
    3. Athlete comes online. Sync happens.
    4. What happens? Does the log attach to v2? Is it orphaned? Does the plan revert?
- **Risk Level:** **HIGH**. Data integrity issues will frustrate users.

### 🟠 3. Client-Side Observability
**Risk:** The app runs logic heavy (MediaPipe, WASM) on diverse client devices (Chinese Android implementation).
- **Gap:** No mechanism mentioned to capture client-side crashes or WASM failures.
- **Risk Level:** **MEDIUM**. Blind spots in debugging user issues.

### 🟡 4. Bleeding Edge Stack Dependencies
**Risk:** Tailwind 4 and Next.js 15 are very new.
- **Gap:** Potential ecosystem compatibility issues (e.g., UI component libraries not yet updated for TW4).
- **Risk Level:** **LOW/MEDIUM**. Usable, but expect "growing pains".

---

## 3. Architecture Recommendations (Kaizen)

### ✅ Recommendation 1: Direct-to-Object-Storage (R2)
**Change:** Do not store user videos on the VPS disk. Configure PocketBase to use **Cloudflare R2** as its storage adapter.
- **Why:**
    -   **Infinite Storage**: No risk of filling the VPS.
    -   **Performance**: Cloudflare R2 serves content globally (CDN) automatically.
    -   **Backup**: Data is already safe; you only need to backup the SQLite DB file.
-   **Cost**: R2 has a generous free tier (10GB/mo + millions of requests), likely $0 for the start.

### ✅ Recommendation 2: Explicit "Smart Sync" Strategy
**Change:** Define strict sync rules in `lib/pocketbase/offline.ts`.
-   **Logs (Append-Only):** Always safe to sync.
-   **Entity Updates (Profiles, Plans):** Use `last_modified` checks.
-   **Conflict:** If `server_version > local_version`, prompt user OR "Server Wins" strategy (safer for MVP).
-   **Optimistic UI:** Show changes immediately, revert on sync error.

### ✅ Recommendation 3: Lightweight Error Telemetry
**Change:** Add a simple `logging` collection in PocketBase or use a free-tier monitoring tool (e.g., GlitchTip, Sentry).
-   **Why:** You need to know if `MediaPipe` failed to load on a specific device model.

### ✅ Recommendation 4: Schema Migration Plan
**Change:** Although "no migrations later" is the goal, reality differs.
-   **Strategy:** Maintain a `migrations/` folder with SQL scripts. Even if run manually via SQLite CLI during a 5-min maintenance window, having the scripts is essential for reproducing environments.

---

## 4. Missing Components in Plan

1.  **Video Processing Queue Details:**
    -   ffMPEG WASM is heavy on battery.
    -   **Tip:** Add a check: `if (battery < 20%) warnUser()`.
2.  **CDN Strategy for MediaPipe Models:**
    -   The plan says "self-hosted models". Ensure these are served with typically long `Cache-Control` headers (Immutable) to avoid re-downloading 10MB+ files.
3.  **Testing for China:**
    -   **Tip:** Verify that *all* 3rd party scripts (even innocuous ones like Google Fonts or Analytics) are stripped out. They cause 30s timeouts in China.

## 5. Improved Architecture Diagram

```mermaid
graph TB
    subgraph "Client (PWA)"
        UI[Next.js Frontend]
        DB[IndexedDB / Dexie]
        SW[Serwist SW]
    end

    subgraph "Hong Kong VPS"
        PB[PocketBase App]
        SQL[SQLite DB]
    end

    subgraph "Cloudflare Ecosystem"
        DNS[DNS / Proxy]
        R2[R2 Buckets (Storage)]
    end

    UI --> SW
    SW -->|Offline| DB
    SW -->|Online| DNS
    DNS --> PB
    PB --> SQL
    PB -.->|S3 API (Uploads/Reads)| R2
    
    note right of R2
        Primary Storage for Videos
        (Not VPS Disk)
    end
```

## 6. Actionable Next Steps

1.  **Update Implementation Plan** to include the **R2 Storage Adapter** configuration (Critical for scalability).
2.  **Draft a Sync Protocol**: Write a short doc on how conflicts are handled.
3.  **Verify Tailwind 4 plugins**: Ensure `tailwindcss-animate` or other requirements are compatible.
4.  **Add `error_logs` collection** to the Schema Design.

This plan is 90% perfect. The last 10% (Data Sync & Storage Architecture) ensures it survives first contact with real users.
