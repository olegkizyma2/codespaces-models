# 🌐 Глобальні команди AI Chat Server

Після встановлення ви можете використовувати AI Chat Server з будь-якої директорії в системі.

## 🚀 Встановлення

```bash
# Встановити всі глобальні команди разом
make install-all

# Або встановити окремо:
make install        # aichat - повний режим
make install-openai # ai-openai - строгий OpenAI API
make install-stop   # ai-stop - зупинення
```

## 📋 Доступні глобальні команди

### `aichat`
Запускає повнофункціональний чат-сервер з веб-інтерфейсом та TTS
```bash
# З будь-якої директорії
cd ~/Desktop
aichat

# На іншому порту
aichat PORT=3020
```

### `ai-openai`
Запускає строгий OpenAI API без додаткових сервісів (TTS, веб-інтерфейс)
```bash
# З будь-якої директорії
cd /var/log
ai-openai

# Доступні тільки:
# GET /v1/models
# POST /v1/chat/completions  
# GET /health
```

### `ai-stop`
Зупиняє AI сервер з будь-якої директорії
```bash
# Зупинити з будь-якого місця
cd ~/Documents/some-project
ai-stop
```

## 🎯 Приклад використання

```bash
# Запуск API з робочої директорії проекту
cd ~/work/my-ai-project
ai-openai

# Тестування API з тієї ж директорії
curl -X POST "http://127.0.0.1:3010/v1/chat/completions" \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Hello!"}], "model":"gpt-4o-mini"}'

# Зупинення після роботи
ai-stop
```

## 🔧 Технічні деталі

- Всі команди встановлюються в `/usr/local/bin/`
- Вони автоматично переходять в правильну директорію AI Chat Server
- Всі параметри і змінні середовища передаються коректно
- Команди працюють незалежно від поточного робочого каталогу

## 📍 Розташування файлів

- AI Chat Server: `/Users/dev/Documents/NIMDA/codespaces-models`
- Глобальні команди: `/usr/local/bin/ai*` та `/usr/local/bin/aichat`
- Логи завжди в: `/Users/dev/Documents/NIMDA/codespaces-models/server.log`

## 🚫 Видалення

```bash
sudo rm /usr/local/bin/aichat
sudo rm /usr/local/bin/ai-openai  
sudo rm /usr/local/bin/ai-stop
```
