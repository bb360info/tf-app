# Implementation Plan: Track 4.22 — Invite Links & Group Management

## Цель

Реализовать инвайт-ссылки для вступления в группу (вместо ручного ввода кода), перемещение атлетов между группами тренера, и QR-код для offline sharing.

> [!IMPORTANT]
> **Review v3 (2026-02-23, CS brainstorm):** Финальная версия плана. Интегрирует все находки из ревью v1/v2/v3: self-athlete fix, deleted_at фильтр, alreadyMember дифференциация, sessionStorage fallback, OG-теги, invite expiry check, coach_id guard, QR filename, TODO для 4.23.

---

## Phase 0: Pre-Track Fixes + Pending Invite Utility

**Скиллы:** `concise-planning`, `lint-and-validate`, `verification-before-completion`

### [MODIFY] [groups.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/groups.ts)

**Fix 1: `first_name`/`last_name` при автосоздании athlete**

Строки 119-127 — автосоздание athlete record:
```typescript
// After (fixed):
const newAthlete = await pb.collection(Collections.ATHLETES).create({
    name: getDisplayName(user as unknown as HasName) || user.email?.split('@')[0] || 'Athlete',
    first_name: (user as Record<string, string>).first_name || '',
    last_name: (user as Record<string, string>).last_name || '',
    coach_id: group.coach_id,
    user_id: user.id,
});
```

**Fix 2: `deleted_at` фильтр в поиске группы**

> [!CAUTION]
> Без этого фикса soft-deleted группа всё ещё принимает инвайты!

Строка 90 — фильтр поиска группы:
```typescript
// Before:
filter: pb.filter('invite_code = {:code} && invite_expires > {:now}', { code: safeCode, now }),

// After:
filter: pb.filter('invite_code = {:code} && invite_expires > {:now} && deleted_at = ""', { code: safeCode, now }),
```

**Fix 3: Дифференциация `alreadyMember`**

Строки 131-137 — добавление в group_members:
```typescript
// After: дифференцируем already member от нового join
try {
    await pb.collection(Collections.GROUP_MEMBERS).create({
        group_id: group.id,
        athlete_id: athleteId,
    });
} catch (err: unknown) {
    // Check if it's a unique constraint error (already member)
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('unique') || message.includes('UNIQUE')) {
        throw new Error('invite.alreadyMember');
    }
    throw err; // Re-throw unexpected errors
}
```

### [MODIFY] [OnboardingWizard.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/onboarding/OnboardingWizard.tsx)

**Fix 4: Self-athlete creation для самостоятельно зарегистрированных атлетов**

> [!CAUTION]
> Предсуществующий баг Track 4.21: если атлет зарегистрировался **без** инвайта, athlete record не существует → `getSelfAthleteProfile()` → null → specialization теряется.

В `handleFinish()`, перед блоком specialization save:
```typescript
// Fix: ensure athlete record exists before specialization save
if (currentRole === 'athlete' && userId) {
    let myAthlete = await getSelfAthleteProfile();
    if (!myAthlete) {
        // Self-registered athlete without coach — create self-athlete record
        const user = pb.authStore.record;
        if (user) {
            const { default: pbClient } = await import('@/lib/pocketbase/client');
            myAthlete = await pbClient.collection('athletes').create({
                name: getDisplayName(user as unknown as HasName) || user.email?.split('@')[0] || 'Athlete',
                first_name: (user as Record<string, string>).first_name || '',
                last_name: (user as Record<string, string>).last_name || '',
                user_id: user.id,
                // coach_id intentionally empty — self-athlete
            });
        }
    }
    // Now save specialization using myAthlete...
}
```

### [NEW] [pendingInvite.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/utils/pendingInvite.ts)

