# Gate 3: Training System ✅ Checklist

## Deferred from Gate 2
- [x] Athlete can only see own data (test when athlete-role users exist)

- [x] Season Wizard creates macrocycle with Gantt timeline
- [x] Training Phases linked to season (GPP→SPP→COMP→TRANSITION)
- [x] Peaking validation (2-3 weeks rule)
- [x] Competitions (A/B/C meets) on timeline
- [x] Auto-volume reduction 2 days before competition
- [x] Week Constructor with plan creation
- [x] Phase-Aware Auto-Fill generates exercises by phase
- [x] CNS Conflict Detection warns about overload
- [x] Plan Snapshots (version on publish)
- [x] Plan publish → athlete sees read-only
- [x] Invite-codes for group (6 chars, 7 days expiry) — service layer done
- [x] Traffic Light Readiness (10-sec check-in → score 0-100) — dual-role (coach=self-athlete) implemented
- [x] Auto-adaptation toggleable (coach preference)
- [x] Training Log (RPE + flexible sets_data JSON)
- [ ] PDF export (multi-language columns)
- [x] Settings page (language, units, theme)
- [x] Coach Preferences saved
- [x] Onboarding Wizard (3-5 screens)

## Design System Compliance
- [x] All UI passes `docs/DESIGN_SYSTEM.md` Pre-Delivery Checklist
- [x] No hardcoded colors — only `var(--color-*)` tokens
- [x] All touch targets ≥ 44px
- [ ] Tested at 375px width + Chinese text
