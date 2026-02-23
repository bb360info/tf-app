# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/)

## [Unreleased]

### 2026-02-22 — Track 4.20 Phase 6: Stability

#### Added
- **Utility**: `src/lib/utils/errors.ts` — `logError(error, context)` fire-and-forget error logging to console + telemetry; `getErrorMessage(error)` with PocketBase-specific extraction
- **Tests**: `src/lib/utils/__tests__/errors.test.ts` — 8 unit tests for error utilities

#### Changed
- **Error handling**: ~82 empty `catch {}` blocks replaced across ~40 files with context-aware handling:
  - Critical catches → `logError()` + UI error state (pages, modals, forms)
  - Expected catches → `/* expected: ... */` comments (404s, invalid dates)
  - Non-critical catches → `/* non-critical: ... */` comments (streak, achievements, localStorage)
- **PB Index**: `idx_plan_ex_plan(plan_id)` replaced with composite `idx_planex_plan_deleted(plan_id, deleted_at)` — covers soft-delete filter queries via leftmost prefix
- **Docs**: `ARCHITECTURE.md` indexes section updated

### 2026-02-22 — Track 4.20 Phase 5: Bidirectional Communication

#### Added
- **PB Field**: `log_exercises.skip_reason` (text, max 255)
- **Feature**: `AthleteTrainingView.tsx` — per-day notes textarea with debounced auto-save (500ms), `log.id` guard
- **Feature**: `AthleteTrainingView.tsx` — skip_reason quick-select (Equipment|Pain|Time|CoachDecision|Other)
- **Feature**: `CoachLogViewer.tsx` — displays `training_logs.notes` + `log_exercises.skip_reason`
- **Feature**: Adaptation banner when readiness < 60 in `AthleteTrainingView.tsx`
- **Service**: `readinessHistory.ts` → `getLatestReadinessForGroup()` (Promise.all per athlete)
- **Feature**: `WeekConstructor.tsx` → readiness mini-badges for assigned athletes (color-coded)
- **i18n ×3**: `athleteNotePlaceholder`, `adaptationBanner`, `skipReasons.*`, `shared.saving`

### 2026-02-22 — Track 4.20 Phase 4.5: Warmup Page Migration

#### Changed
- **`templates.ts`**: `listTemplates()` получил опциональный `type?` параметр + `expand: 'template_items(template_id)'`. Backward compatible — все вызовы без аргумента работают.
- **`reference/warmup/page.tsx`**: Удалён hard-coded `PROTOCOLS` массив. Данные загружаются из PocketBase через `listTemplates('warmup')`. Добавлены 3 состояния UI: skeleton loading (×3), error+Retry кнопка, cards из PB. `BreathingTimer` без изменений; добавлен `getLocalizedText()` helper для locale-aware fallback.
- **`warmup.module.css`**: Добавлены `.skeleton` (shimmer 1.2s), `.emptyState`, `.retryBtn` (44px touch target), `.protocolDesc`.
- **i18n ×3**: `warmupPage.loading`, `warmupPage.loadError`, `warmupPage.noTemplates`, `warmupPage.retry`.

### 2026-02-22 — Track 4.20 Phase 4: Workout + Templates Hybrid UX


#### Added
- **`templates.ts`**: `appendTemplate()` — добавляет упражнения шаблона к дню плана (append-only, no eject for training_day, sequential SQLite-safe inserts)
- **`templates.ts`**: `createTemplateFromPlanDay()` — сохраняет день плана как шаблон training_day (chunked batch по 5, SQLite safety)
- **`DayColumn.tsx`**: `TrainingTemplatePicker` — выпадающий список шаблонов типа `training_day` (по паттерну WarmupTemplatePicker)
- **`DayColumn.tsx`**: `SaveAsDayTemplateBtn` — кнопка Bookmark → inline input (без `window.prompt()`); закрывается по Escape/Enter
- **`DayColumn.tsx`**: Props `onAppendTemplate` + `onSaveAsTemplate`; JSX `.mainToolbar` flex row
- **`DayColumn.module.css`**: `.mainToolbar` + override стили для toolbar контекста
- **`WeekConstructor.tsx`**: `handleAppendTemplate` + `handleSaveAsTemplate` handlers (lazy import, coachId из authStore)
- **`QuickPlanBuilder.tsx`**: «Save to Library» — lazy PB import, `createTemplate()` + `addTemplateItem()` chunked batch (5); states `savingToLibrary`/`savedToLibrary`
- **`QuickPlanBuilder.module.css`**: `.libraryBtn` (accent ghost style)
- **i18n ×3**: `training.trainingTemplatePicker`, `training.templatePickerEmpty`, `training.saveAsTemplate`, `training.enterTemplateName`, `quickPlan.saveToLibrary`, `quickPlan.savedToLibrary`



#### Fixed
- **Security**: `logs.ts` — 9 instances of raw string interpolation in filter queries migrated to `pb.filter()` (SQL injection prevention)
- **UX**: `SeasonDetail.tsx` `handleAssign` — silent `catch {}` replaced with `assignError` state; `alert()` removed
- **UX**: `groups/page.tsx` — silent `catch` in `handleCreate` replaced with `createError` inline error display; native `confirm()` removed

#### Added
- **Component**: `ConfirmDialog.tsx` + `ConfirmDialog.module.css` — reusable glassmorphism confirm dialog with danger variant, Escape key support, click-outside, min 44×44px touch targets
- **Feature**: Delete Season button in `training/page.tsx` (Trash2 icon, optimistic removal, rollback on error)
- **PocketBase**: `training_phases` API rules hardened — coach-only create/update/delete, authenticated read for coaches+athletes
- **i18n**: Added 9 new keys to RU/EN/CN `common.json` (`deleteSeasonTitle/Confirm`, `seasonDeleted`, `noPublishedPlan`, `createError`, `deleteGroupTitle/Confirm`, `confirmDelete/Cancel`, `assignFailed`)
- **CSS**: `.seasonCardInner`, `.seasonDeleteBtn`, `.assignError` CSS classes

---

### 2026-02-22 — Track 4.20 Phase 3: Override + Plan Resolution

#### Added
- **Feature**: `createIndividualOverride(planId, athleteId)` in `plans.ts` — creates a published copy of a plan for a specific athlete. Sequential `for...of` exercise copy (SQLite safety). Guard: throws if source is itself an override.
- **Feature**: `listOverridesForPlan(planId)` + `countOverridesForPhase(phaseId)` helper functions in `plans.ts`
- **Feature**: Override button (UserCog icon) in `WeekConstructor.tsx` toolbar — active only when plan is published. Opens modal with athlete dropdown.
- **Feature**: Override badge in `SeasonDetail.tsx` PhaseCard — shows «N overrides» count via `countOverridesForPhase`
- **i18n**: 6 new keys ×3 locales: `createOverride`, `overrideFor`, `overrides`, `overrideWarning`, `overrideSuccess`, `selectAthleteForOverride`
- **CSS**: `.overrideBadge` in `SeasonDetail.module.css`; override modal styles (overlay, card, actions) in `WeekConstructor.module.css`

#### Fixed
- **Resolution**: `getPublishedPlanForToday()` now checks Step 0 (individual override via `parent_plan_id != "" AND athlete_id = X`) **before** plan_assignments. Season fallback filter now excludes overrides (`parent_plan_id = ""`).

---

### 2026-02-22 — Track 4.20 Phase 2: Athlete Dashboard + Season Visibility

#### Fixed
- **Critical**: `logs.ts` `getPublishedPlanForToday()` — 3-step resolution: direct plan_assignments → group membership → season fallback
- **Critical**: `AthleteDashboard.tsx` — replaced placeholder with real `getPublishedPlanForToday()` call
- **UX**: `SeasonDetail.tsx` PhaseCard — replaced text UUID input with radio Group|Athlete + lazy dropdown

#### Added
- **Service**: `groups.ts` — `getMyGroupIds(athleteId)`
- **Service**: `seasons.ts` — `listSeasonsForAthlete(athleteId)`
- **Component**: `AthleteSeasonsList.tsx` + `.module.css` — read-only seasons for athletes
- **Prop**: `AthleteTrainingView.onAthleteIdResolved` callback
- **PocketBase**: `plan_assignments` listRule+viewRule — group membership check added
- **i18n**: `mySeasons`, `assignToGroup`, `assignToAthlete`, `selectGroup`, `todayExercises` in RU/EN/CN
---

### 2026-02-22 — Track 4.19 Phase 2: Coach Notes & Log Visibility (Partial)

