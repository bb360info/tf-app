# Gate 4.264 — Schema & Code Audit Fixes

> **Цель:** Исправить 6 расхождений, выявленных в аудите после трека 4.263.  
> Источник: conversation `597e3c98`, report `db_schema_audit.md`.

---

## Phase 1 — Критические баги (🔴)

- [ ] **#1** `AthleteTrainingView.tsx` строка ~559: заменить `pe.is_warmup` → `pe.block !== 'warmup'`
- [ ] **#2** `src/lib/validation/content.ts`: обновить `AchievementTypeSchema` (4 → 13 типов)
- [ ] **#3** `src/lib/validation/content.ts`: обновить `NotificationTypeSchema` (4 → 8 типов)

---

## Phase 2 — Средние (🟡)

- [ ] **#4** `pb_hooks/notifications.pb.js`: расширить `plan_published` хук — слать уведомления атлетам через season membership (не только через plan_assignments)
- [ ] **#5** `AthleteTrainingView.tsx`: вынести `StandaloneBanner` текст в i18n (`t('standalonePlan')`) + добавить ключ в RU/EN/CN

---

## Phase 3 — Низкий приоритет (🟢)

- [ ] **#6** `logs.ts`: добавить `log_mode` параметр в `getOrCreateLog()` и `createTrainingLog()`

---

## Phase 4 — QA + Деплой

- [ ] `pnpm type-check` — 0 ошибок
- [ ] `pnpm build` — успешный билд
- [ ] `pnpm lint` — 0 ошибок
- [ ] Протестировать Focus Mode: warmup больше не попадает в список упражнений
- [ ] Протестировать Zod-валидацию achievements и notifications
- [ ] Деплой хуков: `pb_hooks/notifications.pb.js` → VPS
- [ ] Деплой фронтенда
- [ ] `walkthrough.md` написан

---

## Acceptance Criteria

1. В Focus Mode и QuickEdit warmup-упражнения не отображаются
2. Zod-валидация не падает на реальных типах achievements/notifications
3. Атлеты в сезоне (без plan_assignment) получают push при публикации плана
4. StandaloneBanner корректно отображается на EN и CN
