# 🛠️ Development Tools

Набір зручних інструментів для розробки та тестування моделей OpenAI LLM Proxy.

## 🚀 Швидкий старт

```bash
# Налаштування середовища
./tools.sh setup

# Запуск сервера
./tools.sh start

# Тестування моделей
./tools.sh test
```

## 📋 Доступні інструменти

### 1. `tools.sh` - Головний інструмент управління

```bash
# Управління сервером
./tools.sh start        # Запустити сервер
./tools.sh stop         # Зупинити сервер  
./tools.sh status       # Статус сервера

# Тестування
./tools.sh test         # Інтерактивне тестування
./tools.sh benchmark    # Бенчмарк всіх моделей
./tools.sh health       # Перевірка здоров'я

# Розробка
./tools.sh generate     # Генерація прикладів коду
./tools.sh setup        # Початкове налаштування
```

### 2. `code-generator.mjs` - Генератор коду

Створює готові приклади для різних мов програмування:

```bash
# Генерація всіх прикладів
node code-generator.mjs

# Конкретний приклад
node code-generator.mjs basic js gpt-4o-mini "Explain AI"
```

**Згенеровані файли:**
- `generated-examples/js/basic-chat.mjs` - Базовий JavaScript чат
- `generated-examples/js/interactive-chat.mjs` - Інтерактивний чат
- `generated-examples/python/basic_chat.py` - Python приклад
- `generated-examples/shell/basic-test.sh` - Shell скрипт

### 3. `quick-test.mjs` - Швидке тестування

Інтерактивний інструмент для тестування моделей:

```bash
# Інтерактивний режим
node quick-test.mjs

# Бенчмарк
node quick-test.mjs --benchmark
```

**Можливості:**
- Вибір моделі зі списку
- Готові промпти для тестування
- Вимірювання швидкості відповіді
- Підрахунок токенів

### 4. `model-helper.mjs` - Допоміжник конфігурації

Допомагає налаштувати та перевірити моделі:

```bash
# Перевірка здоров'я
node model-helper.mjs health

# Список доступних моделей
node model-helper.mjs models

# Тест конкретної моделі
node model-helper.mjs test gpt-4o-mini "Hello world"

# Генерація конфігурації
node model-helper.mjs config
```

## 📦 NPM скрипти

Додані зручні NPM команди:

```bash
npm start           # Запуск сервера
npm run test        # Швидке тестування
npm run benchmark   # Бенчмарк
npm run health      # Перевірка здоров'я
npm run generate    # Генерація прикладів
npm run models      # Список моделей
npm run setup       # Налаштування
```

## 🎯 Типові сценарії використання

### Початкове налаштування
```bash
git clone https://github.com/olegkizyma/codespaces-models.git
cd codespaces-models
npm install
./tools.sh setup
```

### Розробка нових функцій
```bash
# Запустити сервер
./tools.sh start

# Згенерувати приклади
./tools.sh generate

# Протестувати зміни
./tools.sh test
```

### Тестування продуктивності
```bash
# Перевірка системи
./tools.sh health

# Бенчмарк всіх моделей
./tools.sh benchmark
```

### Створення власних прикладів
```bash
# Базовий приклад JavaScript
node code-generator.mjs basic js gpt-4o-mini "My custom prompt"

# Python приклад
node code-generator.mjs basic python gpt-4o "Analyze this data"
```

## 🔧 Конфігурація

Конфігурація зберігається в файлі `model-config.json`:

```json
{
  "server": {
    "port": 3010,
    "host": "localhost"
  },
  "models": {
    "enabled": ["gpt-4o-mini", "gpt-4o"],
    "default": "gpt-4o-mini"
  },
  "api": {
    "timeout": 30000,
    "retries": 3
  }
}
```

## 📊 Доступні моделі

- **gpt-4o-mini** - Швидка і економічна модель
- **gpt-4o** - Найпотужніша модель GPT-4
- **Phi-3.5-mini-instruct** - Компактна модель Microsoft
- **AI21-Jamba-1.5-Large** - Велика модель AI21
- **Meta-Llama-3.1-405B-Instruct** - Модель Meta LLaMA
- **Cohere-command-r-plus** - Модель Cohere

## 🐛 Усунення проблем

### Сервер не запускається
```bash
# Перевірити порт
lsof -i :3010

# Перезапустити
./tools.sh stop
./tools.sh start
```

### Помилки при тестуванні
```bash
# Перевірка здоров'я системи
./tools.sh health

# Перевірка конкретної моделі
node model-helper.mjs test gpt-4o-mini "test"
```

### Проблеми з залежностями
```bash
# Переустановка
rm -rf node_modules package-lock.json
npm install
./tools.sh setup
```

## 🎉 Що нового

- ✅ Інтерактивне тестування моделей
- ✅ Автоматична генерація прикладів коду
- ✅ Бенчмарк продуктивності
- ✅ Перевірка здоров'я системи
- ✅ Зручні NPM скрипти
- ✅ Налаштування через конфігурацію

---

Створено для проекту [codespaces-models](https://github.com/olegkizyma/codespaces-models)
