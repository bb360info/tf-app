[G3H] 🔵 Активный трек: Track 4.20 — UX Audit & Coach-Athlete Fixes

✅ Готово (N из M):
- Track 4.19 (Coach-Athlete Interaction & Notifications) завершён полностью.
- Track 4.16 DB Integrity — FK Fixes + API Rules готов.

🆕 Последние изменения (из CHANGELOG.md):
- Создан CF Worker `push-service`, добавлены VAPID ключи и Phase 4 SW для PWA (Push Notifications).
- Добавлено сравнение плана и факта (CoachLogViewer) с 4 статусами и chip-ом.
- Добавлен и стилизован PushPermissionPrompt (iOS A2HS + push prompt).
- Выполнена проверка china-audit.sh и полное удаление TS errors.

📐 План от предыдущего агента: ✅ Найден (в `track-4.20-ux-audit-fixes/implementation_plan.md`)
📝 Walkthrough предыдущей работы: ❌ Нет

🎯 Следующая задача: Phase 1: Quick Wins + Security

📋 Осталось: 14 пунктов (по gate.md)
- [ ] FIX: logs.ts — migrate ALL filters from raw string interpolation
- [ ] ConfirmDialog.tsx — new reusable glassmorphism confirm
- [ ] Ошибка в SeasonDetail.tsx + hardening rules и остальные баги
... И так далее до Phase 6.

🛠 Скиллы для этой задачи: always, architecture, frontend, debugging, ui_design

=== РЕЗУЛЬТАТЫ ГЛУБОКОГО АНАЛИЗА ПЛАНА (TRACK 4.20) ===

Я провел аудит предоставленного `implementation_plan.md` с использованием практик из `database-architect`, `error-handling-patterns` и `react-best-practices`.
План превосходен с точки зрения бизнес-логики и закрытия всех UX-пробелов, однако я выявил **5 скрытых технических багов и архитектурных неточностей**, которые привели бы к ошибкам или падению приложения. Я задокументировал их решения:

1. **[Баг Синтаксиса PocketBase] Разрешение Overrides в `logs.ts` (Фаза 3.1)**
   - *Проблема:* План предлагает фильтр `group_id.group_members_via_group_id.athlete_id = {:aid}`. Это вызовет синтаксическую ошибку `Invalid filter syntax` в PocketBase, так как бэк-реляции (multi-match) требуют оператора `?=` (хотя бы одно совпадение), а не `=`.
   - *Решение:* Как и указано в комментарии плана, я разобью этот запрос на два этапа (`listMyGroups()`, затем фильтр по массиву ID групп). Это на 100% безопаснее и надёжнее работает даже при сложных вложенных реляциях.

2. **[Утечка Памяти / React Lifecycle] Автосохранение заметок атлета (Фаза 5.2)**
   - *Проблема:* В предложенном `useEffect` с дебаунсом:
     ```typescript
     await updateTrainingLog(log.id, { notes: noteValue });
     ```
     Не учитывается, что `log.id` может быть `undefined` (до первого сохранённого подхода атлета, `log` является драфтом). При вызове это уронит страницу: `Cannot read properties of undefined`. Также нет хуков обновления текста при смене компонентом `log`.
   - *Решение:* Добавлю надежный guard: `if (!log?.id) return;`. Буду использовать `useRef` для контроля изменений или сохранять заметку только после фактического создания лога сессии в БД.

3. **[Авария Базы Данных SQLite] Создание большого количества шаблонов (Фаза 4.2 / 4.4)**
   - *Проблема:* План использует `Promise.all(exercises.map(...))` для создания 10–20 элементов шаблона. PocketBase использует SQLite, который при серии быстрых параллельных POST-вызовов может упереться в лок базы (`database is locked`) или HTTP 429 Rate Limiting на сервере (China VPS).
   - *Решение:* Выполнять создание элементов шаблона строго последовательно через `for...of await` цикл в правильном API-файле. Потеря ~50мс на запрос незаметна для UX, зацикливание спасет от краша БД.

4. **[Архитектурная Невозможность] Single Batch Query Readiness (Фаза 5.5)**
   - *Проблема:* В функции `getLatestReadinessForGroup` предложен "single batch query", чтобы достать единственный (свежий) чекин для каждого из всей группы. PocketBase не умеет делать полноценный SQL `GROUP BY athlete_id`, поэтому мы либо вытащим лишние чекины, либо ничего.
   - *Решение:* Выполнять `Promise.all` на каждого из членов группы: `pb.collection('daily_checkins').getList(1, 1, { filter: 'athlete_id=...', sort: '-date' })`. Группы маленькие (5-30 чел), это быстро и полностью предсказуемо.

5. **[Слом Билда / Массовый Рефактор] Replace 50+ empty catch blocks (Фаза 6.2)**
   - *Проблема:* План предлагает вслепую заменить везде `catch {}` на `catch (err) { setError(showError(err, t('errors.networkError'))); }`. Но во многих файлах нет инстансов состояния `error` или инициализированного хука `t` (`useTranslations()`). Это приведет к десяткам ошибок Typescript `Cannot find name 'setError'`.
   - *Решение:* Буду внедрять `try/catch` индивидуально только там, где существует UI-стейт (например, страницы форм). Если локального стейта нет (например, при фоновых запросах), добавлю их через создание централизованного логгера или Toast (в `showError`), чтобы не сломать типы 50 файлов.

**Заключение:**
Проверка на безопасность (SQL Injection v2) из Фазы 1 полностью легитимна (`pb.filter` исправлен). Распределение ролей и архитектура компонентов "гибридных шаблонов" продуманы отлично (Templates UI остаётся в Reference, а в Daily Training появляется Quick Form).

Начинаем исправление по Фазе 1?
