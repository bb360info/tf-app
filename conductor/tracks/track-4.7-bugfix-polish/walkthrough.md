# Walkthrough: Loading States Research (Track 4.7)

## Что сделано

Проведён полный брейншторм UX Loading States — исследование проблемы "пустого скелета" при загрузке данных из PocketBase.

### Анализ текущего состояния
- Изучён `AthleteDashboard.tsx` — 4 спиннера (`.spinner` CSS animation), нет Skeleton UI
- Замерена цепочка: HTML → JS бандл → React mount → 3 PB запроса → данные (~1500-4000ms)
- IndexedDB (Dexie) не используется для отображения кэшированных данных

### Варианты решения (6 вариантов)
| Вариант | Приоритет |
|---------|-----------|
| Progressive Reveal (fade-in) | Track 4.7 — 30 мин |
| Skeleton UI (shimmer cards) | Track 6 — 1-2 дня |
| Min-height CLS fix | Вместе со Skeleton |
| IndexedDB Cache First | Track 6 — 2-3 дня |
| Optimistic UI (мутации) | Track 6 |
| Page Transitions | Track 6 |

### Артефакты
- Полный отчёт: `conductor/tracks/track-4.7-bugfix-polish/loading_states_brainstorm.md`

## Что НЕ сделано (ждёт решения)
- Код не менялся — это исследовательская задача
- Реализация fade-in и skeleton ждёт одобрения
