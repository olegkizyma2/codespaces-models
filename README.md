# 🚀 OpenAI LLM Proxy Server with GitHub Models

Повнофункціональний проксі-сервер для роботи з LLM моделями через GitHub Models API з підтримкою стандартного OpenAI API та розширеними можливостями моніторингу.

## ✨ Основні функції

### �� Множинні інтерфейси
- **Стандартний OpenAI API** - повна сумісність з екосистемою OpenAI
- **Розширений JSON API** - додаткові можливості та налаштування
- **Простий Chat API** - легкий у використанні інтерфейс
- **Web UI** - інтерактивний веб-інтерфейс для тестування

### 🧠 Підтримувані моделі (58 моделей з GitHub Models API)

#### 📋 Повний список моделей для тестування:

1. `ai21-labs/ai21-jamba-1.5-large`
2. `ai21-labs/ai21-jamba-1.5-mini`
3. `cohere/cohere-command-a`
4. `cohere/cohere-command-r-08-2024`
5. `cohere/cohere-command-r-plus-08-2024`
6. `cohere/cohere-embed-v3-english`
7. `cohere/cohere-embed-v3-multilingual`
8. `core42/jais-30b-chat`
9. `deepseek/deepseek-r1`
10. `deepseek/deepseek-r1-0528`
11. `deepseek/deepseek-v3-0324`
12. `meta/llama-3.2-11b-vision-instruct`
13. `meta/llama-3.2-90b-vision-instruct`
14. `meta/llama-3.3-70b-instruct`
15. `meta/llama-4-maverick-17b-128e-instruct-fp8`
16. `meta/llama-4-scout-17b-16e-instruct`
17. `meta/meta-llama-3.1-405b-instruct`
18. `meta/meta-llama-3.1-8b-instruct`
19. `microsoft/mai-ds-r1`
20. `microsoft/phi-3-medium-128k-instruct`
21. `microsoft/phi-3-medium-4k-instruct`
22. `microsoft/phi-3-mini-128k-instruct`
23. `microsoft/phi-3-mini-4k-instruct`
24. `microsoft/phi-3-small-128k-instruct`
25. `microsoft/phi-3-small-8k-instruct`
26. `microsoft/phi-3.5-mini-instruct`
27. `microsoft/phi-3.5-moe-instruct`
28. `microsoft/phi-3.5-vision-instruct`
29. `microsoft/phi-4`
30. `microsoft/phi-4-mini-instruct`
31. `microsoft/phi-4-mini-reasoning`
32. `microsoft/phi-4-multimodal-instruct`
33. `microsoft/phi-4-reasoning`
34. `mistral-ai/codestral-2501`
35. `mistral-ai/ministral-3b`
36. `mistral-ai/mistral-large-2411`
37. `mistral-ai/mistral-medium-2505`
38. `mistral-ai/mistral-nemo`
39. `mistral-ai/mistral-small-2503`
40. `openai/gpt-4.1`
41. `openai/gpt-4.1-mini`
42. `openai/gpt-4.1-nano`
43. `openai/gpt-4o`
44. `openai/gpt-4o-mini`
45. `openai/gpt-5`
46. `openai/gpt-5-chat`
47. `openai/gpt-5-mini`
48. `openai/gpt-5-nano`
49. `openai/o1`
50. `openai/o1-mini`
51. `openai/o1-preview`
52. `openai/o3`
53. `openai/o3-mini`
54. `openai/o4-mini`
55. `openai/text-embedding-3-large`
56. `openai/text-embedding-3-small`
57. `xai/grok-3`
58. `xai/grok-3-mini`

**🧪 Статус тестування:**
- ✅ Протестовані: `openai/gpt-4.1`, `xai/grok-3`, `deepseek/deepseek-r1`, `microsoft/phi-4`
- ❌ Не працюють: `openai/gpt-5`
- 🔄 Решта 53 моделі потребують тестування

### 📊 Моніторинг та аналітика
- **Статистика використання** - детальна інформація по кожній моделі
- **Перевірка лімітів контексту** - автоматична валідація розміру тексту
- **Рекомендації моделей** - AI-підбір оптимальної моделі для завдання
- **Відстеження помилок** - автоматичне логування та аналіз помилок
- **Метрики продуктивності** - швидкість, ефективність, використання токенів

### ⚙️ Контроль одночасності та лімітів (нове)
Вбудовані механізми для стабільності під навантаженням:

| Механізм | ENV | Значення за замовчуванням | Опис |
|----------|-----|---------------------------|------|
| Rate limiting | RATE_LIMIT_ENABLED | 1 | Увімкнення ліміту запитів |
| Ліміт запитів/хв | RATE_LIMIT_PER_MINUTE | 30 | Оптимізовано під 20–30 реальних req/min (налаштовується) |
| Конкурентність | UPSTREAM_CONCURRENCY_ENABLED | 1 | Увімкнення контролю одночасності |
| Максимум одночасно | UPSTREAM_MAX_CONCURRENT | 5 | Паралельні виклики до апстріму |
| Розмір черги | UPSTREAM_QUEUE_MAX | 50 | Очікування понад активні слоти |
| Тайм-аут очікування | UPSTREAM_QUEUE_TIMEOUT_MS | 30000 | Скидання очікування |

