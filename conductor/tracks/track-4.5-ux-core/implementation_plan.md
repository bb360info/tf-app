# Gate 4.5 — Финальный план закрытия

> **Illustration** → Track 6 (утверждено)
> **PB credentials** → `.agent/pb-admin.md` (gitignored)

---

## Распределение по агентам и скиллам

| # | Блок | 🤖 Агент | ⏱ | 🛠 Скиллы | 📖 Workflows |
|---|------|---------|---|-----------|-------------|
| 1 | **C — AthleteTrainingView** | **Sonnet** | 90м | `always` + `frontend` + `ui_design` | `/ui-work` |
| 2 | **D — PB Admin** | **Sonnet** (browser) | 15м | — | — |
| 3 | **A — Quick Wins** | **Sonnet** | 30м | `always` + `frontend` | — |
| 4 | **B — Dashboard аналитика** | **Sonnet** | 30м | `always` + `frontend` + `ui_design` | — |
| 5 | **E — DS Compliance** | **Flash** ⚡ | 20м | `always` | — |

---

## Детализация скиллов по блокам

### Блок C — AthleteTrainingView

**Workflow:** `/ui-work` (обязательный перед UI работой)

**mandatory_reads (перед стартом):**
- `docs/DESIGN_SYSTEM.md`
- `src/styles/tokens.css`
- `src/app/globals.css`

**Скиллы:**
| Скилл | Путь | Зачем |
|-------|------|-------|
| `jumpedia-design-system` | `.agent/skills/skills/jumpedia-design-system/SKILL.md` | Iron Law, tokens, pre-delivery checklist |
| `react-ui-patterns` | `.agent/skills/skills/react-ui-patterns/SKILL.md` | Loading/error/empty states, form patterns |
| `react-best-practices` | `.agent/skills/skills/react-best-practices/SKILL.md` | Waterfall prevention, bundle optimization |
| `lint-and-validate` | `.agent/skills/skills/lint-and-validate/SKILL.md` | pnpm type-check/lint/build после изменений |
| `concise-planning` | `.agent/skills/skills/concise-planning/SKILL.md` | Структурирование многофайловой задачи |

---

### Блок D — PB Admin (browser)

Скиллы не нужны — это browser-only задача (создать коллекцию + API rules).

**Контекст:** прочитать `.agent/pb-admin.md` для credentials.

---

### Блок A — Quick Wins

**Скиллы:**
| Скилл | Зачем |
|-------|-------|
| `jumpedia-design-system` | Проверка что Lucide иконки соответствуют DS |
| `lint-and-validate` | Валидация после изменений |

---

### Блок B — Dashboard аналитика

**mandatory_reads:** `docs/DESIGN_SYSTEM.md`, `src/styles/tokens.css`

**Скиллы:**
| Скилл | Зачем |
|-------|-------|
| `jumpedia-design-system` | Glass cards, spacing tokens |
| `react-ui-patterns` | Loading/empty states для ProgressChart, AchievementsGrid |
| `react-best-practices` | Lazy-load Recharts, bundle split |
| `lint-and-validate` | Валидация |

---

### Блок E — DS Compliance Audit

**Скиллы:**
| Скилл | Зачем |
|-------|-------|
| `jumpedia-design-system` | Pre-Delivery Checklist — основной инструмент аудита |

**Проверки:**
```bash
# CDN audit
grep -r "fonts.googleapis\|cdnjs\|unpkg\|cdn.jsdelivr" src/
# Emoji audit
grep -rn "[\x{1F300}-\x{1FAFF}]" src/components/ src/app/
# Build
pnpm type-check && pnpm lint && pnpm build
```

---

## Порядок выполнения

### 1️⃣ Блок C: AthleteTrainingView — `Sonnet` · 90 мин

| # | Файл | Действие |
|---|------|----------|
| C1 | [NEW] `trainingLogs.ts` | PB сервис: CRUD + `getPublishedPlanForAthlete` |
| C2 | [NEW] `AthleteTrainingView.tsx` | Read-only план + RPE slider + sets form |
| C3 | [NEW] `AthleteTrainingView.module.css` | Glass cards, RPE gradient, mobile-first |
| C4 | [MOD] `training/page.tsx` | `if (isAthlete) return <AthleteTrainingViewLazy />` |
| C5 | [MOD] `AthleteDashboard.tsx` | Today plan fetch → "Начать тренировку" |

### 2️⃣ Блок D: PB Admin — `Sonnet` (browser) · 15 мин

| # | Действие |
|---|----------|
| D1 | Login → create `custom_exercises` (22 поля) |
| D2 | Set API Rules (visibility-based) |

### 3️⃣ Блок A: Quick Wins — `Sonnet` · 30 мин

| # | Файл | Действие |
|---|------|----------|
| A1 | `mental/page.tsx` | emoji → Lucide (Brain, Target, MessageCircle, Unlock, Zap, Wind) |
| A2 | `exercises.ts` | `equipment` в searchExercises filter |
| A3 | `ExerciseCatalog.tsx` | Equipment chips + community badge |

### 4️⃣ Блок B: Dashboard — `Sonnet` · 30 мин

| # | Файл | Действие |
|---|------|----------|
| B1 | `AthleteDashboard.tsx` | Lazy ProgressChart + AchievementsGrid |
| B2 | `AthleteDashboard.module.css` | Стили секций |

### 5️⃣ Блок E: DS Compliance — `Flash` ⚡ · 20 мин

| # | Проверка |
|---|----------|
| E1 | No CDN, no emoji, 375px, touch ≥ 44px |
| E2 | `pnpm type-check && pnpm lint && pnpm build` |

---

## Deferred → Track 6
- Иллюстрации упражнений (Cloudflare R2)
