# Implementation Plan: Track 4.268 (Tech Debt Zero)

## User Review Required
>
> [!IMPORTANT]
> **DB Cascade Delete (Phase 2.1)** требует ручного вмешательства администратора базы данных. В коде это не настраивается. Инструкция приведена ниже.
> Проверьте, готовы ли вы выполнить эти действия в админ-панели PocketBase.

---

## Proposed Changes

### Phase 1: Security & Types

#### [MODIFY] All Services (pb.filter migration)

- **Цель:** Исключить фильтр-инъекции.
- **Действия:** Глобальный поиск `filter:\s*["'\`]`. Замена прямой интерполяции на вызовы`pb.filter("field = {:val}", { val })`.
- Затрагиваемые файлы: `customExercises.ts`, `planResolution.ts`, `seasons.ts`, `plans.ts` и другие сервисы по результатам поиска.

#### [MODIFY] `src/lib/pocketbase/types/` (Strict DTOs)

- **Цель:** Слепой TypeScript из-за `extends RecordModel`.
- **Действия:** Убрать `extends RecordModel` (или `[key: string]: any`) из расширенных интерфейсов (например, `PlanExerciseWithExpand`). Явно прописать нужные поля `id`, `created`, `updated` и т.д., чтобы любые опечатки в полях отлавливались на этапе компиляции.

---

### Phase 2: Integrations & Architecture

#### [MANUAL] Admin UI Configuration (Cascade Delete)

1. Зайти в PocketBase Admin UI (`https://jumpedia.app/_/`).
2. Открыть коллекции: `training_logs`, `test_results`, `daily_checkins`, `seasons`, `achievements`.
3. В каждой коллекции найти поле `athlete_id` (или аналогичный relation).
4. Открыть его настройки (шестеренка) → "On delete" изменить с `Restrict` (или пустой) на **Cascade**.
5. Сохранить схему.

#### [MODIFY] `src/lib/pocketbase/services/notifications.ts` & CF Worker

- **Цель:** Заставить CF Worker доставлять Web Push уведомления.
- **Действия:**
  - Изучить эндпоинт `cloudflare-worker/push-service`.
  - В `sendNotification()` (Next.js) добавить логику: если уведомление успешно создано в PB, делать `fetch()` запрос к CF Worker POST `/send_push` с нужными данными (или настроить PB Webhook, если это предпочтительнее и воркер умеет парсить PB payload).

---

### Phase 3: UI Maintainability

#### [NEW] `src/components/dashboard/CoachDashboard.tsx`

- Вынести всю логику из `dashboard/page.tsx` (хуки `loadAthletes`, `handleNotify`, состояния и верстку списка атлетов).

#### [MODIFY] `src/app/[locale]/(protected)/dashboard/page.tsx`

- Оставить только серверную/клиентскую обертку и маршрутизацию ролей:

```tsx
if (isAthlete) return <AthleteDashboard />;
return <CoachDashboard />;
```

## Verification Plan

### Automated Tests

- `pnpm type-check`: Должен пройти без ошибок (важно для Phase 1.2).
- `pnpm lint`: Убедиться, что рефакторинг не создал неиспользуемых импортов.
- `pnpm build`: Убедиться, что Next.js успешно собирает статику.

### Manual Verification

1. **Push Notifications:** Отправить сообщение тренером (Coach Note) атлету. Убедиться, что PWA атлета получило Web Push на системном уровне.
2. **Coach Dashboard:** Зайти в профиль тренера, убедиться что карточки атлетов, фильтры и модалки Add/Edit сохранены и работают корректно.
3. **Data Fetching:** Зайти в конструктор и другие экраны, чтобы убедиться, что изменённый `pb.filter()` везде срабатывает и не выдает пустых списков или 400 Bad Request от PocketBase.
