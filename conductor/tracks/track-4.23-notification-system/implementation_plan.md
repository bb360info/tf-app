# Implementation Plan — Track 4.23: Notification System & App Badge

## Goal

Unified notification service с message_key i18n pattern, preference enforcement, реальные триггеры для `plan_published`, `achievement`, `invite_accepted`. App icon badge (iOS 16.4+, Desktop PWA). SQL injection fix в `planAssignments.ts` и `plans.ts`.

## Decisions Log

| # | Решение | Альтернатива | Почему выбрано |
|---|---------|-------------|----------------|
| 1 | `message_key` + `message_params` в PB schema | Raw text message | Мультиязычность получателя, совместимость с push delivery |
| 2 | Triggers в service layer (publishPlan, joinByInviteCode) | Triggers в React caller | Надёжнее — trigger всегда срабатывает вне зависимости от UI |
| 3 | Achievement trigger в caller (AchievementsGrid) | В сервисе checkAndGrant | checkAndGrant — client-side, вставка trigger внутрь увеличивает risk scope |
| 4 | SQL injection fix в Phase 0 | Отдельным треком | Мы и так трогаем planAssignments.ts → чиним попутно |
| 5 | Сохранять custom text тренера через `messageParams.text` | Заменить на generic `coachNoteSent` | Текст от тренера — ценная UX-фича, её потеря = регрессия |
| 6 | Achievement notification с `priority: 'low'` | Отложить до push delivery | "Прогрев" для push, не раздражает в bell |
| 7 | Batch preferences check для publishPlan | Sequential N+1 calls | 20 athletes = 20 HTTP calls → 1 batch = лучше |
| 8 | Strict sendCoachNote — throw при ошибке resolve | Fallback athleteId как userId | Fallback скрывает баги (Poka-Yoke: fail fast) |
| 9 | NotificationBell click → navigate(link) | Только mark read без навигации | Без навигации notification с link бесполезен |
| 10 | Notification expiry filter client-side | Показывать expired | expires_at поле уже в schema, 1 строка кода |

---

## Phase 0: Foundation — Unified Service + Security
**Скиллы:** `concise-planning`, `lint-and-validate`, `typescript-expert`, `architect-review`

### 0.1 SQL Injection Fix — `planAssignments.ts`

В `planAssignments.ts` заменить 4 raw string interpolations на `pb.filter()`:

```diff
// listPlanAssignments (L20)
-  filter: `plan_id = "${planId}"`
+  filter: pb.filter('plan_id = {:planId}', { planId })

// assignPlanToAthlete (L36)
-  `plan_id = "${planId}" && athlete_id = "${athleteId}"`
+  pb.filter('plan_id = {:planId} && athlete_id = {:athleteId}', { planId, athleteId })

// assignPlanToGroup (L67)
-  `plan_id = "${planId}" && group_id = "${groupId}"`
+  pb.filter('plan_id = {:planId} && group_id = {:groupId}', { planId, groupId })

// listActivePlanAssignments (L99)
-  filter: `plan_id = "${planId}" && (status = "active" || status = "")`
+  filter: pb.filter('plan_id = {:planId} && (status = "active" || status = "")', { planId })
```

### 0.2 SQL Injection Fix — `plans.ts`

В `plans.ts` заменить 3 raw interpolations + удалить stale debug log:

```diff
// listPlansForPhase (L37)
-  filter: `phase_id = "${phaseId}" && deleted_at = ""`
+  filter: pb.filter('phase_id = {:phaseId} && deleted_at = ""', { phaseId })

// ⚠️ УДАЛИТЬ stale console.log (L42):
-  console.log('[listPlansForPhase] Result:', result.length, result);

// getOrCreatePlan (L90)
-  `phase_id = "${phaseId}" && week_number = ${weekNumber} && deleted_at = ""`
+  pb.filter('phase_id = {:phaseId} && week_number = {:weekNumber} && deleted_at = ""', { phaseId, weekNumber })

// listPlanExercises (L106)
-  filter: `plan_id = "${planId}" && deleted_at = ""`
+  filter: pb.filter('plan_id = {:planId} && deleted_at = ""', { planId })
```

### 0.3 PB Schema — `notifications` collection

