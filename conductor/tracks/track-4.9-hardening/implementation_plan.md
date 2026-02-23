# Track 4.9: Pre-Launch Hardening — Улучшенный План

## 🔍 Результаты аудита + брейншторма

### Что уже сделано (Track 4.7 Extension)

Из CHANGELOG и анализа кода выяснено, что **~80% Фазы 1 уже выполнено** в Track 4.7 Extension:

| Задача из Gate 4.9 | Статус | Доказательство |
|---|---|---|
| `AddTestResultModal.tsx` → 4 RU строки → i18n | ✅ Сделано | CHANGELOG: `tf('invalidValue')`, `tf('futureDateError')`, `tf('saveFailed')`, `tf('notesPlaceholder')` |
| `AddTestResultModal.tsx` → inline spinner → CSS | ✅ Сделано | CHANGELOG: `className={styles.spinIcon}` |
| `AthleteCard.tsx` → hardcoded confirm → i18n | ✅ Сделано | CHANGELOG: `t('deleteConfirm', {name})` |
| `AthleteCard.tsx` → `лет` → i18n | ✅ Сделано | Grep: нет `лет` в файле |
| `ProgressChart.tsx` → `ru-RU` → locale | ✅ Сделано | Есть `localeMap: Record<string, string>` |
| `ProgressChart.tsx` → 2 hardcoded строки | ✅ Сделано | CHANGELOG: `locale`, `noDataMessage`, `loadingLabel` props |
| `training/page.tsx` → 4 hardcoded strings | ✅ Сделано | CHANGELOG: `checkin/checkinDone/checkinCreateFailed/checkinSaveFailed` |
| `training/page.tsx` → 5 inline styles → CSS | ⚠️ Частично | Осталось 2 inline styles: `style={{ backgroundColor: PHASE_COLORS[...] }}` (динамические — допустимо) |
| `dashboard/page.tsx` → 2 RU строки | ❌ Осталось | `'Не удалось загрузить список атлетов.'` + `'Загрузка...'` aria-label |
| `training/page.tsx` → loading CSS classes | ✅ Сделано | CHANGELOG: `.wizardLoadingOverlay`, `.detailLoadingBox` |
| ~15-20 новых i18n ключей | ✅ Сделано | CHANGELOG: ~15 ключей добавлено |
| AthleteDashboard fade-in + shimmer | ✅ Сделано | CHANGELOG: `@keyframes fadeIn`, `@keyframes shimmer`, `.shimmerBar` |
| AthleteDashboard CLS fix | ✅ Сделано | CHANGELOG: `min-height: 160px` |

### Что НЕ сделано (реальный остаток)

| Фаза | Задача | Приоритет |
|---|---|---|
| 1 | `dashboard/page.tsx`: 2 hardcoded RU строки | 🟢 Quick |
| 2 | Settings: смена пароля (`changePassword`) | 🟡 Medium |
| 2 | Settings: редактирование имени (`updateUserName`) | 🟡 Medium |
| 2 | Settings: 3 inline styles → CSS | 🟢 Quick |
| 2 | Settings: профиль атлета (read-only) | 🟡 Medium |
| 3 | `athlete_id` в seasons (PB schema + services) | 🔴 Critical |
| 3 | Athlete-Season binding (UI + services) | 🔴 Critical |
| 4 | Coach Athlete Detail Page (с табами) | 🟡 Medium |
| 5 | Dashboard group filter + badge | 🟡 Medium |
| 5 | ErrorBoundary | 🟡 Medium |

### PocketBase доступ

- **API Health:** ✅ `200 OK` (`https://jumpedia.app/api/health`)
- **Admin Panel:** `https://jumpedia.app/_/`
- **Admin Credentials:** ❌ **НЕ НАЙДЕНЫ** в `.env.local` — только `NEXT_PUBLIC_POCKETBASE_URL`

