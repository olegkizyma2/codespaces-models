# 🤖 AI Chat - Makefile та глобальна команда

Простий спосіб запуску чату з 24 AI моделями з будь-якої папки в терміналі.

## 🚀 Швидкий старт

### Локальне використання (з папки проекту)
```bash
# Показати довідку
make help

# Запустити чат сервер
make chat

# Запустити на іншому порту
make chat PORT=3011

# Перевірити статус
make status

# Показати логи
make logs

# Тестувати API
make test

# Зупинити сервер
make stop

# Перезапустити
make restart

# Запустити ngrok для публічного доступу
make ngrok

# Зупинити ngrok
make ngrok-stop

# Перевірити статус ngrok
make ngrok-status

# Показати публічний URL ngrok
make ngrok-url
```

### Глобальна команда (з будь-якої папки)
```bash
# Встановити глобально
make install

# Тепер можна використовувати з будь-якої папки:
cd /tmp
aichat              # запустити чат
aichat status       # перевірити статус
aichat stop         # зупинити
aichat test         # тестувати API
aichat help         # повна довідка
```

## 📋 Доступні команди

| Команда | Опис |
|---------|------|
| `make chat` або `aichat` | Запустити чат сервер (порт 3010) |
| `make chat PORT=N` або `aichat PORT=N` | Запустити на вказаному порту |
| `make stop` або `aichat stop` | Зупинити сервер |
| `make restart` або `aichat restart` | Перезапустити сервер |
| `make status` або `aichat status` | Перевірити статус сервера |
| `make logs` або `aichat logs` | Показати логи сервера |
| `make test` або `aichat test` | Швидкий тест API |
| `make models` | Показати список доступних AI моделей |
| `make ngrok` | Запустити ngrok тунель для публічного доступу |
| `make ngrok-stop` | Зупинити ngrok тунель |
| `make ngrok-status` | Перевірити статус ngrok |
| `make ngrok-url` | Показати публічний URL ngrok |
| `make install` | Встановити глобальну команду `aichat` |
| `make clean` або `aichat clean` | Очистити тимчасові файли |
| `make help` або `aichat help` | Показати довідку |

## 🤖 Підтримувані AI моделі

- **🤖 OpenAI**: gpt-4o, gpt-4o-mini
- **🏢 Microsoft**: phi-3-mini-4k, phi-3-medium-4k, phi-3-medium-128k, phi-3.5-mini-instruct
- **📚 AI21**: jamba-1.5-mini, jamba-1.5-large, jamba-instruct
- **🔄 Cohere**: command-r, command-r-plus
- **🦙 Meta**: llama-3.1-405b-instruct, llama-3.1-70b-instruct, llama-3.1-8b-instruct, llama-3.2-11b-vision-instruct, llama-3.2-90b-vision-instruct
- **🌟 Mistral**: mistral-large-2407, mistral-nemo, mistral-small

## 🌐 Веб інтерфейс

Після запуску сервера, відкрийте в браузері:
- **Простий чат**: http://127.0.0.1:3010
- **Health check**: http://127.0.0.1:3010/health

## 🎯 Приклади використання

### Локальний розробник
```bash
cd ~/my-project
make chat          # запуск з папки проекту
```

### Глобальне використання
```bash
cd /any/folder
aichat             # запуск з будь-якої папки
aichat PORT=3011   # на іншому порту
aichat test        # швидкий тест
```

### API тестування
```bash
# Через Makefile
make test

# Через глобальну команду
aichat test

# Ручний тест
curl -X POST http://127.0.0.1:3010/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Привіт!"}], "model":"gpt-4o-mini"}'
```

## 🔧 Налаштування

### Змінити шлях для глобальної команди
Відредагуйте файл `/usr/local/bin/aichat` та змініть `CHAT_PROJECT_DIR`:

```bash
sudo nano /usr/local/bin/aichat
# Змініть: CHAT_PROJECT_DIR="/your/new/path"
```

### Видалити глобальну команду
```bash
sudo rm /usr/local/bin/aichat
```

## 🛠 Вимоги

- **Node.js** - для сервера
- **lsof** - для перевірки портів
- **curl** - для health checks та тестів
- **make** - для запуску команд Makefile

### Встановлення на macOS
```bash
# Через Homebrew
brew install node lsof curl make

# Node.js також можна встановити з https://nodejs.org
```

## 📝 Логи та відлагодження

```bash
# Показати логи
aichat logs

# Детальні логи
tail -f server.log

# Перевірити процеси
aichat status

# Очистити тимчасові файли
aichat clean
```

## ✨ Особливості

- 🚀 **Швидкий запуск** - одна команда для запуску
- 🌐 **Глобальний доступ** - працює з будь-якої папки
- 🎯 **Автоматичні перевірки** - health checks та dependency checks
- 🔍 **Відлагодження** - детальні логи та статуси
- 🛑 **Безпечне зупинення** - правильне завершення процесів
- 🎨 **Кольоровий вивід** - зручне читання в терміналі

## 🌐 Ngrok - публічний доступ

Ngrok дозволяє зробити ваш локальний чат доступним через інтернет за допомогою HTTPS тунелю.

### Команди ngrok

```bash
# Запустити ngrok тунель
make ngrok

# Перевірити статус ngrok
make ngrok-status  

# Показати публічний URL
make ngrok-url

# Зупинити ngrok
make ngrok-stop
```

### Приклад використання

```bash
# 1. Запустити локальний сервер
make chat

# 2. Запустити ngrok тунель
make ngrok

# 3. Отримати публічний URL
make ngrok-url
# Виведе: 🌐 Публічний URL: https://abc123.ngrok-free.app

# 4. Тепер ваш чат доступний в інтернеті!
# Відкрийте URL в браузері або поділіться з іншими
```

### Особливості ngrok

- 🔒 **HTTPS за замовчуванням** - безпечне з'єднання
- 🌍 **Глобальний доступ** - доступ з будь-якого місця
- 📊 **Web interface** - огляд запитів на http://127.0.0.1:4040
- 🚀 **Швидке налаштування** - одна команда для запуску
- 🔄 **Автоматичне керування** - правильне створення та зупинення тунелів

### Вимоги для ngrok

- Встановлений [ngrok](https://ngrok.com/download)
- Реєстрація на ngrok.com (для стабільних URL)
- Налаштований authtoken (опціонально)

```bash
# Встановити ngrok на macOS
brew install ngrok

# Додати authtoken (після реєстрації на ngrok.com)  
ngrok authtoken YOUR_TOKEN
```
