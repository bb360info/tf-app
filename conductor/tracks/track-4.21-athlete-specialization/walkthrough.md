# Track 4.21 — Walkthrough

## Phase 0: SQL Injection Fixes ✅
- `athletes.ts`, `groups.ts` — `pb.filter()` параметризация во всех методах

## Phase 1: Schema & Types ✅
- PocketBase: +`first_name`/`last_name` на users, +`primary_discipline`/`secondary_disciplines` на athletes, создана коллекция `personal_records`
- `types.ts`: `Discipline`, `SeasonType`, `PRSource`, обновлены `UsersRecord`, `AthletesRecord`, `PersonalRecordsRecord`
- `validation/core.ts`: `DisciplineSchema`, `RegisterSchema`, `AthletesSchema`; `validation/personalRecords.ts` (новый)

## Phase 2: Services ✅
- `services/personalRecords.ts`: `listPersonalRecords`, `getCurrentPRs`, `addPersonalRecord` (is_current flip: update→create), `updatePersonalRecord`, `deletePersonalRecord`
- `lib/utils/nameHelpers.ts`: `getDisplayName()` + `getInitials()` с fallback chain
- `services/athletes.ts`: `updateAthlete()` принимает `primary_discipline`, `secondary_disciplines`

## Phase 3: Registration & Onboarding ✅
- `RegisterForm.tsx`: `name` → `firstName + lastName` (два поля рядом) + role selector (Athlete/Coach)
- `OnboardingWizard.tsx`: StepProfile удалён → новый `StepSpecialization` (DisciplineSelector + PR для атлетов, info-card для тренеров)
- `DisciplineSelector.tsx`: новый переиспользуемый компонент; `DisciplineSelector.module.css`

## Phase 4: Settings & Dashboard ✅

### Изменённые файлы

| Файл | Что изменилось |
|---|---|
| `settings/page.tsx` | Profile: two-column firstName+lastName; Athlete-only: DisciplineSelector section + PR table |
| `settings.module.css` | +14 новых классов: nameRow, disciplineChip, prSection, prRow, prForm, prEmpty... |
| `AthleteDashboard.tsx` | primaryDiscipline state + hero badge under welcome text |
| `AthleteDashboard.module.css` | +`.disciplineBadge` |
| `AthleteCard.tsx` | `initials()` → `getInitials()` из nameHelpers; discipline chip под именем |
| `AthleteCard.module.css` | +`.disciplineChip` |

### Settings: Specialization + PR секция (атлеты)

- **Summary view**: discipline chips (primary accent, secondary neutral)
- **Edit view**: DisciplineSelector с toggle (Edit2/X кнопка)
- **PR Header**: Trophy icon + expandable history + Plus кнопка
- **Add PR Form**: discipline select, season (outdoor/indoor), result input, source, date — inline форма
- **PR List**: каждая строка показывает дисциплину, мета (season·source), результат в метрах, `PR` badge для is_current, X кнопка удаления
- **PR Empty State**: Trophy icon + текст

### Верификация
```
pnpm type-check → Exit 0 ✅
pnpm build      → Exit 0 ✅
```

## Phase 4 (Residual): Coach View + Modals ✅

| Файл | Что изменилось |
|---|---|
| `AthleteDetailClient.tsx` | discipline chip в hero + PR секция в OverviewTab (getCurrentPRs + Add/Delete) + `initials()` → `getInitials()` |
| `athleteDetail.module.css` | +`.disciplineChip`, `.prSection`, `.prSectionHeader`, `.prForm`, `.prFormRow`, `.prSelect`, `.prInput`, `.prSaveBtn`, `.prList`, `.prRow`, `.prResult`, `.prDeleteBtn`, `.prEmpty` |
| `EditAthleteModal.tsx` | +`primary_discipline` select (high_jump / long_jump / triple_jump, опционально) |
| `AddAthleteModal.tsx` | +`primary_discipline` select при создании атлета |
| `messages/{en,ru,cn}/common.json` | +`dashboard.newAthlete.discipline` |

### Верификация
```
pnpm type-check → Exit 0 ✅
pnpm build      → Exit 0 ✅
```

## Phase 5: Name Migration ✅

| Файл | Строки | Что изменилось |
|---|---|---|
| `AthleteCard.tsx` | 44, 67, 86, 94, 114, 125, 136 | `athlete.name` → `getDisplayName(athlete)` (×7) |
| `AthleteDetailClient.tsx` | 171 | hero `<h1>` → `getDisplayName(athlete)` |
| `groups.ts` | 123 | `joinByInviteCode()` auto-create athlete — `user.name` → `getDisplayName(user as HasName)` |

**Deferred:** `window.confirm()` → `ConfirmDialog` — компонент не существует, low priority, перенесён в backlog

### Верификация
```
pnpm type-check → Exit 0 ✅
pnpm build      → Exit 0 ✅
```

## Статус трека

| Фаза | Статус |
|---|---|
| Phase 0: SQL Injection Fixes | ✅ |
| Phase 1: Schema & Types | ✅ |
| Phase 2: Services | ✅ |
| Phase 3: Registration & Onboarding | ✅ |
| Phase 4: Settings & Dashboard | ✅ |
| Phase 5: Name Migration | ✅ (window.confirm → deferred) |
| Phase 6: i18n | ⏳ следующий |
| Phase 7: QA Gate | ⏳ |
