# Track 4.7 Extension: Hardcoded Strings + Inline Styles + UX Polish

> **Статус:** Ожидает выполнения  
> **Оценка:** ~3 часа  
> **Зависимости:** Нет (gate 4.7 закрыт, это расширение)

## Контекст

Gate 4.7 закрыт (16/16 ✅). При аудите выявлены дополнительные проблемы:
- **Hardcoded русские строки** в 4 компонентах — EN/CN пользователи видят русский текст
- **Inline styles** в `training/page.tsx` — нарушение DS (Design System)
- **UX loading states** из `loading_states_brainstorm.md` — ждут реализации

> [!IMPORTANT]
> **Lint-ошибки src/** (ThemeProvider, ProgressChart, peaking, readiness, snapshots) вынесены в отдельный **Lint Cleanup Track** — НЕ трогать здесь.

---

## 🛠 Инструкция для агента

### Обязательные скиллы

Перед началом работы загрузи скиллы:

| Группа | Скиллы | Зачем |
|--------|--------|-------|
| `always` | `jumpedia-design-system`, `verification-before-completion`, `lint-and-validate`, `concise-planning` | Базовая дисциплина, DS compliance |
| `i18n` | `i18n-localization` | Правильная структура ключей next-intl, plural forms |
| `frontend` | `react-best-practices`, `nextjs-app-router-patterns` | CSS Modules, компонентные паттерны |

### Mandatory reads (ПЕРЕД кодом)
```
docs/DESIGN_SYSTEM.md     — токены, glassmorphism, touch targets
src/styles/tokens.css      — CSS переменные (имена)
messages/ru/common.json    — текущая структура i18n ключей
```

### Порядок выполнения
1. Фаза 1 → Фаза 2 → Фаза 3
2. После КАЖДОЙ фазы: `pnpm type-check && pnpm build && pnpm test`
3. В конце: `pnpm lint 2>&1 | grep "src/" | wc -l` — убедиться что не добавились ошибки
4. Обновить `CHANGELOG.md` и `gate.md` (добавить extension items)

---

## Фаза 1: Hardcoded Strings → i18n (4 файла)

### 1.1 AddTestResultModal.tsx

**Файл:** `src/components/analytics/AddTestResultModal.tsx`

4 hardcoded строки + 1 inline style:

| Строка | Было | Ключ i18n |
|--------|------|-----------|
| L45 | `'Введите корректное значение > 0'` | `analytics.addTestForm.invalidValue` |
| L49 | `'Дата не может быть в будущем'` | `analytics.addTestForm.futureDateError` |
| L64 | `'Не удалось сохранить результат. Попробуйте ещё раз.'` | `analytics.addTestForm.saveFailed` |
| L145 | `placeholder="Условия, самочувствие..."` | `analytics.addTestForm.notesPlaceholder` |

**Inline style fix:**
```diff
// L163
-<Loader2 ... style={{ animation: 'spin 0.7s linear infinite' }} />
+<Loader2 ... className={styles.spinIcon} />
```
Добавить в `AddTestResultModal.module.css`:
```css
.spinIcon { animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
```

### 1.2 AthleteCard.tsx

**Файл:** `src/components/dashboard/AthleteCard.tsx`

| Строка | Было | Ключ i18n |
|--------|------|-----------|
| L56-58 | `` `Удалить атлета «${athlete.name}» со всеми данными? Это действие необратимо.` `` | `dashboard.deleteConfirm` (с параметром `{name}`) |
| L88 | `` `...лет` `` (после вычисления возраста) | `dashboard.yearsOld` (с параметром `{age}`) |

```diff
// L56-58
-const confirmed = window.confirm(`Удалить...«${athlete.name}»...`);
+const confirmed = window.confirm(t('deleteConfirm', { name: athlete.name }));

// L87-89
-{new Date().getFullYear() - new Date(athlete.birth_date).getFullYear()} лет
+{t('yearsOld', { age: new Date().getFullYear() - new Date(athlete.birth_date).getFullYear() })}
```

### 1.3 ProgressChart.tsx

**Файл:** `src/components/analytics/ProgressChart.tsx`

> ProgressChart — презентационный компонент без `useTranslations`. Решение: добавить props для строк.

```diff
 interface ProgressChartProps {
     results: TestResultRecord[];
     testType: TestType;
     title: string;
     isLoading?: boolean;
+    locale?: string;        // для toLocaleDateString
+    noDataMessage?: string;  // "Нужно минимум 2 результата"
+    loadingLabel?: string;   // aria-label для skeleton
 }
```

| Строка | Было | Станет |
|--------|------|--------|
| L110 | `'Нужно минимум 2 результата для графика'` | `noDataMessage ?? 'Need at least 2 results'` |
| L118 | `'ru-RU'` hardcoded | `locale ?? 'en-US'` → передать из `useLocale()` в родителе |
| L98 | `aria-label="Загрузка графика"` | `aria-label={loadingLabel ?? 'Loading chart'}` |

**Обновить все вызовы ProgressChart** — добавить props:
- `src/components/dashboard/AthleteDashboard.tsx` 
- `src/app/[locale]/(protected)/analytics/page.tsx`

### 1.4 training/page.tsx — hardcoded strings

**Файл:** `src/app/[locale]/(protected)/training/page.tsx`

| Строка | Было | Ключ i18n |
|--------|------|-----------|
| L75 | `'Cannot save check-in: athlete profile could not be created.'` | `alert(t('training.checkinCreateFailed'))` |
| L85 | `'Failed to save checkin. Check console for details.'` | `alert(t('training.checkinSaveFailed'))` |
| L176 | `Check-in` | `{t('training.checkin')}` |
| L184 | `Ready` | `{t('training.checkinDone')}` |

---

## Фаза 2: Inline Styles → CSS Classes

**Файл:** `src/app/[locale]/(protected)/training/page.tsx`  
**CSS:** `src/app/[locale]/(protected)/training/training.module.css`

5 inline styles → CSS классы:

```css
/* Добавить в training.module.css */
.headerActions {
    display: flex;
    gap: var(--space-2);
}
.checkinBtn {
    background-color: var(--color-info);
}
.checkinDoneBtn {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text-primary);
}
.settingsBtn {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
    min-width: 44px;
    padding: 0 var(--space-3);
}
.wizardLoading {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-overlay);
}
.wizardLoadingCard {
    padding: var(--space-8);
    border-radius: var(--radius-lg);
    color: var(--color-text-primary);
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
}
.detailLoading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    color: var(--color-text-tertiary);
}
```

Замены в TSX:
```diff
-<div style={{ display: 'flex', gap: '8px' }}>
+<div className={styles.headerActions}>