Утилитарный модуль для управления pending invite:
```typescript
interface PendingInvite {
  code: string;
  timestamp: number; // Date.now()
}

const STORAGE_KEY = 'pendingInviteCode';
const JOINED_KEY = 'joinedGroup'; // sessionStorage only — for OnboardingWizard feedback
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Save invite code to localStorage + sessionStorage (Safari Private fallback).
 */
export function savePendingInvite(code: string): void {
  const data = JSON.stringify({ code, timestamp: Date.now() });
  try { localStorage.setItem(STORAGE_KEY, data); } catch { /* quota */ }
  try { sessionStorage.setItem(STORAGE_KEY, data); } catch { /* quota */ }
}

/**
 * Get pending invite code. Returns null if stale (>24h) or not found.
 * Checks localStorage first, then sessionStorage fallback.
 */
export function getPendingInvite(): string | null {
  const raw = (() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { /* */ }
    try { return sessionStorage.getItem(STORAGE_KEY); } catch { /* */ }
    return null;
  })();
  if (!raw) return null;
  try {
    const parsed: PendingInvite = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > MAX_AGE_MS) {
      clearPendingInvite(); // Auto-cleanup stale
      return null;
    }
    return parsed.code;
  } catch {
    clearPendingInvite();
    return null;
  }
}

export function clearPendingInvite(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* */ }
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* */ }
}

/**
 * Atomically consume pending invite code.
 * Returns code and clears storage — second call returns null.
 */
export function consumePendingInvite(): string | null {
  const code = getPendingInvite();
  if (code) clearPendingInvite();
  return code;
}

/**
 * Consume pending invite and join group.
 * Saves joinedGroup to sessionStorage for OnboardingWizard feedback.
 * Returns result or null on any error.
 */
export async function joinWithPendingInvite(): Promise<{groupName: string} | null> {
  const code = consumePendingInvite();
  if (!code) return null;

  try {
    const { joinByInviteCode } = await import('@/lib/pocketbase/services/groups');
    const group = await joinByInviteCode(code);
    const groupName = group.name || 'Group';
    // Save for OnboardingWizard StepDone feedback
    try { sessionStorage.setItem(JOINED_KEY, groupName); } catch { /* */ }
    return { groupName };
  } catch {
    // Code invalid, expired, coach, or alreadyMember — silently fail
    return null;
  }
}

/**
 * Get joined group name from sessionStorage (for OnboardingWizard feedback).
 * Clears after reading.
 */
export function getJoinedGroupName(): string | null {
  try {
    const name = sessionStorage.getItem(JOINED_KEY);
    if (name) sessionStorage.removeItem(JOINED_KEY);
    return name;
  } catch { return null; }
}
```

Вызывать `joinWithPendingInvite()` **только в 2 местах**:
- `LoginForm.handleSubmit` / `handleGoogleLogin` — для возвращающихся пользователей
- `OnboardingWizard.handleFinish` — для новых пользователей

**НЕ ДОБАВЛЯТЬ** в `AuthProvider.tsx` — race condition risk.

---

## Phase 1: /join Page

**Скиллы:** `concise-planning`, `nextjs-app-router-patterns`, `nextjs-best-practices`, `auth-implementation-patterns`, `jumpedia-design-system`

### [NEW] [page.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/%28public%29/join/page.tsx)

Client-side page в `(public)` группе (не требует auth):

> [!WARNING]
> **Suspense обязателен** — `useSearchParams()` в Static Export требует обёртки в `<Suspense>`, иначе build упадёт.

```tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';

// Generic OG tags for link preview in messengers
export const metadata: Metadata = {
  title: 'Join Group — Jumpedia',
  description: 'Your coach invites you to join a training group on Jumpedia',
  openGraph: {
    title: 'Join Group — Jumpedia',
    description: 'Your coach invites you to join a training group on Jumpedia',
    type: 'website',
  },
};

export default function JoinPage() {
  return (
    <Suspense fallback={<JoinSkeleton />}>
      <JoinContent />
    </Suspense>
  );
}
```

