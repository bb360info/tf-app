# UX/UI Research — Jumpedia

> **Date:** February 2026
> **Context:** PWA for high jump athletes & coaches, Next.js 15 + PocketBase, trilingual (RU/EN/CN)
> **Audience:** Athletes 15–30, Coaches 30–60+
> **Style:** Athletic Minimal + Glassmorphism
> **Sources:** 15 web research queries, 13+ competitor analysis, 10+ reference apps

---

## 1. Trends 2025–2026

### Apple "Liquid Glass"

Apple introduced **Liquid Glass** at WWDC 2025 — evolution of glassmorphism with dynamic refractions, adaptive blur, light/motion reactivity. Sets the bar for the industry.

**For Jumpedia:**
- Our glassmorphism approach is **on-trend**, but needs evolution
- Add adaptive shadows and dynamic reflections (CSS `@property` + `conic-gradient`)
- Glass surfaces should **react** to content underneath, not be static
- Mandatory **fallback** — Liquid Glass is GPU-heavy, China often uses budget devices

### AI-Driven Personalization

| Trend | Jumpedia Application |
|-------|---------------------|
| **Adaptive navigation** | Show coach and athlete different menu items based on role and usage frequency |
| **Predictive actions** | "Start workout" button on home when scheduled training is now |
| **Readiness Score** | Already exists! But needs hero-section visual integration in dashboard |
| **Smart defaults** | Auto-fill sets/reps based on athlete's history |

### Gesture-First Interaction

- **Swipe-to-action** on exercise cards (swipe left → delete, right → complete)
- **Pull-to-refresh** with custom animation
- **Long-press** for quick actions instead of three-dot menu
- **Drag-and-drop** for reordering exercises in plan

### Bottom Sheet Pattern

2026 trend: **bottom sheets** as primary mobile pattern:
- Create/edit forms → bottom sheet (not full-screen page)
- Exercise details → peek-sheet with drag to expand
- Filters → sheet with chips
- Already in our Design System, needs consistent implementation

### Micro-Interactions & Haptic Feedback

- **Completion pulse**: scale 1→1.05→1 on set completion (200ms)
- **Streak animation**: fire icon bounce + counter (400ms)
- **Smooth state transitions**: animated day/week switching in planner
- **Skeleton screens**: already exist, need perfect shimmer effect

---

## 2. Competitor Analysis

### Competitor Matrix

| App | UI Strengths | Weaknesses | What to Take |
|-----|-------------|------------|-------------|
| **Strava** | Social feed, gamification (Kudos, Segments) | Overwhelming for beginners | Feed-driven dashboard |
| **WHOOP** | Clean UX, Recovery Score as center, data → insight | Expensive, closed ecosystem | **Recovery Score hero card** — standard for our Readiness |
| **TrainHeroic** | Workout programming, template marketplace | Dated UI, hard for coaches 50+ | Marketplace idea, plan structure |
| **TrueCoach** | Coach-athlete communication focused | No own analytics | Feedback card format |
| **Hevy** | Clean logging UI, minimalist | Gym only, no periodization | **Data entry minimalism** — standard |
| **Strong** | Plate calculator, rest timer, data-first | Cold design | Load calculator, timers |
| **Nike Training Club** | Premium animations, video demos | No personalized programming | Animation quality, video UX |
| **Freeletics** | AI coach, adaptive workouts | No coach-athlete system | Adaptive UI based on performance |
| **Everfit** | All-in-one for coaches, good mobile | Feature-bloated | Program builder UX |
| **BridgeAthletic** | Sport-specific programs | Weak mobile UI | Periodization approach |
| **Pedestal** | Specifically for periodization | Small base | **Direct competitor** — study closely |
| **Final Surge** | Training calendar, multi-sport | Dated design | Calendar view for planning |
| **MyJump** | Precise jump analysis | Measurement only, no training plans | **Direct competitor** — integrate jump analytics |

### Key Insight

**Jumpedia is unique** — combines:
1. Periodization (like Pedestal/BridgeAthletic)
2. Jump analytics (like MyJump)
3. Coach-athlete communication (like TrueCoach)
4. Video biomechanics analysis (like CoachNow)

**No single app covers all 4.** This is our superpower.

---

## 3. Reference Apps — Where to Get Ideas

### Tier 1: Direct references

| App | What to copy |
|-----|-------------|
| **WHOOP** | Recovery Score hero with color-coding (red→yellow→green), minimal chrome, insight over data |
| **Hevy** | Logging UX: fast set entry, inline editing, timer, minimal taps |
| **Strava** | Activity feed, week summary card |