-style={{ backgroundColor: 'var(--color-info)' }}
+className={`${styles.createBtn} ${styles.checkinBtn}`}

-style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
+className={`${styles.createBtn} ${styles.checkinDoneBtn}`}

-style={{ backgroundColor: '...', color: '...', minWidth: 44, padding: '0 12px' }}
+className={`${styles.createBtn} ${styles.settingsBtn}`}

// SeasonWizardLazy loading:
-<div style={{position: 'fixed', inset: 0, ...}}>
-  <div className="glass" style={{padding: '2rem', ...}}>
+<div className={styles.wizardLoading}>
+  <div className={styles.wizardLoadingCard}>

// SeasonDetailLazy loading:
-<div style={{display: 'flex', alignItems: 'center', ...}}>
+<div className={styles.detailLoading}>
```

---

## Фаза 3: UX Quick Wins (из loading_states_brainstorm.md)

**CSS-only изменения, без логики.**

### 3.1 Fade-in анимация карточек

**Файл:** `src/components/dashboard/AthleteDashboard.module.css`

```css
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
}
.card {
    animation: fadeIn 0.3s var(--ease-out) forwards;
}
.card:nth-child(2) { animation-delay: 100ms; }
.card:nth-child(3) { animation-delay: 200ms; }
.card:nth-child(4) { animation-delay: 300ms; }

