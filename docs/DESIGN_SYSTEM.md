# Design System — Энциклопедия Прыгуна v2

> **Style:** Athletic Minimal + Glassmorphism
> **Approach:** Mobile-first, touch-first, offline-capable
> **China:** Zero external resources. Self-host everything.
> **Read before:** Any UI component, page, or layout work.

---

## 1. Design Tokens

### Colors — Light Mode

```css
:root {
  /* Background */
  --color-bg:             #ffffff;
  --color-bg-secondary:   #f7f7f5;
  --color-bg-tertiary:    #f0f0ee;
  --color-bg-elevated:    #ffffff;

  /* Glass surfaces */
  --color-glass-bg:       rgba(255, 255, 255, 0.72);
  --color-glass-border:   rgba(255, 255, 255, 0.5);
  --color-glass-shadow:   rgba(0, 0, 0, 0.06);

  /* Text */
  --color-text:           #1a1a1a;
  --color-text-secondary: #6b6b6b;
  --color-text-muted:     #9b9b9b;
  --color-text-inverse:   #ffffff;

  /* Primary */
  --color-primary:        #2383e2;
  --color-primary-hover:  #1a6bc4;
  --color-primary-active: #1558a8;
  --color-primary-light:  #e8f0fe;
  --color-primary-ghost:  rgba(35, 131, 226, 0.08);

  /* Borders */
  --color-border:         #e5e5e3;
  --color-border-light:   #f0f0ee;
  --color-border-focus:   var(--color-primary);

  /* Semantic */
  --color-success:        #00a86b;
  --color-success-light:  #d4edda;
  --color-warning:        #f2994a;
  --color-warning-light:  #fff3cd;
  --color-danger:         #eb5757;
  --color-danger-light:   #f8d7da;
  --color-info:           #56ccf2;
  --color-info-light:     #d6f0fb;

  /* Category — exercise types */
  --color-cat-plyometric:  #eb5757;
  --color-cat-highjump:    #2383e2;
  --color-cat-strength:    #9b51e0;
  --color-cat-gpp:         #00a86b;
  --color-cat-speed:       #f2994a;
  --color-cat-flexibility: #56ccf2;
  --color-cat-jump:        #ff6b6b;

  /* Favorites */
  --color-fav:            #ffb800;
}
```

### Colors — Dark Mode

```css
[data-theme="dark"] {
  --color-bg:             #0f0f0f;
  --color-bg-secondary:   #1a1a1a;
  --color-bg-tertiary:    #222222;
  --color-bg-elevated:    #1e1e1e;

  --color-glass-bg:       rgba(30, 30, 30, 0.75);
  --color-glass-border:   rgba(255, 255, 255, 0.08);
  --color-glass-shadow:   rgba(0, 0, 0, 0.3);

  --color-text:           #ececec;
  --color-text-secondary: #a0a0a0;
  --color-text-muted:     #666666;
  --color-text-inverse:   #0f0f0f;

  --color-primary:        #4a9ee8;
  --color-primary-hover:  #6bb3f0;
  --color-primary-active: #3088d4;
  --color-primary-light:  #1e2d3d;
  --color-primary-ghost:  rgba(74, 158, 232, 0.1);

  --color-border:         #2a2a2a;
  --color-border-light:   #222222;

  --color-success-light:  #1a3a2a;
  --color-warning-light:  #3a3020;
  --color-danger-light:   #3a1a1a;
  --color-info-light:     #1a2d3a;
}
```

### Spacing Scale

```css
:root {
  --space-0:   0;
  --space-1:   4px;
  --space-2:   8px;
  --space-3:   12px;
  --space-4:   16px;
  --space-5:   20px;
  --space-6:   24px;
  --space-8:   32px;
  --space-10:  40px;
  --space-12:  48px;
  --space-16:  64px;
  --space-20:  80px;
}
```

### Typography

