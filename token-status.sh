#!/bin/bash

# 🔄 Швидкий довідник команд для системи ротації токенів

echo "🔄 Система автоматичної ротації GitHub токенів"
echo "================================================"
echo ""

# Кольори
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Моніторинг токенів:${NC}"
echo "  curl http://localhost:4000/v1/tokens/stats | jq"
echo ""

echo -e "${BLUE}🔄 Ручна ротація токена:${NC}"
echo "  curl -X POST http://localhost:4000/v1/tokens/rotate | jq"
echo ""

echo -e "${BLUE}🔄 Скидання статистики:${NC}"
echo "  curl -X POST http://localhost:4000/v1/tokens/reset-stats | jq"
echo ""

echo -e "${BLUE}📝 Перегляд логів:${NC}"
echo "  pm2 logs openai-proxy --lines 20"
echo "  pm2 logs openai-proxy --lines 50 | grep TOKEN-ROTATOR"
echo ""

echo -e "${BLUE}🚀 Управління PM2:${NC}"
echo "  pm2 restart openai-proxy"
echo "  pm2 status"
echo "  pm2 monit"
echo ""

echo -e "${BLUE}🧪 Тестування:${NC}"
echo "  node test-token-rotation.mjs"
echo ""

echo -e "${YELLOW}💡 Поточний статус:${NC}"
pm2 status 2>/dev/null | grep openai-proxy || echo "  PM2 не запущено"
echo ""

echo -e "${GREEN}🔍 Статистика токенів:${NC}"
curl -s http://localhost:4000/v1/tokens/stats 2>/dev/null | jq -r '.tokens[] | "  \(.key): активний=\(.isCurrent), блокований=\(.blocked), помилок=\(.failures)"' || echo "  Сервер не доступний"
echo ""

echo -e "${BLUE}📚 Документація:${NC}"
echo "  cat TOKEN_ROTATION.md"
echo "  cat TOKEN_ROTATION_REPORT.md"
echo ""
