# 🔴 ДИАГНОСТИКА: Проблема с GitHub Токенами

## Проблема
При попытке запроса к GitHub Models API получаем ошибку **401 Unauthorized** или **0 моделей**.

## Симптомы
```
❌ Error: 401 - Incorrect API key provided: gho_Ooti****Qw3G
❌ Models list received! Total: 0 models
```

## Причины
1. **GitHub токены невалидные или заблокированные** - текущие токены в `.env` не работают
2. **Токены истекли** - срок действия токенов закончился
3. **Токены отозваны** - пользователь удалил токены в GitHub
4. **Неверные разрешения** - токены не имеют доступа к GitHub Models API

## Текущие токены в `.env`
```
GITHUB_TOKEN=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          ❌ НЕ РАБОТАЕТ
GITHUB_TOKEN2=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        ❌ НЕ РАБОТАЕТ
GITHUB_TOKEN3=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        ❌ НЕ РАБОТАЕТ
GITHUB_TOKEN4=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        ❌ НЕ РАБОТАЕТ
```

## Решение

### Шаг 1: Создать новый GitHub Personal Access Token (PAT)
1. Откройте https://github.com/settings/tokens/new
2. Дайте токену имя (например: "GitHub Models API")
3. Выберите срок действия (рекомендуется 90 дней или больше)
4. **НЕ выбирайте никакие области видимости (scopes)** - это нормально для GitHub Models API
5. Нажмите "Generate token" и скопируйте значение

### Шаг 2: Обновить `.env` файл
```bash
GITHUB_TOKEN=<новый_токен>
```

### Шаг 3: Перезагрузить сервер
```bash
pkill -f "node server.js"
node server.js &
```

### Шаг 4: Протестировать
```bash
node test-tokens.mjs
```

## Требования для GitHub Models API
- ✅ Valid GitHub PAT token (Personal Access Token)
- ✅ Аккаунт с активным планом (не обязательно платным)
- ✅ Стабильное интернет соединение
- ✅ No specific scopes required (unlike other GitHub APIs)

## Дополнительная информация
Документация: https://github.com/marketplace/models/

## Примечание
Все текущие токены в файле вернули пустой список моделей, что указывает на то, что они либо:
- Никогда не работали
- Были отозваны
- Заблокированы GitHub

**Требуется немедленное действие - создать новый валидный токен!**