```css
:root {
  /* Font families — ALL self-hosted in /public/fonts/ */
  --font-body:    'Inter', system-ui, -apple-system, sans-serif;
  --font-display: 'Plus Jakarta Sans', sans-serif;
  --font-mono:    'JetBrains Mono', ui-monospace, monospace;

  /* Font sizes */
  --text-xs:    0.75rem;   /* 12px — labels, badges */
  --text-sm:    0.875rem;  /* 14px — secondary text */
  --text-base:  1rem;      /* 16px — body (min for mobile!) */
  --text-lg:    1.125rem;  /* 18px — card titles */
  --text-xl:    1.25rem;   /* 20px — section headings */
  --text-2xl:   1.5rem;    /* 24px — page headings */
  --text-3xl:   1.875rem;  /* 30px — hero */
  --text-4xl:   2.25rem;   /* 36px — display */

  /* Font weights */
  --font-normal:    400;
  --font-medium:    500;
  --font-semibold:  600;
  --font-bold:      700;
  --font-extrabold: 800;

  /* Line heights */
  --leading-tight:  1.25;  /* headings */
  --leading-normal: 1.5;   /* body text */
  --leading-relaxed: 1.65; /* reading-heavy content */

  /* Font scale multiplier (user accessibility) */
  --fs-scale: 1;
}
```

**Rules:**
- Body text: `--font-body` at `--text-base` (never below 16px on mobile)
- Headings: `--font-display` at `--font-extrabold`
- Dosages, sets/reps, numbers: `--font-mono`
- Max line length: 65-75 characters
- Chinese text may be 20-30% wider — test with 中文

### Border Radius

```css
:root {
  --radius-sm:   6px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-2xl:  20px;
  --radius-full: 9999px;
}
```

### Shadows

```css
:root {
  --shadow-xs:  0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-sm:  0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md:  0 4px 6px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04);
  --shadow-lg:  0 10px 15px rgba(0, 0, 0, 0.08), 0 4px 6px rgba(0, 0, 0, 0.04);
  --shadow-xl:  0 20px 25px rgba(0, 0, 0, 0.1), 0 8px 10px rgba(0, 0, 0, 0.04);
  --shadow-glow: 0 0 20px rgba(35, 131, 226, 0.15);
}

[data-theme="dark"] {
  --shadow-xs:  0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-sm:  0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md:  0 4px 6px rgba(0, 0, 0, 0.3);
  --shadow-lg:  0 10px 15px rgba(0, 0, 0, 0.4);
  --shadow-xl:  0 20px 25px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 20px rgba(74, 158, 232, 0.2);
}
```

### Z-Index Scale

```css
:root {
  --z-base:     0;
  --z-raised:   10;
  --z-dropdown: 20;
  --z-sticky:   30;
  --z-overlay:  40;
  --z-modal:    50;
  --z-toast:    60;
  --z-tooltip:  70;
}
```

---

## 2. Glassmorphism System

The app uses frosted glass surfaces to create depth and a modern feel.

### Glass Card

```css
.glass-card {
  background: var(--color-glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
```

### Glass Variants

| Variant | Background | Blur | Use Case |
|---------|-----------|------|----------|
| **Subtle** | `rgba(white, 0.5)` | `8px` | Cards, list items |
| **Medium** | `rgba(white, 0.72)` | `16px` | Panels, modals |
| **Strong** | `rgba(white, 0.85)` | `24px` | Header, navigation |
| **Accent** | `rgba(primary, 0.08)` | `12px` | Active states, highlights |

### Glass Rules

1. **Never stack glass on glass** — max 1 glass layer deep
2. **Always test on low-end devices** — `backdrop-filter` is GPU-heavy
3. **Fallback required** — use `@supports not (backdrop-filter: blur(1px))` with solid background
4. **Minimum contrast** — ensure text is 4.5:1 contrast ratio even over complex backgrounds
5. **Light mode**: `rgba(255, 255, 255, 0.5-0.85)` — NOT `rgba(white, 0.1)` (too transparent)
6. **Dark mode**: `rgba(30, 30, 30, 0.6-0.85)` — maintain readability

### Performance Fallback

```css
@supports not (backdrop-filter: blur(1px)) {
  .glass-card {
    background: var(--color-bg-elevated);
    box-shadow: var(--shadow-md);
  }
}
```

---

## 3. Breakpoints — Mobile First

```css
/* Base styles = mobile (375px+) — ALWAYS start here */

/* Tablet */
@media (min-width: 768px) { ... }

/* Desktop */
@media (min-width: 1024px) { ... }

/* Wide desktop */
@media (min-width: 1440px) { ... }
```

### Layout Widths