### Tier 2: Component inspiration

| App | Component |
|-----|----------|
| **Notion** | Calendar view, week planner |
| **Linear** | Keyboard shortcuts, command palette (Cmd+K) |
| **Apple Health** | Data visualization, trend cards |
| **Duolingo** | Gamification: streaks, XP, levels |
| **Calm** | Onboarding flow, progressive complexity |

### Tier 3: Visual style

| App | Style element |
|-----|-------------|
| **Spotify** | Color accents based on content, dark mode palette |
| **Apple Fitness+** | Activity rings for volume visualization |
| **Oura Ring** | Score-based dashboard, daily readiness |

---

## 4. UX for Two Audiences

### Athletes (15–30)

Expectations: Fast, beautiful, mobile. Like Instagram + Strava.

| Principle | Implementation |
|-----------|---------------|
| **One-thumb operation** | All key actions in bottom third of screen |
| **Visual-first** | Progress charts, color codes, animations |
| **Gamification** | Streak days, PRs, achievements |
| **Quick logging** | Max 3 taps per set: weight → reps → ✓ |

Key flow: `Open → Readiness Score → Today's workout → Start → Log sets → Finish → Day summary`
**Max 2 taps** to start workout.

### Coaches (30–60+)

Expectations: Reliable, clear, powerful. Like Excel, but simpler.

| Principle | Implementation |
|-----------|---------------|
| **Clarity over beauty** | Large font (≥16px!), high contrast |
| **Progressive disclosure** | Basic — immediate, advanced — 1 tap away |
| **Familiar patterns** | Tables, lists, calendar — don't reinvent the wheel |
| **Overview first** | Dashboard with all athletes, their statuses and alerts |
| **Batch operations** | Assign plan to group, update all, mass-edit |

### Navigation Architecture

```
ATHLETE:                        COACH:
┌─────┬───────┬─────┬─────┐     ┌─────┬────────┬──────┬──────┐
│Today│ Plan  │ Log │Stats│     │Team │Training│Review│ More │
│ 🏠  │  📋   │  ✏️ │ 📊  │     │ 👥  │  📋    │ ✅ ③ │  ≡   │
└─────┴───────┴─────┴─────┘     └─────┴────────┴──────┴──────┘
```

---

## 5. Data Visualization Patterns

### Chart types for Jumpedia

| Metric | Visualization | Why |
|--------|-------------|-----|
| **PR progress** | Line chart + milestone markers | Shows trend + specific records |
| **Readiness Score** | Gauge / donut chart (WHOOP-style) | Instant state understanding |
| **Training volume** | Stacked bar chart by weeks | Load structure by categories |
| **CNS load** | Horizontal progress bar with color | Simple (green→red) |
| **Streak / Consistency** | Calendar heatmap (GitHub-style) | Motivating, shows gaps |
| **Sets/Reps** | Compact data table + sparklines | Coach needs exact numbers |
| **Periodization phases** | Timeline / Gantt-like strip | Context "where am I in season" |
| **Athlete comparison** | Radar / spider chart | Multi-dimensional for coach |

### Mobile data viz rules

1. ONE metric per card — don't cram 5 charts on one screen
2. Touch-friendly — tap areas ≥ 48px, tooltips on tap (not hover!)
3. Progressive drill-down — Hero number → tap → chart → tap → table
4. Monospace for numbers — JetBrains Mono for all numerical data
5. Color as meaning — red = bad, green = good, blue = neutral
6. Sparklines everywhere — mini-charts in table cells for trends
7. Offline-safe — all data cached, charts from IndexedDB

---

## 6. Onboarding UX

### "30 seconds to Aha-moment"

**For athlete:** "Aha" = saw today's workout from coach
**For coach:** "Aha" = created first plan in 2 minutes

### Onboarding Flow (4 screens)

```
Screen 1: "Who are you?"    → Athlete / Coach
Screen 2: "Tell us about yourself" → Name, age, height, PR (athlete) | Name, club (coach)
Screen 3: "Customize"       → Language, units, theme
Screen 4: "Ready!" + first action → Today View (athlete) | Create first season (coach)
```

### Progressive Disclosure Levels

| Level | Visible | When unlocked |
|-------|---------|--------------|
| **L0 — Baseline** | Today, Plan, Log, Stats | Post-onboarding |
| **L1 — Engaged** | CNS calculator, readiness trend | After 5+ workouts |
| **L2 — Power** | Export, batch operations, custom exercises | After 20+ workouts |
| **L3 — Coach Plus** | Cross-athlete analytics, video analysis | Coach with 3+ athletes |

