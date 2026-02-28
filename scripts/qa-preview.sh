#!/usr/bin/env bash
# qa-preview.sh — Quick smoke test for Jumpedia before deploy
# Run: bash scripts/qa-preview.sh  |  pnpm qa  |  pnpm qa:fast
set -e

echo "🔍 Running QA preview..."

echo ""
echo "1/3 → Type check (tsc --noEmit)"
pnpm type-check

echo ""
echo "2/3 → Unit tests (vitest run)"
pnpm test

echo ""
echo "3/3 → Lint (eslint)"
pnpm lint

echo ""
echo "✅ QA preview passed — safe to deploy"
