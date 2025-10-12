#!/bin/bash

# 🚀 Управління OpenAI Proxy Server з Token Rotation
# Можна запускати з будь-якої папки!

# Шлях до проекту
PROJECT_DIR="/Users/dev/Documents/NIMDA/codespaces-models"
APP_NAME="openai-proxy"

# Кольори
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Функція для виведення статусу
print_status() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Функція для перевірки PM2
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        echo -e "${RED}❌ PM2 не встановлено!${NC}"
        echo "Встановіть: npm install -g pm2"
        exit 1
    fi
}

case "${1:-help}" in
    start)
        print_status "🚀 ЗАПУСК СЕРВЕРА"
        cd "$PROJECT_DIR" || exit 1
        
        # Перевірка чи вже запущено
        if pm2 describe "$APP_NAME" &> /dev/null; then
            echo -e "${YELLOW}⚠️  Сервер вже запущено!${NC}"
            echo "Використайте: $0 restart"
            exit 0
        fi
        
        echo "📂 Директорія: $PROJECT_DIR"
        echo "🔧 Конфігурація: ecosystem.config.cjs"
        echo ""
        
        pm2 start ecosystem.config.cjs
        
        echo ""
        sleep 2
        
        echo -e "${GREEN}✅ Перевірка статусу...${NC}"
        pm2 status | grep "$APP_NAME"
        
        echo ""
        echo -e "${GREEN}📝 Логи запуску:${NC}"
        pm2 logs "$APP_NAME" --lines 5 --nostream
        
        echo ""
        echo -e "${BLUE}💡 Корисні команди:${NC}"
        echo "  $0 status    - Статус сервера"
        echo "  $0 logs      - Логи в реальному часі"
        echo "  $0 tokens    - Статус токенів"
        ;;

    stop)
        print_status "⏹️  ЗУПИНКА СЕРВЕРА"
        cd "$PROJECT_DIR" || exit 1
        pm2 stop "$APP_NAME"
        echo -e "${GREEN}✅ Сервер зупинено${NC}"
        ;;

    restart)
        print_status "🔄 ПЕРЕЗАПУСК СЕРВЕРА"
        cd "$PROJECT_DIR" || exit 1
        
        echo "📂 Директорія: $PROJECT_DIR"
        echo "🔄 Перезапускаємо $APP_NAME..."
        echo ""
        
        pm2 restart "$APP_NAME"
        
        sleep 2
        
        echo ""
        echo -e "${GREEN}✅ Статус після перезапуску:${NC}"
        pm2 status | grep "$APP_NAME"
        
        echo ""
        echo -e "${GREEN}📝 Останні логи:${NC}"
        pm2 logs "$APP_NAME" --lines 10 --nostream | tail -15
        
        echo ""
        echo -e "${GREEN}🔑 Статус токенів:${NC}"
        curl -s http://localhost:4000/v1/tokens/stats 2>/dev/null | jq -r '
            "Активний токен: \(.current_token)",
            "Всього токенів: \(.total_tokens)",
            "",
            (.tokens[] | "  \(if .isCurrent then "🟢" else "⚪" end) \(.key): помилок=\(.failures), блок=\(.blocked)")
        ' || echo "⚠️  API ще не готове, почекайте секунду..."
        ;;

    reload)
        print_status "♻️  ПОВНИЙ ПЕРЕЗАПУСК (з оновленням .env)"
        cd "$PROJECT_DIR" || exit 1
        
        echo "🔄 Зупиняємо сервер..."
        pm2 stop "$APP_NAME" 2>/dev/null || true
        
        echo "🔄 Завантажуємо нову конфігурацію..."
        pm2 start ecosystem.config.cjs
        
        sleep 2
        
        echo ""
        echo -e "${GREEN}✅ Сервер перезапущено з новою конфігурацією${NC}"
        pm2 status | grep "$APP_NAME"
        
        echo ""
        echo -e "${GREEN}🔑 Токени після reload:${NC}"
        pm2 logs "$APP_NAME" --lines 5 --nostream | grep "TOKEN-ROTATOR"
        ;;

    status|s)
        print_status "📊 СТАТУС СИСТЕМИ"
        cd "$PROJECT_DIR" || exit 1
        
        echo -e "${BLUE}PM2 Process:${NC}"
        pm2 status | grep -E "id|$APP_NAME|───"
        
        echo ""
        echo -e "${BLUE}🔑 Токени:${NC}"
        curl -s http://localhost:4000/v1/tokens/stats 2>/dev/null | jq -r '
            "Активний: \(.current_token)",
            "Всього: \(.total_tokens)",
            "",
            "Статус токенів:",
            (.tokens[] | "  \(if .isCurrent then "🟢" else "⚪" end) \(.key)",
             "     Блокований: \(.blocked)",
             "     Помилок: \(.failures)",
             "     Останнє використання: \(.lastUsed // "ніколи")",
             ""
            )
        ' || echo "❌ Сервер не відповідає"
        
        echo ""
        echo -e "${BLUE}💾 Використання ресурсів:${NC}"
        pm2 describe "$APP_NAME" 2>/dev/null | grep -E "memory|cpu|restart" | head -3
        ;;

    logs|l)
        print_status "📝 ЛОГИ В РЕАЛЬНОМУ ЧАСІ"
        cd "$PROJECT_DIR" || exit 1
        echo "Натисніть Ctrl+C для виходу"
        echo ""
        pm2 logs "$APP_NAME"
        ;;

    errors|e)
        print_status "❌ ОСТАННІ ПОМИЛКИ"
        cd "$PROJECT_DIR" || exit 1
        pm2 logs "$APP_NAME" --err --lines 30 --nostream
        ;;

    tokens|t)
        print_status "🔑 СТАТУС ТОКЕНІВ"
        
        echo -e "${BLUE}📊 Детальна статистика:${NC}"
        curl -s http://localhost:4000/v1/tokens/stats | jq '.' || echo "❌ API недоступне"
        
        echo ""
        echo -e "${BLUE}💡 Швидкі дії з токенами:${NC}"
        echo "  curl -X POST http://localhost:4000/v1/tokens/rotate     # Ручна ротація"
        echo "  curl -X POST http://localhost:4000/v1/tokens/reset-stats # Скинути статистику"
        ;;

    flush)
        print_status "🗑️  ОЧИСТКА ЛОГІВ"
        cd "$PROJECT_DIR" || exit 1
        pm2 flush "$APP_NAME"
        echo -e "${GREEN}✅ Логі очищено${NC}"
        ;;

    monit|m)
        print_status "📊 МОНІТОРИНГ PM2"
        cd "$PROJECT_DIR" || exit 1
        echo "Натисніть Ctrl+C для виходу"
        pm2 monit
        ;;

    test)
        print_status "🧪 ТЕСТУВАННЯ СИСТЕМИ"
        cd "$PROJECT_DIR" || exit 1
        
        echo "1️⃣  Перевірка API..."
        if curl -s http://localhost:4000/health &> /dev/null; then
            echo -e "${GREEN}✅ API доступне${NC}"
        else
            echo -e "${RED}❌ API недоступне${NC}"
            exit 1
        fi
        
        echo ""
        echo "2️⃣  Перевірка токенів..."
        tokens=$(curl -s http://localhost:4000/v1/tokens/stats | jq -r '.total_tokens')
        if [ "$tokens" -gt 0 ]; then
            echo -e "${GREEN}✅ Token Rotator працює ($tokens токенів)${NC}"
        else
            echo -e "${RED}❌ Token Rotator не працює${NC}"
        fi
        
        echo ""
        echo "3️⃣  Тестовий запит..."
        response=$(curl -s -X POST http://localhost:4000/v1/chat/completions \
            -H "Content-Type: application/json" \
            -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hi"}],"max_tokens":5}' \
            2>/dev/null)
        
        if echo "$response" | jq -e '.choices' > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Запит успішний${NC}"
        else
            error=$(echo "$response" | jq -r '.error.message // "Unknown"')
            echo -e "${YELLOW}⚠️  Відповідь: $error${NC}"
        fi
        
        echo ""
        echo -e "${GREEN}✅ Тести завершено${NC}"
        ;;

    info|i)
        print_status "ℹ️  ІНФОРМАЦІЯ ПРО СИСТЕМУ"
        echo -e "${BLUE}📂 Директорія:${NC} $PROJECT_DIR"
        echo -e "${BLUE}🔧 Конфігурація:${NC} ecosystem.config.cjs"
        echo -e "${BLUE}📝 Логи:${NC} $PROJECT_DIR/logs/"
        echo -e "${BLUE}🌐 API URL:${NC} http://localhost:4000"
        echo -e "${BLUE}📊 API Endpoints:${NC}"
        echo "  • GET  /v1/tokens/stats"
        echo "  • POST /v1/tokens/rotate"
        echo "  • POST /v1/tokens/reset-stats"
        echo "  • POST /v1/chat/completions"
        echo "  • GET  /v1/models"
        echo ""
        echo -e "${BLUE}📚 Документація:${NC}"
        echo "  • TOKEN_ROTATION.md"
        echo "  • THROTTLING_GUIDE.md"
        echo "  • TOKEN_ROTATION_QUICKSTART.md"
        ;;

    help|h|*)
        cat << 'HELP'

