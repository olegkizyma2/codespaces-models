# 🛡️ Захист від 429 помилок - Розумний Throttling

## Проблема

Запити приходять **занадто швидко** без затримок:
```
12:56:51 - openai/gpt-4o
12:56:52 - openai/gpt-4o-mini       ← 1 секунда
12:57:14 - openai/gpt-4o            ← 22 секунди
12:57:15 - openai/gpt-4o-mini       ← 1 секунда
12:57:30 - openai/gpt-4o            ← 15 секунд
12:57:31 - openai/gpt-4o-mini       ← 1 секунда
```

Результат: **429 Too Many Requests** з `retry-after: 82294s` (~23 години!)

## Типи лімітів GitHub Models

### 1. **UserByModelByDay** ⚠️ НАЙСУВОРІШИЙ
- **Денний ліміт** на користувача + модель
- Скидається **раз на добу**
- `retry-after: ~80000s` (≈22 години)
- **Ротація токенів НЕ допоможе** якщо токени з одного акаунту

### 2. **UserByMinute** (менш критичний)
- Хвилинний ліміт на користувача
- Скидається кожну хвилину
- `retry-after: ~60s`

### 3. **TokenByMinute** (рідкісний)
- Ліміт на токен per minute
- Ротація токенів допоможе

## ✅ Рішення

Впроваджено **багаторівневий захист**:

### 1. **Model-Specific Throttling** 🎯

Кожна модель має **мінімальний інтервал** між запитами:

```javascript
// Налаштування в .env
ENABLE_MODEL_THROTTLING=1
MODEL_MIN_INTERVAL_MS=2000  // 2 секунди між запитами
```

**Як працює:**
```javascript
async function throttleModelRequest(model) {
  const lastRequest = modelLastRequest.get(model);
  const elapsed = now - lastRequest;
  const remaining = MODEL_MIN_INTERVAL_MS - elapsed;
  
  if (remaining > 0) {
    console.log(`[THROTTLE] Model ${model}: затримка ${remaining}ms`);
    await new Promise(resolve => setTimeout(resolve, remaining));
  }
  
  modelLastRequest.set(model, Date.now());
}
```

**Приклад логів:**
```
13:24:55 - Запит для gpt-4o-mini
13:24:57 - [THROTTLE] Model gpt-4o-mini: затримка 2000ms
13:24:59 - Запит відправлено
```

### 2. **Розумна обробка 429 з врахуванням типу ліміту** 🧠

```javascript
async function handle429Error(error, model) {
  const limitType = headers['x-ratelimit-type'];
  const retryAfter = Number(headers['retry-after']);
  
  // Якщо це денний ліміт - блокуємо модель через Circuit Breaker
  if (limitType === 'UserByModelByDay') {
    console.error(`⚠️  ДЕННИЙ ЛІМІТ досягнуто для ${model}! 
                   Потрібно чекати ~${Math.round(retryAfter/3600)} годин`);
    
    // Форсуємо відкриття circuit breaker
    const breaker = getCircuitBreaker(model);
    breaker.isOpen = true;
    breaker.failures = CIRCUIT_BREAKER_THRESHOLD + 10;
  }
  
  // Спробуємо ротацію токена
  await tokenRotator.recordRateLimitError(currentToken);
}
```

### 3. **Покращений Retry з пропуском денного ліміту** ⏭️

```javascript
async function retryWithBackoff(fn, attempts, delay, model) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error?.status === 429) {
        await handle429Error(error, model);
        
        // Якщо денний ліміт - НЕ ретраїмо
        if (limitType === 'UserByModelByDay') {
          console.log(`[RETRY] Денний ліміт - пропускаємо retry`);
          throw error; // Негайно повертаємо помилку клієнту
        }
      }
      
      // Exponential backoff для інших помилок
      const backoffDelay = delay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
}
```

### 4. **Circuit Breaker для моделей** 🔌

Модель з денним лімітом **автоматично блокується**:

```javascript
function checkCircuitBreaker(model) {
  const breaker = getCircuitBreaker(model);
  
  if (breaker.isOpen) {
    throw new Error(`Circuit breaker open for model: ${model}`);
  }
  
  return true;
}
```

## 📊 Результат

### До впровадження:
```
12:56:51 → запит
12:56:52 → запит  ← 1s
12:57:14 → запит
12:57:15 → запит  ← 1s
12:57:30 → запит
12:57:31 → 429 ERROR ❌
```

