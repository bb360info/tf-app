# Gate 4.264 — Schema & Code Audit Fixes

> **Цель:** Исправить 6 расхождений, выявленных в аудите после трека 4.263.  
> Источник: conversation `597e3c98`, report `db_schema_audit.md`.

---

## Phase 1 — Критические баги (🔴)

- [x] **#1** `AthleteTrainingView.tsx` строка ~559: заменить `pe.is_warmup` → `pe.block !== 'warmup'`
- [x] **#2** `src/lib/validation/content.ts`: обновить `AchievementTypeSchema` (4 → 13 типов)
- [x] **#3** `src/lib/validation/content.ts`: обновить `NotificationTypeSchema` (4 → 8 типов)

---

## Phase 2 — Средние (🟡)

- [x] **#4** `pb_hooks/notifications.pb.js`: удалён дублирующий хук `plan_published`, расширен `publishPlan()` в `plans.ts` на season membership + Set dedup
- [x] **#5** `AthleteTrainingView.tsx`: StandaloneBanner — `useTranslations('training')` + ключ `standalonePlan` в RU/EN/CN

---

## Phase 3 — Низкий приоритет (🟢)

- [x] **#6** `logs.ts`: добавлен `log_mode` параметр в `getOrCreateLog()` и `createTrainingLog()`

---

## Phase 4 — QA + Деплой

- [x] `pnpm type-check` — 0 ошибок
- [x] `pnpm build` — успешный билд
- [x] `pnpm lint` — 0 ошибок
- [x] Протестировать Focus Mode: warmup больше не попадает в список упражнений
- [x] Протестировать Zod-валидацию achievements и notifications
- [x] Деплой хуков: `pb_hooks/notifications.pb.js` → VPS
- [x] Деплой фронтенда
- [x] `walkthrough.md` написан

---

## Acceptance Criteria

1. ✅ В Focus Mode и QuickEdit warmup-упражнения не отображаются
2. ✅ Zod-валидация не падает на реальных типах achievements/notifications
3. ✅ Атлеты в сезоне (без plan_assignment) получают push при публикации плана
4. ✅ StandaloneBanner корректно отображается на EN и CN
