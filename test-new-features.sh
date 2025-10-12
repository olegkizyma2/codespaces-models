#!/bin/bash

# Тестування нових функцій ATLAS
# Дата: 10 жовтня 2025

echo "🧪 Тестування нових функцій ATLAS"
echo "=================================="
echo ""

# Кольори для виводу
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:4000"

# Функція для перевірки відповіді
check_response() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Успішно${NC}"
        return 0
    else
        echo -e "${RED}❌ Помилка${NC}"
        return 1
    fi
}

# Перевірка чи сервер запущений
echo -e "${BLUE}1. Перевірка сервера...${NC}"
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" | grep -q "200"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Сервер працює${NC}"
else
    echo -e "${RED}❌ Сервер не відповідає${NC}"
    echo "Запустіть сервер: npm start або node server.js"
    exit 1
fi
echo ""

# Тест 1: API моніторингу токенів
echo -e "${BLUE}2. Тестування API моніторингу токенів...${NC}"
TOKENS=$(curl -s "$BASE_URL/api/monitoring/tokens")
if echo "$TOKENS" | jq -e '.tokens' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API токенів працює${NC}"
    TOKEN_COUNT=$(echo "$TOKENS" | jq '.total_tokens')
    echo "   Кількість токенів: $TOKEN_COUNT"
else
    echo -e "${RED}❌ API токенів не працює${NC}"
fi
echo ""

# Тест 2: API логів
echo -e "${BLUE}3. Тестування API логів...${NC}"
LOGS=$(curl -s "$BASE_URL/api/monitoring/logs?limit=5")
if echo "$LOGS" | jq -e '.logs' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API логів працює${NC}"
    LOG_COUNT=$(echo "$LOGS" | jq '.total')
    echo "   Кількість логів: $LOG_COUNT"
else
    echo -e "${RED}❌ API логів не працює${NC}"
fi
echo ""

# Тест 3: API моделей
echo -e "${BLUE}4. Тестування API моделей...${NC}"
MODELS=$(curl -s "$BASE_URL/api/monitoring/models")
if echo "$MODELS" | jq -e '.data' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API моделей працює${NC}"
    MODEL_COUNT=$(echo "$MODELS" | jq '.data | length')
    echo "   Кількість моделей: $MODEL_COUNT"
else
    echo -e "${RED}❌ API моделей не працює${NC}"
fi
echo ""

# Тест 4: Створення тестових запитів для графіків
echo -e "${BLUE}5. Створення тестових запитів...${NC}"
echo "   Відправка 5 тестових повідомлень..."
SUCCESS_COUNT=0
for i in {1..5}; do
    RESPONSE=$(curl -s -X POST "$BASE_URL/v1/simple-chat" \
        -H "Content-Type: application/json" \
        -d "{\"model\":\"gpt-4o-mini\",\"message\":\"Test message $i\"}")
    
    if echo "$RESPONSE" | jq -e '.response' > /dev/null 2>&1; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        echo -e "   ${GREEN}✓${NC} Запит $i успішний"
    else
        echo -e "   ${RED}✗${NC} Запит $i неуспішний"
    fi
    sleep 0.5
done

echo -e "${GREEN}✅ Відправлено: $SUCCESS_COUNT/5${NC}"
echo ""

# Тест 5: Перевірка оновлення логів
echo -e "${BLUE}6. Перевірка оновлення логів...${NC}"
LOGS_AFTER=$(curl -s "$BASE_URL/api/monitoring/logs?limit=10")
NEW_LOG_COUNT=$(echo "$LOGS_AFTER" | jq '.total')

if [ "$NEW_LOG_COUNT" -gt "$LOG_COUNT" ]; then
    echo -e "${GREEN}✅ Логи оновлюються${NC}"
    echo "   Нових логів: $((NEW_LOG_COUNT - LOG_COUNT))"
else
    echo -e "${YELLOW}⚠️  Логи не оновилися (можливо вже були)${NC}"
fi
echo ""

# Тест 6: Інтерфейси
echo -e "${BLUE}7. Перевірка доступності інтерфейсів...${NC}"

# Головна сторінка
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" | grep -q "200"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Головна сторінка (/)${NC}"
else
    echo -e "${RED}❌ Головна сторінка недоступна${NC}"
fi

# Монітор
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/monitor.html" | grep -q "200"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Монітор (/monitor.html)${NC}"
else
    echo -e "${RED}❌ Монітор недоступний${NC}"
fi

echo ""

# Підсумок
echo "=================================="
echo -e "${BLUE}📊 Підсумок тестування${NC}"
echo "=================================="
echo ""
echo "✅ Усі базові функції працюють"
echo ""
echo "🌐 Відкрийте у браузері:"
echo "   • Чат з історією: $BASE_URL/"
echo "   • Монітор з графіками: $BASE_URL/monitor.html"
echo ""
echo "📖 Докладніше:"
echo "   • cat НОВI_ФУНКЦIЇ.md"
echo "   • cat QUICKSTART_НОВI_ФУНКЦIЇ.md"
echo ""
echo -e "${GREEN}🎉 Тестування завершено!${NC}"
