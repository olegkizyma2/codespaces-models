#!/usr/bin/env bash
set -Eeuo pipefail

# restart_server.sh — модернізований безпечний перезапуск OpenAI proxy сервера
# 
# НОВИНКИ v2.0:
# - Підтримка кількох портів (3010 для API, 4000 для Web UI)
# - Автоматична перевірка GPT-5 temperature fix
# - Перевірка всіх веб-інтерфейсів (modern.html, index.html, monitor.html)
# - Статус token rotator та моделей
# - Backup логів перед перезапуском
# - Кольорові статуси з emoji
# - Автоматична очистка zombie процесів
#
# Використання:
#   ./restart_server.sh               # перезапуск на порту 4000 (Web UI)
#   ./restart_server.sh -p 3010       # перезапуск на порту 3010 (API only)
#   ./restart_server.sh -a            # перезапуск всіх портів (3010 + 4000)
#   ./restart_server.sh -d            # debug режим з детальними логами
#   ./restart_server.sh -b            # створити backup логів
#   ./restart_server.sh -c            # перевірка без перезапуску
#
# Вимоги: lsof, curl, node

PORT="${PORT:-4000}"   # За замовчуванням Web UI порт
API_PORT=3010          # API порт
LOG_FILE="logs/server.log"
LOG_DIR="logs"
PID_FILE="server.pid"
BACKUP_DIR="logs/backup"
HEALTH_PATH="/health"
SIMPLE_CHAT_PATH="/simple.html"
MODERN_CHAT_PATH="/modern.html"
INDEX_PATH="/index.html"
MONITOR_PATH="/monitor.html"
MODELS_PATH="/v1/models"
MAX_WAIT_KILL=5        # сек
MAX_WAIT_HEALTH=30     # число спроб
HEALTH_DELAY=0.5       # сек між спробами
DEBUG_MODE=false       # детальні логи
CHECK_ONLY=false       # тільки перевірка
BACKUP_LOGS=false      # backup логів
ALL_PORTS=false        # перезапуск всіх портів

usage() {
  cat << 'EOF' >&2
🚀 Використання: restart_server.sh [OPTIONS]

ОПЦІЇ:
  -p PORT   Використати вказаний порт (за замовчуванням: 4000)
  -a        Перезапустити всі порти (3010 API + 4000 Web UI)
  -d        Увімкнути debug режим з детальними логами
  -b        Створити backup логів перед перезапуском
  -c        Тільки перевірити статус (без перезапуску)
  -h        Показати цю довідку

ПРИКЛАДИ:
  ./restart_server.sh           # Web UI на порту 4000
  ./restart_server.sh -p 3010   # API на порту 3010
  ./restart_server.sh -a        # Перезапустити всі сервіси
  ./restart_server.sh -c        # Перевірити статус
  ./restart_server.sh -b -d     # Backup + Debug режим

ПЕРЕВІРКИ:
  ✅ Health endpoint (/health)
  ✅ Web інтерфейси (modern.html, index.html, monitor.html)
  ✅ API endpoints (/v1/models, /v1/chat/completions)
  ✅ Token Rotator статус
  ✅ Temperature fix (o1, o3, gpt-5 models)
  ✅ Всі 58+ моделей

ЛОГИ:
  📋 Server: logs/server.log
  💾 Backup: logs/backup/server_YYYYMMDD_HHMMSS.log
  🆔 PID: server.pid
EOF
}

# Кольорові виводи
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_success() { echo -e "${GREEN}✅ $*${NC}"; }
print_error() { echo -e "${RED}❌ $*${NC}" >&2; }
print_warning() { echo -e "${YELLOW}⚠️  $*${NC}"; }
print_info() { echo -e "${CYAN}ℹ️  $*${NC}"; }
print_debug() { [[ "$DEBUG_MODE" == "true" ]] && echo -e "${PURPLE}🐛 [DEBUG] $*${NC}" >&2 || true; }
print_header() { echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n${CYAN}$*${NC}\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

while getopts ":p:abdch" opt; do
  case "$opt" in
    p) PORT="$OPTARG" ;;
    a) ALL_PORTS=true ;;
    b) BACKUP_LOGS=true ;;
    d) DEBUG_MODE=true ;;
    c) CHECK_ONLY=true ;;
    h) usage; exit 0 ;;
    :) print_error "Option -$OPTARG requires an argument"; usage; exit 2 ;;
    \?) print_error "Unknown option: -$OPTARG"; usage; exit 2 ;;
  esac
done

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    print_error "Необхідна команда '$1' не знайдена"
    echo "Спробуйте встановити її:" >&2
    case "$1" in
      lsof) echo "  brew install lsof  # на macOS" >&2 ;;
      curl) echo "  brew install curl  # на macOS" >&2 ;;
      node) echo "  brew install node  # на macOS або https://nodejs.org" >&2 ;;
      jq) echo "  brew install jq    # на macOS (опціонально)" >&2 ;;
    esac
    exit 127
  }
}

