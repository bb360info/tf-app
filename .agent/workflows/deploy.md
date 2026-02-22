---
description: Задеплоить сайт на VPS — pnpm build + rsync на 209.46.123.119
---
// turbo-all

## Deploy to VPS

1. Run deploy script (build + rsync):

```bash
cd "/Users/bogdan/antigravity/skills master/tf" && bash scripts/deploy.sh 2>&1
```

2. Verify site is accessible:

```bash
curl -s -o /dev/null -w "HTTP %{http_code}" https://jumpedia.app/en/dashboard
```
