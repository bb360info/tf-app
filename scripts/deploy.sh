#!/bin/bash
# Deploy static export to VPS
# Usage: ./scripts/deploy.sh

set -e

echo "🔨 Building..."
pnpm build

echo "🚀 Deploying to VPS..."
rsync -avz --delete \
  -e "ssh -i ~/.ssh/encyclopedia_jumper_vps" \
  out/ root@209.46.123.119:/var/www/encyclopedia-jumper/

echo "✅ Deployed to http://209.46.123.119"
