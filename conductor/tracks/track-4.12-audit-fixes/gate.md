# Gate 4.12: Audit Bug Fixes — Checklist

> **Контекст:** Комплексный аудит выявил 10 багов/несоответствий. Self-athlete для coach удаляется — у тренеров уже есть реальные ученики.
> **Скиллы:** `systematic-debugging`, `verification-before-completion`, `concise-planning`, `jumpedia-design-system`
> **Предыдущий аудит:** см. `brain/1f5ce246.../walkthrough.md` + `implementation_plan.md`

## Фаза 1: Self-Athlete Removal + getSelfAthleteId Refactor

- [ ] `readiness.ts` — удалить coach ветку (auto-create self-athlete, строки 112-133)
- [ ] `readiness.ts` — `getSelfAthleteId()` теперь athlete-only: запрос по `user_id`, для coach → throw Error
- [ ] `readiness.ts` — убрать singleton promise guard `_selfAthletePromise` (упрощение)
- [ ] `athletes.ts:35` — убрать фильтр `a.user_id !== user.id`, заменить на `return all;`
- [ ] `groups.ts:104` — добавить проверку: coach не может `joinByInviteCode`
- [ ] `WeekConstructor.tsx:110` — оставить как есть (non-blocking catch), athleteId=null для coach → кнопка Log не появляется

## Фаза 2: BUG-1 — readiness_score не существует на DailyCheckinsRecord

- [ ] `AthleteDetailClient.tsx:89` — `checkin?.readiness_score` → вычислять через `calculateReadiness()` из `calculator.ts`
- [ ] Импорт: `import { calculateReadiness } from '@/lib/readiness/calculator'`
- [ ] Маппинг полей: `{ sleepDuration: checkin.sleep_hours, sleepQuality: checkin.sleep_quality, soreness: checkin.pain_level, mood: checkin.mood }`

## Фаза 3: BUG-4 — Единая формула readiness (3 места → 1 источник)

- [ ] `dashboard/page.tsx:78-90` — inline readiness → `calculateReadiness()` из `calculator.ts`
- [ ] `AthleteDashboard.tsx:64-74` — inline readiness → `calculateReadiness()` из `calculator.ts`
- [ ] Убедиться что `calculator.ts` — единственный source of truth

## Фаза 4: Coach Training Page — удаление readiness checkin

- [ ] `training/page.tsx` — удалить state: `athleteId`, `checkinData`, `showCheckin` (строки 34-36)
- [ ] `training/page.tsx` — удалить useEffect readiness init (строки 52-80)
- [ ] `training/page.tsx` — удалить `handleSaveCheckin` (строки 82-105)
- [ ] `training/page.tsx` — удалить checkin-кнопки из header actions (строки 213-227)
- [ ] `training/page.tsx` — удалить checkin modal overlay (строки 247-266)
- [ ] `training/page.tsx` — удалить lazy import `DailyCheckinLazy` (строки 395-400)
- [ ] `training/page.tsx` — readinessScore проп из SeasonDetailLazy → удалить (строка 153)

## Фаза 5: CSS Utility Classes

- [ ] `tokens.css` — добавить `.sr-only` (screen-reader-only utility)
- [ ] `tokens.css` — добавить `.hidden-mobile` + `@media (max-width: 480px)` override

## Фаза 6: Analytics Role Guard

- [ ] `analytics/page.tsx` — добавить `useAuth()` + `isAthlete` check
- [ ] Если `isAthlete` → показать athlete-friendly empty state или redirect на `/dashboard`

## Фаза 7: Minor Fixes

- [ ] `AthleteTrainingView.tsx:204` — `DAY_NAMES` → i18n через `t('training.dayMon')` и т.д.
- [ ] Добавить ключи `training.dayMon..daySun` в `messages/{ru,en,cn}/common.json` — по 7 ключей × 3 локали
- [ ] `AthleteDashboard.tsx:163` — символ `↩` → `<RotateCcw size={14} />` из Lucide

## Criteria

- [ ] `pnpm type-check` — Exit 0
- [ ] `pnpm build` — Exit 0
- [ ] `pnpm test` — Exit 0, 16+ tests pass
- [ ] `getSelfAthleteId()` НЕ создаёт athlete-записи для coach
- [ ] Тренер → `/dashboard` — self-athlete не виден в списке
- [ ] Тренер → `/training` — нет кнопки checkin
- [ ] Тренер → `/dashboard/athlete/{id}` — readiness badge отображает число
- [ ] Атлет → `/analytics` — корректный UI (не crash)
- [ ] Мобиль (< 480px) → `/training` — текст кнопок скрыт, только иконки
- [ ] `grep -rn 'readiness_score' src/ --include="*.tsx"` — только в Zod schema, не в runtime