**Логика JoinContent:**
1. Извлечь `code` из `searchParams`
2. Если нет code → показать ошибку «Неверная ссылка» + ссылка на главную
3. Проверить auth через `pb.authStore.isValid`:
   - **Залогинен как coach**: показать info card «Тренеры управляют группами, а не вступают» + кнопка «На Dashboard»
   - **Залогинен как athlete**: сразу `joinByInviteCode(code)`:
     - Success → карточка с именем группы + «На Dashboard»
     - `alreadyMember` → «Вы уже в этой группе» + «На Dashboard»
     - Error → «Код истёк» / «Неверная ссылка»
   - **Не залогинен**: `savePendingInvite(code)` → карточка с двумя кнопками:
     - **«Регистрация»** (primary) → `/auth/register`
     - **«Уже есть аккаунт»** (secondary) → `/auth/login`
4. **Success page expectations:** «Ваш тренер может назначить вам план тренировок. Заполните профиль специализации в Настройках.»
5. UI: glassmorphism card (design system tokens), loading spinner, success/error states

### [NEW] [join.module.css](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/%28public%29/join/join.module.css)

Glassmorphism card, loading skeleton, success/error states. Все design tokens из `tokens.css`.

### i18n ×3 (RU/EN/CN)

Добавить в `messages/{ru,en,cn}/common.json` раздел `join`:
```json
"join": {
  "title": "Присоединиться к группе",
  "joining": "Присоединяемся...",
  "success": "Вы добавлены в группу «{name}»",
  "successHint": "Ваш тренер может назначить вам план тренировок",
  "successProfile": "Заполните профиль специализации в Настройках",
  "goToDashboard": "На Dashboard",
  "invalidLink": "Неверная ссылка",
  "invalidLinkDesc": "Ссылка повреждена. Попросите тренера отправить новую.",
  "codeExpired": "Код истёк. Попросите тренера новую ссылку.",
  "coachCannotJoin": "Тренеры управляют группами, а не вступают в них",
  "coachCannotJoinDesc": "Перейдите в настройки групп для управления",
  "alreadyMember": "Вы уже в этой группе",
  "alreadyMemberDesc": "Можете перейти на главную",
  "registerFirst": "Зарегистрируйтесь, чтобы присоединиться",
  "haveAccount": "Уже есть аккаунт?"
}
```

---

## Phase 2: Register + Login + Onboarding Integration

**Скиллы:** `concise-planning`, `react-best-practices`, `auth-implementation-patterns`, `lint-and-validate`

### [MODIFY] [RegisterForm.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/auth/RegisterForm.tsx)

- Импортировать `getPendingInvite` из `pendingInvite.ts`
- Если `getPendingInvite() !== null`:
  - Автоматически установить `role = 'athlete'` (скрыть role selector)
  - Показать info banner: `t('auth.inviteBanner')` — «Вы регистрируетесь по приглашению тренера»

### [MODIFY] [LoginForm.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/auth/LoginForm.tsx)

В `handleSubmit()` — **после** успешного логина, **перед** redirect:
```typescript
const { joinWithPendingInvite } = await import('@/lib/utils/pendingInvite');
const inviteResult = await joinWithPendingInvite();
if (inviteResult) {
  // Show toast with join.success + inviteResult.groupName
}
```

В `handleGoogleLogin()` — **тот же код** после успешного OAuth.

### [MODIFY] [OnboardingWizard.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/components/onboarding/OnboardingWizard.tsx)

> [!CAUTION]
> **Критический порядок вызовов:** `joinWithPendingInvite()` ДОЛЖЕН вызываться **ПЕРЕД** specialization save! `joinByInviteCode()` автосоздаёт athlete record. Если вызвать после — specialization потеряется.

В `handleFinish()` — **в самом начале** try-блока:
```typescript
// Step 0: Auto-join group from pending invite FIRST
const { joinWithPendingInvite, getJoinedGroupName } = await import('@/lib/utils/pendingInvite');
const inviteResult = await joinWithPendingInvite();
// Also check if LoginForm already consumed the code
const joinedGroupName = inviteResult?.groupName ?? getJoinedGroupName();

// Step 1: Self-athlete fix (from Phase 0)
// Step 2: Role, specialization, preferences...
```

