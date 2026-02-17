# Gate 1: Infrastructure ✅ Checklist

> All items must be checked before starting Track 2.

## Server
- [x] HK VPS rented (CN2 GIA route) — *US VPS for dev, HK migration planned for prod*
- [x] SSH key access configured (`encyclopedia_jumper_vps` key)
- [x] Firewall: only 80, 443, 22 open — *+ 8090 for PocketBase (internal only, blocked by IONOS)*

## PocketBase
- [x] PocketBase installed + systemd service (v0.36.3)
- [x] Admin account created
- [x] `curl https://api.domain.com/api/health` → 200 OK — *via http://209.46.123.119/api/health*
- [x] SSL certificate (Cloudflare) — *Cloudflare proxied, auto SSL*

## Cloudflare R2
- [x] R2 bucket created (`tf-storage`)
- [x] PocketBase S3 adapter configured (forcePathStyle: true)
- [x] Test backup upload verified (test_backup.zip → R2)
- [x] CORS on R2 configured for domain — *PocketBase proxies R2 files with `access-control-allow-origin: *`*

## Next.js
- [x] `create-next-app@15` initialized with TypeScript + App Router
- [x] Serwist PWA configured
- [x] Static export builds (`pnpm build` → `out/`)
- [x] Deployed to VPS via nginx — *rsync out/ → /var/www/encyclopedia-jumper/*
- [x] Domain resolves to static site — *`https://jumpedia.app/api/health` → 200 OK via Cloudflare proxy*

## Monitoring
- [x] UptimeRobot ping every 5 min — *jumpedia.app/api/health, 100% uptime*
- [~] Telegram alert configured — *skipped, email alerts via UptimeRobot sufficient*
- [x] Backup cron: SQLite → R2 daily (3 AM UTC)
- [x] Backup tested (test_backup.zip, 229 KB)

## Fonts & Design System
- [x] Fonts self-hosted in `/public/fonts/`: Inter, Plus Jakarta Sans, JetBrains Mono, Noto Sans SC
- [x] `docs/DESIGN_SYSTEM.md` read and understood by dev team
- [x] CSS tokens file created with design tokens from DESIGN_SYSTEM.md
