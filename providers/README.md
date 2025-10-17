# Multi-Provider System

🚀 **НОВА АРХІТЕКТУРА:** Провайдери адаптовані за зразком [Goose](https://github.com/block/goose)!

## ✨ Що Нового

Провайдери тепер підтримують:
- ✅ **Metadata API** - `static metadata()` для кожного провайдера
- ✅ **Environment-First** - `static fromEnv()` створення з env vars
- ✅ **Usage Tracking** - автоматичне відстеження токенів
- ✅ **Standardized Errors** - `ProviderError` з кодами помилок
- ✅ **Goose Compatible** - сумісність з Goose architecture

### 📊 Статус Адаптації

| Провайдер | Goose-Ready | Usage Tracking | Metadata |
|-----------|-------------|----------------|----------|
| OpenAI | ✅ | ✅ | ✅ |
| Anthropic | ✅ | ✅ | ✅ |
| GitHub Copilot | ✅ | ✅ | ✅ |
| Google | ⏳ | ⏳ | ⏳ |
| Azure | ⏳ | ⏳ | ⏳ |

**Детальна документація:** [providers/README.md](./providers/README_GOOSE.md)

---

Цей модуль забезпечує інтеграцію зовнішніх LLM провайдерів у OpenAI proxy систему.

## Огляд

Система провайдерів дозволяє підключати різні джерела LLM моделей до вашого проксі-сервера. Всі моделі від зовнішніх провайдерів мають префікс `ext-<provider>-` для легкої ідентифікації.

### 🎯 Спеціальні провайдери (NEW!)

**Провайдери з підтримкою ротації токенів:**

1. **GitHub Copilot** (`githubcopilot`) - `ext-copilot-` ⭐ **ОСНОВНИЙ**
   - GitHub Copilot моделі
   - Підтримка множинних токенів
   - Конфігурація: `GITHUB_COPILOT_API_KEY`, `GITHUB_COPILOT_TOKEN_*`

2. **Claude Code** (`claude_code`) - `ext-claude-code-`
   - Claude моделі оптимізовані для коду
   - Підтримка множинних токенів
   - Конфігурація: `CLAUDE_CODE_API_KEY`, `CLAUDE_CODE_TOKEN_*`

3. **Cursor Agent** (`cursor_agent`) - `ext-cursor-`
   - Cursor AI моделі
   - Підтримка множинних токенів
   - Конфігурація: `CURSOR_AGENT_API_KEY`, `CURSOR_AGENT_TOKEN_*`

4. **Lead Worker** (`lead_worker`) - `ext-leadworker-`
   - Спеціалізовані Lead Worker моделі
   - Підтримка множинних токенів
   - Конфігурація: `LEAD_WORKER_API_KEY`, `LEAD_WORKER_TOKEN_*`

5. **ATLAS** (`atlas`) - `atlas-`
   - Об'єднує всі 58 GitHub Models API моделей
   - Використовує GITHUB_TOKEN для ротації
   - Конфігурація: `ATLAS_ENABLED`, використовує `GITHUB_TOKEN_*`

📖 **Детальна документація:** [SPECIAL_PROVIDERS.md](../SPECIAL_PROVIDERS.md)

### Підтримувані провайдери

1. **Anthropic (Claude)** - `ext-anthropic-`
   - Claude 3.5 Sonnet, Haiku, Opus
   - Конфігурація: `ANTHROPIC_API_KEY`

2. **OpenAI** - `ext-openai-`
   - Прямий доступ до OpenAI API
   - Конфігурація: `EXT_OPENAI_API_KEY`

3. **Azure OpenAI** - `ext-azure-`
   - Microsoft Azure OpenAI Service
   - Конфігурація: `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`

4. **Ollama** - `ext-ollama-`
   - Локальні моделі (LLaMA, Mistral, etc.)
   - Конфігурація: `OLLAMA_BASE_URL` (за замовчуванням: http://localhost:11434)

5. **Google AI (Gemini)** - `ext-google-`
   - Gemini Pro, Flash, Ultra
   - Конфігурація: `GOOGLE_API_KEY`

6. **OpenRouter** - `ext-openrouter-`
   - Доступ до 100+ моделей через єдиний API
   - Конфігурація: `OPENROUTER_API_KEY`

7. **LiteLLM** - `ext-litellm-`
   - Gateway до всіх популярних провайдерів
   - Конфігурація: `LITELLM_BASE_URL`, `LITELLM_API_KEY`

8. **xAI (Grok)** - `ext-xai-`
   - Grok моделі від xAI
   - Конфігурація: `XAI_API_KEY`

## Швидкий старт

### 1. Налаштування провайдера через .env

```bash
# Увімкнути Anthropic
ANTHROPIC_ENABLED=1
ANTHROPIC_API_KEY=sk-ant-api03-xxx...

# Увімкнити Ollama (локальні моделі)
OLLAMA_ENABLED=1
OLLAMA_BASE_URL=http://localhost:11434
```

### 2. Налаштування через веб-інтерфейс

1. Відкрийте http://localhost:4000/monitor.html
2. Перейдіть на вкладку "🔌 Провайдери"
3. Натисніть "⚙️ Налаштувати" для потрібного провайдера
4. Введіть API ключ і увімкніть провайдер
5. Натисніть "🧪 Тест" для перевірки з'єднання

### 3. Використання моделей провайдерів

```javascript
// Список всіх моделей (включає провайдерів)
fetch('http://localhost:4000/v1/models')
  .then(r => r.json())
  .then(data => {
    console.log('GitHub моделей:', data.meta.github_models);
    console.log('Провайдерів моделей:', data.meta.provider_models);
    console.log('Всього моделей:', data.meta.total_models);
  });

// Використання моделі від провайдера
fetch('http://localhost:4000/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'ext-anthropic-claude-3-5-sonnet-20241022',
    messages: [{ role: 'user', content: 'Hello!' }]
  })
});
```

## API Endpoints

### GET /api/monitoring/providers
Отримати статус всіх провайдерів

```json
{
  "success": true,
  "providers": [
    {
      "name": "anthropic",
      "enabled": true,
      "configured": true,
      "errors": []
    }
  ],
  "total": 8,
  "enabled": 1,
  "configured": 1
}
```

### POST /api/monitoring/providers/:name/config
Оновити конфігурацію провайдера

```json
{
  "apiKey": "sk-...",
  "enabled": true,
  "baseURL": "https://api.example.com"
}
```

### POST /api/monitoring/providers/:name/test
Тестувати підключення до провайдера

```json
{
  "success": true,
  "message": "Provider anthropic is working",
  "models_count": 5
}
```

### GET /api/monitoring/providers/:name/models
Отримати список моделей провайдера

```json
{
  "success": true,
  "provider": "anthropic",
  "models": [...],
  "count": 5
}
```

## Архітектура

```
providers/
├── base.mjs              # Базовий клас Provider
├── registry.mjs          # Реєстр провайдерів
├── config.mjs            # Менеджер конфігурації
├── index.mjs             # Головний експорт
├── anthropic.mjs         # Anthropic Provider
├── openai.mjs            # OpenAI Provider
├── azure.mjs             # Azure OpenAI Provider
├── ollama.mjs            # Ollama Provider
├── google.mjs            # Google AI Provider
├── openrouter.mjs        # OpenRouter Provider
├── litellm.mjs           # LiteLLM Provider
└── xai.mjs               # xAI Provider
```

### Створення власного провайдера

```javascript
import { Provider } from './base.mjs';

export class MyProvider extends Provider {
  constructor(config = {}) {
    super({
      name: 'myprovider',
      apiKey: config.apiKey || process.env.MY_API_KEY,
      baseURL: config.baseURL || 'https://api.example.com',
      modelPrefix: 'ext-myprovider-',
      ...config
    });
  }

  async getModels() {
    // Повернути список моделей
    return [
      {
        id: this.getPrefixedModelName('my-model-1'),
        object: 'model',
        owned_by: 'myprovider',
        provider: 'myprovider'
      }
    ];
  }

  async chatCompletion(params) {
    // Реалізувати chat completion
    const { model, messages, ...rest } = params;
    const originalModel = this.getOriginalModelName(model);
    
    // Викликати API провайдера
    const response = await fetch(`${this.baseURL}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: originalModel, messages, ...rest })
    });
    
    const data = await response.json();
    
    // Повернути у форматі OpenAI
    return {
      id: data.id,
      object: 'chat.completion',
      model: this.getPrefixedModelName(originalModel),
      choices: data.choices,
      usage: data.usage
    };
  }

  async *streamChatCompletion(params) {
    // Реалізувати streaming
    // ...
  }
}
```

## Безпека

⚠️ **Важливо:** API ключі зберігаються в .env файлі. Переконайтеся, що:
- `.env` файл додано до `.gitignore`
- Використовуйте окремі ключі для різних середовищ
- Регулярно оновлюйте ключі
- Не діліться ключами публічно

## Troubleshooting

### Провайдер не активується
1. Перевірте що `<PROVIDER>_ENABLED=1` в .env
2. Переконайтеся що API ключ правильний
3. Перевірте логи сервера: `tail -f logs/server.log`

### Моделі провайдера не відображаються
1. Перезапустіть сервер після зміни .env
2. Перевірте статус провайдера через веб-інтерфейс
3. Використайте "🧪 Тест" для діагностики

### Помилки при запитах
1. Перевірте що модель має правильний префікс (`ext-<provider>-`)
2. Переконайтеся що провайдер налаштований і увімкнений
3. Перевірте ліміти API ключа провайдера

## Приклади використання

### Python з OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:4000/v1",
    api_key="dummy"  # Не потрібен для локального проксі
)

# Використання моделі від Anthropic через проксі
response = client.chat.completions.create(
    model="ext-anthropic-claude-3-5-sonnet-20241022",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)

print(response.choices[0].message.content)
```

### JavaScript/Node.js

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:4000/v1',
  apiKey: 'dummy'
});

// Ollama локальна модель
const response = await openai.chat.completions.create({
  model: 'ext-ollama-llama3',
  messages: [{ role: 'user', content: 'Hello!' }]
});

console.log(response.choices[0].message.content);
```

### cURL

```bash
# Тест з Google Gemini
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "ext-google-gemini-pro",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Ліцензія

MIT
