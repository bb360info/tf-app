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
- [ ] SSL certificate (Cloudflare or Let's Encrypt) — *deferred: no domain yet*

## Cloudflare R2
- [x] R2 bucket created (`tf-storage`)
- [x] PocketBase S3 adapter configured (forcePathStyle: true)
- [x] Test backup upload verified (test_backup.zip → R2)
- [ ] CORS on R2 configured for domain — *deferred: no domain yet*

## Next.js
- [x] `create-next-app@15` initialized with TypeScript + App Router
- [x] Serwist PWA configured
- [x] Static export builds (`pnpm build` → `out/`)
- [x] Deployed to VPS via nginx — *rsync out/ → /var/www/encyclopedia-jumper/*
- [ ] Domain resolves to static site — *deferred: no domain yet*

## Monitoring
- [ ] UptimeRobot ping every 5 min — *needs domain*
- [ ] Telegram alert configured — *deferred*
- [x] Backup cron: SQLite → R2 daily (3 AM UTC)
- [x] Backup tested (test_backup.zip, 229 KB)

## Fonts & Design System
- [x] Fonts self-hosted in `/public/fonts/`: Inter, Plus Jakarta Sans, JetBrains Mono, Noto Sans SC
- [ ] `docs/DESIGN_SYSTEM.md` read and understood by dev team
- [x] CSS tokens file created with design tokens from DESIGN_SYSTEM.md