---

## 7. Dark Mode Best Practices

### Lessons from leaders

| App | Good | Bad | Lesson |
|-----|------|-----|--------|
| **WHOOP** | Subdued colors, progressive data reveal | — | Standard for data dark mode |
| **Strava** | Bold, energetic | Too high contrast, chaotic | Don't do pure black + bright accent |
| **Hevy** | System dark auto-switch | Large fonts, messy overviews | Test with real data |

### Jumpedia dark rules

```css
/* Already good: */
--color-bg: #0f0f0f;             /* Not pure black ✅ */
--color-text: #ececec;            /* Not pure white ✅ */

/* Recommendations: */
--color-bg-oled: #000000;         /* Optional OLED battery save */
--color-danger: #e06060;           /* Slightly softer than #eb5757 */
--color-success: #4CAF7D;          /* Slightly softer than #00a86b */
--shadow-md: 0 0 12px rgba(74, 158, 232, 0.08); /* Shadows → glow */
--color-glass-bg: rgba(30, 30, 30, 0.8);  /* Glass slightly more opaque */
```

---

## 8. Micro-Interactions Catalog

| Event | Animation | Duration | CSS |
|-------|----------|---------|-----|
| Set recorded | Scale pulse 1→1.05→1 | 200ms | `ease-spring` |
| Workout complete | Confetti + checkmark | 600ms | Lottie |
| New PR | Star burst + glow | 800ms | `@keyframes` |
| Streak +1 | Fire icon bounce | 400ms | `ease-spring` |
| Pull-to-refresh | Custom SVG animation | variable | Custom |
| Tab switch | Content crossfade | 200ms | `ease-in-out` |
| Card expand | Height + opacity | 300ms | `ease-out` |
| Bottom sheet | Slide up + backdrop | 300ms | `ease-out` |
| Readiness update | Color morph + count-up | 500ms | `transition` |
| Delete swipe | Slide out + collapse | 250ms | `ease-in` |

### Celebration Moments

1. **New PR** → Star burst + haptic + toast "🏆"
2. **Phase complete** → Full-screen congratulations + stats summary
3. **Streak milestone** (7, 14, 30, 100) → Badge unlocked
4. **First jump** → Welcome achievement
5. **100% plan compliance** → Perfect score animation

---

## 9. SWOT Analysis

### Strengths
- ✅ Only platform combining: periodization + jump analytics + video analysis + communication
- ✅ Works in China (self-hosted, no CDN)
- ✅ Trilingual (RU/EN/CN) — unique for niche
- ✅ PWA = no app store review, fast updates
- ✅ Design system already "Athletic Minimal + Glassmorphism" — on trend

### Weaknesses
- ⚠️ Home screen lacks "what to do now" context → fixed by Today View
- ⚠️ No gamification → planned
- ⚠️ Logging UX too heavy → needs optimization
- ⚠️ No social elements → low priority for niche

### Opportunities
- 🚀 Apple Liquid Glass trend — our glassmorphism already on the wave
- 🚀 High-jump specialized app market is empty
- 🚀 Video biomechanics analysis — killer feature
- 🚀 AI readiness prediction from data

### Threats
- ⚠️ TrainHeroic/Everfit may add sport-specific features
- ⚠️ Apple Health/Google Fit expanding platforms
- ⚠️ PocketBase dependency (small community)

---

## 10. Accessibility

### Font Scale for coaches 50+

```css
:root { --fs-scale: 1; }
.fs-large  { --fs-scale: 1.125; }  /* +12.5% */
.fs-xlarge { --fs-scale: 1.25;  }  /* +25% */
```

### Contrast Check

| Element | Min | Current | Action |
|---------|-----|---------|--------|
| Body text | 4.5:1 | ✅ 12.6:1 | OK |
| Secondary text | 4.5:1 | ✅ 5.8:1 | OK |
| Muted text | 3:1 | ⚠️ 3.2:1 | Monitor |
| Category chips | 4.5:1 | ❓ | Test needed |
| Graph axis labels | 3:1 | ❓ | Test needed |

---

## Sources

### Articles
- UX Design Trends 2025–2026 (uxdesigninstitute.com)
- Apple Liquid Glass (developer.apple.com/design)
- Sports App UX Best Practices
- Designing for Older Users (uxplanet.org)

### Reference Apps
- WHOOP, Strava, Hevy, Strong, Nike Training Club, Pedestal, Final Surge, Oura Ring

### Competitors
- TrainHeroic, TrueCoach, Everfit, BridgeAthletic, TeamBuildr, MyJump, Exercise.com
