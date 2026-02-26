# Context: Track 4.22 — Invite Links & Group Management

## Что делаем

Две основные фичи + бонус:

1. **Инвайт-ссылки** — тренер отправляет URL `jumpedia.app/join?code=ABC123` → спортсмен кликает → регистрируется → автоматически попадает в группу
2. **Перемещение атлетов** — тренер может перемещать (🔄) или добавлять (➕) атлета между/в свои группы через явные действия в UI
3. **QR-код** — бонус для личных встреч, кодирует тот же URL

## Зачем

Текущий flow: тренер генерирует 6-char код → спортсмен **уже должен быть зарегистрирован** → вводит код вручную в Settings → Groups. Это неудобно:
- Нет «магической ссылки» для мессенджера
- Онбординг не знает о pending invite
- Невозможно переместить атлета между группами без удаления и повторного ввода кода

## Ключевые файлы

### Invite Flow (существующий код)
- `src/lib/pocketbase/services/groups.ts` — `joinByInviteCode()`, `generateInviteCode()`, `getActiveInviteCode()`
- `src/app/[locale]/(protected)/settings/groups/page.tsx` — UI тренера (groups CRUD, invite codes, members)
- `src/lib/pocketbase/auth.ts` — `registerWithEmail()`, `loginWithEmail()`
- `src/components/auth/RegisterForm.tsx` — регистрация (first/last name, email, role selector)
- `src/components/auth/LoginForm.tsx` — логин + redirect
- `src/components/onboarding/OnboardingWizard.tsx` — 4 шага (Welcome → Specialization → Preferences → Done)
- `src/lib/pocketbase/AuthProvider.tsx` — контекст авторизации, `register()` callback

### Plan Resolution (для понимания влияния move)
- `src/lib/pocketbase/services/logs.ts` → `getPublishedPlanForToday()` — 4-step priority chain:
  - Step 0: Individual Override (`training_plans.athlete_id + parent_plan_id`) — НЕ зависит от группы
  - Step 1: Direct Assignment (`plan_assignments.athlete_id`) — НЕ зависит от группы  
  - Step 2: **Group Assignment** (`plan_assignments.group_id` → `getMyGroupIds()`) — **ЗАВИСИТ от группы**
  - Step 3: Season Fallback (`seasons.athlete_id`) — НЕ зависит от группы
- `src/lib/pocketbase/services/planAssignments.ts` — `assignPlanToGroup()`, `assignPlanToAthlete()`

### PocketBase Schema
- `groups` — coach_id, name, invite_code (6 chars, unique), invite_expires (ISO +7 days), deleted_at (soft-delete)
- `group_members` — group_id, athlete_id (junction, unique constraint)
- `athletes` — user_id, coach_id, name, first_name, last_name, primary_discipline
- `plan_assignments` — plan_id, athlete_id, group_id, status (active/inactive)
- `training_plans` — athlete_id, parent_plan_id (для overrides)

## Архитектурные решения (Decision Log)

