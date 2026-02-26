# UX/UI Improvement Plan — Jumpedia

> **Goal:** Specific proposals for every screen and future feature, accounting for 60+ existing components and planned tracks.

---

## 1. Current Product Map

### Navigation (BottomTabBar)

**Current:** 5 identical tabs for all roles — Dashboard, Training, Analytics, Reference, Settings.

**Problems:**
- No coach/athlete separation → coaches see irrelevant, athletes miss features
- "Reference" occupies valuable bottom nav space, used rarely
- No contextual badges (unread notifications, pending logs)

**Proposal — Role-Based Navigation:**

```
ATHLETE:                        COACH:
┌─────┬───────┬─────┬─────┐     ┌─────┬────────┬──────┬──────┐
│Today│ Plan  │ Log │Stats│     │Team │Training│Review│ More │
│ 🏠  │  📋   │  ✏️ │ 📊  │     │ 👥  │  📋    │ ✅ ③ │  ≡   │
└─────┴───────┴─────┴─────┘     └─────┴────────┴──────┴──────┘
```

- "Today" = Readiness + Today's Workout (WHOOP-style)
- "Review" = athlete logs pending review (badge with count)
- "More" = Settings + Reference + Exercises (less frequent)

**Future stubs:**
- "Video" tab (Track 5) → show in "More" with "Coming soon" tag
- Offline indicator → cloud icon in header (Track 6)

---

### Dashboard / Home Screen

**Current:** `AthleteDashboard.tsx` (328 lines), lazy-loads ProgressChart, AchievementsGrid, StreakHeroCard. Has ReadinessCheckin, CompetitionCountdown. **No "Today View".**

**Athlete "Today View":**

| Block | Component | Status | Priority |
|-------|-----------|--------|----------|
| Readiness Hero | **ScoreCard** (new) | 🆕 | P0 |
| Today's Workout | **TodayWorkoutCard** (new) | 🆕 | P0 |
| Quick Stats Strip | **StatsStrip** (new) | 🆕 | P1 |
| Streak Card | `StreakHeroCard.tsx` | ✅ Exists | — |
| Competition Countdown | `CompetitionCountdown.tsx` | ✅ Exists | — |
| Weekly Heatmap | **WeeklyHeatmap** (new) | 🆕 | P2 |

**Coach Dashboard:**

| Block | Component | Status | Priority |
|-------|-----------|--------|----------|
| Alerts Banner | **TeamAlerts** (new) | 🆕 | P0 |
| Athletes Grid | `AthleteCard.tsx` | ✅ Rework | P1 |
| Weekly Summary | **WeekSummaryBar** (new) | 🆕 | P1 |
| Pending Reviews | **PendingReviews** (new) | 🆕 | P0 |

---

### Training System

**Current:** 26 components. Largest: `WeekConstructor.tsx` (33KB), `DayColumn.tsx` (33KB), `AthleteTrainingView.tsx` (29KB), `SeasonWizard.tsx` (27KB).

**Decomposition targets:**

```
DayColumn.tsx (33KB) → split into:
├── DayHeader.tsx          (phase, day, totals)
├── ExerciseRow.tsx         (single exercise row)
├── SetLogger.tsx           (inline set entry)
├── DayActions.tsx          (action buttons)
└── DayColumn.tsx           (container, ~8KB)

WeekConstructor.tsx (33KB) → split into:
├── WeekStrip.tsx           (horizontal day strip)
├── WeekSummary.tsx         (week totals)
├── DayColumn.tsx           (already exists)
└── WeekConstructor.tsx     (container, ~10KB)
```

**Data entry UX improvements:**

| Current | Proposal | How |
|---------|----------|-----|
| Full keyboard for weight | Numeric keypad | `inputMode="decimal"` |
| Manual rep entry | Stepper ±1 | `±` buttons beside field |
| RPE not used | RPE slider (1-10) | CSS-only range input |
| No rest timer | Auto-countdown after set | `setTimeout` + audio beep |
| Re-entering data | Auto-fill from previous workout | Query last log for same exercise |
| No progress display | Sparkline under input | Recharts SparklineChart mini |

---

### Analytics

**Current:** ProgressChart, CnsHeatmap, TrainingLoadPie, AchievementsGrid, TestResultCard, AddTestResultModal.