| Breakpoint | Content max-width | Side padding |
|-----------|------------------|-------------|
| Mobile (<768px) | `100%` | `16px` |
| Tablet (768-1023px) | `720px` | `24px` |
| Desktop (1024-1439px) | `960px` | `32px` |
| Wide (1440px+) | `1120px` | `40px` |

### Rules

- **Write mobile CSS first**, then add complexity with `min-width` queries
- **Never use `max-width` media queries** — mobile-first means additive
- Test every screen at: `375px`, `390px`, `768px`, `1024px`, `1440px`
- Content must be **fully usable at 375px** — nothing hidden, no horizontal scroll

---

## 4. Component Patterns

### Card (Primary Surface)

```
┌──────────────────────────────┐
│  🔵 Category bar (4px left)  │ ← color = category
│                              │
│  Title (--font-display, 700) │
│  Subtitle (--text-secondary) │
│                              │
│  [tag] [tag] [tag]           │ ← chips
│                              │
│  ⭐  ➕                      │ ← actions (right align)
└──────────────────────────────┘
```

- Surface: `glass-card` (subtle variant)
- Corner radius: `--radius-lg`
- Hover: `box-shadow: var(--shadow-lg)`
- Expand animation: `max-height` transition
- **Touch target**: entire card header is tappable (min 48px height)

### Button

| Variant | Background | Border | Use |
|---------|-----------|--------|-----|
| **Primary** | `--color-primary` | none | Main CTA |
| **Secondary** | transparent | `--color-border` | Alternative actions |
| **Ghost** | transparent | none | Toolbar, inline |
| **Danger** | `--color-danger` | none | Delete, destructive |

All buttons:
- Min height: `44px` (touch target)
- Padding: `--space-3 --space-5`
- Border radius: `--radius-md`
- Transition: `all 0.2s ease`
- Disabled: `opacity: 0.5; pointer-events: none`

### Chip / Tag

- Padding: `--space-1 --space-3`
- Border radius: `--radius-full`
- Font: `--text-xs`, `--font-semibold`
- Category chips: colored background, white text
- Filter chips: `--color-bg-tertiary` background
- Active: `--color-primary` background

### Input

- Height: `44px` min
- Padding: `--space-3 --space-4`
- Border: `1px solid var(--color-border)`
- Focus: `border-color: var(--color-primary); box-shadow: var(--shadow-glow)`
- Font size: `--text-base` (16px — prevents iOS zoom!)
- Border radius: `--radius-md`

### Modal / Sheet

- Mobile: **bottom sheet** (slides up from bottom, drag to dismiss)
- Desktop: center modal with overlay
- Overlay: `rgba(0, 0, 0, 0.4)`
- Surface: glass-card (strong variant)
- Corner radius: `--radius-xl` (top only on mobile)

---

## 5. Icon System

### Library: Lucide React

```tsx
import { Play, Heart, Plus, Settings } from 'lucide-react';
```

### Sizes

| Context | Size | Lucide prop |
|---------|------|-------------|
| Inline with text | `16px` | `size={16}` |
| Button icon | `20px` | `size={20}` |
| Navigation | `24px` | `size={24}` |
| Feature / empty state | `32-48px` | `size={32}` |

### Rules

- ❌ **NO emojis as UI icons** — v1 uses 🔍📋⭐🌙📖 — replace ALL with Lucide SVGs
- ❌ **NO icon fonts** (Font Awesome, Material Icons CDN)
- ✅ **Lucide only** — tree-shakeable, consistent, lightweight
- Stroke width: `2` (default)
- Color: `currentColor` (inherits text color)

---

## 6. Animation Tokens

```css
:root {
  /* Durations */
  --duration-fast:    100ms;
  --duration-normal:  200ms;
  --duration-slow:    300ms;
  --duration-slower:  500ms;

  /* Easings */
  --ease-default:    ease;
  --ease-in-out:     cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out:        cubic-bezier(0, 0, 0.2, 1);
  --ease-in:         cubic-bezier(0.4, 0, 1, 1);

  /* Standard transition shorthand */
  --transition:      var(--duration-normal) var(--ease-in-out);
}
```

### Animation Rules

