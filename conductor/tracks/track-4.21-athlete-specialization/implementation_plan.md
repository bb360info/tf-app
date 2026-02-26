# Специализация атлетов и Личные Рекорды (v4)

## Контекст

Онбординг не собирает специализацию/PR. Имя спрашивается дважды (регистрация + онбоардинг). Нет first/last name. SQL injection в athletes.ts/groups.ts.

---

## Маппинг скиллов по фазам (из project_skills.json)

| Фаза | Группы | Скиллы |
|------|--------|--------|
| **Phase 0**: Pre-Track Fixes | `always` + `debugging` | `systematic-debugging`, `error-handling-patterns`, `lint-and-validate` |
| **Phase 1**: Schema & Types | `always` + `architecture` + `typescript` | `architecture`, `architect-review`, `database-architect`, `typescript-expert` |
| **Phase 2**: Services | `always` + `typescript` + `architecture` | `typescript-expert`, `architecture` |
| **Phase 3**: Reg & Onboarding | `always` + `frontend` + `ui_design` | `nextjs-app-router-patterns`, `react-best-practices`, `react-ui-patterns` |
| **Phase 4**: Settings & Dashboard | `always` + `frontend` + `ui_design` | `nextjs-app-router-patterns`, `react-best-practices`, `react-ui-patterns` |
| **Phase 5**: Name Migration | `always` + `refactoring` | `code-refactoring-refactor-clean`, `react-patterns` |
| **Phase 6**: i18n | `always` + `i18n` | `i18n-localization` |
| **Phase 7**: QA Gate | `always` + `testing` | `test-driven-development`, `unit-testing-test-generate` |

> Группа `always` = `concise-planning`, `lint-and-validate`, `jumpedia-design-system`, `verification-before-completion`

---

## Proposed Changes

### Компонент 0: Pre-Track SQL Injection Fix

#### [MODIFY] [athletes.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/athletes.ts)

Все `filter: \`...\${..}\`` → `pb.filter()`:
- `listMyAthletes()` (L31)
- `hardDeleteAthleteWithData()` — 5+ вызовов deleteAll/getFullList
- `getLatestCheckin()` (L170)
- `getLatestTestResult()` (L189)

#### [MODIFY] [groups.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/groups.ts)

- `listMyGroups()` (L26)
- `joinByInviteCode()` (L93)
- `listGroupMembers()` (L174)

---

### Компонент 1: PocketBase Schema Changes

#### [MODIFY] `users` collection

| Поле | Действие | Описание |
|------|----------|----------|
| `first_name` | **ADD** text, max 100 | Имя |
| `last_name` | **ADD** text, max 100 | Фамилия |
| `name` | KEEP | Обратная совместимость: `name = first_name + " " + last_name` |

#### [MODIFY] `athletes` collection

| Поле | Тип | Описание |
|------|-----|----------|
| `primary_discipline` | select (triple_jump/long_jump/high_jump) | Основной вид |
| `secondary_disciplines` | **multi-select** (triple_jump/long_jump/high_jump) | Доп. виды |

> **Решение:** multi-select вместо JSON — PB-нативная валидация, индексация, API фильтрация.

#### [NEW] `personal_records` collection

| Поле | Тип | Req | Описание |
|------|-----|-----|----------|
| `athlete_id` | relation → athletes | ✅ | FK |
| `discipline` | select (triple_jump/long_jump/high_jump) | ✅ | Вид |
| `season_type` | select (indoor/outdoor) | ✅ | Сезон |
| `result` | number (0–30) | ✅ | Метры (float) |
| `date` | date | — | Дата установления |
| `competition_name` | text (255) | — | Соревнование |
| `source` | select (competition/training) | ✅ | Тип |
| `is_current` | bool (default true) | ✅ | Текущий PR |
| `notes` | text (500) | — | — |

**API Rules:** `athlete_id.coach_id = @request.auth.id || athlete_id.user_id = @request.auth.id`
**Indexes:** `idx_pr_athlete(athlete_id)`, `idx_pr_athlete_disc(athlete_id, discipline, season_type)`

---

### Компонент 2: TypeScript Types + Validation

#### [MODIFY] [types.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/types.ts)

```diff
+export type Discipline = 'triple_jump' | 'long_jump' | 'high_jump';
+export type SeasonType = 'indoor' | 'outdoor';
+export type PRSource = 'competition' | 'training';

 export interface UsersRecord extends BaseRecord {
     email: string;
     name: string;
+    first_name?: string;
+    last_name?: string;
     role: UserRole;
 }

 export interface AthletesRecord extends BaseRecord, SoftDeletable {
+    primary_discipline?: Discipline;
+    secondary_disciplines?: Discipline[];
 }

+export interface PersonalRecordsRecord extends BaseRecord {
+    athlete_id: string;
+    discipline: Discipline;
+    season_type: SeasonType;
+    result: number;
+    date?: string;
+    competition_name?: string;
+    source: PRSource;
+    is_current: boolean;
+    notes?: string;
+}
```

