# 🚀 Goose-Style Provider Architecture

Детальна документація по новій архітектурі провайдерів, адаптованій за зразком Goose.

## 📖 Зміст

- [Що Нового](#що-нового)
- [Статус Адаптації](#статус-адаптації)
- [Базова Архітектура](#базова-архітектура)
- [Приклади Використання](#приклади-використання)
- [Створення Власного Провайдера](#створення-власного-провайдера)
- [Тестування](#тестування)
- [Міграція](#міграція)

## Що Нового

### ✨ Нові Можливості

1. **Provider Metadata** - кожен провайдер має метадані
2. **Environment-First** - створення з environment variables
3. **Usage Tracking** - автоматичне відстеження токенів
4. **Standardized Errors** - єдиний підхід до помилок
5. **Goose Compatibility** - повна сумісність з Goose

### 📊 Статус Адаптації

Див. [PROVIDER_ADAPTATION_FINAL_REPORT.md](../PROVIDER_ADAPTATION_FINAL_REPORT.md)

## Базова Архітектура

Детальний опис класів та методів у [base.mjs](./base.mjs)

## Приклади Використання

### OpenAI
```javascript
import { OpenAIProvider } from './providers/openai.mjs';

const provider = await OpenAIProvider.fromEnv({ model: 'gpt-4o' });
const result = await provider.chatCompletion({...});
console.log(result.usage.usage.totalTokens);
```

### Anthropic
```javascript
import { AnthropicProvider } from './providers/anthropic.mjs';

const provider = await AnthropicProvider.fromEnv({ 
  model: 'claude-sonnet-4-20250514' 
});
const result = await provider.chatCompletion({...});
```

Більше прикладів: [PROVIDER_ADAPTATION_FINAL_REPORT.md](../PROVIDER_ADAPTATION_FINAL_REPORT.md#приклади-використання)

## Створення Власного Провайдера

Див. [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) для детального шаблону

## Тестування

```bash
node test-adapted-providers.mjs
```

## Міграція

Гайд по міграції існуючих провайдерів: [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