**New components:**

| Component | Data | Visualization | Track |
|-----------|------|--------------|-------|
| **JumpProgressChart** | test_results (vertical_jump) | Line + milestones | Track 5 |
| **ReadinessTrend** | daily_checkins 30 days | Area chart + avg | Track 5-6 |
| **ConsistencyCalendar** | training_logs presence | GitHub heatmap | Track 6 |
| **SpiderChart** (coach) | Multi-dimension compare | Radar, up to 3 athletes | Track 6 |
| **SeasonTimeline** | seasons + phases | Gantt-like | Track 6 |

---

## 2. Future Feature Stubs

> **Principle:** Every stub = working disabled UI, not empty file. User sees "Coming soon".

### Track 5: Video + Biomechanics

```
src/components/video/
├── VideoUploader.tsx          → upload UI (stub)
├── VideoPlayer.tsx            → player with controls
├── PoseOverlay.tsx            → MediaPipe skeleton canvas
├── AngleDisplay.tsx           → joint angles
├── VideoCompare.tsx           → side-by-side comparison
└── VideoAnalysisSummary.tsx   → video summary

src/components/analytics/
└── VideoAnalyticsCard.tsx     → "Video Analytics" card

src/app/[locale]/(protected)/video/
└── page.tsx                   → video analysis page
```

**Video UX recommendations:**
- Slow-motion: slider 0.25x → 2x
- Frame-by-frame: ◀ ▶ buttons or swipe
- Pose overlay: toggle skeleton on/off
- Angle display: real-time angles on video
- Compare: split-screen with reference
- Touch: pinch-to-zoom
- Annotations: draw lines/arrows on video

### Track 6: Polish + Offline + Launch

```
src/components/offline/
├── SyncStatusIndicator.tsx    → cloud icon in header
├── OfflineBanner.tsx          → "Offline mode" banner
└── SyncConflictResolver.tsx   → conflict resolution

src/components/shared/
├── CommandPalette.tsx         → Cmd+K (power users)
└── FeatureTeaser.tsx          → "Coming soon" card

src/components/onboarding/
├── OnboardingWizard.tsx       → 4-step wizard
└── RoleSelector.tsx           → Athlete / Coach
```

### Backlog Stubs

| Feature | Stub | Where |
|---------|------|-------|
| PDF Export | `<ExportButton type="pdf" disabled />` | SeasonDetail, WeekConstructor |
| Exercise Illustrations | `<ExerciseIllustration src={null} fallbackIcon />` | ExercisePicker, Reference |
| Notification Analytics | `<NotificationStats />` | Settings → Notifications |

---

## 3. Design System Additions

### New CSS variables for tokens.css

```css
:root {
  /* Safe areas (PWA) */
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  
  /* Tabular numbers */
  --font-numeric: 'JetBrains Mono', ui-monospace, monospace;
  
  /* Score colors (Readiness) */
  --color-score-low: #eb5757;     /* 0-40 */
  --color-score-mid: #f2994a;     /* 41-70 */
  --color-score-high: #00a86b;    /* 71-100 */
  
  /* Data viz palette */
  --color-chart-1: #2383e2;
  --color-chart-2: #9b51e0;
  --color-chart-3: #00a86b;
  --color-chart-4: #f2994a;
  --color-chart-5: #eb5757;
  --color-chart-6: #56ccf2;
  
  /* Bottom sheet */
  --sheet-handle-width: 36px;
  --sheet-handle-height: 4px;
  --sheet-border-radius: var(--radius-xl) var(--radius-xl) 0 0;
}
```

### New DS components

| Component | Purpose | Type |
|-----------|---------|------|
| `ScoreCard` | Hero number with color (Readiness, CNS) | Card |
| `WeekStrip` | 7 days with color-coding | Strip |
| `SetLogger` | Inline set entry: weight × reps | Form row |
| `BottomSheet` | Drag-to-dismiss mobile panel | Overlay |
| `StatsStrip` | 4 compact metric cards in row | Row |
| `ExerciseRow` | Exercise row with actions | List item |
| `ComingSoonCard` | Future feature stub | Card |
| `FeatureTeaser` | "Coming soon" mini-banner | Inline |
| `SyncIndicator` | Online/offline status | Icon badge |

