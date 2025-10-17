# Provider Migration Guide

## Адаптація провайдерів за зразком Goose

### Що додано в base.mjs:
- `ProviderMetadata` - метадані провайдера
- `ModelInfo` - інформація про модель
- `Usage` - відстеження використання токенів
- `ProviderUsage` - використання конкретного провайдера
- `ProviderError` - стандартизовані помилки
- `fromEnv()` - створення з змінних середовища
- `metadata()` - статичний метод метаданих
- `completeWithModel()` - Goose-стиль завершення
- `fetchSupportedModels()` - динамічне отримання моделей
- `supportsEmbeddings()` - підтримка embeddings
- `createEmbeddings()` - створення embeddings

### Шаблон адаптації провайдера:

```javascript
import { Provider, ProviderMetadata, ModelInfo, Usage, ProviderUsage, ProviderError } from './base.mjs';

const PROVIDER_KNOWN_MODELS = ['model1', 'model2'];
const PROVIDER_DEFAULT_MODEL = 'model1';
const PROVIDER_DOC_URL = 'https://...';

export class YourProvider extends Provider {
  constructor(config = {}) {
    super({
      name: 'yourprovider',
      apiKey: config.apiKey || process.env.YOUR_API_KEY,
      baseURL: config.baseURL || 'https://api.your.com',
      modelPrefix: 'ext-your-',
      ...config
    });
  }

  // 1. Додати metadata()
  static metadata() {
    return ProviderMetadata.create(
      'yourprovider',
      'Your Provider',
      'Description',
      PROVIDER_DEFAULT_MODEL,
      PROVIDER_KNOWN_MODELS.map(name => new ModelInfo({ name })),
      PROVIDER_DOC_URL,
      [{ name: 'YOUR_API_KEY', required: true, description: 'API key' }]
    );
  }

  // 2. Додати fromEnv()
  static async fromEnv(modelConfig = {}) {
    const apiKey = Provider.getEnvSecret('YOUR_API_KEY');
    const baseURL = Provider.getEnvConfig('YOUR_BASE_URL', 'https://api.your.com');
    
    return new YourProvider({
      apiKey,
      baseURL,
      model: modelConfig.model || PROVIDER_DEFAULT_MODEL,
      ...modelConfig
    });
  }

  // 3. Додати extractUsage()
  extractUsage(response) {
    const usage = response.usage;
    if (!usage) return ProviderUsage.empty(this.name);

    return new ProviderUsage(this.name, new Usage({
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0
    }));
  }

  // 4. Додати handleError()
  handleError(error) {
    if (error.status === 401) {
      return ProviderError.authError('Invalid API key', { originalError: error });
    }
    if (error.status === 429) {
      return ProviderError.rateLimitError('Rate limit exceeded', { originalError: error });
    }
    return ProviderError.apiError(error.message || 'API error', { originalError: error });
  }

  // 5. Оновити chatCompletion() щоб повертав usage
  async chatCompletion(params) {
    try {
      // ... ваш код ...
      const result = await ... ;
      return {
        ...result,
        usage: this.extractUsage(result)
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 6. Додати completeWithModel() якщо потрібен custom logic
  async completeWithModel(modelConfig, system, messages, tools = []) {
    try {
      const allMessages = system 
        ? [{ role: 'system', content: system }, ...messages] 
        : messages;

      const params = {
        model: modelConfig.model || this.model,
        messages: allMessages,
        temperature: modelConfig.temperature,
        max_tokens: modelConfig.maxTokens,
        tools: tools.length > 0 ? tools : undefined
      };

      const result = await this.chatCompletion(params);
      
      return {
        message: result.choices[0].message,
        usage: result.usage
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }
}
```

## Статус міграції:

✅ **base.mjs** - додано всі базові класи
✅ **openai.mjs** - повністю адаптовано
✅ **githubcopilot.mjs** - вже був адаптований
🔄 **anthropic.mjs** - в процесі
⏳ **google.mjs** - потребує адаптації
⏳ **azure.mjs** - потребує адаптації
⏳ **openrouter.mjs** - потребує адаптації
⏳ **ollama.mjs** - потребує адаптації
⏳ **xai.mjs** - потребує адаптації
⏳ **litellm.mjs** - потребує адаптації

## Основні переваги нової архітектури:

1. **Єдиний інтерфейс** - всі провайдери мають однакову структуру
2. **Usage tracking** - автоматичне відстеження використання токенів
3. **Стандартизовані помилки** - єдиний підхід до обробки помилок
4. **Metadata** - легке отримання інформації про провайдер
5. **fromEnv** - консистентне створення з environment variables
6. **Goose compatibility** - сумісність з архітектурою Goose
