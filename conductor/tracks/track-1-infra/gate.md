# Gate 1: Infrastructure ✅ Checklist

> All items must be checked before starting Track 2.

## Server
- [ ] HK VPS rented (CN2 GIA route)
- [ ] SSH key access configured
- [ ] Firewall: only 80, 443, 22 open

## PocketBase
- [ ] PocketBase installed + systemd service
- [ ] Admin account created
- [ ] `curl https://api.domain.com/api/health` → 200 OK
- [ ] SSL certificate (Cloudflare or Let's Encrypt)

## Cloudflare R2
- [ ] R2 bucket created
- [ ] PocketBase S3 adapter configured
- [ ] Test file upload/download via PocketBase
- [ ] CORS on R2 configured for domain

## Next.js
- [ ] `create-next-app@15` initialized with TypeScript + App Router
- [ ] Serwist PWA configured
- [ ] Static export builds (`pnpm build` → `out/`)
- [ ] Deployed to VPS via nginx
- [ ] Domain resolves to static site

## Monitoring
- [ ] UptimeRobot ping every 5 min
- [ ] Telegram alert configured
- [ ] Backup cron: SQLite → R2 daily
- [ ] Backup restore tested

## Fonts & Design System
- [ ] Fonts self-hosted in `/public/fonts/`: Inter, Plus Jakarta Sans, JetBrains Mono, Noto Sans SC
- [ ] `docs/DESIGN_SYSTEM.md` read and understood by dev team
- [ ] CSS tokens file created with design tokens from DESIGN_SYSTEM.md
