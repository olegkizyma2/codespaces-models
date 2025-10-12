# 🎯 Короткий звіт: Префікси моделей

## Питання
> Чому `gpt-4o-mini` працює без префікса `openai/`?

## Відповідь
**GitHub Models API автоматично нормалізує назви!**

---

## ✅ Що працює

### Обидва варіанти:
```bash
# БЕЗ префікса
"model": "gpt-4o-mini"         ✅ Працює

# З префіксом
"model": "openai/gpt-4o-mini"  ✅ Працює
```

### Тестування:
```bash
# Тест 1: без префікса
curl -X POST http://localhost:4000/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "test"}]}'
# ✅ Успішно!

# Тест 2: з префіксом
curl -X POST http://localhost:4000/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model": "openai/gpt-4o-mini", "messages": [{"role": "user", "content": "test"}]}'
# ✅ Успішно!
```

---

## 🔍 Як це працює

### Потік запиту:
```
Клієнт → server.js → OpenAI SDK → GitHub Models API
         ↓                         ↓
    "gpt-4o-mini"           "gpt-4o-mini"
                                   ↓
                         Автонормалізація:
                         "gpt-4o-mini" → "openai/gpt-4o-mini"
```

### GitHub Models API:
- ✅ Розпізнає короткі назви
- ✅ Автоматично додає префікс
- ✅ Підтримує і повні назви

---

## 📊 Приклади

### Офіційні назви (з API):
```bash
curl http://localhost:4000/v1/models | jq '.data[] | .id' | grep gpt
```
```
"openai/gpt-4o"
"openai/gpt-4o-mini"
"openai/o1-preview"
```

### Короткі назви (працюють також):
```
gpt-4o
gpt-4o-mini
o1-preview
phi-4
llama-3.1-405b
```

---

## 💡 Рекомендації

### Використовуйте що зручніше:

**Коротко** (для швидких тестів):
```bash
"model": "gpt-4o-mini"
```

**Повністю** (для явності):
```bash
"model": "openai/gpt-4o-mini"
```

**Обидва варіанти працюють однаково!**

---

## 📁 Детальна документація

Дивіться: `MODEL_PREFIX_EXPLANATION.md`

---

**Висновок**: Це фіча GitHub Models API для зручності. Можна використовувати короткі назви, API автоматично додасть префікс. 🎉