Добавить state `joinedGroupName` в компонент.

В `StepDone`: показать группу если `joinedGroupName` не null:
```tsx
{joinedGroupName && (
  <div className={styles.inviteSuccess}>
    <Check size={18} />
    {t('join.success', { name: joinedGroupName })}
  </div>
)}
```

Redirect fix: если `joinedGroupName` не null → `/dashboard` (у нового атлета нет плана).

### i18n ×3
```json
"auth": {
  "inviteBanner": "Вы регистрируетесь по приглашению тренера"
}
```

---

## Phase 3: Coach Share UI

**Скиллы:** `concise-planning`, `jumpedia-design-system`, `react-best-practices`, `cc-skill-frontend-patterns`

### [MODIFY] [settings/groups/page.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/%28protected%29/settings/groups/page.tsx)

**Share Link кнопка** — рядом с Copy в code block:
```tsx
<button onClick={() => handleShareLink(g.activeCode!.code, g.name, g.activeCode!.expires)} title={t('groups.shareLink')}>
  <Share2 size={14} />
</button>
```

**handleShareLink с auto-check expiry:**
```typescript
async function handleShareLink(code: string, groupName: string, expires: string) {
  // Check if code expires within 24h — warn coach
  const expiresIn = new Date(expires).getTime() - Date.now();
  if (expiresIn < 24 * 60 * 60 * 1000) {
    // Show warning: "Код истекает скоро, сгенерировать новый?"
    // If user confirms → await handleGenerate(groupId) first
    // If user declines → continue with current code
  }

  const url = `${window.location.origin}/${locale}/join?code=${code}`;
  if (navigator.share) {
    try {
      await navigator.share({
        title: t('groups.inviteTitle'),
        text: t('groups.inviteText', { group: groupName }) + '\n' + t('groups.linkExpiry'),
        url,
      });
    } catch { /* user cancelled share dialog */ }
  } else {
    await navigator.clipboard.writeText(url);
    setCopiedGroup(groupId); // reuse existing copy toast pattern
  }
}
```

**Manual code entry hint** — в атлетском UI:
```tsx
<p className={styles.inviteHint}>{t('groups.inviteHint')}</p>
```

### i18n ×3
```json
"groups": {
  "shareLink": "Поделиться ссылкой",
  "linkCopied": "Ссылка скопирована",
  "inviteTitle": "Присоединяйтесь к группе на Jumpedia",
  "inviteText": "Вступите в группу «{group}»",
  "inviteHint": "Или попросите тренера отправить ссылку-приглашение",
  "linkExpiry": "Ссылка действует 7 дней",
  "linkExpiringSoon": "Код истекает менее чем через сутки. Сгенерировать новый?"
}
```

---

## Phase 4: Move Athletes Between Groups

**Скиллы:** `concise-planning`, `jumpedia-design-system`, `react-best-practices`, `code-refactoring-refactor-clean`

### [MODIFY] [groups.ts](file:///Users/bogdan/antigravity/skills%20master/tf/src/lib/pocketbase/services/groups.ts)

> [!IMPORTANT]
> **Create-first, delete-second** + **coach_id guard** — безопасная стратегия.

