# Special Providers Integration

## Огляд

Додано 5 нових провайдерів з розширеною підтримкою:

### 🎯 Спеціальні провайдери

1. **GitHub Copilot** (`githubcopilot`) - ⭐ **ОСНОВНИЙ**
2. **Claude Code** (`claude_code`) - Оптимізований для коду
3. **Cursor Agent** (`cursor_agent`) - Cursor AI інтеграція
4. **Lead Worker** (`lead_worker`) - Спеціалізовані задачі
5. **ATLAS** (`atlas`) - Об'єднує всі 58 GitHub Models

## 🔥 Ключові можливості

### Ротація токенів

Всі нові провайдери підтримують **автоматичну ротацію токенів**:

- ✅ Автоматичне переключення при rate limit (429)
- ✅ Множинні токени для високої доступності
- ✅ Блокування токенів на 1 хвилину після помилки
- ✅ Статистика по кожному токену

### Покращена система логування

- ✅ Окремі логи для кожного провайдера
- ✅ Автоматична ротація log файлів
- ✅ In-memory логи для швидкого доступу
- ✅ Фільтрація по рівнях (debug, info, warn, error)
- ✅ API для перегляду логів

## 📋 Конфігурація

### GitHub Copilot (ОСНОВНИЙ)

```bash
# Базова конфігурація
GITHUB_COPILOT_ENABLED=1
GITHUB_COPILOT_API_KEY=your_api_key

# Ротація токенів (опціонально)
GITHUB_COPILOT_TOKEN_1=token_1
GITHUB_COPILOT_TOKEN_2=token_2
GITHUB_COPILOT_TOKEN_3=token_3
```

**Моделі:**
- `ext-copilot-gpt-4`
- `ext-copilot-gpt-4-turbo`
- `ext-copilot-gpt-3.5-turbo`
- `ext-copilot-claude-3-opus`
- `ext-copilot-claude-3-sonnet`

### Claude Code

```bash
CLAUDE_CODE_ENABLED=1
CLAUDE_CODE_API_KEY=your_anthropic_key

# Ротація токенів
CLAUDE_CODE_TOKEN_1=token_1
CLAUDE_CODE_TOKEN_2=token_2
```

**Моделі (оптимізовані для коду):**
- `ext-claude-code-claude-3-5-sonnet-20241022`
- `ext-claude-code-claude-3-opus-20240229`
- `ext-claude-code-claude-3-sonnet-20240229`
- `ext-claude-code-claude-3-haiku-20240307`

### Cursor Agent

```bash
CURSOR_AGENT_ENABLED=1
CURSOR_AGENT_API_KEY=your_cursor_key

# Ротація токенів
CURSOR_AGENT_TOKEN_1=token_1
CURSOR_AGENT_TOKEN_2=token_2
```

**Моделі:**
- `ext-cursor-gpt-4-cursor`
- `ext-cursor-gpt-3.5-turbo-cursor`
- `ext-cursor-claude-cursor`
- `ext-cursor-cursor-small`
- `ext-cursor-cursor-medium`

### Lead Worker

```bash
LEAD_WORKER_ENABLED=1
LEAD_WORKER_API_KEY=your_lead_worker_key

# Ротація токенів
LEAD_WORKER_TOKEN_1=token_1
LEAD_WORKER_TOKEN_2=token_2
```

**Моделі:**
- `ext-leadworker-worker-gpt-4`
- `ext-leadworker-worker-claude-3`
- `ext-leadworker-worker-fast`
- `ext-leadworker-worker-accurate`
- `ext-leadworker-worker-balanced`

### ATLAS (58 GitHub Models)

```bash
ATLAS_ENABLED=1
# Використовує GITHUB_TOKEN для ротації
```

**Всі 58 моделей з префіксом `atlas-`:**
- `atlas-openai/gpt-4o`
- `atlas-openai/gpt-5`
- `atlas-meta/llama-3.3-70b-instruct`
- `atlas-deepseek/deepseek-r1`
- ... і 54 інші

## 🔌 API Endpoints

### Статистика токенів

```bash
# Токени конкретного провайдера
GET /api/monitoring/providers/:name/tokens

# Всі токени
GET /api/monitoring/providers/tokens/all

# Ручна ротація токена
POST /api/monitoring/providers/:name/rotate-token
```

**Приклад відповіді:**
```json
{
  "success": true,
  "provider": "githubcopilot",
  "tokens": [
    {
      "key": "GITHUB_COPILOT_TOKEN_1",
      "active": true,
      "blocked": false,
      "blockedUntil": 0,
      "failures": 0
    },
    {
      "key": "GITHUB_COPILOT_TOKEN_2",
      "active": false,
      "blocked": false,
      "blockedUntil": 0,
      "failures": 0
    }
  ],
  "total": 2,
  "active": 1,
  "blocked": 0
}
```

### Логи провайдера

```bash
# Логи конкретного провайдера
GET /api/monitoring/providers/:name/logs?level=error&count=100

# Всі логи
GET /api/monitoring/providers/logs/all?count=200

# Статистика логів
GET /api/monitoring/providers/logs/stats

# Очистити логи
POST /api/monitoring/providers/:name/logs/clear
```

**Приклад відповіді:**
```json
{
  "success": true,
  "provider": "githubcopilot",
  "logs": [
    {
      "timestamp": "2025-01-17T10:30:00.000Z",
      "provider": "githubcopilot",
      "level": "INFO",
      "message": "API Request",
      "model": "ext-copilot-gpt-4",
      "temperature": 0.7
    }
  ],
  "count": 1
}
```