#### [MODIFY] [collections.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/collections.ts) — add `PERSONAL_RECORDS`

#### [MODIFY] [core.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/validation/core.ts)
- `UsersSchema` → add `first_name`, `last_name` optional
- `RegisterSchema` → replace `name` with `first_name` + `last_name`
- `AthletesSchema` → add discipline fields

#### [NEW] [validation/personalRecords.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/validation/personalRecords.ts) — Zod schemas

---

### Компонент 3: Services

#### [NEW] [services/personalRecords.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/personalRecords.ts)

- `listPRsForAthlete()`, `getCurrentPR()`, `addPersonalRecord()` (update→create order for is_current flip), `updatePersonalRecord()`, `deletePersonalRecord()`, `listPRHistory()`

#### [MODIFY] [services/athletes.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/athletes.ts)

- `updateAthlete()` + `createAthlete()` → accept disciplines
- `hardDeleteAthleteWithData()` → add `personal_records` cascade delete

#### [MODIFY] [auth.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/auth.ts)

- `registerWithEmail()` → accept + save `first_name`, `last_name`; compute `name`
- `updateUserName()` → accept `first_name`, `last_name`

#### [NEW] [src/lib/utils/nameHelpers.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/utils/nameHelpers.ts)

- `getDisplayName(record)` → `first_name + " " + last_name` || `name` fallback
- `getInitials(record)` → first letter of each

---

### Компонент 4: Registration Form

#### [MODIFY] [RegisterForm.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/auth/RegisterForm.tsx)

- Replace single `name` with `firstName` + `lastName` inputs

---

### Компонент 5: Onboarding Wizard

#### [MODIFY] [OnboardingWizard.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/onboarding/OnboardingWizard.tsx)

Flow: Welcome → **Specialization** (athletes) / Preferences (coaches) → Preferences → Done

Remove StepProfile. Add StepSpecialization:
- 3 selectable cards (triple/long/high) → `primary_discipline`
- Chips for secondary disciplines (excluding primary)
- Optional PR inputs (indoor/outdoor, unit=м)

#### [NEW] [DisciplineSelector.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/shared/DisciplineSelector.tsx)

Shared component: onboarding + settings + coach view

---

### Компонент 6: Settings & Dashboard

#### [MODIFY] Settings — new sections: DisciplineSelector, PRs table, AddPRModal, PR History, first/last name edit
#### [MODIFY] `AthleteDashboard.tsx` — discipline badge near name
#### [MODIFY] `AthleteDetailClient.tsx` — discipline + PR table (coach editable)
#### [MODIFY] `AthleteCard.tsx` — `getInitials()` helper
#### [MODIFY] `EditAthleteModal.tsx` — discipline fields
#### [MODIFY] `AddAthleteModal.tsx` — optional discipline

---

### Компонент 7: Name Migration + Cleanup

- All `.name` → `getDisplayName()` / `getInitials()` in 6+ components
- `joinByInviteCode()` — use first/last name
- 4 × `window.confirm()` → `ConfirmDialog` migration

---

### Компонент 8: i18n (RU/EN/CN) — ~40 keys × 3 languages

### Компонент 9: Tests + QA

---

## Decision Log

| # | Решение | Почему |
|---|---------|--------|
| 1 | `personal_records` отдельная коллекция | PR ≠ test. Разная семантика. |
| 2 | `secondary_disciplines` = **PB multi-select** | Не JSON — валидация PB, индексация, фильтрация |
| 3 | `first_name` + `last_name` + `name` (все 3) | Обратная совместимость |
| 4 | Naming: `triple_jump` (не `TJ`) | Стандарт проекта — как `phase_type`, `test_type` |
| 5 | Убрать StepProfile из онбоардинга | Имя — регистрация, роль — контекст |
| 6 | PR всегда в метрах | Стандарт лёгкой атлетики |
| 7 | Phase 0 — SQL injection fix | Безопасность до начала основной работы |
| 8 | `is_current` flip: update → create | Без транзакции — порядок минимизирует гонку |

---

## Verification Plan

```bash
pnpm type-check && pnpm build && pnpm test
```

### QA (browser)
1. Регистрация с first+last name → онбоардинг → Specialization → PR → Done
2. Settings → discipline change → PR add/edit/history
3. Coach → AthleteDetail → discipline + PR visible
4. Invite flow → athlete joins via code → check athlete record