> [!IMPORTANT]  
> **Для Фазы 3 нужны PB Admin credentials.**
> Агент НЕ может самостоятельно добавить поле `athlete_id` в коллекцию `seasons` или настроить cascade через API без admin email/password. 
> 
> **Варианты:**
> 1. Передать `PB_ADMIN_EMAIL` + `PB_ADMIN_PASSWORD` в `.env.local` → агент сможет делать это через PB Admin API
> 2. Пользователь добавляет поле вручную в PB Admin Panel → агент работает только с фронтендом
> 3. Скрипт-помощник `scripts/pb-add-athlete-season.sh` — пользователь запускает с credentials

### Здоровье проекта

```
pnpm type-check → ✅ Exit 0 (0 ошибок)
pnpm test       → ✅ 16/16 тестов (computeStreak + telemetry)
PocketBase API  → ✅ 200 healthy
Dev server      → ✅ Running (pnpm dev, 1h+)
```

---

## 🧠 Брейншторм: UI/UX улучшения поверх базового плана

### 1. Athlete Detail Page — Premium UX

Вместо простой таблицы — **полноценный профиль атлета** а-ля спортивная аналитика:

- **Hero-секция**: аватар (initials) + имя + возраст/рост + readiness badge (цвет-индикатор) + streak
- **Tab Bar**: горизонтальные таблетки с glassmorphism (не браузерные табы)
- **Overview**: glass-карточки с ключевыми метриками (лучший прыжок, текущий streak, avg readiness за 7д)
- **Training History**: timeline-карточки вместо плоской таблицы (дата + план + RPE colour bar)
- **Test Results**: ProgressChart (уже есть) + sparkline мини-графики в карточках с delta-чипами
- **Readiness**: CNS heatmap (уже есть) + readiness trend линейный график за месяц
- **Мобильная навигация**: swipeable tabs (touch gesture)

### 2. Settings — Структурированная иерархия

- **Секция Account**: имя (editable) + email (read-only) + avatar placeholder
- **Секция Security**: change password с visibility toggle + strength indicator
- **Секция Athlete Profile** (if `role=athlete`): glass-card с рост/ДР/группа/тренер
- **ChevronRight** иконка вместо повёрнутого ArrowLeft для навигации к groups

### 3. ErrorBoundary as Glass Card

- Не стандартный "Something went wrong" — а glassmorphism карточка с:
  - Lucide `AlertTriangle` icon (accent color)
  - "Что-то пошло не так" / "Something went wrong" (i18n)
  - Кнопка "Попробовать снова" (перезагрузка компонента) + "На главную"
  - Автоматический лог в `error_logs` через `reportError()`

### 4. Dashboard Groups — Chip Filter Bar

- Горизонтальная прокрутка чипов (как в ExerciseCatalog equipment filter)
- `"Все"` chip + по чипу на каждую группу
- Badge на AthleteCard: маленький тег внизу с названием группы

---

## Proposed Changes (Улучшенный план)

### Фаза 1: Quick Fix — 2 оставшихся hardcoded строки (15 мин)

**🛠 Скиллы:** `always` + `i18n`

---

#### [MODIFY] [dashboard/page.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/%28protected%29/dashboard/page.tsx)

- Строка 60: `'Не удалось загрузить список атлетов.'` → `t('dashboard.loadError')`
- Строка 181: `aria-label="Загрузка..."` → `aria-label={t('app.loading')}`

#### [MODIFY] messages/{ru,en,cn}/common.json

- Добавить `dashboard.loadError` в 3 локали

---

### Фаза 2: Settings Improvements (1 день)

**🛠 Скиллы:** `always` + `frontend` + `auth_security` + `ui_design` + `i18n`

**Mandatory reads:** `docs/DESIGN_SYSTEM.md`, `src/styles/tokens.css`

---

#### [MODIFY] [auth.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/auth.ts)

- Добавить `changePassword(oldPassword: string, newPassword: string)`:
  ```ts
  pb.collection('users').update(pb.authStore.record!.id, {
    oldPassword,
    password: newPassword,
    passwordConfirm: newPassword,
  });
  ```
- Добавить `updateUserName(name: string)`:
  ```ts
  pb.collection('users').update(pb.authStore.record!.id, { name });
  ```

#### [MODIFY] [settings/page.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/%28protected%29/settings/page.tsx)

