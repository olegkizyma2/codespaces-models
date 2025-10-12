/**
 * Token Rotator - Автоматичне переключення між GitHub токенами при rate limit (429)
 * 
 * Функціонал:
 * - Читає всі доступні токени з .env
 * - Автоматично переключається на наступний токен при помилці 429
 * - Відстежує стан кожного токена (активний/заблокований)
 * - Автоматично перезапускає сервер через PM2
 */

import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TokenRotator {
  constructor() {
    this.tokens = [];
    this.currentIndex = 0;
    this.tokenStatus = new Map(); // токен -> { blocked: boolean, blockedUntil: timestamp, failures: number }
    this.envPath = path.join(__dirname, '.env');
    this.rotationLock = false;
    this.maxFailuresBeforeRotation = 3;
    this.blockDuration = 60000; // 1 хвилина блокування токена після 429
  }

  /**
   * Ініціалізація - читання всіх токенів з .env
   */
  async initialize() {
    try {
      const envContent = await fs.readFile(this.envPath, 'utf-8');
      const lines = envContent.split('\n');
      
      // Збираємо всі GITHUB_TOKEN* токени
      this.tokens = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('GITHUB_TOKEN') && trimmed.includes('=')) {
          const [key, value] = trimmed.split('=');
          const token = value.trim();
          if (token && token.startsWith('gho_')) {
            this.tokens.push({ key: key.trim(), value: token });
            this.tokenStatus.set(token, {
              blocked: false,
              blockedUntil: 0,
              failures: 0,
              lastUsed: 0
            });
          }
        }
      }

      // Визначаємо поточний активний токен
      const currentToken = process.env.GITHUB_TOKEN;
      if (currentToken) {
        const index = this.tokens.findIndex(t => t.value === currentToken);
        if (index !== -1) {
          this.currentIndex = index;
        }
      }

      console.log(`[TOKEN-ROTATOR] Ініціалізовано ${this.tokens.length} токенів`);
      console.log(`[TOKEN-ROTATOR] Поточний токен: ${this.tokens[this.currentIndex]?.key}`);
      
      return true;
    } catch (error) {
      console.error('[TOKEN-ROTATOR] Помилка ініціалізації:', error.message);
      return false;
    }
  }

  /**
   * Отримати поточний активний токен
   */
  getCurrentToken() {
    return this.tokens[this.currentIndex];
  }

  /**
   * Зареєструвати помилку 429 для поточного токена
   */
  async recordRateLimitError(token) {
    const status = this.tokenStatus.get(token);
    if (!status) return;

    status.failures++;
    status.lastUsed = Date.now();

    console.log(`[TOKEN-ROTATOR] Помилка 429 для токена ${this.getCurrentToken()?.key}, failures: ${status.failures}`);

    if (status.failures >= this.maxFailuresBeforeRotation) {
      console.log(`[TOKEN-ROTATOR] Токен ${this.getCurrentToken()?.key} досяг ліміту помилок, переключаємось...`);
      await this.rotateToNextToken();
    }
  }

  /**
   * Знайти наступний доступний токен
   */
  findNextAvailableToken() {
    const now = Date.now();
    const startIndex = this.currentIndex;
    
    // Спробуємо знайти незаблокований токен
    for (let i = 0; i < this.tokens.length; i++) {
      const testIndex = (startIndex + i + 1) % this.tokens.length;
      const token = this.tokens[testIndex];
      const status = this.tokenStatus.get(token.value);
      
      // Скидаємо блокування якщо час вийшов
      if (status.blocked && now > status.blockedUntil) {
        status.blocked = false;
        status.failures = 0;
      }
      
      if (!status.blocked) {
        return testIndex;
      }
    }
    
    // Якщо всі заблоковані, беремо токен з найменшою кількістю помилок
    let minFailures = Infinity;
    let bestIndex = (startIndex + 1) % this.tokens.length;
    
    for (let i = 0; i < this.tokens.length; i++) {
      const token = this.tokens[i];
      const status = this.tokenStatus.get(token.value);
      if (status.failures < minFailures) {
        minFailures = status.failures;
        bestIndex = i;
      }
    }
    
    return bestIndex;
  }

  /**
   * Переключитись на наступний доступний токен
   */
  async rotateToNextToken() {
    if (this.rotationLock) {
      console.log('[TOKEN-ROTATOR] Ротація вже виконується, пропускаємо...');
      return false;
    }

    this.rotationLock = true;

    try {
      // Блокуємо поточний токен
      const currentToken = this.tokens[this.currentIndex];
      const currentStatus = this.tokenStatus.get(currentToken.value);
      currentStatus.blocked = true;
      currentStatus.blockedUntil = Date.now() + this.blockDuration;

      // Знаходимо наступний доступний
      const nextIndex = this.findNextAvailableToken();
      const nextToken = this.tokens[nextIndex];

      if (nextIndex === this.currentIndex) {
        console.log('[TOKEN-ROTATOR] Немає доступних токенів для ротації!');
        // Даємо додатковий час для відновлення
        await this.wait(5000);
        this.rotationLock = false;
        return false;
      }

      console.log(`[TOKEN-ROTATOR] Переключаємось з ${currentToken.key} на ${nextToken.key}`);
      
      // Оновлюємо індекс
      this.currentIndex = nextIndex;

      // Оновлюємо .env файл
      await this.updateEnvFile(nextToken);

      // ВАЖЛИВО: Тепер просто оновлюємо токен у process.env
      // Сервер продовжить працювати з новим токеном при наступних запитах
      console.log('[TOKEN-ROTATOR] Токен успішно оновлено у process.env');
      console.log('[TOKEN-ROTATOR] Наступні запити використовуватимуть новий токен');

      this.rotationLock = false;
      return true;

    } catch (error) {
      console.error('[TOKEN-ROTATOR] Помилка при ротації токена:', error.message);
      this.rotationLock = false;
      return false;
    }
  }

  /**
   * Оновити .env файл з новим активним токеном
   */
  async updateEnvFile(newToken) {
    try {
      const envContent = await fs.readFile(this.envPath, 'utf-8');
      const lines = envContent.split('\n');
      
      // Знаходимо перший GITHUB_TOKEN= і оновлюємо його
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('GITHUB_TOKEN=')) {
          lines[i] = `GITHUB_TOKEN=${newToken.value}`;
          break;
        }
      }
      
      await fs.writeFile(this.envPath, lines.join('\n'), 'utf-8');
      console.log(`[TOKEN-ROTATOR] .env файл оновлено з токеном ${newToken.key}`);
      
      // Оновлюємо process.env для поточного процесу
      process.env.GITHUB_TOKEN = newToken.value;
      
    } catch (error) {
      console.error('[TOKEN-ROTATOR] Помилка оновлення .env:', error.message);
      throw error;
    }
  }

  /**
   * Перезапустити сервер через PM2
   */
  async restartServer() {
    try {
      console.log('[TOKEN-ROTATOR] Перезапускаємо сервер через PM2...');
      
      // Спочатку зупиняємо
      try {
        await execAsync('pm2 stop openai-proxy');
      } catch (e) {
        // Ігноруємо помилки зупинки
      }
      
      // Чекаємо трохи
      await this.wait(1000);
      
      // Запускаємо заново
      const { stdout, stderr } = await execAsync('pm2 start ecosystem.config.cjs');
      console.log('[TOKEN-ROTATOR] PM2 вивід:', stdout);
      
      if (stderr) {
        console.error('[TOKEN-ROTATOR] PM2 помилки:', stderr);
      }
      
      // Чекаємо поки сервер запуститься
      await this.wait(3000);
      
      console.log('[TOKEN-ROTATOR] Сервер успішно перезапущено');
      
    } catch (error) {
      console.error('[TOKEN-ROTATOR] Помилка перезапуску PM2:', error.message);
      throw error;
    }
  }

  /**
   * Зареєструвати успішний запит для токена
   */
  recordSuccess(token) {
    const status = this.tokenStatus.get(token);
    if (status) {
      // Поступово зменшуємо лічильник помилок при успішних запитах
      status.failures = Math.max(0, status.failures - 1);
      status.lastUsed = Date.now();
    }
  }

  /**
   * Отримати статистику по всіх токенах
   */
  getStats() {
    const stats = [];
    for (let i = 0; i < this.tokens.length; i++) {
      const token = this.tokens[i];
      const status = this.tokenStatus.get(token.value);
      stats.push({
        key: token.key,
        index: i,
        isCurrent: i === this.currentIndex,
        blocked: status.blocked,
        blockedUntil: status.blocked ? new Date(status.blockedUntil).toISOString() : null,
        failures: status.failures,
        lastUsed: status.lastUsed ? new Date(status.lastUsed).toISOString() : null
      });
    }
    return stats;
  }

  /**
   * Скинути статистику помилок для всіх токенів
   */
  resetStats() {
    for (const status of this.tokenStatus.values()) {
      status.failures = 0;
      status.blocked = false;
      status.blockedUntil = 0;
    }
    console.log('[TOKEN-ROTATOR] Статистика скинута');
  }

  /**
   * Helper для затримки
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let rotatorInstance = null;

export async function getTokenRotator() {
  if (!rotatorInstance) {
    rotatorInstance = new TokenRotator();
    await rotatorInstance.initialize();
  }
  return rotatorInstance;
}

export default TokenRotator;