#### Added
- **TDD**: `compliance.test.ts` — 11 тестов: 0%/60%/100%, AM/PM, dedup, cap + ExerciseComparison 4 статуса (matched/partial/missed/added)
- **Service**: `compliance.ts` — `calculateWeeklyCompliance()` и `getExerciseComparison()` (pure functions, zero PB dependency)
- **UI**: `DayColumn` — `dayNote` prop + textarea (500 chars, MessageSquare icon, glassmorphism, readOnly fallback `<p>`)
- **State**: `WeekConstructor` — `dayNotes` state (инициализация из `plan.day_notes`, auto-save через `updatePlan()`)
- **API**: `updatePlan()` — расширен на `day_notes` поле
- **i18n**: `training.dayNote` + `training.dayNotePlaceholder` ×3 локали (RU/EN/CN)
- **UI**: `AthleteTrainingView` DayCard — `dayNote` banner из `plan.day_notes` (glassmorphism, MessageSquare icon)
- **UI**: `CoachLogViewer` — Plan vs Fact comparison (desktop table / mobile cards, 4 статуса, compliance chip)
- **UI**: `AthleteCard` — `weekCompliance` prop + TrendingUp inline badge (data-level: high/medium/low + CSS)
- **i18n**: `coachLog` namespace × RU+EN+CN, `dashboard.compliance` × RU+EN+CN
- **UI**: `CoachLogViewerLazy` → `AthleteDetailClient.TrainingTab` via `next/dynamic(ssr:false)` — нагружает план+логи+недельный compliance
- **CF Worker**: `push-service` — zadeploen na `push.jumpedia.app` (Custom Domain), VAPID keys сгенерированы, batch endpoint `/push-batch`, shared secret auth 401, health 200
- **Phase 4 SW**: `sw.ts` += `push` handler (foreground dedup + `seenPushIds` Set), `notificationclick`, `SW_UPDATED` postMessage
- **Phase 4 Hooks**: `usePushSubscription.ts` (subscribe/unsubscribe/decline + 30d grace), `useNotifications.ts` (SSE + BG Sync + exponential backoff + dedup)
- **Phase 4 UI**: `PushPermissionPrompt.tsx` (3-visit smart timing, iOS A2HS + push prompt, glassmorphism, mobile bottom sheet)
- **Fix**: `notifications.ts` `markAllRead()` N+1→batch fetch `/api/custom/mark-all-read` (O(1))
- **Phase 5 Services**: `notifications.ts` listUnread→`getList(1,20)`+totalItems, `listByType()` добавлен; `notificationPreferences.ts` (upsert getOrCreate, toggleType, quietHours, debounce)
- **Phase 5 UI**: `ActivityFeed.tsx` (shimmer skeleton, CLS fix), `/notifications` страница (type filter chips, ARIA tablist), `NotificationPreferences.tsx` (toggle ARIA role=switch, debounce 500ms)
- **Phase 5 i18n**: `notifications` namespace ×3 locale (RU+EN+CN), 9 типов + quietHours + push/email keys
- **Phase 6 ESLint**: PushPermissionPrompt setState→single-state refactor, useNotifications recursive callback fix — 0 errors
- **Phase 6 WCAG**: NotificationPreferences inputs id+htmlFor (Level A 3.3.2), PushPermissionPrompt aria-live assertive (4.1.3), prefers-reduced-motion ×3 CSS (2.2.2)
- **Phase 6 QA**: china-audit.sh ✅ PASS, type-check Exit 0, build Exit 0



#### Fixed
- **SQL injection** in `notifications.ts` — all 4 queries migrated to `pb.filter()` parameterized format
- `listAll()` changed from `getFullList` to paginated `getList(1, 20)` to prevent loading unbounded records
- Added `listPaginated()` and `requestKey` for cancel-safe notification queries