Заголовки відповіді:
```
X-Upstream-Active: кількість поточних апстрім викликів
X-Upstream-Queue: довжина черги очікування
```

Приклад запуску з іншими параметрами:
```bash
RATE_LIMIT_PER_MINUTE=20 UPSTREAM_MAX_CONCURRENT=8 node server.js
```

План подальших покращень:
 - Персистентна черга (Redis/BullMQ)
 - Метрики p95/p99
 - Prometheus endpoint
 - Адаптивний backoff

### 📈 Метрики та Prometheus (нове)
Вбудований endpoint для моніторингу в форматі Prometheus.

| Тип | Назва | Опис |
|-----|-------|------|
| counter | http_requests_total | Кількість HTTP запитів (labels: method, path, status) |
| counter | http_errors_total | 5xx відповіді |
| counter | rate_limit_exceeded_total | Заблоковані rate limiting запити |
| gauge | upstream_active_current | Активні апстрім виклики зараз |
| gauge | upstream_queue_length | Довжина черги очікування |
| histogram | http_request_duration_seconds | Розподіл часу відповіді |
| gauge | process_resident_memory_bytes | Пам'ять процесу |
| gauge | process_uptime_seconds | Аптайм процесу |
| gauge | nodejs_active_handles | Активні дескриптори (I/O) |

### 🛡️ Watchdog / Автовідновлення
Скрипт `watchdog.sh` забезпечує автоматичний перезапуск при падінні та health‑перевірку.

```bash
./watchdog.sh                # моніторинг порту 3010 кожні 10с
PORT=3011 INTERVAL=5 ./watchdog.sh &   # інший порт + фоновий режим
```

Параметри (ENV):
- PORT (3010) – порт сервера
- INTERVAL (10) – період health‑check сек
- RESTART_DELAY (2) – пауза перед перевіркою після рестарту
- MAX_RESTARTS_MIN (10) – обмеження рестартів за хвилину

Логи в `watchdog.log`. Для production краще використати systemd / pm2, але цей варіант мінімальний і самодостатній.

ENV змінні:

| ENV | Значення за замовчуванням | Опис |
|-----|---------------------------|------|
| METRICS_ENABLED | 1 | Увімкнення експорту метрик |
| METRICS_PATH | /metrics | Шлях endpoint'а |

Приклад збору через curl:
```bash
curl -s http://localhost:3010/metrics | head -n 40
```

Приклад Prometheus scrape-конфігурації:
```yaml
scrape_configs:
  - job_name: 'codespaces-models'
    static_configs:
      - targets: ['localhost:3010']
    metrics_path: /metrics
    scrape_interval: 15s
```

План покращень метрик:
```bash
curl -s http://localhost:3010/metrics | head -n 40
```
- Метрики черги: час очікування в квантилях

```yaml
scrape_configs:
  - job_name: 'codespaces-models'
    static_configs:
      - targets: ['localhost:3010']
    metrics_path: /metrics
    scrape_interval: 15s
```
git clone https://github.com/olegkizyma/codespaces-models.git
cd codespaces-models
План покращень метрик:

- Додавання label environment (prod/stage)
- Додаткові bucket'и для latency (p95/p99 обчислення окремим процесом)
- Лічильник токенів (prompt/response) окремо
- Метрики черги: час очікування в квантилях
Створіть \`.env\` файл:
\`\`\`env
### Передумови

- Node.js 18+
- GitHub Token з доступом до GitHub Models
\`\`\`

### 1. Клонування та встановлення

```bash
git clone https://github.com/olegkizyma/codespaces-models.git
cd codespaces-models
npm install
```
Сервер буде доступний на http://localhost:3010

## 🛠️ Розширені інструменти розробки
```env
GITHUB_TOKEN=your_github_token_here
OPENAI_BASE_URL=https://models.github.ai/inference
```
```bash
# Повне налаштування одною командою
### 3. Запуск

```bash
npm start
```
./tools.sh test

Сервер буде доступний на <http://localhost:3010>
# Бенчмарк всіх моделей
./tools.sh benchmark
### Швидкий старт з інструментами

```bash
# Повне налаштування одною командою
./tools.sh setup

# Інтерактивне тестування моделей
./tools.sh test

# Бенчмарк всіх моделей
./tools.sh benchmark
```
🤖 **quick-test.mjs** - Швидке тестування
- Вибір моделі зі списку
- Готові тестові промпти
- Вимірювання швидкості та токенів
- Інтерактивний чат

🏗️ **code-generator.mjs** - Генератор коду
- Створення прикладів для JS, Python, Shell
- Різні типи використання (basic, interactive)
- Готові до запуску файли

⚙️ **model-helper.mjs** - Налаштування
- Перевірка доступних моделей
- Тестування з'єднання
- Генерація конфігурації

**Детальна документація:** [TOOLS.md](TOOLS.md)

### NPM команди
```bash
npm run test        # Швидке тестування
npm run benchmark   # Бенчмарк моделей  
npm run health      # Перевірка системи
npm run generate    # Генерація прикладів
```