- **Секция Account (улучшена):**
  - Editable name field (inline edit + save icon)
  - Email: read-only
- **Новая секция Security:**
  - Три поля: Old Password / New Password / Confirm
  - Password visibility toggle (Eye/EyeOff Lucide)
  - Password strength indicator (bar: weak → strong)
  - Submit → `changePassword()` → success toast
- **Athlete Profile секция (новая, if `role=athlete`):**
  - Glass-card с данными: рост, ДР, группа, тренер
  - Данные из `getSelfAthlete()` → athletes collection
  - Read-only (тренер редактирует через dashboard)
- **Inline styles → CSS:**
  - Строка 198: `style={{ textDecoration, cursor }}` → добавить в `.row` для `Link`
  - Строка 208: rotate ArrowLeft → заменить на `ChevronRight` (семантически правильнее)
  - Строки 218-230: Save button inline → `.saveBtn` CSS class

#### [MODIFY] [settings.module.css](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/%28protected%29/settings/settings.module.css)

- `.saveBtn` — full-width primary button via tokens
- `.chevronIcon` — tertiary text color
- `.passwordSection` — grouped input fields
- `.strengthBar` — 4-level color indicator
- `.profileCard` — glassmorphism read-only card
- `.editNameBtn` — ghost button с icon

#### [MODIFY] messages/{ru,en,cn}/common.json

- `settings.security`, `settings.changePassword`, `settings.oldPassword`, `settings.newPassword`, `settings.confirmPassword`, `settings.passwordChanged`, `settings.passwordMismatch`, `settings.editName`, `settings.athleteProfile`, `settings.height`, `settings.birthDate`, `settings.group`, `settings.coach`

---

### Фаза 3: Athlete-Season Binding (2-3 дня) ⚠️ Ключевая фаза

**🛠 Скиллы:** `always` + `architecture` + `typescript` + `frontend` + `i18n`

**Mandatory reads:** `docs/ARCHITECTURE.md`

> [!WARNING]  
> **PocketBase Admin работа (требует credentials или ручную работу пользователя):**
> 1. Добавить поле `athlete_id` (relation → athletes, **optional**) в `seasons`
> 2. Настроить cascade delete: `training_logs`, `test_results`, `daily_checkins`, `achievements`, `log_exercises` → `athlete_id` → On Delete = **Cascade**
> 3. Добавить index: `idx_seasons_athlete ON seasons(athlete_id)`

---

#### [MODIFY] [types.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/types.ts)

- `SeasonsRecord`: добавить `athlete_id?: string; // FK → athletes (optional — для персональных планов)`

#### [MODIFY] [seasons.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/seasons.ts)

- `createSeason(data)` — принимать optional `athlete_id`
- `listSeasons(opts?)` — optional `athleteId` filter
- **Новое:** `listSeasonsForAthlete(athleteId)` — тренер: "покажи сезоны атлета"
- **Новое:** `getMySeasons()` — атлет: через `getSelfAthleteId()` → filter `athlete_id`

#### [MODIFY] [SeasonWizard.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/SeasonWizard.tsx)

- Dropdown «Для кого сезон» (⚠️ только coach role):
  - `"Общий (без привязки)"` — default для обратной совместимости
  - + список атлетов из `listMyAthletes()`
- Glass-styled select с аватар-инициалами рядом с именем
- При выборе атлета → `athlete_id` передаётся в `createSeason()`

#### [MODIFY] [training/page.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/%28protected%29/training/page.tsx)

- Фильтр сезонов по `athleteId` из query params (для навигации из Athlete Detail)
- Badge с именем атлета в header если фильтр активен

#### [MODIFY] [AthleteTrainingView.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/training/AthleteTrainingView.tsx)

- Поиск плана: `getPublishedPlanForToday()` → filter по `athlete_id = selfAthleteId`
- Empty state если нет привязки: "Тренер ещё не назначил план" (glass card с Info icon)

#### [MODIFY] [trainingLogs.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/trainingLogs.ts)

- `getPublishedPlanForToday()` — filter через `athlete_id` chain

