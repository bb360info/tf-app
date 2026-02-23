# Gate 4.5: UX Core — Exercise Catalog + Daily Builder + Athlete View ✅ Checklist

## Фаза 1: Exercise Catalog
- [x] Страница `/reference/exercises` с карточками из PocketBase — `reference/exercises/page.tsx` + `ExerciseCatalog.tsx`
- [x] Фильтры: категория, уровень, фаза — ExerciseCatalog.tsx (category/level/phase chips)
- [x] Фильтр по оборудованию — ExerciseCatalog.tsx (equipment chips) + searchExercises(equipment) параметр
- [x] Поиск (текст, RU/EN/CN) — searchExercises() debounce 350ms query
- [x] Детальная карточка (описание, дозировка, мышцы, оборудование) — ExerciseDetailSheet.tsx
- [ ] Иллюстрация упражнения **— НЕ реализована** (нет поля illustration в UI, нет загрузки картинок)
- [x] Inline Coach Tips с TTS (Web Speech API) — CoachTips.tsx
- [x] «Показать атлету» — fullscreen overlay — ShowAthleteOverlay.tsx
- [x] Избранное (localStorage) — useExerciseFavorites hook
- [x] Карточка «Библиотека упражнений» на `/reference` page

## Фаза 2: Daily Training Builder + Exercise Constructor
- [x] QuickPlanBuilder — конструктор тренировки (дата, длительность, упражнения, notes, localStorage history)
- [x] Reorder ▲▼ (ChevronUp/ChevronDown) + inline sets×reps + notes textarea
- [x] CNS Load indicator (cnsTotal, red/yellow/green)
- [x] ExerciseConstructor — 4-step wizard (basics/details/coaching/review)
- [x] Visibility model: personal → pending_review (customExercises.ts + submitForReview)
- [x] PB schema: `custom_exercises` коллекция — уже существовала с полями name_ru/en/cn, level, training_category, cns_cost, coach_id, visibility, phase_suitability, tags
- [x] PB API Rules для custom_exercises — List/View: `coach_id = @request.auth.id || visibility = "approved"`, Create: auth, Update/Delete: coach_id
- [x] Сервис `customExercises.ts` (CRUD + submitForReview + listApprovedCommunityExercises)
- [x] ExercisePicker: вкладка «Мои упражнения» (custom tab)
- [x] Approved custom exercises бейдж «Community» в ExerciseCatalog — communityBadge i18n (RU/EN/CN) + `.communityBadge` CSS + `status === 'approved'` рендер
- [x] ⏳ Admin UI для модерации → Track 6 (пока через PB Admin Panel)

## Фаза 3: Athlete Dashboard
- [x] useAuth hook (isCoach/isAthlete/role) — `useAuth.ts`
- [x] Role-switch на `/dashboard` — `if (isAthlete) return <AthleteDashboard />`
- [x] 10-sec Readiness Check-in — ReadinessCheckin.tsx + score display
- [x] Мой план на сегодня — AthleteTrainingView: показывает published plan для атлета
- [x] Заполнение Training Log (RPE + подходы) — trainingLogs.ts сервис + AthleteTrainingView с RPE слайдером
- [x] Мои тесты и прогресс — lazy ProgressChart (standing_jump) + Recharts в AthleteDashboard
- [x] Мои ачивки — lazy AchievementsGrid (checkAndGrant + Suspense) в AthleteDashboard
- [x] AthleteTrainingView на `/training` для role=athlete — role-check в training/page.tsx + early return

## Фаза 4: Warmup & Mental Prep
- [x] 2 новые категории в Reference: warmup + mental
- [x] Warmup Protocols (3 пресета: Training / Competition / Recovery)
- [x] Breathing Timer (4-4-4-4 SVG circle animation)
- [x] Mental Prep cards (6 карточек + 5-step routine)
- [x] mental/page.tsx использует Lucide — эмодзи заменены (Brain, Target, Wind, MessageCircle, Unlock, Zap)

## Design System Compliance
- [x] All UI passes `docs/DESIGN_SYSTEM.md` Pre-Delivery Checklist — все новые файлы используют CSS токены, glassmorphism, Lucide
- [x] Mobile-first validated — pnpm build Exit 0, max-width: 600px, padding-bottom: 64px (nav)
- [x] Touch targets ≈ 44px — checkinBtn 48px, reCheckinBtn min-height 44px, stepper/save buttons в AthleteTrainingView
- [x] No external CDN requests — china-audit.sh PASS, 14 woff2 self-hosted
- [x] No emoji as UI icons — mental/page.tsx обновлён (Lucide), новые компоненты emoji-free

## Дополнительные доработки (QoL / Bug Fixes)
- [x] AthleteTrainingView: fix 400 error — `user.id` → `getSelfAthleteId()`, 400/404 → empty state
- [x] i18n: русские переводы фаз (PRE_COMP, COMP, TRANSITION) в messages/ru/common.json
- [x] middleware.ts: next-intl Accept-Language автодетекция (localeDetection: true)
- [x] detectLocale.ts: клиентская утилита `detectBrowserLocale()` — `navigator.languages` → ru/cn/en
- [x] OnboardingWizard: дефолт языка из browser detection + router.replace при смене locale
- [x] hardDeleteAthleteWithData: каскадное удаление всех данных атлета (12 коллекций)
- [x] AthleteCard: кнопка удаления (onDelete + Trash2 + confirm + deleteBtn CSS)
- [ ] PocketBase Admin: Cascade behaviour для athlete_id relations (restrict → cascade) — **ручная настройка**

