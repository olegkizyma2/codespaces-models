#!/bin/bash

# GitHub Copilot OAuth Test Script
# Тестує OAuth flow через API endpoints

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║         GitHub Copilot OAuth Flow Test                        ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:4000"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Тест 1: Перевірка доступності endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test status endpoint
echo -n "Тестування GET /api/copilot/auth/status... "
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/copilot/auth/status")
if [ "$STATUS_CODE" = "200" ]; then
    echo -e "${GREEN}✅ OK${NC} (HTTP $STATUS_CODE)"
else
    echo -e "${RED}❌ FAIL${NC} (HTTP $STATUS_CODE)"
    exit 1
fi

# Test web UI
echo -n "Тестування Web UI /copilot-auth.html... "
UI_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/copilot-auth.html")
if [ "$UI_CODE" = "200" ]; then
    echo -e "${GREEN}✅ OK${NC} (HTTP $UI_CODE)"
else
    echo -e "${RED}❌ FAIL${NC} (HTTP $UI_CODE)"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Тест 2: Запуск OAuth flow"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Start OAuth
echo "Запускаємо OAuth flow..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/copilot/auth/start" \
  -H "Content-Type: application/json")

# Check for error
ERROR=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('error', ''))" 2>/dev/null)

if [ ! -z "$ERROR" ]; then
    echo -e "${RED}❌ Помилка при старті OAuth:${NC}"
    echo "$ERROR"
    exit 1
fi

# Extract data
USER_CODE=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('userCode', 'N/A'))")
VERIFICATION_URI=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('verificationUri', 'N/A'))")
STATUS=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('status', 'N/A'))")

echo -e "${GREEN}✅ OAuth flow запущено${NC}"
echo ""
echo "   📝 User Code: ${YELLOW}$USER_CODE${NC}"
echo "   🔗 URL: $VERIFICATION_URI"
echo "   📊 Status: $STATUS"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏳ Тест 3: Перевірка статусу"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

sleep 2

# Check status
STATUS_RESPONSE=$(curl -s "$BASE_URL/api/copilot/auth/status")
CURRENT_STATUS=$(echo "$STATUS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('status', 'unknown'))")

echo "Поточний статус: ${YELLOW}$CURRENT_STATUS${NC}"

if [ "$CURRENT_STATUS" = "pending" ]; then
    echo -e "${YELLOW}⏳ Очікується авторизація користувача${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📱 Наступні кроки:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "   1. Відкрийте: ${GREEN}$VERIFICATION_URI${NC}"
    echo "   2. Введіть код: ${YELLOW}$USER_CODE${NC}"
    echo "   3. Підтвердіть доступ до GitHub Copilot"
    echo ""
    echo "   Альтернативно:"
    echo "   - Відкрийте Web UI: ${GREEN}$BASE_URL/copilot-auth.html${NC}"
    echo ""
elif [ "$CURRENT_STATUS" = "authorized" ]; then
    echo -e "${GREEN}✅ Авторизація успішна!${NC}"
    AUTHORIZED_AT=$(echo "$STATUS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('authorizedAt', 'N/A'))")
    echo "   Час: $AUTHORIZED_AT"
elif [ "$CURRENT_STATUS" = "error" ]; then
    echo -e "${RED}❌ Помилка авторизації${NC}"
    ERROR_MSG=$(echo "$STATUS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('error', 'Unknown error'))")
    echo "   $ERROR_MSG"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Всі тести пройдено успішно!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