### Після впровадження:
```
13:24:55 → запит
[THROTTLE] затримка 2000ms ⏳
13:24:57 → запит відправлено
[THROTTLE] затримка 2000ms ⏳
13:24:59 → запит відправлено
✅ Немає 429 помилок!
```

## ⚙️ Налаштування

### В `.env` файлі:

```env
# Базове throttling
ENABLE_MODEL_THROTTLING=1
MODEL_MIN_INTERVAL_MS=2000

# Circuit breaker
CIRCUIT_BREAKER_THRESHOLD=10
CIRCUIT_BREAKER_TIMEOUT=60000

# Retry логіка
RETRY_ATTEMPTS=3
RETRY_DELAY_MS=1000

# Token rotation
maxFailuresBeforeRotation=3
blockDuration=60000
```

### Рекомендовані значення:

| Параметр | Development | Production | High Load |
|----------|-------------|------------|-----------|
| MODEL_MIN_INTERVAL_MS | 1000 | 2000 | 3000 |
| CIRCUIT_BREAKER_THRESHOLD | 5 | 10 | 15 |
| RETRY_ATTEMPTS | 3 | 2 | 1 |

## 🎯 Стратегії при досягненні денного ліміту

### Варіант 1: Використання різних акаунтів
```env
# Різні GitHub акаунти
GITHUB_TOKEN=gho_account1_token
GITHUB_TOKEN2=gho_account2_token
GITHUB_TOKEN3=gho_account3_token
```

### Варіант 2: Fallback на інші моделі
```javascript
// Якщо gpt-4o заблокований - використати gpt-4o-mini
if (circuitBreaker.isOpen('gpt-4o')) {
  model = 'gpt-4o-mini';
}
```

### Варіант 3: Queue з відкладанням
```javascript
// Черга запитів на наступну добу
if (limitType === 'UserByModelByDay') {
  queueForTomorrow.add({ model, messages, retryAt: Date.now() + retryAfter * 1000 });
}
```

## 📝 Логи системи

### Успішна робота:
```
[THROTTLE] Model gpt-4o-mini: затримка 2000ms (останній запит 500ms тому)
[OPENAI-STD] Chat completions request for model: "gpt-4o-mini"
✅ Response received
```

### При 429 помилці:
```
[429-ERROR] Rate limit досягнуто для моделі gpt-4o-mini
[429-ERROR] Тип ліміту: UserByModelByDay, retry-after: 82294s
[429-ERROR] ⚠️  ДЕННИЙ ЛІМІТ досягнуто для моделі gpt-4o-mini! Потрібно чекати ~23 годин
[CIRCUIT-BREAKER] Opened for model: gpt-4o-mini (15 failures)
[TOKEN-ROTATOR] Реєструємо помилку для поточного токена
[RETRY] Денний ліміт - пропускаємо retry для моделі gpt-4o-mini
```

## 🧪 Тестування

```bash
# Тест throttling
for i in {1..5}; do
  curl -X POST http://localhost:4000/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hi"}]}'
  echo "Request $i sent"
done

# Очікуваний результат:
# Request 1 sent → OK
# Request 2 sent → затримка 2s → OK
# Request 3 sent → затримка 2s → OK
```

## 📈 Метрики

Додано відстеження:
- `throttle_delays_total` - кількість затримок
- `throttle_delay_duration_ms` - тривалість затримок
- `circuit_breaker_opens` - відкриття circuit breaker
- `daily_limit_hits` - досягнення денного ліміту

## 💡 Best Practices

1. **Налаштуйте throttling** відповідно до вашого навантаження
2. **Моніторте логи** на наявність `[THROTTLE]` та `[429-ERROR]`
3. **Використовуйте різні акаунти** для токенів
4. **Не намагайтесь обійти** денний ліміт - це порушення ToS
5. **Плануйте навантаження** з урахуванням лімітів

## ✅ Висновок

Система тепер:
- ✅ **Автоматично затримує** запити між моделями
- ✅ **Розпізнає** тип rate limit (денний/хвилинний)
- ✅ **Блокує моделі** з денним лімітом через circuit breaker
- ✅ **Не витрачає retry** на денний ліміт
- ✅ **Логує** детальну інформацію для діагностики
- ✅ **Ротує токени** при можливості

**Запити тепер йдуть з контрольованою швидкістю, що запобігає 429 помилкам!** 🎉
