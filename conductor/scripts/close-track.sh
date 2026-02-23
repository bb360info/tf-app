#!/usr/bin/env bash
set -e

# close-track.sh
# Вычисляет следующий minor tag (например 0.1.0 -> 0.2.0)
# Читает активный трек из tracks.md
# Обновляет CHANGELOG.md и tracks.md

cd "$(dirname "$0")/../.." || exit 1

# 1. Поиск последней версии в CHANGELOG.md
LAST_VERSION=$(grep -E '^## \[([0-9]+\.[0-9]+\.[0-9]+)\]' CHANGELOG.md | head -n 1 | sed -E 's/## \[([0-9]+\.[0-9]+\.[0-9]+)\].*/\1/')

if [ -z "$LAST_VERSION" ]; then
    NEXT_VERSION="0.1.0"
else
    # Увеличиваем minor версию (e.g. 0.1.0 -> 0.2.0)
    MAJOR=$(echo "$LAST_VERSION" | cut -d. -f1)
    MINOR=$(echo "$LAST_VERSION" | cut -d. -f2)
    NEXT_VERSION="${MAJOR}.$((MINOR + 1)).0"
fi

# 2. Поиск активного трека в tracks.md
ACTIVE_TRACK_LINE=$(grep '🔵 Active' conductor/tracks.md || true)

if [ -z "$ACTIVE_TRACK_LINE" ]; then
    echo "⚠️ Не найден активный трек (🔵 Active) в conductor/tracks.md"
    echo "Использую 'Manual Updates' как название."
    TRACK_NAME="Manual Updates"
else
    # Строка вида: | 🔵 Active | 4.19 | Coach-Athlete Interaction...
    TRACK_HINT=$(echo "$ACTIVE_TRACK_LINE" | awk -F'|' '{print $3 "|" $4}' | sed -E 's/^[ \t]+|[ \t]+$//g')
    NUM=$(echo "$TRACK_HINT" | awk -F'|' '{print $1}' | sed 's/ //g')
    TITLE=$(echo "$TRACK_HINT" | awk -F'|' '{print $2}' | sed -E 's/^[ \t]+|[ \t]+$//g')
    TRACK_NAME="Track $NUM: $TITLE"
fi

TODAY=$(date "+%Y-%m-%d")
NEW_HEADER="## [$NEXT_VERSION] — $TODAY — $TRACK_NAME"

echo "📦 Переводим [Unreleased] в $NEW_HEADER..."

# 3. Обновление CHANGELOG.md
SED_INPLACE=(-i '')
if ! sed --version >/dev/null 2>&1 | grep -q GNU; then
  # macOS
  sed -i '' "s|^## \[Unreleased\]|## [Unreleased]\n\n$NEW_HEADER|" CHANGELOG.md
else
  # Linux
  sed -i "s|^## \[Unreleased\]|## [Unreleased]\n\n$NEW_HEADER|" CHANGELOG.md
fi

# 4. Обновление tracks.md (🔵 Active -> 🟢 Done)
if [ -n "$ACTIVE_TRACK_LINE" ]; then
    echo "✅ Помечаем трек как Done в tracks.md"
    if ! sed --version >/dev/null 2>&1 | grep -q GNU; then
        sed -i '' 's/🔵 Active/🟢 Done/g' conductor/tracks.md
    else
        sed -i 's/🔵 Active/🟢 Done/g' conductor/tracks.md
    fi
fi

# 5. Git Tag
echo "🔖 Создаем git tag v$NEXT_VERSION"
git tag "v$NEXT_VERSION" || true

echo "🎉 Трек успешно закрыт!"