#### [MODIFY] [athletes.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/athletes.ts)

- `hardDeleteAthleteWithData()` → упрощение: если cascade настроен, один `delete` + fallback try/catch на ручное каскадирование

---

### Фаза 4: Coach Athlete Detail Page (1-2 дня) ⭐ Визуально впечатляющая

**🛠 Скиллы:** `always` + `frontend` + `ui_design` + `analytics` + `i18n` + `accessibility`

**Mandatory reads:** `docs/DESIGN_SYSTEM.md`, `src/styles/tokens.css`

> [!TIP]  
> Переиспользовать `ProgressChart`, `CnsHeatmap`, `StreakHeroCard`, `AchievementsGrid` — все эти компоненты уже поддерживают `athlete_id` фильтрацию.

---

#### [NEW] [athlete/[id]/page.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/%28protected%29/dashboard/athlete/%5Bid%5D/page.tsx)

**Hero Section:**
- Аватар (инициалы, цветной фон по hash имени)
- Имя + возраст + рост
- Readiness badge (зелёный/жёлтый/красный кружок)
- Streak counter (🔥 fire icon, дни подряд)

**Tab Navigation (glassmorphism pills):**
```
[ Overview ]  [ Training ]  [ Tests ]  [ Readiness ]
```
- Active tab: `--color-primary` bg + `--color-text-inverse`
- Inactive: `--color-bg-tertiary`
- Transition: `--transition`

**Tab: Overview**
- 4 glass metric cards в grid 2×2:
  - Лучший standing jump (value + date)
  - Текущий streak
  - Avg readiness за 7 дней
  - Тренировок этой недели
- Последние 3 теста (mini TestResultCard)
- Кнопка "Создать сезон" → `/training?athleteId=[id]`

**Tab: Training History**
- Timeline-карточки (glass):
  - Дата (left sideline)
  - Название плана + фаза
  - RPE color bar (gradient green→yellow→red)
  - Notes excerpt
- Empty state: "Пока нет записей" + suggest

**Tab: Test Results**
- ProgressChart (full-width, lazy loaded)
- Type picker (horizontal chips: standing_jump, approach_jump, sprint_30m...)
- Recent results list с delta-чипами (▲ green / ▼ red)

**Tab: Readiness**
- CNS Heatmap (7×N weeks grid)
- Readiness trend line chart (last 30 days)
- Статистика: avg sleep, avg mood, min/max readiness

#### [NEW] [athleteDetail.module.css](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/%28protected%29/dashboard/athlete/%5Bid%5D/athleteDetail.module.css)

- Glassmorphism hero card
- Tab pills bar (horizontal scroll mobile)
- Metric cards grid (2×2 mobile → 4×1 desktop)
- Timeline cards
- `@supports` fallback for backdrop-filter
- `prefers-reduced-motion`
- Mobile-first: 375px → 768px → 1024px

#### [MODIFY] [AthleteCard.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/dashboard/AthleteCard.tsx)

- Клик → `router.push('/dashboard/athlete/[id]')` вместо текущего поведения

#### [MODIFY] messages/{ru,en,cn}/common.json

- `athleteDetail.overview`, `athleteDetail.trainingHistory`, `athleteDetail.testResults`, `athleteDetail.readiness`, `athleteDetail.bestJump`, `athleteDetail.currentStreak`, `athleteDetail.avgReadiness`, `athleteDetail.weekWorkouts`, `athleteDetail.createSeason`, `athleteDetail.noLogs`, `athleteDetail.noTests`, `athleteDetail.noCheckins`, `athleteDetail.back`

---

### Фаза 5: Dashboard Groups + ErrorBoundary + UX Polish (1 день)

**🛠 Скиллы:** `always` + `frontend` + `ui_design` + `errors` + `i18n` + `performance`

---

#### [MODIFY] [dashboard/page.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/%28protected%29/dashboard/page.tsx)

- **Group Filter Bar** (chip-based horizontal scroll):
  - Загрузить `listMyGroups()` + `listGroupMembers()` для маппинга athlete → group
  - Chip "Все" (default active) + по чипу на каждую группу
  - Фильтрация: `useMemo`-based filter по выбранной группе
