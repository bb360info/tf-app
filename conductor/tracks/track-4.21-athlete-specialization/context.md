# Track 4.21 Context — Athlete Specialization & Personal Records

## Что делаем

Добавляем систему специализации атлетов (дисциплины прыжков) и личных рекордов в приложение. Одновременно разделяем поле `name` на `first_name` + `last_name` и упрощаем онбоардинг. Также фиксим SQL injection в athletes.ts и groups.ts.

## Зачем

Тренер не имеет данных о виде спортсмена и его лучших результатах — это критически важная информация для планирования тренировок и периодизации. Имя спрашивается дважды (регистрация + онбоардинг), что раздражает пользователя.

## Ключевые решения (утверждены)

1. **3 дисциплины**: Triple Jump, Long Jump, High Jump — naming `triple_jump`/`long_jump`/`high_jump` (как `phase_type`, `test_type`)
2. **Primary** — одна (PB select), **Secondary** — несколько (**PB multi-select**, не JSON)
3. **PR с историей** — backfill поддержка
4. **Indoor + Outdoor** — сезонное разделение PR
5. **Competition vs Training** — тип источника PR
6. **PR всегда в метрах** — стандарт л/а
7. **first_name + last_name + name** — `name` остаётся для обратной совместимости
8. **StepProfile удалён** из онбоардинга
9. **Phase 0** — SQL injection fix перед основной работой
10. **DisciplineSelector** — shared component (onboarding + settings + coach view)
11. **`is_current` flip** — порядок update → create для минимизации race condition

## Скиллы по фазам (из project_skills.json)

| Фаза | Группы |
|------|--------|
| Phase 0: Pre-Track Fixes | `always` + `debugging` |
| Phase 1: Schema & Types | `always` + `architecture` + `typescript` |
| Phase 2: Services | `always` + `typescript` + `architecture` |
| Phase 3: Reg & Onboarding | `always` + `frontend` + `ui_design` |
| Phase 4: Settings & Dashboard | `always` + `frontend` + `ui_design` |
| Phase 5: Name Migration | `always` + `refactoring` |
| Phase 6: i18n | `always` + `i18n` |
| Phase 7: QA Gate | `always` + `testing` |

## Файлы, которые затрагивает

### PocketBase (MCP tool)
- `users` → +`first_name`, +`last_name`
- `athletes` → +`primary_discipline` (select), +`secondary_disciplines` (multi-select)
- NEW `personal_records` collection

### Backend / Types
- `src/lib/pocketbase/types.ts` — новые типы
- `src/lib/pocketbase/collections.ts` — +`PERSONAL_RECORDS`
- `src/lib/pocketbase/auth.ts` — first/last name
- `src/lib/pocketbase/services/athletes.ts` — disciplines + pb.filter() fix + cascade delete PRs
- `src/lib/pocketbase/services/groups.ts` — pb.filter() fix
- NEW `src/lib/pocketbase/services/personalRecords.ts`
- NEW `src/lib/validation/personalRecords.ts`
- `src/lib/validation/core.ts` — schema updates
- NEW `src/lib/utils/nameHelpers.ts`

### Frontend
- `RegisterForm.tsx` — split name
- `OnboardingWizard.tsx` — remove Profile, add Specialization
- `settings/page.tsx` — discipline + PR sections
- `AthleteDashboard.tsx` — discipline badge
- `AthleteCard.tsx` — initials helper
- `AthleteDetailClient.tsx` — discipline + PR (coach view)
- `EditAthleteModal.tsx` — discipline fields
- `AddAthleteModal.tsx` — optional discipline
- NEW `DisciplineSelector.tsx` — shared component
- Multiple components — name migration + window.confirm → ConfirmDialog

### i18n
- `messages/{ru,en,cn}/` — ~40 new keys × 3 languages

## Порядок выполнения
0. Phase 0: pb.filter() migration (athletes.ts + groups.ts)
1. Phase 1: PB schema via MCP → types → validation
2. Phase 2: Services (personalRecords + athletes + auth + nameHelpers)
3. Phase 3: RegisterForm + OnboardingWizard + DisciplineSelector
4. Phase 4: Settings + Dashboard + Coach views
5. Phase 5: Name migration + cleanup (window.confirm → ConfirmDialog)
6. Phase 6: i18n
7. Phase 7: Tests + QA
