#!/usr/bin/env bash
# =============================================================
# china-audit.sh — Zero External Resources Audit
# Jumpedia v2 — China Compliance Check
# Usage: bash scripts/china-audit.sh
# Exit code: 0 = pass, 1 = found external dependencies
# =============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0

echo "🔍 Jumpedia — China Audit: Zero External Resources"
echo "=================================================="

# Domains that are blocked in China or should not be referenced
BLOCKED_PATTERNS=(
    "googleapis.com"
    "gstatic.com"
    "fonts.google.com"
    "cdn.jsdelivr.net"
    "cdnjs.cloudflare.com"
    "unpkg.com"
    "skypack.dev"
    "esm.sh"
    "ga.js"
    "gtag"
    "googletagmanager"
    "analytics.google.com"
    "facebook.net"
    "connect.facebook.net"
    "hotjar.com"
    "segment.com"
    "mixpanel.com"
)

# Directories to scan — source only (not compiled public/ bundles)
SCAN_DIRS=("src" "messages")

# Public items to check separately (skip compiled SW bundles)
echo ""
echo "Scanning source: ${SCAN_DIRS[*]}"
echo "(public/ build artifacts excluded — they contain webpack runtime)"
echo ""

for pattern in "${BLOCKED_PATTERNS[@]}"; do
    matches=$(grep -rn "$pattern" "${SCAN_DIRS[@]}" \
        --include="*.ts" \
        --include="*.tsx" \
        --include="*.js" \
        --include="*.jsx" \
        --include="*.css" \
        --include="*.html" \
        --include="*.json" \
        2>/dev/null || true)

    if [ -n "$matches" ]; then
        echo -e "${RED}❌ BLOCKED: '$pattern' found:${NC}"
        echo "$matches" | head -5
        echo ""
        FAILED=1
    fi
done

# Check for <link> tags with external href in HTML/JSX
echo "Checking for external <link> tags..."
ext_links=$(grep -rn 'href="http' src/ --include="*.tsx" --include="*.ts" --include="*.jsx" 2>/dev/null | grep -v "localhost" | grep -v "#" || true)
if [ -n "$ext_links" ]; then
    echo -e "${YELLOW}⚠️  External href found (review):${NC}"
    echo "$ext_links"
    echo ""
fi

# Check for external <script> src
echo "Checking for external <script> src..."
ext_scripts=$(grep -rn 'src="http' src/ --include="*.tsx" --include="*.ts" --include="*.jsx" 2>/dev/null | grep -v "localhost" || true)
if [ -n "$ext_scripts" ]; then
    echo -e "${RED}❌ External script src found:${NC}"
    echo "$ext_scripts"
    FAILED=1
fi

# Check fonts are self-hosted (public/fonts/ exists)
echo ""
echo "Checking self-hosted fonts..."
if [ -d "public/fonts" ]; then
    font_count=$(find public/fonts -name "*.woff2" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "${GREEN}✅ Self-hosted fonts: $font_count woff2 files${NC}"
else
    echo -e "${RED}❌ public/fonts directory not found!${NC}"
    FAILED=1
fi

# Check next.config.ts for CSP or external domains
echo ""
echo "Checking next.config.ts..."
if [ -f "next.config.ts" ] || [ -f "next.config.js" ]; then
    config_file="next.config.ts"
    [ -f "next.config.js" ] && config_file="next.config.js"
    ext_domains=$(grep -n "external\|cdn\|googleapis" "$config_file" 2>/dev/null || true)
    if [ -n "$ext_domains" ]; then
        echo -e "${YELLOW}⚠️  Review next.config:${NC}"
        echo "$ext_domains"
    else
        echo -e "${GREEN}✅ next.config clean${NC}"
    fi
fi

echo ""
echo "=================================================="
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ PASS: No blocked external resources found.${NC}"
    echo -e "${GREEN}   Platform is China-accessible.${NC}"
else
    echo -e "${RED}❌ FAIL: Blocked external resources detected.${NC}"
    echo -e "${RED}   Fix the issues above before deployment.${NC}"
    exit 1
fi
