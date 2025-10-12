# ⚡ Швидкий старт - Управління сервером

## 🎯 Найчастіші команди

### З папки проекту:
```bash
./manage-server.sh restart   # Перезапустити
./manage-server.sh status    # Статус
./manage-server.sh logs      # Логи (Ctrl+C вихід)
./manage-server.sh tokens    # Токени
```

### З будь-якої папки (після alias):
```bash
manage-server restart
manage-server status
```

## 📦 Налаштування alias (один раз)

```bash
# Додайте в ~/.zshrc
echo 'alias manage-server="/Users/dev/Documents/NIMDA/codespaces-models/manage-server.sh"' >> ~/.zshrc
source ~/.zshrc

# Тепер працює з будь-якої папки!
cd ~/Downloads
manage-server status ✅
```

## 🚀 Типові сценарії

### 1. Перезапуск (найчастіше)
```bash
./manage-server.sh restart
```

### 2. Додали токен в .env
```bash
# Після редагування .env
./manage-server.sh reload  # ← не restart!
./manage-server.sh tokens  # перевірка
```

### 3. Дивимось що відбувається
```bash
./manage-server.sh logs
```

### 4. Перевірка статусу
```bash
./manage-server.sh status
```

## 📋 Всі команди

| Команда | Коли | Опис |
|---------|------|------|
| `restart` | Після змін коду | Швидкий перезапуск |
| `reload` | Після змін .env | Повний перезапуск |
| `status` | Перевірка | Статус системи та токенів |
| `logs` | Моніторинг | Логи в реальному часі |
| `errors` | Проблеми | Останні помилки |
| `tokens` | Токени | Детальний статус |
| `test` | Перевірка | Запустити тести |
| `flush` | Великі логи | Очистити логи |

## 🌐 Web інтерфейси

```
http://localhost:4000         # Головна (Simple Chat)
http://localhost:4000/monitor # Моніторинг
http://localhost:4000/classic # Classic UI
http://localhost:4000/health  # Health check
```

## 🔑 API токенів

```bash
# Статус
curl http://localhost:4000/v1/tokens/stats | jq

# Ручна ротація
curl -X POST http://localhost:4000/v1/tokens/rotate

# Скинути статистику
curl -X POST http://localhost:4000/v1/tokens/reset-stats
```

## 📚 Повна документація

Детальна інструкція: [УПРАВЛІННЯ_СЕРВЕРОМ.md](./УПРАВЛІННЯ_СЕРВЕРОМ.md)

---

**Швидка довідка**: `./manage-server.sh help`