╔════════════════════════════════════════════════════════════════╗
║        🚀 OpenAI Proxy Server - Система Управління            ║
╚════════════════════════════════════════════════════════════════╝

ВИКОРИСТАННЯ: manage-server.sh <команда>

📋 ОСНОВНІ КОМАНДИ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  start          Запустити сервер
  stop           Зупинити сервер
  restart        Перезапустити сервер (швидко)
  reload         Повний перезапуск з оновленням .env
  status, s      Показати статус системи
  
📝 ЛОГИ ТА МОНІТОРИНГ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  logs, l        Логи в реальному часі
  errors, e      Тільки помилки
  flush          Очистити всі логи
  monit, m       PM2 моніторинг (інтерактивний)
  
🔑 ТОКЕНИ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  tokens, t      Статус токенів
  
🧪 ІНШЕ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  test           Запустити тести
  info, i        Інформація про систему
  help, h        Ця довідка

💡 ПРИКЛАДИ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  manage-server.sh start       # Запустити сервер
  manage-server.sh restart     # Перезапустити
  manage-server.sh status      # Статус
  manage-server.sh logs        # Дивитись логи
  manage-server.sh tokens      # Статус токенів

📚 КОЛИ ВИКОРИСТОВУВАТИ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  restart  → Звичайний перезапуск (найчастіше)
  reload   → Після зміни .env або додавання токенів
  flush    → Коли логи занадто великі
  test     → Перевірка після змін

🌐 WEB ІНТЕРФЕЙСИ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  http://localhost:4000         # Головна (Simple Chat)
  http://localhost:4000/monitor # Моніторинг
  http://localhost:4000/classic # Classic UI
  http://localhost:4000/health  # Health check

HELP
        ;;
esac
