#!/bin/bash

# 🔧 Token Rotation - Emergency Commands
# Швидкі команди для вирішення проблем

echo "🆘 Token Rotation - Аварійні команди"
echo "===================================="
echo ""

case "${1:-help}" in
  status|s)
    echo "📊 Поточний статус:"
    pm2 status | grep openai-proxy
    echo ""
    curl -s http://localhost:4000/v1/tokens/stats 2>/dev/null | jq -r '
      "Активний токен: \(.current_token)",
      "Всього токенів: \(.total_tokens)",
      "",
      "Деталі:",
      (.tokens[] | "  \(.key): \(if .isCurrent then "✓ АКТИВНИЙ" else "  неактивний" end) | блок: \(.blocked) | помилок: \(.failures)")
    ' || echo "❌ Сервер не доступний"
    ;;

  rotate|r)
    echo "🔄 Виконую ротацію токена..."
    result=$(curl -s -X POST http://localhost:4000/v1/tokens/rotate 2>/dev/null)
    echo "$result" | jq '.' || echo "❌ Помилка ротації"
    ;;

  reset)
    echo "🔄 Скидаю статистику токенів..."
    curl -s -X POST http://localhost:4000/v1/tokens/reset-stats 2>/dev/null | jq '.'
    echo ""
    echo "✅ Статистику скинуто"
    ;;

  restart)
    echo "🔄 Перезапускаю сервер..."
    pm2 restart openai-proxy
    sleep 3
    echo ""
    echo "📊 Новий статус:"
    pm2 status | grep openai-proxy
    echo ""
    echo "📝 Останні логи:"
    pm2 logs openai-proxy --lines 10 --nostream
    ;;

  logs|l)
    lines="${2:-30}"
    echo "📝 Останні $lines рядків логів:"
    pm2 logs openai-proxy --lines "$lines" --nostream
    ;;

  errors|e)
    echo "❌ Останні помилки 429:"
    pm2 logs openai-proxy --err --lines 50 --nostream | grep -A 5 "429\|TOKEN-ROTATOR" | tail -30
    ;;

  watch|w)
    echo "👁️  Моніторинг токенів (оновлення кожні 5 сек, Ctrl+C для виходу)..."
    echo ""
    while true; do
      clear
      echo "🔄 Token Rotation Monitor - $(date '+%H:%M:%S')"
      echo "=========================================="
      echo ""
      curl -s http://localhost:4000/v1/tokens/stats 2>/dev/null | jq -r '
        "Активний: \(.current_token)",
        "",
        (.tokens[] | "  \(.key):",
         "    Активний: \(.isCurrent)",
         "    Блокований: \(.blocked)",
         "    Помилок: \(.failures)",
         "    Останнє використання: \(.lastUsed // "ніколи")",
         ""
        )
      ' || echo "❌ Сервер не доступний"
      sleep 5
    done
    ;;

  test|t)
    echo "🧪 Тестування системи..."
    echo ""
    echo "1️⃣  Перевірка API..."
    health=$(curl -s http://localhost:4000/health 2>/dev/null)
    if [ -n "$health" ]; then
      echo "✅ API доступне"
    else
      echo "❌ API недоступне"
      exit 1
    fi
    echo ""
    
    echo "2️⃣  Перевірка Token Rotator..."
    tokens=$(curl -s http://localhost:4000/v1/tokens/stats 2>/dev/null | jq -r '.total_tokens')
    if [ "$tokens" -gt 0 ]; then
      echo "✅ Token Rotator активний ($tokens токенів)"
    else
      echo "❌ Token Rotator не працює"
      exit 1
    fi
    echo ""
    
    echo "3️⃣  Тестовий запит..."
    response=$(curl -s -X POST http://localhost:4000/v1/chat/completions \
      -H "Content-Type: application/json" \
      -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hi"}],"max_tokens":5}' \
      2>/dev/null)
    
    if echo "$response" | jq -e '.choices' > /dev/null 2>&1; then
      echo "✅ Запит успішний"
      echo "$response" | jq -r '.choices[0].message.content'
    else
      error=$(echo "$response" | jq -r '.error.message // "Unknown error"')
      echo "⚠️  Помилка: $error"
    fi
    echo ""
    
    echo "✅ Всі тести завершено"
    ;;

  emergency|em)
    echo "🚨 АВАРІЙНИЙ РЕЖИМ"
    echo "=================="
    echo ""
    echo "1. Скидаю статистику токенів..."
    curl -s -X POST http://localhost:4000/v1/tokens/reset-stats 2>/dev/null > /dev/null
    echo "✅ Готово"
    echo ""
    
    echo "2. Перезапускаю сервер..."
    pm2 restart openai-proxy > /dev/null 2>&1
    sleep 3
    echo "✅ Готово"
    echo ""
    
    echo "3. Перевірка статусу..."
    pm2 status | grep openai-proxy
    echo ""
    
    echo "4. Статистика токенів:"
    curl -s http://localhost:4000/v1/tokens/stats 2>/dev/null | jq -r '.tokens[] | "  \(.key): блок=\(.blocked), помилок=\(.failures)"'
    echo ""
    echo "✅ Аварійне відновлення завершено"
    ;;

  help|h|*)
    echo "Використання: $0 <команда>"
    echo ""
    echo "Доступні команди:"
    echo "  status, s        - Поточний статус токенів"
    echo "  rotate, r        - Ручна ротація токена"
    echo "  reset            - Скидання статистики"
    echo "  restart          - Перезапуск сервера"
    echo "  logs, l [N]      - Показати N останніх рядків логів (за замовчуванням 30)"
    echo "  errors, e        - Показати помилки 429"
    echo "  watch, w         - Моніторинг в реальному часі"
    echo "  test, t          - Запустити тести"
    echo "  emergency, em    - Аварійне відновлення"
    echo "  help, h          - Ця довідка"
    echo ""
    echo "Приклади:"
    echo "  $0 status        # Показати статус"
    echo "  $0 rotate        # Переключити токен"
    echo "  $0 logs 50       # Показати 50 рядків логів"
    echo "  $0 watch         # Моніторинг в реальному часі"
    echo "  $0 emergency     # Аварійне відновлення"
    echo ""
    ;;
esac