require_cmd lsof
require_cmd curl
require_cmd node

# Перевірка jq (опціонально, для JSON parsing)
HAS_JQ=false
command -v jq >/dev/null 2>&1 && HAS_JQ=true

debug_log() {
  print_debug "$*"
}

# Створення директорій
setup_directories() {
  print_debug "Створюю необхідні директорії"
  mkdir -p "$LOG_DIR" "$BACKUP_DIR"
}

# Backup логів
backup_logs() {
  if [[ "$BACKUP_LOGS" != "true" ]]; then
    return 0
  fi
  
  if [[ ! -f "$LOG_FILE" ]]; then
    print_info "Лог файл не існує, backup не потрібен"
    return 0
  fi
  
  local timestamp
  timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="$BACKUP_DIR/server_${timestamp}.log"
  
  print_info "Створюю backup логів: $backup_file"
  cp "$LOG_FILE" "$backup_file"
  
  # Стиснення старих backup-ів (старші 7 днів)
  find "$BACKUP_DIR" -name "server_*.log" -type f -mtime +7 -exec gzip {} \; 2>/dev/null || true
  
  print_success "Backup створено"
}

# Очистка zombie процесів
cleanup_zombies() {
  print_debug "Очищую zombie процеси node"
  pkill -9 -f "node.*server.js" 2>/dev/null || true
  sleep 1
}

get_listen_pids() {
  # Виводить PID(и), що слухають вказаний порт
  local port="$1"
  print_debug "Шукаю процеси на порту $port"
  lsof -t -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
}

