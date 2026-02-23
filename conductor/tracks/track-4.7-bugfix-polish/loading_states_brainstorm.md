# 🧠 Брейншторм: UX Loading States — Jumpedia

> **Контекст**: Next.js 15 Static Export + PocketBase (VPS, Гонконг) + Dexie.js (IndexedDB) + PWA (Serwist)  
> **Проблема**: При каждом открытии страницы пользователь видит пустой экран со спиннером пока JS загружается и PocketBase отвечает (~500-1500ms реальный опыт)  
> **Скиллы**: `brainstorming` + `planning` + `ui_design` + `always`

---

## 🔍 Текущее состояние (из кода)

### AthleteDashboard.tsx — что сейчас происходит:
```
1. HTML загружен (пустой div)
2. JS бандл загружается (~800ms-2s, 1й визит)
3. React монтируется → isLoading = true → показывает .spinner
4. getSelfAthleteId() → PB запрос (~100-400ms до HK)
5. getTodayCheckin() → ещё один PB запрос (~100-400ms)
6. listTestResults() → ещё один PB запрос (lazy, ~100-400ms)
7. isLoading = false → контент появляется
```

**Итого задержка от входа до данных: 1500-4000ms** — это ощутимо.

### Что сейчас используется:
- `styles.spinner` — класс (CSS rotate animation) — используется в 4 местах
- `styles.loading` — wrapper для спиннера
- `styles.analyticsLoading` — для Suspense fallback (StreakHeroCard, ProgressChart, AchievementsGrid)
- `Suspense` — используется правильно для lazy-loaded компонентов
- **Skeleton UI — отсутствует** (нет ни одного файла)
- **IndexedDB кэш — не используется** для отображения (только для offline sync)

---

## 💡 Все варианты решения

### Вариант A — Skeleton UI (Shimmer Cards) ⭐ ПРИОРИТЕТ 1
**Что это**: "Призрак" будущего контента — серые блоки с shimmer-анимацией вместо спиннера

```
До:  [спиннер на пустом фоне]
После: [каркас карточки с анимацией] → [реальные данные]
```

**Как работает в контексте дизайн-системы**:
- Shimmer bar = `background` gradient animation на `--color-bg-secondary`
- Skeleton card = структура как реальная карточка (`.card` класс) с placeholder-блоками
- Использует `--color-bg-tertiary` как цвет skeleton + `--color-bg-secondary` для shimmer
- Анимация: `background-position` 200% → -200% (GPU composited ✅)
- `prefers-reduced-motion` → убираем анимацию shimmer, оставляем статичный gray block

**Компоненты где нужен Skeleton**:
1. `AthleteDashboard` → `CheckinCardSkeleton` (замена спиннера в `.loading`)
2. `AthleteDashboard` → `StatBarSkeleton` (2 плашки рядом)
3. `AthleteDashboard` → `AnalyticsSkeleton` (для `analyticsLoading` Suspense)
4. `AthleteCard` (в `DashboardPage` — тренерское вью) → `AthleteCardSkeleton`

**Плюсы**: Лучший UX из всех вариантов, воспринимается как быстрее, стандарт 2024+  
**Минусы**: Нужно создать "дубль" каждого компонента (немного кода)  
**Сложность**: Средняя — 1-2 дня

---

### Вариант B — IndexedDB "Cache First" ⭐ ПРИОРИТЕТ 2
**Что это**: Показываем данные из Dexie МГНОВЕННО, фоном обновляем из PB

```
Визит 1: [skeleton ~500ms] → [данные]
Визит 2+: [ДАННЫЕ СРАЗУ из IndexedDB 0ms] → тихое обновление в фоне
```

**Как реализовать в AthleteDashboard**:
```typescript
// useCachedAthleteData.ts hook
const [data, setData] = useState<CachedDashboardData | null>(null);

useEffect(() => {
  // Step 1: Мгновенно из IndexedDB (0ms)
  db.dashboardCache.get(userId).then(cached => {
    if (cached) setData(cached); // пользователь видит всё сразу
  });
  
  // Step 2: Параллельно из PocketBase
  fetchFreshData().then(fresh => {
    setData(fresh);
    db.dashboardCache.put({ userId, ...fresh }); // обновляем кэш
  });
}, [userId]);
```

**Плюсы**: После первого визита — нулевая задержка, работает офлайн  
**Минусы**: Нужна новая Dexie таблица, stale data на секунду, сложнее реализовать  
**Сложность**: Высокая — 2-3 дня, нужно схему Dexie расширять

---

### Вариант C — Progressive Reveal (Fade-in) ⭐ ПРИОРИТЕТ 1 (быстрая победа)
**Что это**: Вместо резкого появления данных — плавный `opacity` transition

```css
.card {
  opacity: 0;
  animation: fadeIn 0.3s var(--ease-out) forwards;
}

@keyframes fadeIn {
  to { opacity: 1; }
}
```

**Где применить**:
- На каждой `.card` секции в `AthleteDashboard` — staggered появление (delay 0, 100ms, 200ms)
- На `AthleteCard` в тренерском дашборде

**Плюсы**: 15 минут работы, сразу убирает "резкость", ничего не ломает  
**Минусы**: Данные всё равно появляются не мгновенно, просто плавнее  
**Сложность**: Минимальная — 30 минут

---

### Вариант D — Optimistic UI (для мутаций)
**Что это**: При записи checkin — сразу показываем "сохранено" до ответа PB

