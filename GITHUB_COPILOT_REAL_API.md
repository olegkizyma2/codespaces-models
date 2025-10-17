# GitHub Copilot Provider - Реальна інтеграція як у Goose

## 🎯 Огляд

Цей провайдер реалізує **справжню інтеграцію з GitHub Copilot API**, як це зроблено в Goose AI assistant.

## 🔐 Автентифікація

GitHub Copilot використовує **OAuth Device Code Flow** для автентифікації.

### Крок 1: Отримайте GitHub OAuth Token

Ви можете отримати токен одним з двох способів:

#### Спосіб 1: Через GitHub CLI (найпростіший)

```bash
# Встановіть GitHub CLI якщо ще не встановлено
brew install gh

# Авторизуйтесь
gh auth login

# Отримайте токен
gh auth token
```

#### Спосіб 2: Створіть Personal Access Token вручну

1. Відкрийте https://github.com/settings/tokens
2. Натисніть "Generate new token (classic)"
3. Виберіть scope: `read:user`
4. Створіть токен та скопіюйте

### Крок 2: Налаштуйте провайдер

Додайте до `.env`:

```bash
# GitHub Copilot Provider (Реальний API)
GITHUB_COPILOT_ENABLED=1
GITHUB_COPILOT_TOKEN=gho_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 📋 Доступні моделі

Провайдер отримує список моделей динамічно з Copilot API. 

Відомі моделі (fallback):
- `gpt-4o` - OpenAI GPT-4o
- `o1` - OpenAI o1
- `o3-mini` - OpenAI o3-mini
- `claude-3.7-sonnet` - Claude 3.7 Sonnet
- `claude-sonnet-4` - Claude Sonnet 4
- `gpt-4.1` - GPT-4.1 (stream only)

## 🔧 Як працює

### 1. Отримання Copilot Token

```javascript
GITHUB_TOKEN (OAuth) 
  → https://api.github.com/copilot_internal/v2/token
  → Copilot API Token + Endpoint
```

### 2. Кешування токена

Токен кешується у `.cache/githubcopilot-token.json` та автоматично оновлюється при закінченні терміну дії.

### 3. API Requests

```javascript
POST {endpoint}/chat/completions
Headers:
  - Authorization: Bearer {copilot_token}
  - Copilot-Integration-Id: vscode-chat
  - User-Agent: GithubCopilot/1.155.0
  - editor-version: vscode/1.85.1
  - editor-plugin-version: copilot/1.155.0
```

## 📊 Приклади використання

### Через curl

```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "copilot-gpt-4o",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### Через OpenAI SDK

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:4000/v1',
  apiKey: 'dummy' // Not required for local proxy
});

const response = await client.chat.completions.create({
  model: 'copilot-claude-sonnet-4',
  messages: [
    { role: 'user', content: 'Explain quantum computing' }
  ]
});

console.log(response.choices[0].message.content);
```

### Через Python

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:4000/v1",
    api_key="dummy"
)

response = client.chat.completions.create(
    model="copilot-o3-mini",
    messages=[
        {"role": "user", "content": "Write a Python function"}
    ]
)

print(response.choices[0].message.content)
```

## 🔍 Перевірка статусу

```bash
# Список моделей
curl http://localhost:4000/v1/models | jq '.data[] | select(.provider=="githubcopilot")'

# Статус токена
curl http://localhost:4000/api/providers/githubcopilot/status
```

## 🚨 Важливо

1. **Copilot Subscription Required**: Потрібна активна підписка GitHub Copilot
2. **Token Security**: Не публікуйте GITHUB_COPILOT_TOKEN у репозиторіях
3. **Rate Limits**: GitHub Copilot має ліміти запитів, слідкуйте за використанням

## 🔄 Відмінності від Atlas

| Характеристика | Atlas | GitHub Copilot |
|---|---|---|
| **Базовий API** | GitHub Models API | GitHub Copilot API |
| **Автентифікація** | GitHub Token (gho_*) | OAuth + Copilot Token |
| **Моделі** | 58 відкритих моделей | Copilot-специфічні моделі |
| **Claude моделі** | ❌ Немає | ✅ Є (claude-sonnet-4) |
| **Endpoint** | models.github.ai | Динамічний |
| **Prefix** | atlas- | copilot- |

## 🎨 Архітектура (як у Goose)

```
User Request
    ↓
GitHub Copilot Provider
    ↓
Check Token Cache
    ↓ (if expired)
Refresh Token
    ↓
GET https://api.github.com/copilot_internal/v2/token
    ↓
Copilot API Token + Endpoint
    ↓
POST {endpoint}/chat/completions
    ↓
Response
```

## 📁 Файли

- `providers/githubcopilot.mjs` - Основний провайдер
- `.cache/githubcopilot-token.json` - Кеш токена
- `.env` - Конфігурація

## ✅ Готово!

Тепер у вас є **справжня інтеграція GitHub Copilot**, як у Goose! 🎉

**Дата**: 17 жовтня 2025  
**Статус**: ✅ РЕАЛЬНИЙ COPILOT API
