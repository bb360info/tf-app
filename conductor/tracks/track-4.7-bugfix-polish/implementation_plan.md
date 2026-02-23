# Track 4.7: Bug Fixes + DS Polish — Детализированный план

## Контекст

Аудит всех файлов из gate.md проведён. Предыдущий агент создал план с 4 фазами — я **подтверждаю** его корректность и детализирую каждый шаг с указанием скиллов, конкретных строк и зависимостей.

> [!IMPORTANT]
> **Уточнение по useAuth:** Анализ показал, что `AuthProvider.useAuth` и `hooks/useAuth` — это **два разных хука** с разными API. Файлы, использующие `AuthProvider`, нуждаются в `login/register/logout/resetPassword`. Файлы с `hooks/useAuth` используют `role/isCoach/isAthlete`. **Оба варианта корректны** — стандартизация не нужна, нужен лишь audit-комментарий.

---

## Фаза 1: Критические баги (функциональность)

**Скиллы:** `always`, `typescript-expert`
**Цель:** Исправить сломанную логику в сервисах PocketBase

### 1.1 Добавить `user_id` в `AthletesRecord`

#### [MODIFY] [types.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/types.ts)

Строка ~44: добавить `user_id?: string` после `coach_id`:
```diff
 export interface AthletesRecord extends BaseRecord, SoftDeletable {
     coach_id: string; // FK → users
+    user_id?: string; // FK → users (self-link for athlete role)
     name: string;
```

### 1.2 Заполнять `user_id` при создании self-athlete

#### [MODIFY] [readiness.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/readiness.ts)

Строки 108-112: добавить `user_id: user.id`:
```diff
         const newAthlete = await pb.collection('athletes').create({
             coach_id: user.id,
+            user_id: user.id,
             name: athleteName,
             gender: 'male',
         });
```

### 1.3 Рефакторинг `joinByInviteCode()` — sanitize + `getSelfAthleteId()`

#### [MODIFY] [groups.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/groups.ts)

1. Добавить import `getSelfAthleteId` из `./readiness` (строка 10)
2. Строка 86: sanitize invite code — `.replace(/"/g, '')`  
3. Строки 96-114: заменить ручной lookup на `getSelfAthleteId()`

```diff
+import { getSelfAthleteId } from './readiness';

 export async function joinByInviteCode(code: string): Promise<GroupWithRelations> {
     const now = new Date().toISOString();
     const groups = await pb.collection(Collections.GROUPS).getList<GroupWithRelations>(1, 1, {
-        filter: `invite_code = "${code.toUpperCase()}" && invite_expires > "${now}"`,
+        filter: `invite_code = "${code.toUpperCase().replace(/"/g, '')}" && invite_expires > "${now}"`,
     });
     ...
-    const user = pb.authStore.model;
-    if (!user) throw new Error('Not authenticated');
-    const athletes = await pb.collection(Collections.ATHLETES).getList(1, 1, {
-        filter: `coach_id = "${user.id}"`,
-    });
-    if (athletes.items.length > 0) {
-        try { ... } catch { }
-    }
+    const athleteId = await getSelfAthleteId();
+    try {
+        await pb.collection(Collections.GROUP_MEMBERS).create({
+            group_id: group.id,
+            athlete_id: athleteId,
+        });
+    } catch {
+        // Already a member — unique constraint
+    }
```

### 1.4 i18n hardcoded string в `EditAthleteModal`

#### [MODIFY] [EditAthleteModal.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/dashboard/EditAthleteModal.tsx)

Строка 39:
```diff
-   setError('Не удалось обновить данные. Попробуйте ещё раз.');
+   setError(tDash('updateFailed'));
```

#### [MODIFY] messages/en/common.json, ru/common.json, cn/common.json

Добавить ключ `dashboard.updateFailed`:
- EN: `"Failed to update. Please try again."`
- RU: `"Не удалось обновить данные. Попробуйте ещё раз."`  
- CN: `"更新失败，请重试。"`

---

## Фаза 2: Design System Violations

**Скиллы:** `always`, `jumpedia-design-system`, `frontend`  
**Цель:** Привести touch targets и glassmorphism fallback к стандарту DS

### 2.1 Добавить missing token `--color-text-on-accent`

#### [MODIFY] [tokens.css](file:///Users/bogdan/antigravity/skills%20master/tf/src/styles/tokens.css)

В `:root` и `[data-theme="dark"]`:
```css
--color-text-on-accent: #ffffff;
```

### 2.2 Исправить touch targets в `groups.module.css`

#### [MODIFY] [groups.module.css](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/%28protected%29/settings/groups/groups.module.css)

| Что | Было | Станет |
|-----|------|--------|
| `.backLink` width/height | 36×36 | 44×44 |
| `.iconBtn` width/height | 28×28 | min-width/min-height 44×44 |
| `.input` font-size | `--text-sm` (14px) | `--text-base` (16px) |

### 2.3 Добавить `@supports` fallback для glassmorphism

#### [MODIFY] [groups.module.css](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/%28protected%29/settings/groups/groups.module.css)

Добавить в конец файла:
```css
@supports not (backdrop-filter: blur(1px)) {
    .createForm,
    .groupCard {
        background: var(--color-bg-elevated);
        box-shadow: var(--shadow-md);
    }
}
```

### 2.4 Аудит backLink touch targets

Найдено 5 `.backLink` определений:
- ✅ `warmup.module.css` — `min-height: 44px` 
- ✅ `mental.module.css` — `min-height: 44px`
- ✅ `settings.module.css` — `.backBtn` = `44×44`
- ⚠️ `AuthForms.module.css` — нет min-height → добавить `min-height: 44px`
- ⚠️ `training.module.css` — проверить/исправить

---

## Фаза 3: Build Fix + Inline Styles

**Скиллы:** `always`, `frontend`, `i18n-localization`  
**Цель:** Убрать build warning, заменить inline styles на CSS classes

### 3.1 Создать `not-found.tsx`

#### [NEW] [not-found.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/not-found.tsx)

- DS-compliant 404 page: glassmorphic card, `FileQuestion` Lucide icon
- CSS module `not-found.module.css`
- i18n ключи `app.notFound`, `app.goHome`

### 3.2 Убрать inline styles из `forgot-password/page.tsx`

#### [MODIFY] [AuthForms.module.css](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/auth/AuthForms.module.css)

Добавить 2 класса:
```css
.successLink {
    display: block;
    text-align: center;
    text-decoration: none;
}