```typescript
// Пользователь нажал "Сохранить" → СРАЗУ показываем UI checkinDone
setCheckinDone(true); // optimistic
setLastScore(calculatedScore); // optimistic

// В фоне сохраняем в PB
try {
  await saveCheckin(data);
} catch {
  // Если ошибка — откатываем
  setCheckinDone(false);
  showError();
}
```

**Плюсы**: Форма кажется мгновенной  
**Минусы**: Нужен rollback при ошибке, может запутать пользователя  
**Сложность**: Средняя — подходит отдельным Track

---

### Вариант E — Skeleton + Content Projection (CSS Grid резервирование)
**Что это**: Страница рисуется сразу с правильными размерами (через min-height на контейнерах), чтобы избежать layout shift (CLS)

```css
.checkinSection {
  min-height: 120px; /* резервируем место */
}
```

**Плюсы**: Нет "прыжков" при появлении данных, хорошо для Web Vitals (CLS)  
**Минусы**: Требует знания примерных размеров компонентов  
**Сложность**: Низкая, делается в связке со Skeleton

---

### Вариант F — Page Transition Animation
**Что это**: Анимация перехода между страницами через Next.js View Transitions API

**Статус для нашего стека**: ⚠️ **Ограничено**  
- Static Export → нет Server Components  
- View Transitions API — работает в Chrome/Safari 2024+, но без hydration tricks  
- Можно через `document.startViewTransition()` на клиенте  

**Вывод**: Добавляет полировку но не решает core проблему загрузки данных

---

## 📊 Сравнение вариантов

| Вариант | Эффект для пользователя | Сложность | Приоритет |
|---------|------------------------|-----------|-----------|
| **C — Progressive Reveal** | Плавное появление (нет резкости) | 🟢 30 мин | **Сейчас (Track 4.7)** |
| **A — Skeleton UI** | Структура видна сразу | 🟡 1-2 дня | **Track 6 / 4.7 расширение** |
| **E — Min-height (CLS fix)** | Нет layout shift | 🟢 30 мин | **Вместе со Skeleton** |
| **B — IndexedDB Cache First** | 0ms второй визит | 🔴 2-3 дня | **Track 6 — Offline** |
| **D — Optimistic UI** | Instant feedback на мутации | 🟡 1 день | **Track 6** |
| **F — Page Transitions** | Красивые переходы | 🟡 1 день | **Track 6 — Polish** |

---

## 🎯 Рекомендованный план по трекам

### Сейчас (Track 4.7 расширение — "быстрые победы") 
**Время: ~2-3 часа**

1. **Progressive Reveal (Вариант C)** — `@keyframes fadeIn` + staggered delay на cards в `AthleteDashboard.module.css`
2. **Заменить спиннеры в `Suspense` on proper Skeleton** — минимальная версия (просто animated gray block правильного размера) для `StreakHeroCard`, `ProgressChart`, `AchievementsGrid`
3. **Min-height резервирование** на `.loading` секциях чтобы не было CLS

### Track 6 — Polish + Launch
**Полноценная система:**

4. **`SkeletonCard` переиспользуемый компонент** — `src/components/ui/Skeleton.tsx` + `Skeleton.module.css`
5. **`CheckinCardSkeleton`** — точно повторяет форму будущей карточки
6. **`AthleteCardSkeleton`** — для тренерского дашборда
7. **IndexedDB "Cache First" hook** — `useCachedData<T>()` — универсальный хук
8. **Optimistic checkin** — при сохранении показываем сразу

---

## 🔑 Ключевые технические решения

### Decision 1: Где хранить Skeleton компоненты?
- **Вариант**: `src/components/ui/Skeleton.tsx` — единый переиспользуемый компонент
- **Почему**: DRY принцип, легко поддерживать, соответствует структуре проекта

### Decision 2: Shimmer через CSS или JS?
- **Выбор**: CSS `background-position` animation — GPU composited, нет JS overhead
- **Почему**: Design System запрещает animate layout properties; `background-position` переводится в composite layer

### Decision 3: Skeleton или просто fade?
- **Выбор**: Оба! — Fade это быстрая победа сейчас, Skeleton — полноценное решение в Track 6
- **Почему**: YAGNI — не переусложняем 4.7 track который уже почти закрыт

### Decision 4: Как интегрировать с IndexedDB?
- **Выбор**: Отдельный хук `useCachedData<T>()` поверх Dexie
- **Почему**: Изолирует логику кэша, легко тестировать, применить везде где нужно

---

## 🏗️ Архитектура Skeleton системы (Track 6)

```
src/
  components/
    ui/
      Skeleton.tsx          ← BaseElement: <Skeleton width height radius />
      Skeleton.module.css   ← shimmer animation + dark mode
      SkeletonCard.tsx      ← Card-shaped skeleton (glass variant)
    dashboard/
      AthleteDashboard.tsx
      AthleteDashboard.module.css
      skeletons/
        CheckinCardSkeleton.tsx    ← тачит .card структуру
        StatBarSkeleton.tsx        ← 2 cells grid
        AnalyticsSkeleton.tsx      ← для lazy charts
    coaching/
      skeletons/
        AthleteCardSkeleton.tsx    ← повторяет AthleteCard форму
```

---

## ✅ Что реализуем прямо сейчас (Track 4.7)

**Минимальный импакт, максимальный эффект:**

1. **Fade-in анимация** на каждой `.card` в `AthleteDashboard.module.css`
2. **Skeleton-style Suspense fallback** вместо центрированного спиннера в `analyticsLoading` — просто animated gray bar правильной высоты
3. **`prefers-reduced-motion` уже есть** в `.css` — просто расширить

> Занесём в backlog всё для Track 6 после Gate 4.7.