```typescript
/**
 * Move athlete between groups (or add to additional group).
 * Strategy: CREATE new membership first, then DELETE old.
 * Guard: both groups must belong to current coach.
 */
export async function moveAthleteToGroup(
  athleteId: string,
  fromGroupId: string,
  toGroupId: string,
  keepInOriginal = false
): Promise<void> {
  const user = pb.authStore.record;
  if (!user) throw new Error('Not authenticated');

  // Guard: verify both groups belong to current coach
  const [fromGroup, toGroup] = await Promise.all([
    getGroup(fromGroupId),
    getGroup(toGroupId),
  ]);
  if (fromGroup.coach_id !== user.id || toGroup.coach_id !== user.id) {
    throw new Error('groups.unauthorized');
  }

  // Step 1: Create new membership (create-first for safety)
  try {
    await pb.collection(Collections.GROUP_MEMBERS).create({
      group_id: toGroupId,
      athlete_id: athleteId,
    });
  } catch {
    // Unique constraint → already a member of target group → skip
  }
  
  // Step 2: Remove from old group (only if not "add to")
  if (!keepInOriginal) {
    const oldMember = await pb.collection(Collections.GROUP_MEMBERS)
      .getFirstListItem(pb.filter(
        'group_id = {:gid} && athlete_id = {:aid}',
        { gid: fromGroupId, aid: athleteId }
      ));
    await pb.collection(Collections.GROUP_MEMBERS).delete(oldMember.id);
  }
}

/** Check if a group has an active plan assignment */
export async function hasActiveGroupPlan(groupId: string): Promise<boolean> {
  try {
    const result = await pb.collection(Collections.PLAN_ASSIGNMENTS).getList(1, 1, {
      filter: pb.filter('group_id = {:gid} && status = "active"', { gid: groupId }),
    });
    return result.totalItems > 0;
  } catch {
    return false;
  }
}
```

### [MODIFY] [settings/groups/page.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/%28protected%29/settings/groups/page.tsx)

> [!IMPORTANT]
> **2 отдельных действия** — для тренеров 50+ важна ясность:
> - 🔄 **«Переместить»** — атлет покидает текущую группу и переходит в выбранную
> - ➕ **«Добавить в группу»** — атлет остаётся в текущей и добавляется в выбранную

В members panel для каждого member:
- Кнопка 🔄 (ArrowRightLeft) → dropdown с другими группами
- Кнопка ➕ (UserPlus) → dropdown с другими группами (без текущей)
- При move: проверить `hasActiveGroupPlan()` для **ОБЕИХ** групп:
  - Обе имеют планы → «Атлет перейдёт с плана группы „{from}" на план группы „{to}"»
  - Только from → «Атлет потеряет доступ к текущему групповому плану»
  - Только to → «Атлет получит план группы „{to}"»
- После confirm → `moveAthleteToGroup()` → обновить state + toast

**TODO comment:**
```typescript
// TODO(Track 4.23): Notify athlete when moved between groups
// TODO(Track 4.23): Send push notification to coach when athlete joins via invite
```

### i18n ×3
```json
"groups": {
  "moveTo": "Переместить в",
  "addTo": "Добавить в группу",
  "moveWarning": "У группы «{from}» есть активный план. После перемещения атлет потеряет доступ к этому плану.",
  "moveWarningBoth": "Атлет перейдёт с плана группы «{from}» на план группы «{to}».",
  "moveWarningGain": "Атлет получит план группы «{to}».",
  "moveSuccess": "Атлет перемещён в группу «{name}»",
  "addSuccess": "Атлет добавлен в группу «{name}»"
}
```

---

## Phase 5: QR Code

**Скиллы:** `concise-planning`, `jumpedia-design-system`, `react-best-practices`

### Dependency
```bash
pnpm add qrcode @types/qrcode
```

### [MODIFY] [settings/groups/page.tsx](file:///Users/bogdan/antigravity/skills%20master/tf/src/app/%5Blocale%5D/%28protected%29/settings/groups/page.tsx)

- QR button (QrCode icon из Lucide) рядом с Share
- Клик → modal с QR image + group name + invite code

**Rendering:**
```typescript
const QRCode = await import('qrcode');
const dataUrl = await QRCode.toDataURL(inviteUrl, {
  width: 256,
  color: {
    dark: isDarkMode ? '#ffffff' : '#000000',
    light: isDarkMode ? '#1a1a2e' : '#ffffff',
  },
});
```

**Modal:** Имя группы (h3), QR (256×256), invite code текст, **Download PNG** button.

**Download filename:**
```typescript
const filename = `jumpedia-${groupName.replace(/\s+/g, '-').toLowerCase()}-invite.png`;
```

### i18n ×3
```json
"groups": {
  "showQR": "QR-код",
  "downloadQR": "Скачать QR"
}
```