- CSS: переиспользовать `.chipBar` паттерн как в ExerciseCatalog

#### [MODIFY] [AthleteCard.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/dashboard/AthleteCard.tsx)

- Badge с названием группы (мелкий chip внизу карточки)
- `.groupBadge` CSS class → `--text-xs`, `--color-bg-tertiary`

#### [NEW] [ErrorBoundary.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/shared/ErrorBoundary.tsx)

- React class component (Error Boundaries must be class-based)
- Glassmorphism card UI с:
  - `AlertTriangle` icon (Lucide)
  - i18n title: `t('error.title')` → "Что-то пошло не так"
  - i18n description: `t('error.description')` 
  - Кнопка "Попробовать снова" → `this.setState({ hasError: false })`
  - Кнопка "На главную" → `window.location.href = '/'`
- `componentDidCatch` → `reportError(error, errorInfo)` из telemetry

#### [NEW] [ErrorBoundary.module.css](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/shared/ErrorBoundary.module.css)

- Glassmorphism card centered
- DS tokens, dark mode, `@supports` fallback

#### [MODIFY] [layout.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/layout.tsx)

- Обернуть children в `<ErrorBoundary>`

#### [MODIFY] messages/{ru,en,cn}/common.json

- `error.title`, `error.description`, `error.retry`, `error.goHome`
- `dashboard.allGroups`, `dashboard.groupLabel`

---

## Gate 4.9: Обновлённый чеклист

> [!IMPORTANT]
> Следующий агент должен **сначала обновить gate.md** — отметить уже выполненные пункты `[x]`, затем работать только по оставшимся.

### Фаза 1: Quick Fixes (15 мин)
- [x] `AddTestResultModal.tsx` → 4 RU строки → i18n ✅ Track 4.7
- [x] `AddTestResultModal.tsx` → inline spinner → CSS ✅ Track 4.7
- [x] `AthleteCard.tsx` → hardcoded confirm → i18n ✅ Track 4.7
- [x] `AthleteCard.tsx` → `лет` → i18n ✅ Track 4.7
- [x] `ProgressChart.tsx` → `ru-RU` → locale map ✅ Track 4.7
- [x] `ProgressChart.tsx` → 2 строки → i18n ✅ Track 4.7
- [x] `training/page.tsx` → 4 hardcoded → i18n ✅ Track 4.7
- [ ] `dashboard/page.tsx` → 2 hardcoded RU строки → i18n
- [x] `training/page.tsx` → 5 inline styles → CSS ✅ Track 4.7 (2 inline оставлены — динамические phase colors, допустимо)
- [x] ~15-20 i18n ключей ✅ Track 4.7

### Фаза 2: Settings (1 день)
- [ ] `auth.ts` → `changePassword()`
- [ ] `auth.ts` → `updateUserName()`
- [ ] Settings: секция Security (смена пароля)
- [ ] Settings: editable name
- [ ] Settings: athlete profile (read-only)
- [ ] Settings: 3 inline styles → CSS
- [ ] Settings: ArrowLeft → ChevronRight
- [ ] i18n ключи settings

### Фаза 3: Athlete-Season Binding (2-3 дня)
- [ ] PB: `athlete_id` field в `seasons` (ADMIN)
- [ ] PB: cascade delete rules (ADMIN)
- [ ] `types.ts` → `athlete_id?` в SeasonsRecord
- [ ] `seasons.ts` → create/list/filter by athleteId
- [ ] `SeasonWizard.tsx` → athlete dropdown
- [ ] `training/page.tsx` → athleteId filter
- [ ] `AthleteTrainingView.tsx` → plan by athlete_id
- [ ] `trainingLogs.ts` → athlete_id filter
- [ ] `athletes.ts` → simplify hardDelete (cascade)

