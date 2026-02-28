# Phase 7 — QA + Deploy (Track 4.265)
>
> Дата: 2026-02-27 · Агент: ?? · Скиллы: jumpedia-design-system, deployment-engineer, concise-planning

---

## Kaizen-риски (учтены в плане)

| # | Риск | Статус в плане |
|---|------|----------------|
| ⚠️ | `window.confirm`/`alert` в `handleApplyWarmupToPhase` (строки 429, 434) — не стилизованы, проблематично на iOS Safari | **Задача 0**: заменить на inline confirm (аналог `publishConfirm`) |
| ⚠️ | `handlePublishWeekInView` не вызывает `loadSeason()` — PhaseCard не обновляется после publish из MultiWeekView | **Задача 1**: добавить `onSuccess` callback |
| ⚡ | `stampWarmupToAllDays` → N×M async ops — smoke test обязателен | **Задача 6**: smoke test warmup selector |

---

## Задача 0: Заменить `window.confirm`/`alert` на inline confirm

**Файл:** `src/components/training/SeasonDetail.tsx`
**CSS:** `src/components/training/SeasonDetail.module.css`

**Что делать:**

1. В `PhaseCard`, добавить state: `const [warmupApplyConfirm, setWarmupApplyConfirm] = useState(false);`
2. `handleApplyWarmupToPhase`:
   - убрать `window.confirm(...)` → вместо него `setWarmupApplyConfirm(true)`
   - убрать `window.alert(...)` → вместо него вывести результат в inline `<p>` (временно, до Toast-системы)
3. В JSX после `warmupApplyBtn` добавить блок по образцу `publishConfirm`:

   ```jsx
   {warmupApplyConfirm && (
     <div className={styles.warmupApplyConfirmRow}>
       <span>{t('training.warmupApplyConfirm')}</span>
       <button className={styles.warmupConfirmBtn} onClick={doApply} disabled={warmupApplying}>
         {warmupApplying ? '...' : t('training.confirmYes')}
       </button>
       <button className={styles.warmupCancelBtn} onClick={() => setWarmupApplyConfirm(false)}>
         {t('training.confirmNo')}
       </button>
     </div>
   )}
   ```

4. `doApply` = реальный вызов `stampWarmupToAllDays` (логика из `handleApplyWarmupToPhase`)
5. CSS классы `.warmupApplyConfirmRow`, `.warmupConfirmBtn`, `.warmupCancelBtn` — скопировать стили из `.publishConfirm`, `.publishConfirmBtn`, `.publishCancelBtn` (все токены, min-height 44px)

**Verify:** нет `window.confirm`/`window.alert` в файле: `grep -n "window.confirm\|window.alert" src/components/training/SeasonDetail.tsx`

---

## Задача 1: `onSuccess` callback в `handlePublishWeekInView`

**Файл:** `src/components/training/SeasonDetail.tsx`

**Что делать:**

1. Изменить `handlePublishWeekInView` (строки 126–130):

   ```ts
   const handlePublishWeekInView = useCallback(async (_weekNum: number, planId: string) => {
     const { publishPlan } = await import('@/lib/pocketbase/services/plans');
     await publishPlan(planId);
     await loadSeason(); // ← добавить: обновляет season → PhaseCard re-renders с актуальными данными
   }, [loadSeason]); // ← добавить loadSeason в deps
   ```

2. Убедиться что `loadSeason` стабильна (уже `useCallback` с `[seasonId, t]`)

**Verify:** `pnpm type-check` — 0 ошибок. После publish из MultiWeekView PhaseCard показывает обновлённый статус-map.

---

## Задача 2: Pre-delivery checklist (jumpedia-design-system §10)

**Файлы для аудита:**

- `SeasonDetail.module.css` — проверить новые классы (Phase 5-6): `applyWarmupBtn`, `warmupSelectorRow`, `warmupSelect`, `warmupApplyBtn`, `warmupNoTemplates`, `phaseProgressBar`, `phaseProgressFill`, `phaseProgressLabel`, `weekStatusMap`, `weekDot*`, `publishWeekBtn`
- `MultiWeekView.module.css` — `publishWeekBtn`, `weekLabel`
- `SeasonParticipants.module.css` — весь файл новый

**Чеклист:**