Добавить 2 новых поля через MCP PocketBase:

| Поле | Тип | Описание |
|------|-----|----------|
| `message_key` | text (max 100) | i18n ключ: `planPublished`, `achievementEarned` |
| `message_params` | json | Параметры интерполяции: `{ "week": 3, "title": "Streak 7d" }` |

### 0.4 TypeScript — `types.ts`

```diff
 export interface NotificationsRecord extends BaseRecord {
     user_id: string;
     type: NotificationType;
     message: string;
+    message_key?: string;
+    message_params?: Record<string, string | number>;
     read: boolean;
     link?: string;
     priority?: NotificationPriority;
     expires_at?: string;
     delivered?: boolean;
 }
```

### 0.5 `sendNotification()` — `notifications.ts`

Новая unified функция:

```typescript
import { getPreferences } from './notificationPreferences';

interface SendNotificationParams {
    userId: string;
    type: NotificationType;
    messageKey: string;
    messageParams?: Record<string, string | number>;
    link?: string;
    priority?: NotificationPriority;
}

export async function sendNotification(
    params: SendNotificationParams
): Promise<NotificationsRecord | null> {
    if (!params.userId) throw new Error('sendNotification: userId is required');

    // Preference check — respect disabled_types
    try {
        const prefs = await getPreferences(params.userId);
        if (prefs?.disabled_types?.includes(params.type)) return null;
    } catch {
        // No prefs found — allow notification (default: all enabled)
    }

    return pb.collection(Collections.NOTIFICATIONS).create<NotificationsRecord>({
        user_id: params.userId,
        type: params.type,
        message_key: params.messageKey,
        message_params: params.messageParams ?? {},
        message: params.messageKey, // fallback for old clients / debug
        read: false,
        link: params.link ?? '',
        priority: params.priority ?? 'normal',
    });
}
```

### 0.5b `batchCheckPreferences()` — batch preference check

> [!NOTE]
> Вызывается из `publishPlan()` перед циклом отправки. Вместо N HTTP запросов — 1 запрос getFullList + client-side filter.

```typescript
/**
 * Batch check notification preferences for multiple users.
 * Returns Set of userIds that are allowed to receive this notification type.
 * Single HTTP request instead of N sequential calls.
 */
export async function batchCheckPreferences(
    userIds: string[],
    type: NotificationType
): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();

    // Fetch all preferences for given users in one request
    const allowed = new Set(userIds); // default: all allowed
    try {
        const prefs = await pb.collection(Collections.NOTIFICATION_PREFERENCES)
            .getFullList<NotificationPreferencesRecord>({
                filter: pb.filter(
                    userIds.map((_, i) => `user_id = {:uid${i}}`).join(' || '),
                    Object.fromEntries(userIds.map((uid, i) => [`uid${i}`, uid]))
                ),
            });

        // Remove users who have this type disabled
        for (const pref of prefs) {
            if (pref.disabled_types?.includes(type)) {
                allowed.delete(pref.user_id);
            }
        }
    } catch {
        // No prefs collection access — allow all (default: enabled)
    }

    return allowed;
}
```

### 0.6 Refactor `sendCoachNote()` — сохранение кастомного текста

> [!IMPORTANT]
> `sendCoachNote()` ДОЛЖЕН сохранять кастомный текст тренера. Потеря этого — UX регрессия.
> Текст передаётся через `messageParams.text` и рендерится в i18n как `"coachNoteSent": "Message from coach: {text}"`.

```typescript
export async function sendCoachNote(
    athleteId: string,
    message: string,
    link?: string
): Promise<NotificationsRecord | null> {
    // Resolve user_id from athlete record — STRICT, no fallback
    const athlete = await pb.collection(Collections.ATHLETES).getOne(athleteId);
    const userId = (athlete as unknown as { user_id?: string }).user_id ?? '';

    // Guard: athlete without linked user cannot receive notifications
    if (!userId) {
        console.warn('sendCoachNote: athlete has no linked user_id, skipping notification');
        return null;
    }

    return sendNotification({
        userId,
        type: 'coach_note',
        messageKey: 'coachNoteSent',
        messageParams: message ? { text: message } : {},
        link,
    });
}
```