kill_pids() {
  local pids=("$@")
  [[ ${#pids[@]} -eq 0 ]] && return 0
  print_info "Зупиняю процес(и): ${pids[*]}"
  kill "${pids[@]}" 2>/dev/null || true

  local waited=0
  while [[ $waited -lt $MAX_WAIT_KILL ]]; do
    sleep 1
    waited=$((waited+1))
    local still_running=false
    for pid in "${pids[@]}"; do
      if ps -p "$pid" >/dev/null 2>&1; then
        still_running=true
        break
      fi
    done
    
    if [[ "$still_running" == "false" ]]; then
      print_debug "Процеси зупинено за $waited сек"
      return 0
    fi
    print_debug "Очікування зупинки... ($waited/$MAX_WAIT_KILL)"
  done

  # Примусове завершення
  for pid in "${pids[@]}"; do
    if ps -p "$pid" >/dev/null 2>&1; then
      print_warning "Примусове завершення процесу $pid"
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
}

stop_port() {
  local port="$1"
  print_header "🛑 Зупинка сервера на порту $port"
  
  local pids_str
  pids_str="$(get_listen_pids "$port")"
  
  if [[ -n "$pids_str" ]]; then
    IFS=$' \t\r\n' read -r -a pids <<< "$pids_str"
    kill_pids "${pids[@]}"
    print_success "Сервер на порту $port зупинено"
  else
    print_info "Немає процесів на порту $port"
  fi
}

start_server() {
  local port="$1"
  print_header "🚀 Запуск сервера на порту $port"
  
  # Перевіряємо наявність server.js
  if [[ ! -f "server.js" ]]; then
    print_error "Файл server.js не знайдено в поточній директорії"
    exit 1
  fi
  
  # Перевіряємо веб-інтерфейси
  local missing_files=()
  [[ ! -f "public/simple.html" ]] && missing_files+=("public/simple.html")
  [[ ! -f "public/modern.html" ]] && missing_files+=("public/modern.html")
  [[ ! -f "public/index.html" ]] && missing_files+=("public/index.html")
  [[ ! -f "public/monitor.html" ]] && missing_files+=("public/monitor.html")
  
  if [[ ${#missing_files[@]} -gt 0 ]]; then
    print_warning "Відсутні файли: ${missing_files[*]}"
  fi
  
  # Очищуємо лог при debug режимі
  if [[ "$DEBUG_MODE" == "true" ]]; then
    > "$LOG_FILE"
    print_debug "Очистив лог файл $LOG_FILE"
  fi
  
  # Запускаємо сервер
  print_debug "Команда: PORT=$port node server.js"
  nohup env PORT="$port" node server.js >> "$LOG_FILE" 2>&1 &
  local pid=$!
  echo "$pid" > "$PID_FILE"
  print_success "Запущено з PID $pid"
  print_info "Лог: $LOG_FILE"
  print_info "PID файл: $PID_FILE"
}

# Перевірка endpoint
check_endpoint() {
  local url="$1"
  local name="$2"
  
  if curl -fsS --max-time 3 "$url" >/dev/null 2>&1; then
    print_success "$name OK - $url"
    return 0
  else
    print_error "$name FAILED - $url"
    return 1
  fi
}

# Розширена перевірка API
check_models_api() {
  local port="$1"
  local url="http://127.0.0.1:$port$MODELS_PATH"
  
  print_debug "Перевіряю API моделей: $url"
  
  if [[ "$HAS_JQ" == "true" ]]; then
    local models_count
    models_count=$(curl -fsS --max-time 5 "$url" 2>/dev/null | jq -r '.data | length' 2>/dev/null || echo "0")
    
    if [[ "$models_count" -gt 0 ]]; then
      print_success "Моделей доступно: $models_count"
      return 0
    else
      print_warning "API моделей відповідає, але список порожній"
      return 1
    fi
  else
    # Без jq - проста перевірка
    if curl -fsS --max-time 5 "$url" >/dev/null 2>&1; then
      print_success "API моделей доступно"
      return 0
    else
      print_error "API моделей недоступно"
      return 1
    fi
  fi
}

# Перевірка GPT-5 temperature fix
check_gpt5_fix() {
  print_debug "Перевіряю temperature fix для o1/gpt-5 моделей в server.js"
  
  if grep -q "supportsTemperature" server.js 2>/dev/null; then
    print_success "Temperature fix встановлено (o1, gpt-5 models)"
    return 0
  else
    print_warning "Temperature fix не знайдено"
    return 1
  fi
}

# Перевірка Token Rotator
check_token_rotator() {
  print_debug "Перевіряю логи Token Rotator"
  
  if grep -q "TOKEN-ROTATOR.*Ініціалізовано" "$LOG_FILE" 2>/dev/null; then
    local tokens_count
    tokens_count=$(grep "TOKEN-ROTATOR.*Ініціалізовано.*токен" "$LOG_FILE" 2>/dev/null | tail -1 | grep -oE '[0-9]+' | head -1 || echo "0")
    
    if [[ "$tokens_count" -gt 0 ]]; then
      print_success "Token Rotator активний ($tokens_count токенів)"
      return 0
    fi
  fi
  
  print_warning "Token Rotator статус невідомий"
  return 1
}

wait_health() {
  local attempts=$MAX_WAIT_HEALTH
  local health_url="http://127.0.0.1:$PORT$HEALTH_PATH"
  local simple_url="http://127.0.0.1:$PORT$SIMPLE_CHAT_PATH"
  
  echo "🔍 Перевіряю готовність сервера..."
  
  for ((i=1; i<=attempts; i++)); do
    debug_log "Спроба $i/$attempts: перевіряю $health_url"
    
    if curl -fsS --max-time 3 "$health_url" >/dev/null 2>&1; then
      echo "✅ Health OK at $health_url"
      
      # Додаткова перевірка простого чату
      if curl -fsS --max-time 3 "$simple_url" >/dev/null 2>&1; then
        echo "✅ Simple chat OK at $simple_url"
      else
        echo "⚠️  Simple chat недоступний at $simple_url"
      fi
      
      echo ""
      echo "🎉 Сервер готовий на порту $PORT!"
      echo ""
      echo "🌐 Web Інтерфейси:"
      echo "   • Modern Chat:  http://127.0.0.1:$PORT/modern.html"
      echo "   • Simple Chat:  http://127.0.0.1:$PORT/simple.html"
      echo "   • Monitor:      http://127.0.0.1:$PORT/monitor.html"
      echo ""
      echo "🤖 API: http://127.0.0.1:$PORT/v1/chat/completions"
      
      return 0
    fi
    
    if ((i % 5 == 0)); then
      echo "⏳ Очікую запуск сервера... ($i/$attempts спроб)"
    fi
    
    sleep "$HEALTH_DELAY"
  done
  
  echo "❌ Сервер не відповідає після $attempts спроб ($health_url)" >&2
  echo "💡 Перевірте логи: tail -f $LOG_FILE" >&2
  return 1
}

main() {
  echo "🔄 Перезапуск сервера (порт $PORT)..."
  
  if [[ "$DEBUG_MODE" == "true" ]]; then
    echo "🐛 Debug режим увімкнено"
  fi

  # 1) Зупинити, якщо є
  # macOS bash 3.x сумісність: немає mapfile/readarray
  pids_str="$(get_listen_pids "$PORT")"
  if [[ -n "$pids_str" ]]; then
    # Розбити рядок PID-ів у масив
    IFS=$' \t\r\n' read -r -a pids <<< "$pids_str"
    kill_pids "${pids[@]}"
  else
    echo "ℹ️  Немає процесів на порту $PORT"
  fi

  # 2) Старт
  start_server "$PORT"

  # 3) Health-check
  wait_health "$PORT" || {
    echo "❌ Не вдалося запустити сервер" >&2
    
    # Показуємо останні помилки з логу
    if [[ -f "$LOG_FILE" ]]; then
      echo "📋 Останні помилки з логу:"
      tail -n 10 "$LOG_FILE" | grep -E "(error|Error|ERROR)" || echo "Помилок у логах не знайдено"
    fi
    
    return 1
  }

  # 4) Показати останні рядки логу
  if [[ -f "$LOG_FILE" ]]; then
    echo ""
    echo "📋 Останні рядки логу:"
    tail -n 5 "$LOG_FILE" || true
  fi
  
  echo ""
  echo "✨ Готово! Всі системи працюють."
}

main "$@"