```
- [ ] Все цвета через var(--color-*)
- [ ] Все отступы через var(--space-*)
- [ ] Все радиусы через var(--radius-*)
- [ ] Иконки: только Lucide, нет emoji
- [ ] Touch targets ≥ 44×44px (min-height: 44px)
- [ ] Mobile-first: base 375px, breakpoints @media
- [ ] Glass effects через --glass-bg, --glass-border, --glass-blur
- [ ] Нет Tailwind-классов, нет hardcoded hex/px вне tokens.css
```

**Verify:** `grep -rn "#[0-9a-fA-F]\{3,6\}" src/components/training/SeasonDetail.module.css src/components/training/MultiWeekView.module.css src/components/training/SeasonParticipants.module.css`

---

## Задача 3: `pnpm build` clean

```bash
pnpm build 2>&1 | tail -20
```

Убедиться Exit code: 0, нет TypeScript ошибок в output.

---

## Задача 4: Browser smoke test — Coach Flow

**Demo:** `demo.coach@jumpedia.app` / `Demo2026!`

**Сценарий A (publish + auto-assign):**

1. Открыть существующий сезон с athlete_id или group_id
2. Зайти в фазу → создать план-черновик (weekConstructor)
3. Нажать «Publish N drafts» → подтвердить inline confirm
4. ✅ план перешёл в published, в PhaseCard прогресс-бар обновился
5. ✅ в SeasonParticipants panel виден auto-assigned план

**Сценарий B (publish из MultiWeekView + PhaseCard update):**

1. Переключиться в MultiWeekView (кнопка «Все недели»)
2. Нажать кнопку Publish на draft-неделе
3. Вернуться назад (кнопка «Назад»)
4. ✅ PhaseCard показывает обновлённый статус (не требует перезагрузки страницы)

**Сценарий C (Week Status Map navigation):**

1. В PhaseCard кликнуть на цветную точку недели
2. ✅ WeekConstructor открывается на правильной неделе (не на неделе 1)

---

## Задача 5: Browser smoke test — Warmup Selector

**Demo:** `demo.coach@jumpedia.app` / `Demo2026!`

**Сценарий D (Warmup Template Apply):**

1. Открыть сезон → войти в PhaseCard фазы где есть планы с упражнениями
2. Нажать кнопку «Разминка» (Wind icon) → dropdown с шаблонами
3. Выбрать шаблон → нажать «Применить»
4. ✅ Появляется inline confirm (НЕ `window.confirm`!) — нажать «Да»
5. ✅ Spinner во время операции, затем результат (applied: N)
6. ✅ Открыть WeekConstructor → проверить что warmup slots заполнены
7. ✅ Если планов много (3+ плана, 5+ дней) — операция завершается без timeout (< 10 сек)

**⚡ Если timeout:** добавить прогресс-индикатор или разбить на batch — записать в backlog

---

## Задача 6: Mobile test 375px

В браузере DevTools → 375×812 (iPhone SE / iPhone 12 mini):

- ✅ SeasonParticipants panel — без горизонтального overflow
- ✅ PhaseCard actions — кнопки не перекрываются, touch target исправен
- ✅ Warmup selector row — select + кнопка помещаются
- ✅ MultiWeekView — заголовки колонок не обрезаны
- ✅ weekDot кнопки — видны и кликабельны (44px tap area через ::before)

---

## Задача 7: Deploy

```bash
# В терминале проекта:
pnpm build
# /deploy workflow
```

Следовать инструкциям `/deploy` workflow (rsync на 209.46.123.119).

---

## Задача 8: CHANGELOG.md + walkthrough.md

**CHANGELOG.md** — добавить секцию `## [Unreleased] — 2026-02-27 (Phase 7)`:

- Fixed: заменён `window.confirm`/`alert` на inline confirm в Warmup Selector
- Fixed: `handlePublishWeekInView` теперь вызывает `loadSeason()` — PhaseCard обновляется после publish из MultiWeekView
- Released: Track 4.265 Season-Level Assignment & Warmup Fixes — deploy

**walkthrough.md** — append финального раздела Phase 7 с результатами smoke-тестов.

---

## Порядок выполнения

```
Задача 0 → Задача 1 → type-check → Задача 2 (CSS audit) → Задача 3 (build) → Задача 4+5+6 (browser QA) → Задача 7 (deploy) → Задача 8 (docs)
```

---

## Verify командой

```bash
grep -n "window.confirm\|window.alert" src/components/training/SeasonDetail.tsx
# Должно вернуть: нет результатов

pnpm type-check 2>&1 | tail -5
# Exit 0

pnpm build 2>&1 | tail -10
# Exit 0
```
