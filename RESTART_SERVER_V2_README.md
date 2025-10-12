# 🚀 Модернізований Скрипт Перезапуску Сервера v2.0

## 📋 Зміст

- [Що нового](#що-нового)
- [Встановлення](#встановлення)
- [Використання](#використання)
- [Можливості](#можливості)
- [Приклади](#приклади)
- [Порівняння версій](#порівняння-версій)

---

## 🎉 Що нового

### Версія 2.0 (10.10.2025)

#### ✨ Нові функції:

1. **Підтримка кількох портів**
   - API порт (3010)
   - Web UI порт (4000)
   - Одночасний перезапуск всіх портів (`-a`)

2. **Розширені перевірки**
   - ✅ Health endpoint
   - ✅ Всі веб-інтерфейси (modern.html, index.html, monitor.html, simple.html)
   - ✅ API endpoints (/v1/models, /v1/chat/completions)
   - ✅ Перевірка GPT-5 temperature fix
   - ✅ Статус Token Rotator
   - ✅ Кількість доступних моделей (з jq)

3. **Backup логів**
   - Автоматичне створення backup перед перезапуском
   - Стиснення старих backup-ів (>7 днів)
   - Структурована директорія `logs/backup/`

4. **Поліпшений інтерфейс**
   - 🎨 Кольоровий вивід з emoji
   - 📊 Детальні статуси
   - 🐛 Debug режим
   - 📋 Структуровані заголовки

5. **Режим перевірки**
   - Статус без перезапуску (`-c`)
   - Інформація про процеси
   - Останні логи

6. **Очистка zombie процесів**
   - Автоматичне видалення застарілих процесів node
   - Примусове завершення завислих процесів

---

## 🛠 Встановлення

### Вимоги:

```bash
# macOS
brew install lsof curl node

# Опціонально для розширеного JSON parsing
brew install jq
```

### Встановлення скрипту:

```bash
# Зробити виконуваним
chmod +x restart_server_v2.sh

# Створити необхідні директорії
mkdir -p logs/backup
```

---

## 📖 Використання

### Базовий синтаксис:

```bash
./restart_server_v2.sh [OPTIONS]
```

### Опції:

| Опція | Опис | За замовчуванням |
|-------|------|------------------|
| `-p PORT` | Вказати порт | 4000 |
| `-a` | Перезапустити всі порти (3010 + 4000) | false |
| `-d` | Debug режим з детальними логами | false |
| `-b` | Створити backup логів | false |
| `-c` | Тільки перевірити статус | false |
| `-h` | Показати довідку | - |

---

## 🎯 Можливості

### 1. Базовий перезапуск

```bash
# Web UI на порту 4000
./restart_server_v2.sh
```

**Результат:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 Модернізований перезапуск сервера v2.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Health endpoint OK
✅ Simple Chat OK
✅ Modern Chat (ATLAS) OK
✅ Monitor Dashboard OK
✅ Моделей доступно: 58
✅ GPT-5 temperature fix встановлено
✅ Token Rotator активний (4 токенів)

🎉 Сервер готовий на порту 4000!
```

### 2. Перезапуск API

```bash
# API на порту 3010
./restart_server_v2.sh -p 3010
```

### 3. Перезапуск всіх сервісів

```bash
# API (3010) + Web UI (4000)
./restart_server_v2.sh -a
```

### 4. З backup логів

```bash
# Створити backup перед перезапуском
./restart_server_v2.sh -b
```

**Створює:**
```
logs/backup/server_20251010_161242.log
```

### 5. Debug режим

```bash
# Детальні логи процесу
./restart_server_v2.sh -d
```

**Додатковий вивід:**
```
🐛 [DEBUG] Створюю необхідні директорії
🐛 [DEBUG] Очищую zombie процеси node
🐛 [DEBUG] Шукаю процеси на порту 4000
🐛 [DEBUG] Команда: PORT=4000 node server.js
🐛 [DEBUG] Перевіряю API моделей: http://127.0.0.1:4000/v1/models
```

### 6. Перевірка статусу

```bash
# Тільки перевірка без перезапуску
./restart_server_v2.sh -c
```

**Показує:**
- Працюючі процеси (PID)
- Статуси endpoints
- Інформацію про процес (CPU, MEM, час роботи)
- Останні 10 рядків логів

### 7. Комбіновані опції

```bash
# Backup + Debug
./restart_server_v2.sh -b -d

# Всі порти + Backup
./restart_server_v2.sh -a -b

# Статус всіх портів
./restart_server_v2.sh -a -c
```

---

## 📊 Приклади

### Приклад 1: Щоденний перезапуск

```bash
#!/bin/bash
# daily_restart.sh

# Створення backup та перезапуск
./restart_server_v2.sh -b

# Відправка повідомлення
echo "Сервер перезапущено $(date)" >> logs/restart_history.log
```

### Приклад 2: Перевірка здоров'я

```bash
#!/bin/bash
# health_check.sh

# Перевірити статус
if ! ./restart_server_v2.sh -c > /dev/null 2>&1; then
  echo "⚠️ Сервер не працює, перезапускаю..."
  ./restart_server_v2.sh -b
else
  echo "✅ Сервер працює нормально"
fi
```

### Приклад 3: Cron job

```cron
# Перевірка кожні 30 хвилин
*/30 * * * * cd /path/to/project && ./restart_server_v2.sh -c || ./restart_server_v2.sh -b

# Перезапуск щоночі о 3:00
0 3 * * * cd /path/to/project && ./restart_server_v2.sh -a -b
```

---

## 🔍 Порівняння версій

### v1.0 (restart_server.sh) vs v2.0 (restart_server_v2.sh)

| Функція | v1.0 | v2.0 |
|---------|------|------|
| **Базовий перезапуск** | ✅ | ✅ |
| **Кілька портів** | ❌ | ✅ (3010 + 4000) |
| **Backup логів** | ❌ | ✅ |
| **Debug режим** | ✅ Базовий | ✅ Розширений |
| **Перевірка статусу** | ❌ | ✅ (`-c`) |
| **Кольоровий вивід** | ❌ | ✅ |
| **Перевірка Web UI** | ❌ Simple | ✅ Всі (4 інтерфейси) |
| **API перевірки** | ❌ | ✅ Models, Chat |
| **GPT-5 fix check** | ❌ | ✅ |
| **Token Rotator check** | ❌ | ✅ |
| **Zombie cleanup** | ❌ | ✅ |
| **jq підтримка** | ❌ | ✅ (опціонально) |
| **Структуровані логи** | ❌ | ✅ |

---

## 📈 Перевірки які виконує v2.0

### 1. Веб-інтерфейси ✅

```bash
http://127.0.0.1:4000/simple.html       # Simple Chat
http://127.0.0.1:4000/modern.html       # Modern Chat (ATLAS)
http://127.0.0.1:4000/index.html        # Index Page
http://127.0.0.1:4000/monitor.html      # Monitor Dashboard
```

### 2. API Endpoints ✅

```bash
http://127.0.0.1:4000/health            # Health Check
http://127.0.0.1:4000/v1/models         # Models API
http://127.0.0.1:4000/v1/chat/completions  # Chat API
http://127.0.0.1:4000/v1/simple-chat    # Simple Chat API
```

### 3. Код перевірки ✅

```bash
# GPT-5 temperature fix
grep "!model.toLowerCase().includes('gpt-5')" server.js

# Token Rotator
grep "TOKEN-ROTATOR.*Ініціалізовано" logs/server.log
```

### 4. Кількість моделей ✅

```bash
# З jq
curl -s http://127.0.0.1:4000/v1/models | jq '.data | length'
# Результат: 58+
```

---

## 🐛 Troubleshooting

### Проблема: Порт вже зайнятий

```bash
# Перевірити процеси
lsof -i :4000

# Примусово вбити
./restart_server_v2.sh -d  # Debug покаже що відбувається
```

### Проблема: Сервер не запускається

```bash
# Перевірити логи
tail -f logs/server.log

# Перевірити з debug
./restart_server_v2.sh -d -b
```

### Проблема: Відсутні веб-інтерфейси

```bash
# Перевірити наявність файлів
ls -la public/*.html

# Скрипт покаже попередження
⚠️  Відсутні файли: public/modern.html
```

---

## 📝 Логи

### Структура логів:

```
logs/
├── server.log              # Основний лог
└── backup/
    ├── server_20251010_161242.log
    ├── server_20251010_120000.log.gz  # Старі (>7 днів)
    └── server_20251009_030000.log.gz
```

### Очистка старих логів:

```bash
# Автоматично стискає логи старші 7 днів
find logs/backup -name "server_*.log" -type f -mtime +7 -exec gzip {} \;

# Видалити старі backup-и (>30 днів)
find logs/backup -name "*.log.gz" -type f -mtime +30 -delete
```

---

## 🎨 Кольорові статуси

| Emoji | Колір | Значення |
|-------|-------|----------|
| ✅ | Зелений | Успіх |
| ❌ | Червоний | Помилка |
| ⚠️ | Жовтий | Попередження |
| ℹ️ | Синій | Інформація |
| 🐛 | Фіолетовий | Debug |

---

## 🚀 Швидкий старт

```bash
# 1. Базовий перезапуск з backup
./restart_server_v2.sh -b

# 2. Перевірити що працює
./restart_server_v2.sh -c

# 3. Відкрити веб-інтерфейс
open http://127.0.0.1:4000/modern.html
```

---

## 📞 Підтримка

- Логи: `logs/server.log`
- Backup: `logs/backup/`
- Документація: `RESTART_SERVER_V2_README.md`

---

## 🎯 Версія

**v2.0** - 10.10.2025

Модернізований скрипт з підтримкою:
- Кількох портів
- Backup системи
- Розширених перевірок
- Кольорового інтерфейсу
- Debug режиму
- Перевірки статусу

---

**Happy Restarting! 🚀✨**
