# Энциклопедия Прыгуна v2

> 📱 PWA-энциклопедия высотного прыжка для тренеров и спортсменов.
> Работает в Китае 🇨🇳 без VPN (кроме Google OAuth).

## Stack
- **Frontend**: Next.js 15 Static Export + TypeScript + Serwist PWA
- **Backend**: PocketBase (HK VPS)
- **Storage**: Cloudflare R2
- **Offline**: IndexedDB (Dexie.js) + Smart Sync
- **i18n**: RU / EN / CN (next-intl)

## Quick Start
```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # Static export → out/
pnpm test         # Vitest
```

## Docs
- [Architecture](docs/ARCHITECTURE.md) — PocketBase schema, indexes, sync
- [Security](docs/SECURITY.md) — Auth, API rules, headers, CORS
- [Periodization](docs/PERIODIZATION.md) — Training system rules

## Development
See [CLAUDE.md](CLAUDE.md) for agent rules and project structure.
See [conductor/tracks.md](conductor/tracks.md) for current track status.
