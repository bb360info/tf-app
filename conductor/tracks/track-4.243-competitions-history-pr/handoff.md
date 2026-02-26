# Handoff для следующего агента (Track 4.243)

## Что уже подготовлено

1. `gate.md` — полный чеклист фаз трека.
2. `context.md` — продуктовые решения и ограничения.
3. `implementation_plan.md` — стратегия реализации по слоям.
4. `phase-1-plan.md` — детальный стартовый план Data Foundation.
5. `workflow_state.md` — состояние и загруженные скиллы.
6. `walkthrough.md` — bootstrap-лог и решения.

## Как стартовать

1. Убедиться, что Track 4.242 полностью закрыт.
2. Выполнить `/phase` для активного трека и проверить, что выбрана Phase 1 этого трека.
3. Перед правками подтвердить PB schema/rules решения из `context.md`.
4. Работать по `phase-1-plan.md` атомарно.

## Критичные правила

1. Athlete не должен иметь возможность напрямую менять official result.
2. Coach approve/reject должен сохранять audit trail.
3. История соревнований — отдельный модуль, не смешивать с редактором weekly plan.
4. PR берётся только из подтверждённых competition results.

## Быстрый smoke после первых изменений

1. `pnpm type-check`
2. `pnpm lint`
3. `pnpm build`