### Фаза 4: Athlete Detail Page (1-2 дня)
- [ ] `/dashboard/athlete/[id]/page.tsx` — hero + tabs
- [ ] Tab: Overview (metrics grid + recent tests)
- [ ] Tab: Training History (timeline cards)
- [ ] Tab: Test Results (ProgressChart + delta chips)
- [ ] Tab: Readiness (CNS heatmap + trend)
- [ ] `athleteDetail.module.css` — glassmorphism, DS tokens
- [ ] `AthleteCard.tsx` → click → athlete detail page
- [ ] i18n: `athleteDetail.*` ×3 locale

### Фаза 5: Dashboard Groups + ErrorBoundary (1 день)
- [ ] Dashboard: group filter chips
- [ ] AthleteCard: group badge
- [ ] `ErrorBoundary.tsx` — glassmorphism UI
- [ ] `ErrorBoundary.module.css` — DS tokens
- [ ] `layout.tsx` → wrap in ErrorBoundary
- [ ] i18n: `error.*` + `dashboard.allGroups`

### Критерии Gate
- [ ] `pnpm type-check` → Exit 0
- [ ] `pnpm build` → Exit 0
- [ ] `pnpm lint` → 0 new errors
- [ ] `pnpm test` → Exit 0
- [ ] 0 hardcoded RU строк
- [ ] 0 inline styles в Settings
- [ ] Тренер может создать сезон для атлета
- [ ] Атлет видит свой план

---

## Verification Plan

### Automated Tests

```bash
# Каждый этап:
pnpm type-check    # 0 ошибок
pnpm build         # Exit 0
pnpm lint          # 0 new errors
pnpm test          # 16+ passed

# Поиск оставшихся hardcoded строк:
grep -rn "Загрузка\|Не удалось\|Error\|лет\b" src/ --include='*.tsx' --include='*.ts'
```

### Manual Verification (для пользователя)

1. **i18n:** Переключить язык EN/CN → проверить dashboard loading и error строки
2. **Settings Security:** Зайти в Settings → Security → ввести old/new пароль → сохранить → logout → login с новым
3. **Settings Name:** Зайти в Settings → редактировать имя → сохранить → обновить → имя сохранилось
4. **Athlete-Season:** Как coach: SeasonWizard → выбрать athlete → создать → сезон привязан
5. **Athlete View:** Как athlete: войти → Training → увидеть назначенный план (или empty state)
6. **Athlete Detail:** Dashboard → кликнуть на карточку → открыть страницу с 4 табами → проверить ProgressChart, CNS Heatmap
7. **Group Filter:** Dashboard → чип "Все" → чип конкретной группы → фильтрация работает
8. **ErrorBoundary:** В DevTools: `document.querySelector('[data-testid]').__reactFiber$...` → throw error → видно Error Boundary UI

---

## Сводка по скиллам для каждой фазы

| Фаза | Скиллы | Mandatory Reads |
|---|---|---|
| 1. Quick Fixes | `always` + `i18n` | — |
| 2. Settings | `always` + `frontend` + `auth_security` + `ui_design` + `i18n` | `DESIGN_SYSTEM.md`, `tokens.css` |
| 3. Athlete-Season | `always` + `architecture` + `typescript` + `frontend` + `i18n` | `ARCHITECTURE.md` |
| 4. Athlete Detail | `always` + `frontend` + `ui_design` + `analytics` + `i18n` + `accessibility` | `DESIGN_SYSTEM.md`, `tokens.css` |
| 5. Groups + Error | `always` + `frontend` + `ui_design` + `errors` + `i18n` + `performance` | `DESIGN_SYSTEM.md` |

---

## Resolved Decisions

| # | Вопрос | Решение |
|---|---|---|
| 1 | PB cascade | ✅ Cascade в PB Admin. Нужны credentials или ручная работа |
| 2 | Графики на Athlete Detail | ✅ Переиспользовать `ProgressChart` + `CnsHeatmap` |
| 3 | Управление группами | ✅ Только в Settings → Groups. Dashboard = filter + badge |
| 4 | Phase-color inline styles | ✅ Оставить (динамические значения, CSS class не подходит) |
| 5 | ArrowLeft для навигации | ✅ Заменить на `ChevronRight` (Lucide) |
| 6 | Admin credentials | ❓ Нужен ответ пользователя |