@media (prefers-reduced-motion: reduce) {
    .card { animation: none; opacity: 1; }
}
```

### 3.2 CLS Fix — min-height

```css
.analyticsLoading { min-height: 200px; }
.loading { min-height: 300px; }
```

### 3.3 Shimmer Suspense Fallback

**CSS:** `src/components/dashboard/AthleteDashboard.module.css`  
**TSX:** `src/components/dashboard/AthleteDashboard.tsx`

```css
.shimmerBar {
    height: 120px;
    background: linear-gradient(90deg,
        var(--color-bg-tertiary) 25%,
        var(--color-bg-secondary) 50%,
        var(--color-bg-tertiary) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: var(--radius-md);
}
@keyframes shimmer {
    from { background-position: 200% 0; }
    to { background-position: -200% 0; }
}
@media (prefers-reduced-motion: reduce) {
    .shimmerBar { animation: none; background: var(--color-bg-tertiary); }
}
```

Заменить в `AthleteDashboard.tsx`:
```diff
-<div className={styles.analyticsLoading}><span className={styles.spinner} /></div>
+<div className={styles.shimmerBar} aria-label={t('app.loading')} />
```

---

## i18n ключи — полный список

### messages/en/common.json
```json
{
  "analytics": {
    "addTestForm": {
      "invalidValue": "Enter a valid value > 0",
      "futureDateError": "Date cannot be in the future",
      "saveFailed": "Failed to save result. Please try again.",
      "notesPlaceholder": "Conditions, well-being..."
    },
    "minResults": "Need at least 2 results for chart",
    "chartLoading": "Loading chart"
  },
  "dashboard": {
    "deleteConfirm": "Delete athlete \"{name}\" with all data? This action is irreversible.",
    "yearsOld": "{age} y.o."
  },
  "training": {
    "checkin": "Check-in",
    "checkinDone": "Ready",
    "checkinCreateFailed": "Cannot save check-in: athlete profile could not be created.",
    "checkinSaveFailed": "Failed to save check-in. Please try again."
  }
}
```

### messages/ru/common.json
```json
{
  "analytics": {
    "addTestForm": {
      "invalidValue": "Введите корректное значение > 0",
      "futureDateError": "Дата не может быть в будущем",
      "saveFailed": "Не удалось сохранить результат. Попробуйте ещё раз.",
      "notesPlaceholder": "Условия, самочувствие..."
    },
    "minResults": "Нужно минимум 2 результата для графика",
    "chartLoading": "Загрузка графика"
  },
  "dashboard": {
    "deleteConfirm": "Удалить атлета «{name}» со всеми данными? Это действие необратимо.",
    "yearsOld": "{age} лет"
  },
  "training": {
    "checkin": "Чек-ин",
    "checkinDone": "Готов",
    "checkinCreateFailed": "Не удалось сохранить чек-ин: профиль атлета не создан.",
    "checkinSaveFailed": "Не удалось сохранить чек-ин. Попробуйте ещё раз."
  }
}
```

### messages/cn/common.json
```json
{
  "analytics": {
    "addTestForm": {
      "invalidValue": "请输入有效值 > 0",
      "futureDateError": "日期不能是未来",
      "saveFailed": "保存失败，请重试。",
      "notesPlaceholder": "状况、感觉..."
    },
    "minResults": "至少需要2个结果才能显示图表",
    "chartLoading": "加载图表中"
  },
  "dashboard": {
    "deleteConfirm": "删除运动员"{name}"及所有数据？此操作不可逆。",
    "yearsOld": "{age}岁"
  },
  "training": {
    "checkin": "签到",
    "checkinDone": "已准备",
    "checkinCreateFailed": "无法保存签到：运动员档案未创建。",
    "checkinSaveFailed": "保存签到失败，请重试。"
  }
}
```

---

## Verification Checklist

```bash
pnpm type-check   # Exit 0
pnpm build         # Exit 0
pnpm test          # 16/16 pass
pnpm lint 2>&1 | grep "src/" | wc -l  # Не больше чем до начала
```

### Browser Testing
- [ ] Dashboard → fade-in анимация
- [ ] Training → кнопки без inline styles
- [ ] Add Test Result → ошибки на EN/CN (не RU)
- [ ] AthleteCard → confirm на текущем языке
- [ ] Analytics chart → locale-aware даты
- [ ] Dark mode — всё корректно
