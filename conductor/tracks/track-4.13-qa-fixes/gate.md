# Gate 4.13: QA Mobile Bug Fixes — Checklist

> **Context:** This track addresses critical and high-priority bugs found during the comprehensive mobile UI/UX QA audit (Track 4.12+ execution).

## 🛠 Bug Fixes & Refactoring

### 1. Критично: Login Form State Bug (UI)
- [x] Фикс: Добавлен `useRef` fallback для iOS autofill / password managers, которые инжектят значения без `onChange`. При submit используется `ref.current.value` если state пустой.

### 2. Высокий приоритет: Coach Season Wizard "Myself" Assignment
- [x] Фикс: Дефолт "Myself" заменён на disabled placeholder "— Select athlete —". Coach обязан выбрать атлета. Если атлетов нет — показывается подсказка «Добавьте атлета на Дашборде».

### 3. Средний приоритет: Смешивание локализации и данных (UX)
- [x] Закрыто как **by design**: i18n ключи уже корректны (`"Hey, {name}!"` EN / `"Привет, {name}!"` RU). Имя пользователя — его данные, может быть на любом языке.

### 4. Средний приоритет: Разрозненные i18n строки (Bleed-through)
- [x] Фикс: `Reference / Warm-Up` — hardcoded `мін` → `{t('min')}` с i18n ключом в 3 локалях.
- [x] Закрыто: `Date Inputs` — **won't fix**, `<input type="date">` placeholder контролируется ОС/браузером.

### 5. Низкий приоритет: Доступность Quick Plan Builder (UX)
- [x] Фикс: Добавлена кнопка ⚡ «Quick Plan» на Coach Dashboard (outline secondary стиль, ведёт на `/training`).

## 🔍 Дополнительные баги (найдены при анализе)

- [x] `SeasonWizard.tsx`: 3 hardcoded EN error strings → i18n
- [x] `SeasonWizard.tsx`: текстовый символ `✕` → Lucide `<X>` icon (×3 места)
- [x] `AthleteDashboard.tsx`: inline `style={{}}` → CSS module class `.chartIcon`

## 🏁 Quality Gate
- [x] `pnpm type-check` — exit 0
- [x] `pnpm build` — exit 0
- [x] Форма входа: useRef fallback добавлен
- [x] Баг SeasonWizard: "Myself" заменён, coach обязан выбрать атлета
- [x] i18n: 7 новых ключей × 3 локали (EN/RU/CN)