---

## Phase 6: Tests + Build Verification

**Скиллы:** `lint-and-validate`, `verification-before-completion`

### Tests
- `src/lib/utils/__tests__/pendingInvite.test.ts`:
  - `savePendingInvite` / `getPendingInvite` / `clearPendingInvite`
  - sessionStorage fallback when localStorage throws
  - Stale auto-cleanup (>24h returns null)
  - `consumePendingInvite` (get-then-clear, second call returns null)
  - `joinWithPendingInvite` — saves joinedGroup to sessionStorage
  - `getJoinedGroupName` — reads and clears
- `src/lib/pocketbase/services/__tests__/groups.move.test.ts`:
  - `moveAthleteToGroup` — create-first, delete-second order
  - `moveAthleteToGroup` — coach_id guard throws on mismatch
  - `moveAthleteToGroup` with `keepInOriginal=true` — no delete
  - `hasActiveGroupPlan` — returns boolean
- `joinByInviteCode` tests:
  - alreadyMember throws specific error
  - deleted_at group not found
  - first_name/last_name saved on athlete creation

### Verification
```bash
pnpm type-check   # Exit 0
pnpm build         # Exit 0
pnpm test          # All pass
```

### Post-track
- Обновить CHANGELOG.md
- TODO comments в `joinByInviteCode` + `moveAthleteToGroup` для Track 4.23

---

## Файлы затрагиваемые треком

| Файл | Тип | Фаза |
|------|-----|------|
| `src/lib/pocketbase/services/groups.ts` | MODIFY | 0, 4 |
| `src/components/onboarding/OnboardingWizard.tsx` | MODIFY | 0, 2 |
| `src/lib/utils/pendingInvite.ts` | NEW | 0 |
| `src/app/[locale]/(public)/join/page.tsx` | NEW | 1 |
| `src/app/[locale]/(public)/join/join.module.css` | NEW | 1 |
| `src/components/auth/RegisterForm.tsx` | MODIFY | 2 |
| `src/components/auth/LoginForm.tsx` | MODIFY | 2 |
| `src/app/[locale]/(protected)/settings/groups/page.tsx` | MODIFY | 3, 4, 5 |
| `messages/{ru,en,cn}/common.json` | MODIFY | 1-5 |
| `src/lib/utils/__tests__/pendingInvite.test.ts` | NEW | 6 |
| `src/lib/pocketbase/services/__tests__/groups.move.test.ts` | NEW | 6 |

> **НЕ трогаем:** `AuthProvider.tsx` — убран из плана (race condition risk).

> **Конфликт с Track 4.21:** LOW — OnboardingWizard модифицируется в обоих треках, но изменения в разных частях `handleFinish`. Track 4.22 ДОЛЖЕН базироваться на коде после завершения 4.21.

> **Оценка: 3-5 рабочих дней**

---

## Скиллы — сводная таблица

| Фаза | Скиллы для агента |
|------|-------------------|
| Phase 0 | `concise-planning`, `lint-and-validate`, `verification-before-completion` |
| Phase 1 | `concise-planning`, `nextjs-app-router-patterns`, `nextjs-best-practices`, `auth-implementation-patterns`, `jumpedia-design-system` |
| Phase 2 | `concise-planning`, `react-best-practices`, `auth-implementation-patterns`, `lint-and-validate` |
| Phase 3 | `concise-planning`, `jumpedia-design-system`, `react-best-practices`, `cc-skill-frontend-patterns` |
| Phase 4 | `concise-planning`, `jumpedia-design-system`, `react-best-practices`, `code-refactoring-refactor-clean` |
| Phase 5 | `concise-planning`, `jumpedia-design-system`, `react-best-practices` |
| Phase 6 | `lint-and-validate`, `verification-before-completion` |

> [!NOTE]
> Группа `always` (`concise-planning`, `lint-and-validate`, `jumpedia-design-system`, `verification-before-completion`) подключается автоматически. В таблице указаны **дополнительные** скиллы сверх `always`.