1. **Micro-interactions**: 150–300ms (`--duration-normal` to `--duration-slow`)
2. **Page transitions**: 300–500ms (`--duration-slow` to `--duration-slower`)
3. **Only animate**: `transform`, `opacity`, `box-shadow`, `border-color` — GPU-composited
4. **Never animate**: `width`, `height`, `margin`, `padding`, `top/left` — triggers layout
5. **Respect**: `prefers-reduced-motion: reduce` → disable all animations

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. Accessibility Baseline

### Contrast (WCAG 2.1 AA — mandatory)

| Element | Minimum Ratio |
|---------|--------------|
| Body text | 4.5:1 |
| Large text (≥24px or ≥19px bold) | 3:1 |
| UI components (borders, icons) | 3:1 |
| Decorative/disabled | No requirement |

### Touch Targets

- **Minimum**: `44 × 44px` (absolute minimum, no exceptions)
- **Recommended**: `48 × 48px`
- **Spacing between targets**: `8px` minimum

### Focus States

- All interactive elements must have visible focus ring
- Use `outline: 2px solid var(--color-primary); outline-offset: 2px`
- Never `outline: none` without replacement
- Tab order must match visual order

### Screen Reader

- All images: `alt` text (descriptive or `alt=""` if decorative)
- Icon-only buttons: `aria-label`
- Live regions for dynamic content
- Form inputs: associated `<label>`

---

## 8. China-Specific Design Rules

### 🚫 Hard Bans

| Never | Why | Alternative |
|-------|-----|-------------|
| Google Fonts CDN | Blocked in China | Self-host in `/public/fonts/` |
| Material Icons CDN | Blocked | Lucide (bundled) |
| Any `googleapis.com` | Blocked | Local resources |
| Any `gstatic.com` | Blocked | Local resources |
| External analytics | Slow/blocked | PocketBase `error_logs` |
| External CDN for anything | Unpredictable | Self-host everything |

### Text Considerations

- Chinese text is typically **wider** than Latin — test all layouts with 中文
- CJK fonts: include `Noto Sans SC` as Chinese fallback (self-hosted, ~4MB subset)
- Input methods: Chinese IME needs larger input fields (min `44px` height)
- Avoid text in images — not translatable

---

## 9. Anti-Patterns (Hard Bans)

| ❌ Don't | ✅ Do Instead |
|----------|--------------|
| Use emoji as icons (🔍📋) | Use Lucide SVG icons |
| Desktop-first CSS | Mobile-first with `min-width` |
| Hardcode colors (`#333`) | Use design tokens (`var(--color-text)`) |
| Touch targets < 44px | Minimum 44×44px, prefer 48px |
| Hover-only interactions | Always provide tap/click fallback |
| External resources (CDN) | Self-host everything |
| `font-size < 16px` on mobile inputs | Min 16px to prevent iOS zoom |
| Animate layout properties | Use `transform` + `opacity` |
| Stack glass on glass | Max 1 glass layer |
| `outline: none` | Replace with custom focus ring |
| `z-index: 9999` | Use z-index scale tokens |
| Inconsistent border-radius | Use `--radius-*` tokens |
| Mix icon libraries | Lucide only |

---

## 10. Pre-Delivery Checklist

Before merging any UI code:

### Tokens
- [ ] All colors use `var(--color-*)` — no hardcoded hex
- [ ] All spacing uses `var(--space-*)` — no random px values
- [ ] All radii use `var(--radius-*)` — no magic numbers
- [ ] All shadows use `var(--shadow-*)` — no inline box-shadow

### Visual
- [ ] Tested in both light AND dark mode
- [ ] Glass surfaces have `@supports` fallback
- [ ] No emojis used as UI icons
- [ ] Chinese text doesn't overflow containers
- [ ] Category colors match token definitions

### Mobile
- [ ] Tested at 375px width (iPhone SE)
- [ ] All touch targets ≥ 44px
- [ ] No horizontal scroll
- [ ] Input font size ≥ 16px
- [ ] CSS is mobile-first (`min-width` breakpoints only)

### Accessibility
- [ ] Color contrast ≥ 4.5:1 for text
- [ ] Focus states visible
- [ ] `prefers-reduced-motion` respected
- [ ] Interactive elements have `aria-label` if icon-only

### Performance
- [ ] No external resource requests
- [ ] `backdrop-filter` behind `@supports`
- [ ] Animations use GPU-friendly properties only
- [ ] Images are lazy-loaded with dimensions reserved