---

## 4. Quick Wins (do now)

| # | Improvement | File | Time |
|---|------------|------|------|
| 1 | `inputMode="decimal"` on weight inputs | DayColumn.tsx | 5 min |
| 2 | `font-variant-numeric: tabular-nums` | tokens.css | 5 min |
| 3 | Badge count on NotificationBell | NotificationBell.tsx | 15 min |
| 4 | Safe area bottom padding | BottomTabBar.module.css | 10 min |
| 5 | Category color bar on exercise cards | ExercisePicker.module.css | 20 min |
| 6 | Skeleton shimmer on empty states | Skeleton.module.css | 15 min |
| 7 | `aria-label` on icon-only buttons | All components | 30 min |
| 8 | `prefers-reduced-motion` check | tokens.css | 10 min |

---

## 5. Wireframe Concepts

### Today View (Athlete)

```
┌──────────────────────────────────┐
│    READINESS SCORE: 82 🟢       │ ← Hero card, color by value
│    "Ready for high load"         │
├──────────────────────────────────┤
│  📋 TODAY'S WORKOUT:             │
│  ┌──────────────────────────┐   │
│  │ Week 3 · Day 2 · SPP    │   │ ← Phase context
│  │ 6 exercises · ~90 min   │   │
│  │ [▶ Start Workout]        │   │ ← Primary CTA
│  └──────────────────────────┘   │
├──────────────────────────────────┤
│  📊 QUICK STATS                  │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐  │
│  │PR  │ │Days│ │CNS │ │Vol │  │
│  │2.15│ │ 5🔥│ │65% │ │+12%│  │
│  └────┘ └────┘ └────┘ └────┘  │
├──────────────────────────────────┤
│  🔔 NOTIFICATIONS (2)            │
│  • Coach updated weekly plan     │
│  • New PR in jump! 🎉           │
└──────────────────────────────────┘
```

### Coach Dashboard

```
┌──────────────────────────────────────────────┐
│  👥 My Athletes (12)     [+ Add]             │
├──────────────────────────────────────────────┤
│  🔴 Need Attention (2)                       │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ Anna K.      │  │ Igor S.      │         │
│  │ Readiness: 42│  │ Missed: 3d   │         │
│  │ ⚠️ Back pain  │  │ ⚠️ No contact │         │
│  └──────────────┘  └──────────────┘         │
│  🟢 Training Today (5)                       │
│  Anna M. ✓  Max B. ⏳  Dima L. ⏳            │
│  📊 Week #3 Summary                          │
│  │ Volume  ████████████░░  78%   │          │
│  │ Comply  ██████████████░  92%  │          │
│  📋 Pending Reviews: 3 logs                  │
└──────────────────────────────────────────────┘
```

### Exercise Logging

```
┌──────────────────────────────────┐
│  Squats · Set 1/4                │
│  Weight: [  80  ] kg   ← numeric │
│  Reps:   [  5   ]      ← stepper │
│  RPE:    ○○○○●○○○○○    ← 1-10    │
│  [✓ Record Set]                   │
│  History: 75×5  80×5  80×4       │
│  ⏱ Rest: 2:00                    │
└──────────────────────────────────┘
```

---

## 6. Implementation Roadmap

### Phase 1: Foundation UX
1. Role-based bottom navigation
2. Today View — home screen redesign
3. Coach Dashboard redesign
4. Exercise logging UX optimization
5. BottomSheet + ScoreCard components

### Phase 2: Track 5 Prep + Engagement
1. Video component stubs (6 files)
2. Gamification basics (streaks, PRs)
3. Onboarding wizard (4 screens)
4. Empty states with illustrations
5. Celebration animations

### Phase 3: Power UX (Track 6+)
1. Command palette (Cmd+K)
2. Data visualization system (5 new charts)
3. Progressive disclosure (L0-L3)
4. Offline stubs (3 components)
5. Calendar heatmap

### Phase 4: Polish (Ongoing)
1. OLED dark mode variant
2. Dynamic glassmorphism
3. Chinese text testing pass
4. Performance audit (LCP, CLS)
5. Accessibility audit (WCAG 2.1 AA)