### 0.7 Fix `dashboard/page.tsx:handleNotify`

```diff
 const handleNotify = useCallback(async (athleteId: string, _athleteName: string) => {
     try {
-        await sendCoachNote(
-            athleteId,
-            `📋 Тестовое уведомление от тренера — проверка связи! (${new Date().toLocaleTimeString()})`
-        );
+        await sendCoachNote(athleteId, t('coachNoteDefault'));
     } catch (err) {
         logError(err, { component: 'DashboardPage', action: 'handleNotify' });
     }
 }, []);
```

> [!NOTE]
> `sendCoachNote` теперь сам resolve'ит `athlete.user_id` и guard'ит null. `t('coachNoteDefault')` — локализованный default text.

### 0.8 API Rules Check

Проверить через PocketBase MCP:
- `notifications.createRule` — должен быть `@request.auth.id != ""` (минимально)
- Если сейчас `null` → обновить на `@request.auth.id != ""`
- Если `""` (публичный) → ужесточить

---

## Phase 1: Notification Triggers
**Скиллы:** `concise-planning`, `lint-and-validate`, `react-best-practices`, `typescript-expert`

### 1.0 Fix `GroupMember` interface — BLOCKER

> [!CAUTION]
> Без этого фикса notification для group members **не скомпilируется** — `m.expand?.athlete_id?.user_id` will fail TS.