#### Added
- **PocketBase schema**: `push_subscriptions` collection (endpoint, p256dh, auth_key; `idx_push_subs_user`)
- **PocketBase schema**: `notification_preferences` collection (push/email toggles, quiet hours, IANA timezone; UNIQUE `user_id`)
- **PocketBase schema**: `notifications` collection extended — `priority` (normal|urgent), `expires_at`, `delivered` fields; 4 new types
- **PocketBase schema**: `training_plans.day_notes` JSON field for per-day coach notes
- **PocketBase indexes**: `idx_notif_prefs_tz_enabled`, `idx_notifications_expires`, `idx_notifications_delivered`
- **TypeScript**: `PushSubscriptionsRecord`, `NotificationPreferencesRecord` interfaces; `NotificationPriority` type
- **TypeScript**: `NotificationType` expanded to 8 values (+low_readiness, coach_note, invite_accepted, competition_upcoming)
- **Zod**: `validation/push.ts` — `PushSubscriptionSchema` + `NotificationPreferencesSchema` (IANA regex, HH:MM validation)
- **Validation**: `TrainingPlansSchema.day_notes` field added
- **UI**: `CompetitionCountdown` component (glassmorphism, A-priority urgency style, 0 days until highlight)
- **Service**: `getNextCompetition(season)` in `peaking.ts` — returns nearest future competition from expanded season
- **Dashboard**: `AthleteDashboard` integrates `CompetitionCountdown` (lazy loads from athlete's latest season)
- **i18n**: `athleteDashboard.competition` + `athleteDashboard.daysUntil` keys added ×3 locales (RU/EN/CN)
- `Collections.PUSH_SUBSCRIPTIONS`, `Collections.NOTIFICATION_PREFERENCES` constants

## [0.1.0] — 2026-02-21 — Track 4.16 + Previous Tracks

### 2026-02-21 — Track 4.16 Phase 1: DB Integrity — Critical FK + Service Bug Fixes

#### Fixed
- **PocketBase**: `seasons.athlete_id` FK target corrected — was `_pb_users_auth_` (users), now `pbc_401194191` (athletes). Also `cascadeDelete: false` (was `true` — dangerous). Fix applied via two-step MCP API (delete old field → create new field)
- **`customExercises.ts`**: Filter `deleted = false` → `deleted_at = ""` in `listMyCustomExercises` (line 61) and `listApprovedCommunityExercises` (line 104). Field `deleted` (bool) never existed — `deleted_at` (date) is correct soft-delete field
- **`customExercises.ts`**: Soft-delete in `deleteCustomExercise`: `{ deleted: true }` → `{ deleted_at: new Date().toISOString() }`
- **`types.ts`**: Corrected comment on `SeasonsRecord.athlete_id` — `// FK → users` → `// FK → athletes`

### 2026-02-21 — Track 4.16 Phase 2: API Rules Hardening

#### Security
- **PocketBase `training_logs`**: Hardened from `@request.auth.id != ""` to `athlete_id.coach_id = @request.auth.id || athlete_id.user_id = @request.auth.id` for list/view/create/update. Delete restricted to coach only
- **PocketBase `daily_checkins`**: Same hardened rules as training_logs
- **PocketBase `training_plans`**: list/view: `phase_id.season_id.coach_id = @request.auth.id || athlete_id.user_id = @request.auth.id`; create/update/delete: coach only via relation chain
- **PocketBase `plan_assignments`**: list/view: `plan_id.phase_id.season_id.coach_id || athlete_id.user_id`; create/update/delete: coach only
- **PocketBase `seasons`**: listRule/viewRule extended to allow athlete access via `athlete_id.user_id = @request.auth.id`

### 2026-02-21 — Track 4.16 Phase 3: Medium & Low DB Integrity Fixes

#### Fixed
- **`seasons.ts`**: Removed dead `'self'` special case in `listSeasons()` — callers must pass real `athleteId` from athletes collection (was found unused by grep scan)

#### Added
- **PocketBase `athletes`**: Added `CREATE UNIQUE INDEX idx_athletes_user ON athletes (user_id) WHERE user_id != ''` — prevents duplicate athlete records for same user

#### Changed
- **`athletes.ts`**: `hardDeleteAthleteWithData()` comment updated — architectural decision documented: athlete-owned seasons are FULLY deleted (not just unlinked)

---


### 2026-02-21 — Track 4.15 Phase 1: Training Templates & Warm-Up System — PB Schema + Types + Service

#### Added
- **PocketBase**: `training_templates` collection — coach_id, name_ru/en/cn, type (warmup/training_day), total_minutes, is_system, description_ru/en/cn; API Rules: coach_id || is_system for list/view; index `idx_templates_coach`
- **PocketBase**: `template_items` collection — template_id (cascade), order, block (warmup/main), exercise_id (nullable), custom_text_ru/en/cn, duration_seconds, sets, reps, intensity, weight, distance, rest_seconds, notes; index `idx_items_template`
- **PocketBase**: 5 new fields in `plan_exercises` — `block` (select: warmup/main), `custom_text_ru/en/cn` (nullable text), `source_template_id` (relation→training_templates); `exercise_id` made nullable; composite index `idx_planex_block`
- **Seed Data**: 6 system templates (3 warmup: Training 15m, Competition 25m, Recovery 20m; 3 training_day: Jump Day, Strength Day, Speed Day) with is_system=true
- **`types.ts`**: `TrainingTemplateRecord`, `TemplateItemRecord`, `TemplateType`, `TemplateItemBlock`, `PlanExerciseBlock` — new interfaces; `PlanExercisesRecord` updated (exercise_id nullable, block, custom_text_*, source_template_id)
- **`collections.ts`**: `TRAINING_TEMPLATES`, `TEMPLATE_ITEMS` constants
- **`validation/templates.ts`**: Zod schemas — `TrainingTemplateSchema`, `TemplateItemSchema`, `AddWarmupItemSchema`
- **`services/templates.ts`**: Full CRUD (`listTemplates`, `getTemplate`, `createTemplate`, `updateTemplate`, `deleteTemplate`, `copyTemplate`), Template Items CRUD (`addTemplateItem`, `updateTemplateItem`, `removeTemplateItem`, `reorderTemplateItems`), Warmup ops (`stampTemplate`, `ejectTemplate`, `addWarmupItem`)

#### Changed
- **`validation/training.ts`**: `PlanExercisesSchema` — `exercise_id` made optional, added `block`, `custom_text_*`, `source_template_id`
- **`AthleteTrainingView.tsx`**: `getExerciseName()` handles nullable `exercise_id` with `custom_text_*` fallback; `handleSave` skips warmup items without `exercise_id`
- **`TrainingLog.tsx`**: `ExerciseState.exerciseId` made optional; warmup items filtered out from logging UI; `batchSaveLogExercises` call uses type guard filter

---

### 2026-02-21 — Track 4.15 Phase 2: Training Library UI

#### Added
- **`reference/templates/page.tsx`**: Training Library page — tabs (Warm-Ups / Training Days), system + custom sections, loading/error states, integrated TemplateList + TemplateEditor
- **`TemplateList.tsx`**: Glassmorphism card list with Copy (system), Edit / Delete (own) buttons; localized names; Lucide icons
- **`TemplateEditor.tsx`**: Bottom-sheet modal with DnD reorder (@dnd-kit/sortable), 3-locale name inputs, ExercisePicker (PB search), CustomStepForm, warmup/main sections, create + edit logic
- **CSS Modules**: `templates.module.css`, `TemplateList.module.css`, `TemplateEditor.module.css` — Athletic Minimal + Glassmorphism design
- **i18n**: 45+ new keys in `messages/ru`, `messages/en`, `messages/cn` under `templates.*`
- **`reference/page.tsx`**: New Training Templates card (`LayoutList` icon → `/reference/templates`)
- **Dependencies**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` installed

#### Verified
- `pnpm type-check` — exit 0
- `pnpm build` — exit 0, `/[locale]/reference/templates` built in ru/en/cn

---

### 2026-02-21 — Track 4.15 Phase 3: WeekConstructor Integration

#### Changed
- **`DayColumn.tsx`**: Визуальное разделение warmup/main секций; `WarmupTemplatePicker` dropdown (загружает шаблоны из PB); `AdHocWarmupStepBtn` (inline форма кастомного шага); `WarmupCard` для custom_text items (nullable exercise_id); eject кнопка; новые props `onStampTemplate/onEjectWarmup/onAddWarmupItem`
- **`DayColumn.module.css`**: Новые стили warmupSection, sectionDivider, warmupCard, warmupBtn, warmupDropdown, adHocForm
- **`WeekConstructor.tsx`**: Handlers `handleStampTemplate/handleEjectWarmup/handleAddWarmupItem`; передача в `DayColumn`; import `stampTemplate/ejectTemplate/addWarmupItem`
- **`services/plans.ts`**: `calculateWeeklyCNS()` фильтрует `block === 'warmup'` — не учитывает их в CNS нагрузке
- **i18n** (ru/en/cn): 6 новых ключей в `training.*`: `warmupBlock`, `mainBlock`, `warmupPicker`, `warmupPickerEmpty`, `ejectWarmup`, `addWarmupStep`

#### Verified
- `pnpm type-check` — exit 0
- `pnpm build` — exit 0

---

### 2026-02-21 — Track 4.15 Phase 4: Athlete View + Warmup Badge

#### Added
- **`WarmupItem`** (в `AthleteTrainingView.tsx`): простая li с именем и длительностью — без RPE/Sets UI
- **`WarmupBadge`** (в `AthleteTrainingView.tsx`): collapsible секция разминки, свёрнута по умолчанию; атлет не видит название шаблона

#### Changed
- **`LoggableSession`**: split `exercises` → `warmupItems` / `mainItems`; warmup → `WarmupBadge`, main → `ExerciseItem` (RPE/Sets, как прежде)
- **`AthleteTrainingView.module.css`**: новые классы `.warmupBadge`, `.warmupBadgeHeader`, `.warmupBadgeTitle`, `.warmupList`, `.warmupItem`, `.warmupItemDur`

#### Verified
- `pnpm type-check` — exit 0
- `pnpm build` — exit 0
- `pnpm test` — 16/16 pass


#### Added
- **`planAssignments.ts`**: новый сервис — `assignPlanToAthlete`, `assignPlanToGroup`, `unassignPlan`, `deletePlanAssignment`, `listActivePlanAssignments`, `duplicatePlan`, `createIndividualOverride`
- **`groups.ts`**: расширен — `listGroupMembers`, `removeGroupMember`, `updateGroup`, `deleteGroup`
- **`SeasonDetail.tsx`**: кнопка «Assign» в PhaseCard → AssignPanel (вводить group ID, назначать опубликованный план)
- **`GroupsPage`**: collapsible members panel, delete group (soft-delete), remove member
- **`SeasonDetail.module.css`**: `phaseActions`, `assignBtn`, `assignPanel`, `assignRow`, `assignInput`, `assignConfirmBtn`
- **`groups.module.css`**: `membersPanel`, `membersList`, `memberItem`, `deleteBtn`, `removeBtn`
- **i18n EN/RU/CN**: `assign`, `assignHint`, `groupIdPlaceholder`, `manageGroups`

### 2026-02-21 — Track 4.14 Phase 3: Unified Athlete Logging + 7-Day Week View


#### Added
- **`logs.ts`**: unified module — `getPublishedPlanForToday`, `listTodayLogs`, `createTrainingLog`, `listWeekLogs`, `getOrCreateLog(session)` — единый сервис логирования
- **`trainingLogs.ts`**: конвертирован в re-export shim → `logs.ts` (backward-compatible)
- **`AthleteTrainingView.tsx`**: полная переработка — 7-day scroll view, week navigation (±недели), AM/PM session группировка через `groupByDayAndSession`, weekly log map
- **`AthleteTrainingView.module.css`**: новые классы `weekNav`, `weekNavBtn`, `weekScroll`, `dayCard`, `dayCardToday`, `dayCardHeader`, `sessionBlock`, `startLogBtn`
- **`TrainingLog.tsx`**: добавлен `session` prop (default=0=AM), передаётся в `getOrCreateLog`

### 2026-02-21 — Track 4.14 Phase 2: Multi-Session AM/PM + Unit-Aware Plan Editing


#### Added
- **`plans.ts`**: `addExerciseToPlan` теперь принимает `session` (0=AM, 1=PM) + unit fields (weight, duration, distance, rest_seconds)
- **`plans.ts`**: `groupByDayAndSession()` — группировка по дню И сессии `Record<day, Record<session, exercises[]>>`
- **`plans.ts`**: `updatePlanExercise` расширен — weight, duration, distance, rest_seconds, session
- **`DayColumn.tsx`**: полная поддержка AM/PM сессий — SessionBlock с заголовками (Sun=AM/Moon=PM), кнопка «+ PM Session»
- **`DayColumn.tsx`**: unit-aware `ExerciseCard` — адаптивный ввод по `unit_type`: weight→kg, distance→m, time→sec, reps→reps×intensity
- **`DayColumn.module.css`**: CSS классы `.sessionBlock`, `.sessionHeader`, `.sessionHeaderPM`, `.addSessionBtn`
- **`WeekConstructor.tsx`**: `pickerSession` state, `handleAddExercise` передаёт session, `handleReorder` работает внутри сессий
- **i18n** (EN/RU/CN): `training.sessionAM`, `training.sessionPM`, `training.addSession`
- **`UpdateExerciseData`** type экспортируется из `DayColumn.tsx`



#### Added
- **PocketBase**: 5 new fields in `plan_exercises` — `session` (int, AM=0/PM=1), `weight`, `duration`, `distance`, `rest_seconds`
- **PocketBase**: 2 new fields in `training_plans` — `athlete_id` (FK → athletes, for individual overrides), `parent_plan_id` (FK → self, for override chain)
- **PocketBase**: 1 new field in `training_logs` — `session` (int, default 0)
- **PocketBase**: New `plan_assignments` collection — `plan_id` (cascade delete), `athlete_id`, `group_id`, `status` with 3 indexes
- **UNIQUE index**: `training_logs` updated from `(athlete_id, plan_id, date)` → `(athlete_id, plan_id, date, session)` to support AM/PM sessions
- **`types.ts`**: `PlanExercisesRecord`, `TrainingPlansRecord`, `TrainingLogsRecord` updated with new fields; `SetData` extended with `height`/`result` for jump attempts; `PlanAssignmentsRecord` type added
- **`collections.ts`**: `PLAN_ASSIGNMENTS` constant added
- **`validation/planAssignments.ts`**: Zod schema for `plan_assignments` with refine check (athlete_id or group_id required)
- **`validation/training.ts`**: `PlanExercisesSchema` + `TrainingPlansSchema` updated with new fields

#### Note
- `athletes.user_id` already existed in PB schema — confirmed and kept as-is



#### Fixed
- `LoginForm.tsx`: added `useRef` fallback for email/password — handles iOS autofill and password managers that inject values without triggering `onChange`
- `SeasonWizard.tsx`: replaced "Myself" default with "Select athlete" placeholder (`disabled` option) — coach must select an athlete (self-athlete removed in 4.12)
- `SeasonWizard.tsx`: added `isBasicsValid` check requiring athlete selection for coaches with athletes
- `SeasonWizard.tsx`: 3 hardcoded EN error strings → i18n keys (`errors.authLoading`, `errors.notLoggedIn`, `training.createFailed`)
- `SeasonWizard.tsx`: replaced 3 text `✕` symbols with Lucide `<X>` icon component
- `warmup/page.tsx`: hardcoded `мін` (lines 194, 201) → `{t('min')}` i18n key
- `AthleteDashboard.tsx`: inline `style={{}}` on BarChart2 icon → CSS module class `.chartIcon`
- `dashboard/page.tsx`: consolidated duplicate `@/i18n/navigation` imports

#### Added
- `dashboard/page.tsx` + `dashboard.module.css`: ⚡ Quick Plan shortcut button on Coach Dashboard (outline secondary style, links to `/training`)
- `AthleteDashboard.module.css`: `.chartIcon` utility class for inline icon alignment
- 7 new i18n keys × 3 locales (EN/RU/CN): `errors.authLoading`, `errors.notLoggedIn`, `training.selectAthlete`, `training.noAthletesHint`, `training.createFailed`, `warmupPage.min`, `dashboard.quickPlan`

#### Won't Fix
- Date input placeholders (`ДД.ММ.ГГГГ` in EN) — native `<input type="date">` behavior, controlled by OS/browser
- Greeting locale mixing (`Hey, Кириллов!`) — by design: `user.name` is user data in any script, i18n keys already locale-dependent

### 2026-02-21 — Track 4.12: Audit Bug Fixes

#### Fixed
- `AthleteDetailClient.tsx`: `checkin?.readiness_score` access bug replaced with `calculateReadiness()`
- `dashboard/page.tsx` & `AthleteDashboard.tsx`: inline readiness calculation bug replaced with `calculateReadiness()` for a unified source of truth
- `AthleteTrainingView.tsx`: hardcoded `DAY_NAMES` replaced with `training.day_*` i18n keys

#### Removed
- `readiness.ts`: removed `getSelfAthleteId` self-athlete auto-creation logic for coaches (Track 4.8 removal follow-up)
- `athletes.ts`: removed unused self-athlete exclusion filter from `listMyAthletes()`
- `training/page.tsx`: removed coach-side readiness check-in logic (state, effects, handlers, modals)
- `SeasonDetail.tsx`: removed readiness-related props tied to the old check-in modal

#### Added
- `tokens.css`: added utility classes `.sr-only` and `.hidden-mobile`
- `groups.ts`: added coach role guard to `joinByInviteCode()` preventing coaches from joining groups
- `analytics/page.tsx`: added Analytics Role Guard — athletes now load their own data directly without the athlete selector
- `AthleteDashboard.tsx`: replaced `↩` string with `RotateCcw` Lucide icon

### 2026-02-21 — Track 4.11: Debt Closure

#### Fixed
- `dashboard/page.tsx:51` — `let groupMap` → `const groupMap` (prefer-const)
- `layout.tsx:15` — removed unused `eslint-disable` directive
- `ShowAthleteOverlay.module.css:56,79` — `#ffffff` → `var(--color-text-inverse)`
- EN `constructor` section — 5 hardcoded RU strings → English

#### Changed
- `SeasonWizard.tsx` — priority emoji (🔺🔸🔹) → `.priorityDot` CSS classes (5 locations)
- `SeasonDetail.tsx` — priority emoji → `.priorityDot` CSS classes (2 locations)
- `AthleteDetailClient.tsx:155` — ♂♀ symbols → `t('male')`/`t('female')` i18n keys
- `TestResultCard.tsx:31` — ▲▼ emoji → Lucide `TrendingUp`/`TrendingDown` icons
- `analytics/page.tsx` — 3 RU hardcoded strings → i18n keys, 2 inline styles → CSS classes
- `ErrorBoundary.tsx` — 3 RU strings → `labels` prop with EN fallbacks
- `ErrorBoundaryWrapper.tsx` + `protected/layout.tsx` — pass i18n labels to `<ErrorBoundary>`
- `NotificationBell.tsx` — 5 RU fallbacks → EN defaults
- `ThemeToggle.tsx` — 5 RU strings → `useTranslations('settings')`
- `LocaleSwitcher.tsx` — RU aria-label → `t('appLanguage')`
- `CnsHeatmap.tsx` — 4 hardcoded RU/locale-switch → `useTranslations('analytics')`
- `AchievementsGrid.tsx` — inline CATEGORY_LABELS map → `t('category_*')`
- `ExerciseConstructor.tsx` — 2 RU placeholders → i18n keys

#### Added
- ~20 new i18n keys × 3 locales (EN, RU, CN) — errors, analytics, athleteDetail, constructor
- `.headerActions`, `.addTestBtn` CSS classes in `analytics.module.css`
- `.priorityDot` CSS classes in `SeasonWizard.module.css` + `SeasonDetail.module.css`
- PWA icons: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`
- `ARCHITECTURE.md` — Offline/Dexie.js marked as *(planned — Track 6)*

### 2026-02-21 — Track 4.9 Phase 5: Dashboard Polish + ErrorBoundary

#### Fixed
- `dashboard/page.tsx`: 2 inline styles removed → `.addBtnCentered`, `.emptyStateFull` CSS classes
- `dashboard/page.tsx`: group filter now uses `groupId` from enriched `AthleteWithStats` (was `a.group_id` which was always undefined)

#### Added
- `layout.tsx`: `<ErrorBoundary onError={handleError}>` wraps all protected pages with auto-telemetry reporting to PocketBase `error_logs` collection
- `AthleteCard.tsx`: group badge (Tag icon + group name) displayed when athlete belongs to a group
- `athletes.ts`: `groupId` and `groupName` optional fields added to `AthleteWithStats`
- `dashboard/page.tsx`: `group_members` enrichment via PocketBase expand — loads group info for all athletes in one query
- CSS: `.groupBadge` in `AthleteCard.module.css`, `.addBtnCentered` + `.emptyStateFull` in `dashboard.module.css`
- i18n: `dashboard.group`, `dashboard.allGroups`, `dashboard.filterByGroup` × 3 locales

#### Fixed
- `settings/page.tsx`: 3 inline styles removed → CSS classes (`backBtn`, `rowActions`, `rowBlock`, `chevronIcon` animation, `a.row`)
- `AthleteDetailClient.tsx`: hardcoded `'лет'` → `t('yearsOld')`, `'cm'` → `t('cm')`
- `AthleteDetailClient.tsx`: 4 skeleton inline style blocks → `.skeletonHero`, `.skeletonGrid`, `.skeletonStack` CSS classes

#### Added
- `settings/page.tsx`: password **strength bar** (4 levels: weak/fair/good/strong)
- `settings/page.tsx`: athlete profile section (read-only height + birth_date) for `role=athlete`
- CSS: `backBtn`, `chevronIcon`, `rowBlock`, `profileField`, `strengthBar`, `strengthFill` in `settings.module.css`
- CSS: `skeletonHero`, `skeletonGrid`, `skeletonStack` in `athleteDetail.module.css`
- i18n: `settings.height`, `settings.cm`, `settings.birthDate` × 3 locales
- i18n: `athleteDetail.yearsOld`, `athleteDetail.cm` × 3 locales

### 2026-02-20 — PocketBase Schema Fixes + Test Data + MCP

#### Fixed
- **coach_preferences** — added missing `onboarding_complete` (bool) field to PB schema — coach was stuck in onboarding loop on every login
- **achievements.type** — updated select values from 4 generic types to 13 specific types matching `types.ts` (`first_workout`, `streak_7d`, etc.) — gamification was completely broken
- **test_results.value** — fixed `max=0` constraint → `max=9999` — saving any test result was impossible
- **page.tsx** — authenticated users now auto-redirect from landing page to `/dashboard` instead of seeing login/register buttons
- **athlete/[id]** — fixed 500 error on athlete detail page: added nginx `try_files` fallback to route dynamic athlete IDs to placeholder.html shell (React Router handles the real ID client-side)
- **readinessHistory.ts** — fixed `sleep_duration` → `sleep_hours` field name mismatch causing empty readiness heatmap
- **CnsHeatmap** — reduced from 12 to 4 weeks, added score numbers inside cells, mobile tap support

#### Added
- **PocketBase MCP** — `dynamic-pocketbase-mcp` integrated in `mcp_config.json` (replaced broken `@mcpflow.io` package)
- **Test Data** — seeded via MCP: 1 coach (`coach.petrov@test.jumpedia.app`), 3 athletes, group, 2 seasons, 4 phases, 7 plans, 42 checkins, 24 test results, 3 competitions, 9 achievements

### 2026-02-20 — Track 4.9: Coach/Athlete Creation Fixes + QA

#### Fixed
- **BUG-1** `readiness.ts:getSelfAthleteId()` — self-athlete теперь корректно создаётся для обеих ролей через `coach_id` (PB `athletes` не имеет `user_id`)
- **BUG-2** `OnboardingWizard.tsx` — имя пользователя из онбординга сохраняется в PocketBase через `updateUserName()`
- **BUG-3** `preferences.ts:saveMyPreferences()` — `onboarding_complete` включён в PB payload (раньше терялся)
- **BUG-4** `dashboard/page.tsx` — readiness score вычисляется из полей чекина (`sleep_hours`, `sleep_quality`, `mood`, `pain_level`) вместо несуществующего `readiness_score`
- **BUG-6** `AddAthleteModal.tsx` — hardcoded RU ошибка → `t('createFailed')` + eslint dep fix
- **BUG-8** `LoginForm.tsx` — fallback на PB `coach_preferences.onboarding_complete` при отсутствии `localStorage` (новое устройство/инкогнито)
- **BUG-9** `auth.ts` + `AuthProvider.tsx` — дефолт роли унифицирован на `'athlete'` (было `'coach'` непоследовательно)

#### Added
- **i18n** — ключ `dashboard.newAthlete.createFailed` в 3 локалях (RU/EN/CN)

### 2026-02-20 — Track 4.9: QA Bug Fixes

#### Fixed
- **BUG-08** `AthleteDashboard.tsx` — убран `split(' ')[0]` ␲ приветствие теперь показывает полное имя («Привет, QA Athlete!» вместо «Привет, QA!»)
- **BUG-02** `athletes.ts:listMyAthletes()` — self-athlete (созданный через dual-role) больше не попадает в список атлетов тренера (фильтр `user_id !== currentUser.id`)
- **BUG-04** `groups.ts:listMyGroups()` — graceful обработка пустого списка (возвращает `[]` вместо 400 для новых пользователей)
- **BUG-06** `OnboardingWizard.tsx:StepDone` — финальный экран онбординга теперь role-aware: атлет видит свои функции (чекин, план, прогресс, справочник), тренер — свои (планирование, конструктор)

#### Added
- **i18n** — 8 новых ключей `onboarding.done.athleteFeature{1-4}` + `{1-4}Desc` в `messages/{ru,en,cn}/common.json` для ролевого онбординга

### 2026-02-20 — Track 4.7 Extension: i18n + CSS + UX Polish

#### Added
- **i18n** — ~15 новых ключей в `messages/{en,ru,cn}/common.json`: `training.checkin/checkinDone/checkinCreateFailed/checkinSaveFailed`, `dashboard.deleteConfirm/yearsOld`, `analytics.addTestForm.invalidValue/futureDateError/saveFailed/notesPlaceholder`, `analytics.minResults/chartLoading`, `athleteDashboard.reCheckin`
- **ProgressChart.tsx** — новые props: `locale`, `noDataMessage`, `loadingLabel` для полной i18n-ности
- **training.module.css** — 7 новых CSS классов: `.headerActions`, `.checkinBtn`, `.checkinDoneBtn`, `.settingsBtn`, `.wizardLoadingOverlay`, `.wizardLoadingBox`, `.detailLoadingBox`
- **AthleteDashboard.module.css** — UX Quick Wins: `@keyframes fadeIn` (staggered), `@keyframes shimmer`, `.shimmerBar`, CLS fix `min-height: 160px` на `.analyticsLoading`
- **AddTestResultModal.module.css** — `.spinIcon` + `@keyframes spin` (замена inline style)

#### Changed
- **AddTestResultModal.tsx** — 4 hardcoded RU строки → i18n ключи (`tf('invalidValue')`, `tf('futureDateError')`, `tf('saveFailed')`, `tf('notesPlaceholder')`)
- **AddTestResultModal.tsx** — inline spinner `style={{animation}}` → `className={styles.spinIcon}`
- **AthleteCard.tsx** — hardcoded confirm dialog → `t('deleteConfirm', {name})`, `лет` → `t('yearsOld', {age})`
- **ProgressChart.tsx** — hardcoded `'ru-RU'` → dynamic `dateLocale` map, 2 RU строки → props
- **training/page.tsx** — 5 inline styles → CSS classes, hardcoded 'Check-in'/'Ready'/alert strings → i18n
- **training/page.tsx** — SeasonWizardLazy/DetailLazy inline styles → CSS classes
- **AthleteDashboard.tsx** — spinner-based Suspense fallbacks → shimmer skeleton bars, `Обновить` → `t('reCheckin')`

### 2026-02-20 — Track 4.8: Lint Cleanup

#### Fixed
- **ProgressChart.tsx** — рефакторинг `useCssVars`: `useRef` → `useMemo` (устранены `react-hooks/refs` и `react-hooks/set-state-in-effect`)
- **TrainingLoadPie.tsx** — рефакторинг `useCategoryColors`: `useRef` → `useMemo` (те же правила)
- **EditAthleteModal.tsx** — `tDash` добавлен в deps массив `useCallback` (`react-hooks/exhaustive-deps`)
- **SeasonWizard.tsx** — `catch (err: any)` → `err: unknown` с proper narrowing
- **processor.ts** — `errors: any[]` → `unknown[]`
- **patch-exercises.ts** — `let changes` → `const changes` (`prefer-const`)
- **DaySummaryCard.tsx** — `@ts-ignore` → `@ts-expect-error`
- **training/page.tsx** — `any` → `CheckinData` для state и handler; `null → undefined ?? undefined` для initialData
- **11 компонентов** — неиспользуемые переменные с `_prefix` (B-группа)
- **eslint.config.mjs** — `globalIgnores` расширен: `conductor/scripts/**`, `public/sw.js`
- **5 скриптов** — убраны устаревшие `eslint-disable` директивы через `--fix`

### 2026-02-20 — Track 4.7: Bug Fixes + DS Polish

#### Added
- **loading_states_brainstorm.md** — UX Loading States исследование: 6 вариантов решения (Skeleton UI, IndexedDB Cache First, Progressive Reveal, Optimistic UI, CLS fix, Page Transitions), сравнительная таблица, план реализации по трекам

#### Fixed
- **types.ts** — добавлено `user_id?: string` в `AthletesRecord` (поле было в PB, отсутствовало в TypeScript-типе)
- **readiness.ts** — `_getSelfAthleteIdImpl()`: при создании self-athlete устанавливается `user_id: user.id` (dual-role self-link)
- **groups.ts** — `joinByInviteCode()`: заменён ручной lookup через `coach_id` на `getSelfAthleteId()` (единый путь для обоих ролей); sanitize invite code (strip `"` chars — PB filter injection prevention)
- **EditAthleteModal.tsx** — hardcoded Russian error string → i18n ключ `dashboard.updateFailed`
- **forgot-password/page.tsx** — убраны 2 inline styles, заменены на CSS классы `.submitBtnBlock` и `.iconLabel`

#### Added
- **tokens.css** — `--color-text-on-accent: #ffffff` в `:root` и `[data-theme="dark"]` (устранено undefined CSS variable)
- **not-found.tsx** + **not-found.module.css** — страница 404 в `src/app/[locale]/` с DS glassmorphism + `@supports` fallback
- **AuthForms.module.css** — классы `.submitBtnBlock` и `.iconLabel`
- **messages/{ru,en,cn}/common.json** — ключ `dashboard.updateFailed` для трёх локалей

#### Changed
- **groups.module.css** — `.backLink` 36→44px, `.iconBtn` 28→min 44px (touch targets DS), `.input` 14→16px (iOS zoom prevention); добавлен `@supports not (backdrop-filter)` fallback

#### Фаза 3-4 (дополнение)
- **not-found.tsx** — обновлён на `'use client'` + `useTranslations()` с полной i18n поддержкой
- **AuthForms.module.css** — добавлены `.submitBtnBlock`, `.iconLabel`
- **messages/{ru,en,cn}/common.json** — ключи `app.notFound`, `app.notFoundDescription`, `app.goHome`, `auth.resendVerification`
- **EmailVerificationBanner.tsx** — исправлен i18n ключ `sendResetLink` → `resendVerification` (точнее описывает действие)
- **AuthProvider.tsx**, **lib/hooks/useAuth.ts** — добавлены JSDoc comments для документирования разницы двух API

### 2026-02-20 — Track 4.6: Gamification v2 — Achievements + Celebrations

#### Added
- **types.ts** — `AchievementType` расширен с 5 до 13 типов (4 категории: streak/training/testing/compete); удалены `volume_1000`, `season_complete`
- **achievements.ts** — `AchievementProgress`, `CheckAndGrantResult`, `getProgress()` (4 батч-запроса); `ACHIEVEMENTS_BY_CATEGORY` mapping; `computeStreak()` экспортирован
- **computeStreak.test.ts** — 11 unit-тестов для timezone-safe streak вычисления
- **StreakHeroCard.tsx** + CSS Module — hero-number с pulse, best streak, milestone progress, evening warning (≥18:00); glassmorphism + `@supports` fallback
- **useCelebration.ts** — FIFO queue hook (fullscreen 5s / toast 3s auto-dismiss)
- **CelebrationOverlay.tsx** + CSS Module — fullscreen celebration: 30 CSS confetti (deterministic), badge reveal animation, haptic vibrate, sound, Escape dismiss, `aria-modal`
- **CelebrationToast.tsx** + CSS Module — slide-up toast, `aria-live="polite"`, haptic
- i18n: `streakHero.*` + `celebration.*` ключи в `messages/{ru,en,cn}/common.json`

#### Changed
- **AchievementBadge.tsx** — добавлен progress bar для locked ачивок (`role="progressbar"`, ARIA); 4 новые Lucide иконки (Target, Dumbbell, Medal, Flag)
- **AchievementsGrid.tsx** — единственный `checkAndGrant()` call (race condition fix), группировка по 4 категориям, skeleton loading, celebration integration
- **AthleteDashboard.tsx** — lazy-loaded `StreakHeroCard` (Suspense + spinner)

#### Fixed
- **computeStreak()** — timezone-safe: `parseLocalDate()` вместо `new Date(string)` (UTC off-by-one fix)
- **checkAndGrant()** — race condition: возвращает `CheckAndGrantResult` (allEarned + newlyEarned + progress) вместо void

### 2026-02-20 — Cascade Delete Athlete + Hard Delete Support

#### Added
- **athletes.ts** — `hardDeleteAthleteWithData(athleteId)` — каскадное удаление: log_exercises → training_logs → test_results → daily_checkins → seasons (phases→plans→exercises/snapshots, competitions) → achievements → athlete
- **AthleteCard.tsx** — кнопка удаления (Trash2, появляется при hover), window.confirm, `onDelete` prop + `.deleteBtn` CSS
- **DashboardPage** — `handleDelete` с оптимистичным удалением + rollback

### 2026-02-20 — i18n Auto-Detection + Browser Language Mapping

#### Added
- **middleware.ts** — next-intl middleware с `localeDetection: true`, Accept-Language автодетекция
- **detectLocale.ts** (`src/lib/i18n/`) — клиент: `navigator.languages` → ru/cn/en
- **OnboardingWizard.tsx** — дефолт из `detectBrowserLocale()` (не 'ru'); `router.replace(pathname, { locale })` при выборе

### 2026-02-20 — Fix: AthleteTrainingView 400 Error + i18n Phase Names

#### Fixed
- **AthleteTrainingView.tsx** — `user.id` → `getSelfAthleteId()`; 400/404 → empty state
- **messages/ru/common.json** — переводы фаз: PRE_COMP, COMP, TRANSITION

### 2026-02-20 — Bug Fix: Role Selection Moved to Onboarding

#### Fixed
- **OnboardingWizard.tsx** — выбор роли при онбординге теперь **фактически сохраняется**: `handleFinish` вызывает `updateUserRole(role)` перед `saveMyPreferences`; default роли изменён с `'coach'` на `'athlete'`
- **RegisterForm.tsx** — убран дублирующий role selector; при регистрации передаётся временный `'athlete'`, который онбординг перезапишет

#### Added
- **auth.ts** — функция `updateUserRole(role)` для обновления роли текущего пользователя в PocketBase

### 2026-02-20 — Bug Fix: Auth Role Assignment + i18n Key Format

#### Fixed
- **auth.ts** — `registerWithEmail` теперь принимает параметр `role` (default `'coach'` для обратной совместимости)
- **AuthProvider.tsx** — `register()` принимает и передаёт параметр `role` в `registerWithEmail`
- **RegisterForm.tsx** — добавлен radio-selector «Атлет / Тренер» перед кнопкой регистрации; роль передаётся в `register()`; default — `'athlete'`
- **useAuth.ts** — убран ложный fallback `?? 'coach'` → `?? null`, чтобы атлеты не получали роль тренера
- **i18n en/ru/cn** — ключи вида `"protocol.training"` (dot-notation) преобразованы в nested JSON-объекты в секциях `warmupPage` и `mentalPage` (исправлена ошибка `INVALID_KEY` от next-intl)

#### Added
- **i18n** — ключи `auth.role` / `auth.roleAthlete` / `auth.roleCoach` в en/ru/cn
- **AuthForms.module.css** — стили `.roleRow` / `.roleOption` / `.roleActive` для role picker

### 2026-02-19 — Track 4.5 Block B+E: Dashboard Analytics + DS Audit

#### Changed
- **AthleteDashboard.tsx** — добавлены lazy-loaded секции: `ProgressChart` (standing_jump данные) + `AchievementsGrid` (checkAndGrant + Suspense), fetch `listTestResults` после основного check-in load
- **AthleteDashboard.module.css** — добавлены `.analyticsLoading` (spinner placeholder) + `.achievementsSection`

#### Added i18n
- `athleteDashboard.progressTitle` / `jumpChartTitle` / `achievementsTitle` — en/ru/cn

#### Verified
- `pnpm type-check`: 0 ошибок в src/
- `pnpm build`: Exit 0 — Static export успешен
- `china-audit.sh`: PASS — 0 external CDN, 14 woff2 self-hosted
- Emoji audit: новые компоненты emoji-free (mental/page.tsx уже исправлен в Block A)

### 2026-02-19 — Track 4.5 Block A+C: Quick Wins + AthleteTrainingView

#### Added
- **trainingLogs.ts** (`src/lib/pocketbase/services/`) — типы `TrainingLogRecord`.`LogExerciseRecord` + сервисы: `getPublishedPlanForToday`, `createTrainingLog`, `updateTrainingLog`, `listTodayLogs`, `createLogExercise`, `updateLogExercise`
- **AthleteTrainingView** (`src/components/training/`) — компонент просмотра плана дня для атлета: auto-create draft log, RPE слайдер (цветовая шкала 1-10), sets stepper, per-exercise save
- **AthleteTrainingView.module.css** — CSS модуль: glassmorphism cards, мобильный RPE ползунок, touch targets ≥44px

#### Changed
- **ExerciseCatalog.tsx** — добавлен equipment фильтр (chips: barbell/box/dumbbell/mat/hurdles/band/bodyweight), community badge (`status==='approved'`), `badgeRow` layout
- **ExerciseCatalog.module.css** — новые классы `.badgeRow`, `.communityBadge` (success green)
- **exercises.ts** — `searchExercises` принимает `equipment?: string`, фильтрует через `equipment ~ "..."` PocketBase operator
- **mental/page.tsx** — эмодзи иконки заменены на Lucide (Brain, Target, Wind, MessageCircle, Unlock, Zap)
- **training/page.tsx** — role-based routing: `if (isAthlete) return <AthleteTrainingView>`

#### Added i18n
- `training.log.saved` — en/ru/cn
- `exercises.communityBadge` — en/ru/cn (было добавлено ранее для en, теперь ru/cn тоже)
- `exercises.filterEquipment` — уже существовал


#### Added
- **reference/warmup/page.tsx** — 3 warm-up protocols (Training/Competition/Recovery) with phase lists + **Box Breathing Timer** (4-4-4-4 SVG circle animation with play/pause/reset)
- **reference/mental/page.tsx** — 6 Mental Prep cards (Visualization, Pre-Comp Routine, Breathing Focus, Self-Talk, Pressure Release, Performance Mindset) + 5-step pre-competition routine
- **reference/page.tsx** — Added Warmup (`Wind` icon) and Mental Prep (`Brain` icon) navigation cards
- **i18n**: `warmupPage.*` + `mentalPage.*` keys (RU/EN/CN), `reference.categories.warmup/mental` in all 3 locales

### 2026-02-19 — Track 4.5 Phase 3: Athlete Dashboard

#### Added
- **useAuth** (`src/lib/hooks/useAuth.ts`) — reactive hook reading `pb.authStore.record.role`, subscribes to `pb.authStore.onChange`
- **AthleteDashboard** (`src/components/dashboard/AthleteDashboard.tsx`) — athlete role view: greeting, daily check-in card, stats, plan placeholder
- **ReadinessCheckin** (`src/components/dashboard/ReadinessCheckin.tsx`) — 4-slider form (sleep hours/quality, mood, soreness), saves via `saveCheckin()`
- **Role-switch** in `dashboard/page.tsx` — `if (isAthlete) return <AthleteDashboard />` before coach content
- **i18n**: `athleteDashboard.*` keys (22 keys × 3 locales: RU/EN/CN) added to `messages/`

### 2026-02-19 — Track 4.5 Phase 2: QuickPlanBuilder

#### Added
- **QuickPlanBuilder** (`src/components/training/QuickPlanBuilder.tsx`) — localStorage-based bottom sheet constructor for quick workout sessions without season/phase binding
- **QuickPlanBuilder.module.css** — Athletic Minimal + Glassmorphism styling, mobile-first, full dark mode support
- **i18n**: `quickPlan.*` keys (23 keys × 3 locales: RU/EN/CN) added to `messages/`
- **Features**: date picker, duration field, CNS load indicator, exercise list with sets×reps editing, reorder (▲▼), notes textarea, localStorage history (last 30 workouts)
- Integrates `ExercisePicker` with both `library` and `custom` exercise sources

### 2026-02-19 — Track 4.5: Implementation Plan + Exercise Constructor

#### Added
- **implementation_plan.md** — detailed plan for Track 4.5 with 4 phases, ~35 checklist items
- **Exercise Constructor** concept — step-by-step wizard for creating custom exercises
- **Visibility model** for `custom_exercises`: personal → pending_review → approved → rejected
- **PB schema additions**: `visibility`, `approved_by`, `approved_at`, `rejection_reason`, `illustration` fields
- **Admin Exercise Review UI** added to backlog → Track 6

#### Changed
- **gate.md** — updated to 4 phases with ~35 checkboxes (was 27), added ExerciseConstructor + visibility items
- **backlog.md** — added Admin Exercise Review UI entry for Track 6
- Exercise Catalog confirmed at `/reference/exercises` (inside Reference section)
- Athlete Dashboard confirmed as role-switch (same routes, different components)

### 2026-02-19 — Track 4.5: UX Core created

#### Added
- **Track 4.5: UX Core** — new track inserted between Track 4 (Analytics) and Track 5 (Video)
- **gate.md** with 27 checkboxes across 4 sections: Exercise Catalog, Daily Training Builder, Athlete Dashboard, Warmup & Mental Prep
- GAP analysis report comparing legacy v1 features vs current v2 implementation

#### Changed
- **tracks.md** — Track 4.5 set to 🔵 Active, Track 5 moved to 🟡 Next, timeline updated to 33-40 days

### 2026-02-20 — Track 4.5: Integration (Navigation + Auth Guard)

#### Added
- **BottomTabBar**: 5-tab navigation bar (Dashboard, Training, Analytics, Reference, Settings) with glassmorphism, locale-aware links, active state highlighting, ARIA roles
- **AuthGuard**: protects `(protected)` routes, redirects unauthenticated users to `/auth/login` with `returnTo` parameter
- **Route Groups**: `(protected)` and `(public)` groups for clean separation of authenticated vs public pages
- **Account section** in Settings: displays user name/email + Logout button
- `returnTo` support in LoginForm: redirects user back to the page they were trying to access after login
- i18n keys: `nav.dashboard`, `nav.reference`, `settings.account` in 3 locales (EN, RU, CN)

#### Fixed
- `dashboard/page.tsx`: `handleAthleteClick` now uses `@/i18n/navigation` router (was missing locale prefix)
- LoginForm: default redirect after login changed from `/training` to `/dashboard`
- `reference/` moved from `(public)` to `(protected)` route group — BottomTabBar now visible on Reference pages


### 2026-02-19 — Bugfixes: Reference slug + LocaleSwitcher

#### Fixed
- `reference/[slug]/page.tsx` — split into server wrapper (`page.tsx` with `generateStaticParams`) + `ReferenceArticleClient.tsx` (`'use client'`). Fixes Next.js error "cannot use both 'use client' and generateStaticParams"
- `LocaleSwitcher.tsx` — `router.push()` → `router.replace()` so back button navigates to previous page instead of cycling through locale changes
- `settings/page.tsx` — removed `language` from local state (was conflicting with `LocaleSwitcher`); `handleSave` now always uses current `locale` from `useLocale()` — "Saved!" toast now works on all 3 languages
- `settings/page.tsx` — back button changed from `router.back()` to `<Link href="/{locale}/dashboard">` for deterministic navigation (no more cycling through locale history)

### 2026-02-19 — WeekConstructor Toolbar Fix + Design Token Finalization

#### Fixed
- WeekConstructor toolbar: added missing `.actionsRight`, `.multiViewBtn`, `.publishBtn` CSS classes — buttons now display horizontally
- WeekConstructor TSX: publish button uses semantic `.publishBtn` class instead of `.autoFillBtn`

#### Changed
- Replaced `border-radius: 50%` → `var(--radius-full)` in 9 files (10 occurrences)
- Replaced hardcoded `font-size: 0.65–0.75rem` → `var(--text-xs)` in DayColumn, DaySummaryCard
- Replaced `rgba(239, 68, 68, 0.1)` → `var(--color-danger-light)` in WeekConstructor, SeasonWizard, AuthForms
- Tokenized `padding`, `font-weight`, `transition` values in DaySummaryCard, MultiWeekView
- Replaced hardcoded priority hex colors → `var(--color-priority-*-bg/text)` in SeasonDetail
- Replaced `background: #fff` → `var(--color-bg-primary)` in settings toggle thumb
- Replaced `z-index: 10` → `var(--z-raised)` in MultiWeekView sticky header
- Replaced `blur(24px)` → `blur(var(--glass-blur))` in ExercisePicker sheet

### 2026-02-19 — Track 6: Design System Compliance Fix

#### Added
- `tokens.css` — alias layer (13 short-name variables mapping to canonical tokens), `--glass-overlay-blur`, `--radius-xs`, `--z-tooltip`, 6 priority-color tokens, all with dark mode variants

#### Changed
- `PlanHistoryModal.module.css` — full rewrite: all values via tokens, `@supports` fallback, `-webkit-backdrop-filter`, 44px touch targets
- `training.module.css` — 6 hex competition colors → `--color-priority-*` tokens, `white` → `--color-text-inverse`, `blur(4px)` → token
- `TrainingLog.module.css` — `z-index: 200` → `var(--z-overlay)`, blur → token, `@supports` fallback, `border-radius: 3px` → `var(--radius-xs)`
- `DayColumn.module.css` — `#fff` × 2 → `var(--color-text-inverse)`
- `ExercisePicker.module.css` — `#fff` → `var(--color-text-inverse)`
- `SeasonWizard.module.css` — `blur(4px)` → token, `-webkit-backdrop-filter`, `@supports` fallback, `color: white` → token
- `SeasonDetail.module.css` — `color: white` × 2 → `var(--color-text-inverse)`
- `WeekConstructor.module.css` — `@supports` fallback for toolbar glassmorphism
- `AddTestResultModal.module.css`, `AddAthleteModal.module.css` — `blur(4px)` → `var(--glass-overlay-blur)`
- `CnsHeatmap.module.css`, `NotificationBell.module.css` — `border-radius: 2px` → `var(--radius-xs)`
- `settings.module.css` — `#fff` → `var(--color-text-inverse)`
- `NotificationBell.tsx` — emojis (📋⏰🏆ℹ️) → Lucide icons (ClipboardList, Clock, Trophy, Info)
- `WeekConstructor.tsx` — emojis (⚠️📅🖨️📄🕒💾) → Lucide icons (AlertTriangle, CalendarDays, Printer, FileText, History, Save)

### 2026-02-19 — Track 4 Phase 4.6: Theme + i18n Switcher + China Audit

#### Added
- `ThemeProvider.tsx` — React context: light/dark/auto modes, localStorage persistence (`jp-theme`), system `prefers-color-scheme` listener
- Anti-FOUC inline `<script>` in `layout.tsx` — reads localStorage before React hydrates
- `ThemeToggle.tsx` + CSS Module — 3-way pill (Sun/Monitor/Moon), aria-pressed, 44px touch targets
- `LocaleSwitcher.tsx` + CSS Module — RU/EN/中文 pill, useRouter redirect on locale change
- `scripts/china-audit.sh` — bash audit: 15+ blocked patterns, self-hosted fonts check, exit code 0/1

#### Changed
- `layout.tsx` — wrapped with `ThemeProvider`, added anti-FOUC script in `<head>`
- `settings/page.tsx` — replaced select dropdowns with `ThemeToggle` + `LocaleSwitcher` pills; emoji 🌙📏 → Lucide Moon/Ruler; removed redundant theme localStorage logic

### 2026-02-19 — Track 4 Phase 4.5: Reference + Scientific

#### Added
- `reference/page.tsx` — hub page: 4 glass category cards (technique/errors/periodization/injuries) + scientific featured card
- `reference/[slug]/page.tsx` — 4 articles with `generateStaticParams`; content from i18n JSON via `t.raw()`
- `reference/scientific/page.tsx` — TRA vs DUP comparison table (scrollable mobile) + peaking rules list
- `reference/reference.module.css` — glass cards, 2→4 col grid, article layouts (phase steps, error cards, period table, injury cards, sci table)
- i18n: `reference.*` keys in RU/EN/CN — all content trilingual via Python script

### 2026-02-19 — Track 4 Phase 4.4: Achievements + Notifications

#### Added
- `AchievementsRecord` type updated: 5 specific types (streak_7d, streak_30d, volume_1000, first_pb, season_complete)
- `achievements.ts` service: `listAchievements`, `checkAndGrant` (streak/volume/pb/season logic), `ACHIEVEMENT_META` (icons + trilingual labels)
- `notifications.ts` service: `listUnread`, `markRead`, `markAllRead`, `countUnread`
- `AchievementBadge.tsx` — glass card: gold border for unlocked, grayscale/dim for locked, popIn animation
- `AchievementsGrid.tsx` — 2→3→5-col responsive grid, parallel checkAndGrant + listAchievements, skeleton shimmer
- `NotificationBell.tsx` — 44px touch target, red badge count, glass dropdown, mark-read, aria accessible
- i18n: `achievements`, `notifications.*` keys in RU/EN/CN

#### Changed
- `analytics/page.tsx` — NotificationBell in header, AchievementsGrid section after CnsHeatmap

### 2026-02-19 — Track 4 Phase 4.3: Training Load Pie + CNS Heatmap

#### Added
- `TrainingLoadPie.tsx` — Recharts PieChart (lazy donut) with category color tokens
- `CnsHeatmap.tsx` — pure CSS Grid readiness heatmap (7×N weeks), hover tooltips
- `trainingLoad.ts` service — aggregation by `training_category` for seasons
- `readinessHistory.ts` service — `calculateReadiness` wrapper for daily_checkins
- `--color-highjump` and `--color-jump` tokens in `tokens.css`
- i18n: `trainingLoad`, `cnsHeatmap`, `selectSeason` keys in RU/EN/CN
- Season selector on analytics page for Pie chart data source

#### Changed
- `analytics/page.tsx` — integrated TrainingLoadPie + CnsHeatmap + season selector

### 2026-02-19 — Track 4 Phase 4.2: Analytics + Test Results

#### Added
- `testResults.ts` — service: CRUD, `enrichWithDelta` (delta + PB detection), `testUnit`, `isLowerBetter` для спринта
- `ProgressChart.tsx` — lazy Recharts LineChart (`next/dynamic`), CSS vars через `getComputedStyle`, glassmorphism tooltip, skeleton shimmer
- `TestResultCard.tsx` — PB gold badge, delta chip ▲/▼ (`color-mix()`), icon mapping (Zap/Timer/Dumbbell)
- `AddTestResultModal.tsx` — bottom sheet, 7 типов, валидация (value > 0, no future dates), `Loader2` spinner
- `analytics/page.tsx` — athlete selector, scrollable test tabs, chart + results grid (last 6), empty state with CTA
- i18n `analytics.*` в RU/EN/CN (7 типов тестов + форма)

#### Fixed (DS Audit)
- `dashboard.module.css` — `var(--space-24)` → `calc(var(--space-20) + var(--space-4))`, `hsl()` fallback → `var(--color-accent-light)`
- `AddAthleteModal.module.css` — `hsl()` fallback → `var(--color-accent-light)`
- `AddAthleteModal.tsx` — `'...'` loading text → `<Loader2>` Lucide icon

---

### 2026-02-19 — Track 4 Phase 4.1: Coach Dashboard

#### Added
- `athletes.ts` — CRUD service: `listMyAthletes`, `createAthlete`, `updateAthlete`, `deleteAthlete`, `getLatestCheckin`, `readinessLevel`
- `app/[locale]/dashboard/page.tsx` — Coach Dashboard: athlete grid + quick stats (total/active today/avg readiness)
- `AthleteCard.tsx` — Glassmorphism card: avatar initials, readiness color-coded bar, relative last-log date
- `AddAthleteModal.tsx` — Bottom-sheet modal for creating new athletes
- i18n `dashboard.*` in RU/EN/CN

---

### 2026-02-19 — Track 3: Onboarding Wizard


#### Added
- `OnboardingWizard.tsx` — 4-step wizard (Welcome, Profile, Preferences, Done) with glassmorphism card and slide animation
- `onboarding.module.css` — full design-system-compliant styles (all tokens, mobile-first 375px, touch targets ≥44px)
- `/onboarding` route — `src/app/[locale]/onboarding/page.tsx`
- `completeOnboarding()` in `preferences.ts` — saves `onboarding_complete: true` to PB + sets `localStorage.onboarding_done`
- i18n keys `onboarding.*` in RU, EN, CN (welcome, profile, prefs, done steps)

#### Changed
- `RegisterForm.tsx` — post-registration redirect changed to `/onboarding`
- `LoginForm.tsx` — checks `localStorage.onboarding_done`; returns to `/onboarding` if wizard not yet finished
- `CoachPreferencesRecord` + `CoachPreferencesSchema` — added `onboarding_complete?: boolean`

### 2026-02-19 — Track 3: Data Isolation + Auto-Volume + DS Compliance

#### Changed
- `seasons.ts` — `listSeasons()` now filters by `coach_id` (security: users only see own seasons)
- `SeasonWizard.module.css` — replaced 4 hardcoded hex colors with CSS custom properties
- `TrainingLog.module.css` — replaced 1 hardcoded `#fff` with `var(--color-text-inverse)`

#### Added
- `adaptation.ts` — `applyPreCompReduction()`: auto-reduces sets by 40% when competition ≤ 2 days away
- i18n key `training.preCompReduction` in RU, EN, CN

---

### 2026-02-19 — Track 3: Phase 4 — Snapshots + Peaking + Auto-Adaptation + Invite Codes


#### Added
- `src/lib/pocketbase/services/peaking.ts` — Peaking validation service (`validatePeaking`, `hasCriticalPeakingIssues`). Validates PRE_COMP phase placement relative to A/B/C competitions. Returns structured warnings with i18n keys.
- `src/lib/autofill/adaptation.ts` — Auto-Adaptation service (`applyAdaptation`, `adaptationLabel`). Reduces exercise sets by 20–30% when readiness < 60 and auto-adaptation is enabled in coach preferences.
- `src/lib/pocketbase/services/groups.ts` — Groups + Invite Codes service: `listMyGroups`, `createGroup`, `generateInviteCode` (6-char, 7-day expiry), `joinByInviteCode`, `getActiveInviteCode`.
- Peaking warnings section in `SeasonDetail.tsx` — color-coded error/warning cards per competition.
- i18n keys: `training.peakingWarnings`, `training.peaking.*`, `training.adaptationBadge` in RU/EN/CN.

#### Changed
- `publishPlan()` in `plans.ts` — Now auto-creates a plan snapshot (exercises + metadata) before updating status to `published`. Snapshot creation is non-blocking (errors are logged, not thrown).
- `WeekConstructor.tsx` — Imports `applyAdaptation` + `getMyPreferences`; loads `autoAdaptEnabled` state on mount.

### 2026-02-15 — Pre-Track 0: Audit & Design System

#### Added
- `docs/DESIGN_SYSTEM.md` — Athletic Minimal + Glassmorphism design system (tokens, glass, mobile-first, components, accessibility, China rules)
- `docs/SECURITY.md` — Auth flow, API rules matrix, security headers, CORS, rate limiting
- `docs/PERIODIZATION.md` — Season structure, phases, CNS system, readiness score, plan lifecycle
- `.gitignore` — Next.js + PocketBase + PWA ignores
- Git repository initialized (commit `9c7ce7b`)

#### Changed
- `CLAUDE.md` — Added Design System section, added `DESIGN_SYSTEM.md` to docs list
- `GEMINI.md` — Expanded from stub to full agent rules (mirrors CLAUDE.md)
- `PROJECT_CONTEXT.md` — Fixed Technology Decisions table (Supabase → PocketBase, Vercel → VPS, Tailwind → vanilla CSS)

#### Fixed
- `ui-ux-pro-max` CLI — f-string backslash error in `design_system.py:437` (Python 3.9 compat)