## 💡 Використання

### Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:4000/v1",
    api_key="dummy"
)

# GitHub Copilot
response = client.chat.completions.create(
    model="ext-copilot-gpt-4",
    messages=[{"role": "user", "content": "Write Python code"}]
)

# ATLAS моделі
response = client.chat.completions.create(
    model="atlas-openai/gpt-5",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### JavaScript/Node.js

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:4000/v1',
  apiKey: 'dummy'
});

// Claude Code для програмування
const response = await openai.chat.completions.create({
  model: 'ext-claude-code-claude-3-5-sonnet-20241022',
  messages: [{ role: 'user', content: 'Explain async/await' }]
});

// Cursor Agent
const cursorResponse = await openai.chat.completions.create({
  model: 'ext-cursor-gpt-4-cursor',
  messages: [{ role: 'user', content: 'Debug this code' }]
});
```

### cURL

```bash
# Тест GitHub Copilot
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "ext-copilot-gpt-4",
    "messages": [{"role": "user", "content": "Hello"}]
  }'

# Тест ATLAS провайдера
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "atlas-deepseek/deepseek-r1",
    "messages": [{"role": "user", "content": "Hi"}]
  }'
```

## 🔍 Моніторинг

### Перевірка статусу провайдерів

```bash
curl http://localhost:4000/api/monitoring/providers
```

### Перегляд токенів

```bash
# Всі токени
curl http://localhost:4000/api/monitoring/providers/tokens/all

# Токени GitHub Copilot
curl http://localhost:4000/api/monitoring/providers/githubcopilot/tokens
```

### Перегляд логів

```bash
# Останні 50 помилок
curl "http://localhost:4000/api/monitoring/providers/githubcopilot/logs?level=error&count=50"

# Всі останні логи
curl "http://localhost:4000/api/monitoring/providers/logs/all?count=200"

# Статистика
curl http://localhost:4000/api/monitoring/providers/logs/stats
```

## 🛠️ Тестування

Запустіть тест для перевірки всіх провайдерів:

```bash
node test-providers.mjs
```

## 📊 Архітектура

### Структура файлів

```
providers/
├── base.mjs              # Базовий Provider клас
├── registry.mjs          # Реєстр провайдерів
├── config.mjs            # Менеджер конфігурації
├── index.mjs             # Головний експорт
├── githubcopilot.mjs     # GitHub Copilot Provider ⭐
├── claude_code.mjs       # Claude Code Provider
├── cursor_agent.mjs      # Cursor Agent Provider
├── lead_worker.mjs       # Lead Worker Provider
├── atlas.mjs             # ATLAS Provider (58 моделей)
├── anthropic.mjs         # Anthropic Provider
├── openai.mjs            # OpenAI Provider
├── azure.mjs             # Azure Provider
├── ollama.mjs            # Ollama Provider
├── google.mjs            # Google Provider
├── openrouter.mjs        # OpenRouter Provider
├── litellm.mjs           # LiteLLM Provider
└── xai.mjs               # xAI Provider

provider-logger.mjs       # Система логування
```

### Ротація токенів

Кожен новий провайдер реалізує:

```javascript
class SpecialProvider extends Provider {
  // Ініціалізація токенів
  initializeTokens(config)
  
  // Отримання поточного токена
  getCurrentToken()
  
  // Ротація на наступний токен
  rotateToken()
  
  // Статистика токенів
  getTokenStats()
}
```

### Логування

```javascript
import { providerLoggerManager } from './provider-logger.mjs';

const logger = providerLoggerManager.getLogger('githubcopilot');

// Різні рівні логування
logger.debug('Debug message', { data: 'value' });
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');

// Спеціалізовані методи
logger.logRequest(model, params);
logger.logResponse(model, status);
logger.logTokenRotation(from, to, reason);
logger.logRateLimit(model);
```

## 🔐 Безпека

- ✅ API ключі зберігаються в `.env`
- ✅ `.env` в `.gitignore`
- ✅ Токени автоматично блокуються при помилках
- ✅ Логи не містять sensitive data
- ✅ Окремі токени для кожного провайдера

## 🚀 Рекомендації

### Для коду
- **GitHub Copilot** - основний вибір
- **Claude Code** - складні алгоритми
- **Cursor Agent** - швидкі правки

### Для загальних задач
- **ATLAS** - доступ до 58 моделей
- **Lead Worker** - спеціалізовані задачі

### High Availability
Налаштуйте 3-5 токенів для кожного критичного провайдера:

```bash
GITHUB_COPILOT_TOKEN_1=token_1
GITHUB_COPILOT_TOKEN_2=token_2
GITHUB_COPILOT_TOKEN_3=token_3
GITHUB_COPILOT_TOKEN_4=token_4
GITHUB_COPILOT_TOKEN_5=token_5
```

## 📈 Майбутні покращення

- [ ] Автоматичне тестування токенів при старті
- [ ] Metrics по використанню провайдерів
- [ ] Rate limiting per provider
- [ ] Fallback між провайдерами
- [ ] Health checks
- [ ] WebSocket для real-time логів

## 🤝 Внесок

Реалізовано для проекту `olegkizyma2/codespaces-models`

---

**Автор:** ATLAS Team  
**Дата:** 2025-01-17  
**Версія:** 1.0.0