В [groups.ts:160-170](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/groups.ts#L160-L170):

```diff
 export interface GroupMember extends RecordModel {
     group_id: string;
     athlete_id: string;
     expand?: {
         athlete_id?: RecordModel & {
             name: string;
+            user_id: string;
             birth_date?: string;
             height_cm?: number;
         };
     };
 }
```

### 1.1 `publishPlan()` — plan_published

В [plans.ts:publishPlan()](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/plans.ts#L233-L266), добавить re-publish guard + notification trigger:

```typescript
export async function publishPlan(planId: string): Promise<PlanWithExercises> {
    // 0. Guard: prevent re-publish notification spam
    const currentPlan = await getPlan(planId);
    if (currentPlan.status === 'published') return currentPlan;

    // 1. Load current exercises to snapshot
    const exercises = await listPlanExercises(planId);

    // 2. Create snapshot (non-blocking)
    try {
        const { createSnapshot } = await import('./snapshots');
        await createSnapshot(planId, {
            exercises: exercises.map((ex) => ({
                id: ex.id,
                exercise_id: ex.exercise_id,
                order: ex.order,
                day_of_week: ex.day_of_week,
                sets: ex.sets,
                reps: ex.reps,
                intensity: ex.intensity,
                notes: ex.notes,
                exerciseName: ex.expand?.exercise_id?.name_en ?? '',
            })),
            publishedAt: new Date().toISOString(),
            exerciseCount: exercises.length,
        });
    } catch (snapErr) {
        console.warn('Snapshot creation failed (non-blocking):', snapErr);
    }

    // 3. Update plan status to published
    const published = await pb.collection(Collections.TRAINING_PLANS)
        .update<PlanWithExercises>(planId, { status: 'published' as PlanStatus });

    // 4. Notify assigned athletes (fire-and-forget, non-blocking)
    try {
        const { listActivePlanAssignments } = await import('./planAssignments');
        const { sendNotification } = await import('./notifications');
        const assignments = await listActivePlanAssignments(planId);

        const userIdsToNotify = new Set<string>();

        // 4a. Individual athlete assignments
        for (const a of assignments) {
            const uid = (a.expand?.athlete_id as unknown as { user_id?: string })?.user_id;
            if (uid) userIdsToNotify.add(uid);
        }

        // 4b. Group assignments → expand to members
        const groupAssignments = assignments.filter(a => a.group_id);
        if (groupAssignments.length > 0) {
            const { listGroupMembers } = await import('./groups');
            for (const ga of groupAssignments) {
                if (!ga.group_id) continue;
                const members = await listGroupMembers(ga.group_id);
                for (const m of members) {
                    const uid = m.expand?.athlete_id?.user_id;
                    if (uid) userIdsToNotify.add(uid);
                }
            }
        }

        // 4c. Batch preference check — 1 HTTP instead of N
        const { batchCheckPreferences } = await import('./notifications');
        const allowedUserIds = await batchCheckPreferences(
            Array.from(userIdsToNotify),
            'plan_published'
        );

        // 4d. Send notifications — batch by 5 (SQLite safety), only to allowed users
        const userIds = Array.from(allowedUserIds);
        for (let i = 0; i < userIds.length; i += 5) {
            const chunk = userIds.slice(i, i + 5);
            await Promise.all(chunk.map(userId =>
                sendNotification({
                    userId,
                    type: 'plan_published',
                    messageKey: 'planPublished',
                    messageParams: { week: published.week_number },
                    link: '/training',
                })
            ));
        }
    } catch (notifErr) {
        console.warn('Notification send failed (non-blocking):', notifErr);
    }

    return published;
}
```

### 1.2 `AchievementsGrid.tsx` — achievement

В `AchievementsGrid.tsx` после `checkAndGrant()` возвращает `result`:

```typescript
// After checkAndGrant call:
if (result.newlyEarned.length > 0) {
    const { sendNotification } = await import('@/lib/pocketbase/services/notifications');
    const userId = pb.authStore.record?.id;
    if (userId) {
        for (const ach of result.newlyEarned) {
            await sendNotification({
                userId,
                type: 'achievement',
                messageKey: 'achievementEarned',
                messageParams: { title: ach.title ?? ach.type },
                priority: 'low', // self-notification — не раздражать в bell
            }).catch(() => { /* non-critical */ });
        }
    }
}
```

### 1.3 `joinByInviteCode()` — invite_accepted

В [groups.ts:joinByInviteCode()](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/groups.ts#L83-L154), заменить TODO маркеры на L150-L151:

```typescript
    // Replace TODO(Track 4.23) comments with real notification:
    // Notify coach about new member (fire-and-forget)
    try {
        const { sendNotification } = await import('./notifications');
        await sendNotification({
            userId: group.coach_id, // coach_id = user_id from users collection ✅
            type: 'invite_accepted',
            messageKey: 'inviteAccepted',
            messageParams: {
                athleteName: getDisplayName(user as unknown as HasName) || 'Athlete',
                groupName: group.name,
            },
        });
    } catch {
        /* non-critical: notification for invite_accepted */
    }

    return group;
```

### 1.4 `moveAthleteToGroup()` — movedToGroup

> [!NOTE]
> Добавлено после conflict analysis с Track 4.22 — TODO на L282.

В [groups.ts:moveAthleteToGroup()](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/groups.ts#L232-L283), заменить TODO на L282:

```typescript
    // Replace TODO(Track 4.23) with real notification:
    // Notify athlete about group change (fire-and-forget)
    if (!keepInOriginal) {
        try {
            // Resolve user_id from athlete record
            const athlete = await pb.collection(Collections.ATHLETES).getOne(athleteId);
            const userId = (athlete as unknown as { user_id?: string }).user_id;
            if (userId) {
                const { sendNotification } = await import('./notifications');
                await sendNotification({
                    userId,
                    type: 'system', // no dedicated type yet — use system
                    messageKey: 'movedToGroup',
                    messageParams: { groupName: toGroup.name },
                });
            }
        } catch {
            /* non-critical: notification for group move */
        }
    }
```

### 1.5 i18n Message Templates

Добавить в `messages/{ru,en,cn}/common.json` → `notifications` namespace:

**EN:**
```json
{
  "notifications": {
    "planPublished": "New training plan for week {week} is ready",
    "achievementEarned": "Achievement unlocked: {title}",
    "inviteAccepted": "{athleteName} joined {groupName}",
    "movedToGroup": "You were moved to {groupName}",
    "coachNoteSent": "Coach: {text}",
    "coachNoteDefault": "Check-in from your coach"
  }
}
```

**RU:**
```json
{
  "notifications": {
    "planPublished": "Тренировочный план на неделю {week} готов",
    "achievementEarned": "Получено достижение: {title}",
    "inviteAccepted": "{athleteName} присоединился к {groupName}",
    "movedToGroup": "Вы перемещены в группу {groupName}",
    "coachNoteSent": "Тренер: {text}",
    "coachNoteDefault": "Сообщение от тренера"
  }
}
```

**CN:**
```json
{
  "notifications": {
    "planPublished": "第{week}周训练计划已发布",
    "achievementEarned": "获得成就：{title}",
    "inviteAccepted": "{athleteName} 加入了 {groupName}",
    "movedToGroup": "你已被转移到 {groupName}",
    "coachNoteSent": "教练：{text}",
    "coachNoteDefault": "教练的消息"
  }
}
```

---

## Phase 2: NotificationBell i18n Render
**Скиллы:** `concise-planning`, `lint-and-validate`, `i18n-localization`, `react-best-practices`

### 2.1 `NotificationBell.tsx` — message_key fallback render

В [NotificationBell.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/shared/NotificationBell.tsx):

```diff
+import { useTranslations } from 'next-intl';
 
 export function NotificationBell({ labels }: NotificationBellProps) {
+    const tNotif = useTranslations('notifications');
+
+    const renderMessage = (n: NotificationsRecord) => {
+        if (n.message_key) {
+            try {
+                return tNotif(n.message_key, n.message_params ?? {});
+            } catch (e) {
+                console.warn('NotificationBell: i18n key not found:', n.message_key, e);
+            }
+        }
+        return n.message; // fallback for old notifications
+    };

     // ... in JSX:
-    {typeIcon(n.type)} {n.message}
+    {typeIcon(n.type)} {renderMessage(n)}
```

### 2.2 `NotificationBell.tsx` — click → navigate(link)

В текущем коде `handleMarkRead` только помечает прочитанным. Нужно добавить навигацию:

```diff
+import { useRouter } from '@/i18n/navigation';
 
 export function NotificationBell({ labels }: NotificationBellProps) {
+    const router = useRouter();
 
-    const handleMarkRead = async (id: string) => {
+    const handleClick = async (n: NotificationsRecord) => {
         try {
-            await markRead(id);
-            removeNotification(id);
+            await markRead(n.id);
+            removeNotification(n.id);
+            if (n.link) {
+                router.push(n.link);
+                setOpen(false);
+            }
         } catch (err) {
             reportError(err instanceof Error ? err : new Error(String(err)));
         }
     };

     // In JSX, replace onClick:
-    onClick={() => void handleMarkRead(n.id)}
+    onClick={() => void handleClick(n)}
```

### 2.3 `useNotifications.ts` — filter expired notifications

В `loadInitial`, после получения items:

```diff
     const { items } = await listUnread(userId);
+    const now = new Date();
+    const nonExpired = items.filter(n => !n.expires_at || new Date(n.expires_at) > now);
-    for (const n of items) seenIds.current.add(n.id);
-    setNotifications(items);
-    setUnreadCount(items.length);
+    for (const n of nonExpired) seenIds.current.add(n.id);
+    setNotifications(nonExpired);
+    setUnreadCount(nonExpired.length);
```

### 2.4 `/notifications` page — аналогичный update

Тот же `renderMessage` pattern. Verify `/notifications` page uses `tNotif()` for render.

---

## Phase 3: App Icon Badge
**Скиллы:** `concise-planning`, `lint-and-validate`, `mobile-developer`, `verification-before-completion`

### 3.1 `sw.ts` — setAppBadge после showNotification

В [sw.ts:88](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/sw.ts#L88), после `showNotification`:

```diff
             await self.registration.showNotification(title, {
                 body,
                 icon: "/icons/icon-192.png",
                 badge: "/icons/badge-72.png",
                 tag: notifId || undefined,
                 data: { link },
                 requireInteraction: data.priority === "urgent",
             });
+
+            // App icon badge — supported on iOS 16.4+ and Desktop PWA
+            if ('setAppBadge' in self.navigator) {
+                (self.navigator as unknown as { setAppBadge: (n?: number) => Promise<void> })
+                    .setAppBadge(1).catch(() => {});
+            }
```

### 3.2 `useNotifications.ts` — badge sync

Добавить `useEffect` после existing main effect:

```typescript
// Badge sync: update app icon badge count
useEffect(() => {
    if (!('setAppBadge' in navigator)) return;
    if (unreadCount > 0) {
        navigator.setAppBadge(unreadCount).catch(() => {});
    } else {
        navigator.clearAppBadge?.().catch(() => {});
    }
}, [unreadCount]);
```

---

## Phase 4: Badge Icon Asset
**Скиллы:** `concise-planning`, `jumpedia-design-system`

Создать `/public/icons/badge-72.png`:
- 72×72px, монохромный (white on transparent)
- Простой силуэт прыгуна или логотип J
- Используется как `badge` в OS push notification (monochrome requirement)

Verify: `sw.ts:84` -> `badge: "/icons/badge-72.png"` — путь должен совпадать.

---

## Phase 5: Tests + Verification
**Скиллы:** `lint-and-validate`, `verification-before-completion`, `unit-testing-test-generate`

### Unit Tests

Файл: `src/lib/pocketbase/services/__tests__/notifications.test.ts`

```typescript
describe('sendNotification', () => {
    test('returns null when type is in disabled_types', async () => {
        // Mock getPreferences → { disabled_types: ['plan_published'] }
        // Call sendNotification({ type: 'plan_published', ... })
        // Expect: null, pb.create NOT called
    });

    test('creates record with message_key and message_params', async () => {
        // Mock getPreferences → { disabled_types: [] }
        // Call sendNotification({ type: 'achievement', messageKey: 'achievementEarned', messageParams: { title: 'Streak 7d' } })
        // Expect: pb.create called with message_key, message_params
    });

    test('throws when userId is empty', async () => {
        // Call sendNotification({ userId: '', ... })
        // Expect: throw 'userId is required'
    });
});

describe('sendCoachNote', () => {
    test('preserves custom text in messageParams', async () => {
        // Mock pb.collection('athletes').getOne → { user_id: 'user123' }
        // Call sendCoachNote('athlete1', 'Hello athlete!')
        // Expect: sendNotification called with messageParams: { text: 'Hello athlete!' }
    });

    test('returns null when athlete has no user_id', async () => {
        // Mock pb.collection('athletes').getOne → { user_id: '' }
        // Call sendCoachNote('athlete1', 'Hello')
        // Expect: null
    });
});
```

### Build Verification

```bash
pnpm type-check && pnpm build && pnpm test
```

---

## Verification Plan

### Automated Tests
- `pnpm test` — unit tests для sendNotification (3 cases) + sendCoachNote (2 cases)
- `pnpm type-check` — TypeScript compilation
- `pnpm build` — static export

### Manual Verification
- Dashboard → click notify button → NotificationBell shows coach note **with custom text**
- Training → publish plan → assigned athlete gets notification
- Settings → mute plan_published → publish plan → NO notification  
- Re-publish same plan → NO duplicate notification
- PWA install → notification → app icon badge appears (iOS 16.4+ / Chrome Desktop)

---

## Файлы, затрагиваемые треком

| Файл | Изменение |
|------|-----------|
| `src/lib/pocketbase/services/planAssignments.ts` | SQL injection fix (4 filters → pb.filter) |
| `src/lib/pocketbase/services/plans.ts` | SQL injection fix (3 filters) + delete console.log + re-publish guard + notification trigger |
| `src/lib/pocketbase/types.ts` | +message_key, +message_params |
| `src/lib/pocketbase/services/notifications.ts` | +sendNotification(), refactor sendCoachNote() with custom text preservation |
| `src/lib/pocketbase/services/groups.ts` | +GroupMember.user_id in interface + notification trigger in joinByInviteCode() + moveAthleteToGroup() |
| `src/components/gamification/AchievementsGrid.tsx` | +trigger after checkAndGrant() (priority: 'low') |
| `src/components/shared/NotificationBell.tsx` | +message_key i18n render with fallback |
| `src/app/[locale]/(protected)/notifications/page.tsx` | +message_key render |
| `src/app/sw.ts` | +setAppBadge after showNotification |
| `src/lib/hooks/useNotifications.ts` | +useEffect badge sync |
| `src/app/[locale]/(protected)/dashboard/page.tsx` | fix handleNotify — use localized default text |
| `public/icons/badge-72.png` | NEW — badge icon |
| `messages/{ru,en,cn}/common.json` | +notification message templates (6 keys × 3 locales) |
| `src/lib/pocketbase/services/__tests__/notifications.test.ts` | NEW — unit tests (5 cases) |