| # | Решение | Причина |
|---|---------|---------|
| 1 | `localStorage.pendingInviteCode` (JSON: `{code, timestamp}`) + **sessionStorage fallback** | Static export → нет SSR cookie. Auto-cleanup >24h. Переживает reload. SessionStorage спасает в Safari Private Mode. |
| 2 | Предупреждение при move (не блокировка) | Перемещение осознанное. Групповой план меняется. Training logs сохраняются. |
| 3 | `navigator.share` для шаринга + fallback clipboard | Нативный диалог на iOS/Android. Работает в Китае. |
| 4 | Role=athlete автоматически при регистрации через инвайт | Инвайт = спортсмен вступает в группу → роль однозначна |
| 5 | **Create-first, delete-second** для move | При ошибке сети атлет лучше в 2 группах, чем в 0. PB unique constraint обработает дубли. |
| 6 | QR через `qrcode` package (client-side) | 0 внешних запросов → OK для Китая. ~3KB gzipped. |
| 7 | **`consumePendingInvite()` (get-then-clear)** | In-memory guard не нужен: вызов всегда из 1 места за сессию. Get-then-clear проще и надёжнее (переживает HMR). |
| 8 | **Suspense wrapper для `/join` page** | `useSearchParams()` в Static Export требует `<Suspense>`, иначе build fallback error. |
| 9 | **QR dark mode colors** | `toDataURL` с `color.dark/light` адаптирован к теме. |
| 10 | **Invite ПЕРЕД specialization в OnboardingWizard** | `joinByInviteCode` автосоздаёт athlete. Если вызвать после — `getSelfAthleteProfile()` не найдёт атлета → discipline/PR потеряется. |
| 11 | **Coach detection до join attempt на /join** | Не ждать ошибку сервера. Проверить `user.role` клиентски → показать info card. |
| 12 | **Проверка планов ОБЕИХ групп при move** | `hasActiveGroupPlan` только для from — недостаточно. Атлет может неожиданно получить план целевой группы. |
| 13 | **Move и Add — 2 отдельных действия в UI** | Для тренеров 50+ dropdown с обоими вариантами запутан. Явные кнопки 🔄 и ➕ понятнее. |
| 14 | **Fix `first_name`/`last_name` в автосоздании athlete** | Track 4.21 добавил эти поля, но `joinByInviteCode` их не передаёт. |
| 15 | **`deleted_at=""` фильтр в joinByInviteCode** | **(Review v3)** Soft-deleted группа не должна принимать инвайты. Без фильтра — баг. |
| 16 | **Дифференциация alreadyMember** | **(Review v3)** Сейчас duplicate member → silent catch. Нужно re-throw как `invite.alreadyMember` для корректного UI feedback. |
| 17 | **Self-athlete creation (Phase 0)** | **(Review v3)** Если атлет зарегистрировался самостоятельно (без инвайта), athlete record не создаётся → specialization в OnboardingWizard теряется. Автосоздать self-athlete (без coach_id). |
| 18 | **sessionStorage fallback для pending invite** | **(Review v3)** Safari Private Mode может потерять localStorage. Дублировать в sessionStorage. |
| 19 | **sessionStorage.joinedGroup для OnboardingWizard** | **(Review v3)** Если LoginForm потребил code → OnboardingWizard не заметит join. Сохранять joinedGroup в sessionStorage. |
| 20 | **Auto-check invite expiry при Share** | **(Review v3)** Если код < 24h до истечения → warn тренера. Предотвращает отправку мёртвой ссылки. |
| 21 | **coach_id guard в moveAthleteToGroup** | **(Review v3)** Проверка что обе группы принадлежат текущему тренеру. DevTools manipulation prevention. |
| 22 | **Locale отправителя в invite URL** | **(Review v3)** Static export не позволяет auto-detect. `/${locale}/join?code=...` — locale тренера. LocaleSwitcher доступен получателю. Приемлемый компромисс. |
| 23 | **Generic OG meta tags** | **(Review v3)** Для link preview в мессенджерах. Без конкретного group name (static export). Лучше чем ничего. |
| 24 | **QR download с human-readable filename** | **(Review v3)** `jumpedia-{group-name}-invite.png` вместо generic. |

## Ограничения
- Static Export → `/join` будет client-side page, нет API routes
- Китай → никаких CDN, всё self-hosted
- PocketBase не имеет транзакций
- Athlete может быть в нескольких группах одного тренера (junction table)
- Rate limiting на `/join` — отложен на Track 5+ (минимальный риск для MVP)

## Cross-Track Conflicts
- **Track 4.21 → 4.22:** OnboardingWizard модифицируется в обоих треках. Изменения в разных частях `handleFinish` (4.21 = discipline/PR, 4.22 = pending invite + self-athlete fix). **Конфликт: LOW.** 4.22 ДОЛЖЕН стартовать после завершения 4.21.
- **Track 4.23:** `joinByInviteCode` + `moveAthleteToGroup` — хорошие места для notification triggers. Добавить TODO comments, не реализовывать.

## Скиллы по фазам

| Фаза | Группа | Скиллы |
|------|--------|--------|
| Phase 0: Pre-Track Fixes + Pending Invite | `always` | `concise-planning`, `lint-and-validate`, `verification-before-completion` |
| Phase 1: /join page | `always` + `frontend` + `auth_security` | `concise-planning`, `nextjs-app-router-patterns`, `nextjs-best-practices`, `auth-implementation-patterns`, `jumpedia-design-system` |
| Phase 2: Register/Login/Onboarding | `always` + `frontend` + `auth_security` | `concise-planning`, `react-best-practices`, `auth-implementation-patterns`, `lint-and-validate` |
| Phase 3: Coach Share UI | `always` + `frontend` + `ui_design` | `concise-planning`, `jumpedia-design-system`, `react-best-practices`, `cc-skill-frontend-patterns` |
| Phase 4: Move Athletes | `always` + `frontend` + `refactoring` | `concise-planning`, `jumpedia-design-system`, `react-best-practices`, `code-refactoring-refactor-clean` |
| Phase 5: QR Code | `always` + `frontend` | `concise-planning`, `jumpedia-design-system`, `react-best-practices` |
| Phase 6: Tests + Verify | `always` + `testing` | `lint-and-validate`, `verification-before-completion` |

## Review документы
- **Review v1:** `brain/299fce00-daa2-4044-b271-adb448285615/track-4.22-review.md`
- **Review v2 (deep):** `brain/cc08ab0b-9179-4b05-b025-fe8e6e11ac98/track-4.22-deep-review.md`
- **Review v3 (brainstorm):** `brain/22f9bde7-4b01-48a1-b97b-72f578a1a1e7/track-4.22-review.md`
