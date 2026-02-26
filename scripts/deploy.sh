#!/bin/bash
# Deploy static export + PocketBase hooks to VPS
# Usage: ./scripts/deploy.sh

set -e

# Check if SSH key exists
if [ ! -f ~/.ssh/encyclopedia_jumper_vps ]; then
  echo "❌ Error: SSH key ~/.ssh/encyclopedia_jumper_vps not found."
  echo "   Make sure the key is present in your ~/.ssh directory."
  exit 1
fi

echo "🔨 Building..."
pnpm build

echo "🚀 Deploying Next.js static export to VPS..."
rsync -avz --delete \
  -e "ssh -i ~/.ssh/encyclopedia_jumper_vps" \
  out/ root@209.46.123.119:/var/www/encyclopedia-jumper/

echo "🔌 Deploying PocketBase hooks..."
rsync -avz \
  -e "ssh -i ~/.ssh/encyclopedia_jumper_vps" \
  pb_hooks/ root@209.46.123.119:/opt/pocketbase/pb_hooks/

echo "✅ Deployed to https://jumpedia.app"
echo "   PocketBase auto-restarts when hooks change — no manual restart needed."