## 🌐 API Endpoints

### Стандартний OpenAI API
- `POST /v1/chat/completions` - Стандартний чат API
- \`GET /v1/models\` - Список доступних моделей

### Розширений API
- \`POST /v1/proxy\` - Універсальний проксі
- \`POST /v1/simple-chat\` - Простий чат інтерфейс
- \`GET /v1/test-model\` - Тестування моделі
- \`GET /v1/history\` - Історія запитів

### Моніторинг API
- \`POST /v1/recommend-model\` - Рекомендації моделей
- \`GET /v1/stats\` - Статистика використання
- \`POST /v1/check-context\` - Перевірка лімітів контексту

### Web інтерфейси

- \`/ui\` - Головний веб-інтерфейс
- \`/monitor\` - Інтерфейс моніторингу


### TTS (українська озвучка)

- `GET /tts?text=...&voice=anatol|natalia` — повертає аудіо (audio/mpeg або audio/wav)
- Проксі підтримує потокову передачу і заголовки Range/206, великі файли відтворюються без повної буферизації
- У web UI довгі тексти для TTS обрізаються до ~1200 символів (див. `public/remote-chat.js`, константа `MAX_TTS_CHARS`)


## 📚 Приклади використання

### Стандартний OpenAI клієнт
\`\`\`javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'dummy-key',
  baseURL: 'http://localhost:3010/v1'
});

const response = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Привіт!' }]
});
\`\`\`

### Простий HTTP запит
\`\`\`bash
curl -X POST http://localhost:3010/v1/simple-chat \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Привіт!", "model": "gpt-4o-mini"}'
\`\`\`

### Рекомендації моделей
\`\`\`bash
curl -X POST http://localhost:3010/v1/recommend-model \\
  -H "Content-Type: application/json" \\
  -d '{
    "speed": "high",
    "quality": "medium", 
    "contextSize": "large",
    "task": "general"
  }'
\`\`\`

## 🔧 Тестування

### Тестування всіх моделей
\`\`\`bash
npm run test-models
\`\`\`

### Тестування лімітів
\`\`\`bash
npm run test-limits
\`\`\`

### Демонстрація лімітів
\`\`\`bash
node test-model-limits.mjs
\`\`\`

## 📋 Документація

- [\`AVAILABLE_MODELS.md\`](AVAILABLE_MODELS.md) - Детальний каталог моделей
- [\`STANDARD_OPENAI_API.md\`](STANDARD_OPENAI_API.md) - Гід по стандартному API
- [\`API_ANALYSIS.md\`](API_ANALYSIS.md) - Технічний аналіз API
- [\`MODEL_LIMITS_RECOMMENDATIONS.md\`](MODEL_LIMITS_RECOMMENDATIONS.md) - Ліміти та рекомендації

## 🎯 Рекомендації по використанню

### Для швидкості ⚡
- \`gpt-4o-mini\` - найшвидша универсальна модель
- \`Phi-3.5-mini-instruct\` - економна швидка модель

### Для якості 🧠
- \`Meta-Llama-3.1-405B-Instruct\` - найвища якість
- \`gpt-4o\` - універсальна потужна модель

### Для довгих текстів 📖
- \`AI21-Jamba-1.5-Large\` - 256K контекст
- \`Phi-3-small-128k-instruct\` - економна 128K модель

### Для роботи з зображеннями ��️
- \`microsoft/Phi-3.5-vision-instruct\` - Vision модель
- \`gpt-4o\` - підтримує зображення

## ��️ Обробка помилок

Система автоматично:
- Відстежує rate limits та пропонує оптимізації
- Перевіряє ліміти контексту перед відправкою
- Логує всі помилки для аналізу
- Пропонує альтернативні моделі при помилках

## 📊 Моніторинг

Веб-інтерфейс моніторингу (\`/monitor\`) надає:
- Реального часу статистику використання
- Рекомендації по оптимізації
- Аналіз продуктивності моделей
- Інструменти для перевірки лімітів

## 🔄 Оновлення

Система регулярно тестує доступність моделей та автоматично адаптується до змін в GitHub Models API.

## 📞 Підтримка

При виникненні проблем:
1. Перевірте логи сервера
2. Використайте \`/v1/stats\` для діагностики
3. Перевірте статус GitHub Models API
4. Переглянуте документацію по лімітам

## 🏗️ Архітектура

\`\`\`
├── server.js              # Головний сервер
├── model-limits-utils.mjs  # Утиліти для роботи з лімітами
├── test-model-limits.mjs   # Демонстрація лімітів
├── public/
│   ├── index.html         # Головний веб-інтерфейс
│   └── monitor.html       # Інтерфейс моніторингу
├── scripts/
│   └── test_models.mjs    # Скрипти тестування
└── docs/                  # Документація
\`\`\`

## 🚀 Можливості розширення

- Підтримка streaming відповідей
- Кешування популярних запитів
- Балансування навантаження між моделями  
- Інтеграція з іншими AI провайдерами
- Розширена аналітика використання

---

**Створено для максимальної сумісності з OpenAI екосистемою при використанні GitHub Models API** 🎯