.labelIcon {
    margin-right: var(--space-1);
    vertical-align: text-bottom;
}
```

#### [MODIFY] [forgot-password/page.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/%28public%29/auth/forgot-password/page.tsx)

```diff
-<Link ... style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
+<Link ... className={`${styles.submitBtn} ${styles.successLink}`}>

-<Mail size={16} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} />
+<Mail size={16} className={styles.labelIcon} />
```

### 3.3 i18n ключи для not-found

В 3 locale файлах:
- `app.notFound`: EN `"Page not found"` / RU `"Страница не найдена"` / CN `"找不到页面"`
- `app.goHome`: EN `"Go to Dashboard"` / RU `"На главную"` / CN `"返回首页"`

---

## Фаза 4: DX / Code Quality

**Скиллы:** `always`, `i18n-localization`  
**Цель:** Улучшить точность i18n ключей и код-качество

### 4.1 Переименовать i18n ключ в `EmailVerificationBanner`

#### [MODIFY] [EmailVerificationBanner.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/shared/EmailVerificationBanner.tsx)

Строка 63:
```diff
-   {t('sendResetLink')}
+   {t('resendVerification')}
```

#### [MODIFY] messages/en|ru|cn/common.json

Добавить `auth.resendVerification`:
- EN: `"Resend verification email"`
- RU: `"Отправить письмо повторно"`
- CN: `"重新发送验证邮件"`

### 4.2 useAuth стандартизация — **только audit-comment**

> [!NOTE]
> Анализ показал что все 12 файлов используют **правильный** хук:
> - `AuthProvider.useAuth` (5 файлов) → нужен `login/register/logout/resetPassword`
> - `hooks/useAuth` (7 файлов) → нужен `role/isCoach/isAthlete`
>
> **Действие:** Нет изменений. Оба хука корректны — это разные API. Gate пункт можно закрыть с пометкой "audited, both hooks serve different purposes".

---

## Verification Plan

### Automated (после каждого коммита)
```bash
pnpm type-check   # Exit 0
pnpm build         # Exit 0 (критично для Phase 3 — not-found.tsx)
pnpm lint          # нет новых ошибок
pnpm test          # существующие тесты проходят
```

### Browser Testing
1. Проверить `localhost:3000/ru/nonexistent` → 404 страница ✅
2. Groups: проверить увеличенные touch targets в DevTools (44px) ✅
3. Dark mode: проверить `--color-text-on-accent` на кнопках ✅
4. `forgot-password` → проверить что inline styles убраны ✅

---

## Сводка изменений

| Файл | Фаза | Тип |
|------|------|-----|
| `types.ts` | 1 | MODIFY |
| `readiness.ts` | 1 | MODIFY |
| `groups.ts` | 1 | MODIFY |
| `EditAthleteModal.tsx` | 1 | MODIFY |
| `messages/*/common.json` ×3 | 1,3,4 | MODIFY |
| `tokens.css` | 2 | MODIFY |
| `groups.module.css` | 2 | MODIFY |
| `AuthForms.module.css` | 2,3 | MODIFY |
| `training.module.css` | 2 | MODIFY (if needed) |
| `not-found.tsx` + CSS module | 3 | NEW |
| `forgot-password/page.tsx` | 3 | MODIFY |
| `EmailVerificationBanner.tsx` | 4 | MODIFY |
