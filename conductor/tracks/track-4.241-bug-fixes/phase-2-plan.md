# Phase 2 — Template Apply + DnD Save
>
> Дата: 2026-02-24 · Агент: ?? · Скиллы: concise-planning, react-best-practices, systematic-debugging, lint-and-validate

## Задачи

### 1. TemplateList.tsx — добавить prop `onApply` + кнопку Apply

**Файл:** `src/components/templates/TemplateList.tsx`
**Что сделано:**

- Добавлен импорт `Play` из `lucide-react`
- Добавлен `onApply?: (template: TrainingTemplateRecord) => void` в `interface Props`
- Добавлен в деструктуризацию параметров функции
- Добавлена кнопка Apply (Play icon) первой в блоке `.actions` — видима только если `onApply` передан

### 2. TemplatePanelContent.tsx — пробросить `onApply` + onClick

**Файл:** `src/components/templates/TemplatePanelContent.tsx`
**Что сделано:**

- Удалён TODO-комментарий (строки 121-126)
- Добавлен `onApply={(template) => onApply(template.id)}` в `<TemplateList />`
- Добавлен `onClick={() => setActiveTab('my')}` на кнопку "Create first template"

### 3. WeekConstructor.tsx — передать `onReorderDrag`

**Файл:** `src/components/training/WeekConstructor.tsx`
**Что сделано:**

- Добавлены 4 строки после `onDayNoteChange` в `<DayConstructorLazy>`:

  ```tsx
  onReorderDrag={!isReadOnly ? async (updates) => {
      await reorderExercises(updates);
      await loadPlan();
  } : undefined}
  ```

### 4. i18n — добавлен ключ `templates.apply`

**Файлы:** `messages/en/common.json`, `messages/ru/common.json`, `messages/cn/common.json`
**Что сделано:**

- EN: `"apply": "Apply"`
- RU: `"apply": "Применить"`
- CN: `"apply": "应用"`

## Верификация

✅ `pnpm type-check` → Exit 0
✅ `pnpm build` → Exit 0

**Gate 2: ПРОЙДЕН ✅**
