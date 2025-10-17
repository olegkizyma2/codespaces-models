/**
 * Provider Logger
 * Enhanced logging system for provider-specific logs with rotation support
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ProviderLogger {
  constructor(providerName, options = {}) {
    this.providerName = providerName;
    this.logDir = options.logDir || path.join(__dirname, 'logs', 'providers');
    this.maxLogSize = options.maxLogSize || 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = options.maxLogFiles || 5;
    this.logLevel = options.logLevel || 'info'; // debug, info, warn, error
    this.inMemoryLogs = [];
    this.maxInMemoryLogs = options.maxInMemoryLogs || 500;
    
    // Ensure log directory exists
    this.ensureLogDirectory();
  }

  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error(`[PROVIDER-LOGGER] Error creating log directory:`, error);
    }
  }

  getLogFilePath() {
    return path.join(this.logDir, `${this.providerName}.log`);
  }

  getRotatedLogFilePath(index) {
    return path.join(this.logDir, `${this.providerName}.${index}.log`);
  }

  async rotateLogFile() {
    try {
      const currentLog = this.getLogFilePath();
      
      // Check if current log file exists and its size
      try {
        const stats = await fs.stat(currentLog);
        if (stats.size < this.maxLogSize) {
          return; // No rotation needed
        }
      } catch (error) {
        return; // File doesn't exist, no rotation needed
      }

      // Rotate existing files
      for (let i = this.maxLogFiles - 1; i >= 1; i--) {
        const oldPath = this.getRotatedLogFilePath(i);
        const newPath = this.getRotatedLogFilePath(i + 1);
        
        try {
          await fs.rename(oldPath, newPath);
        } catch (error) {
          // File might not exist, continue
        }
      }

      // Rotate current log to .1
      await fs.rename(currentLog, this.getRotatedLogFilePath(1));
      
      console.log(`[PROVIDER-LOGGER] Rotated log file for ${this.providerName}`);
    } catch (error) {
      console.error(`[PROVIDER-LOGGER] Error rotating log file:`, error);
    }
  }

  formatLogEntry(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      provider: this.providerName,
      level: level.toUpperCase(),
      message,
      ...data
    };

    // Keep in memory
    this.inMemoryLogs.unshift(logEntry);
    if (this.inMemoryLogs.length > this.maxInMemoryLogs) {
      this.inMemoryLogs.pop();
    }

    return `${timestamp} [${this.providerName}] ${level.toUpperCase()}: ${message} ${Object.keys(data).length > 0 ? JSON.stringify(data) : ''}\n`;
  }

  async writeToFile(logLine) {
    try {
      // Check if rotation is needed
      await this.rotateLogFile();
      
      // Append to log file
      const logFile = this.getLogFilePath();
      await fs.appendFile(logFile, logLine);
    } catch (error) {
      console.error(`[PROVIDER-LOGGER] Error writing to file:`, error);
    }
  }

  shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  debug(message, data = {}) {
    if (!this.shouldLog('debug')) return;
    const logLine = this.formatLogEntry('debug', message, data);
    console.debug(logLine.trim());
    this.writeToFile(logLine);
  }

  info(message, data = {}) {
    if (!this.shouldLog('info')) return;
    const logLine = this.formatLogEntry('info', message, data);
    console.log(logLine.trim());
    this.writeToFile(logLine);
  }

  warn(message, data = {}) {
    if (!this.shouldLog('warn')) return;
    const logLine = this.formatLogEntry('warn', message, data);
    console.warn(logLine.trim());
    this.writeToFile(logLine);
  }

  error(message, data = {}) {
    if (!this.shouldLog('error')) return;
    const logLine = this.formatLogEntry('error', message, data);
    console.error(logLine.trim());
    this.writeToFile(logLine);
  }

  // Log API request
  logRequest(model, params = {}) {
    this.info('API Request', {
      model,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
      stream: params.stream
    });
  }

  // Log API response
  logResponse(model, status, data = {}) {
    this.info('API Response', {
      model,
      status,
      ...data
    });
  }

  // Log token rotation
  logTokenRotation(fromToken, toToken, reason = '') {
    this.warn('Token Rotation', {
      from: fromToken,
      to: toToken,
      reason
    });
  }

  // Log rate limit
  logRateLimit(model, retryAfter = null) {
    this.warn('Rate Limit Hit', {
      model,
      retry_after: retryAfter
    });
  }

  // Get recent logs
  getRecentLogs(count = 100) {
    return this.inMemoryLogs.slice(0, count);
  }

  // Get logs by level
  getLogsByLevel(level, count = 100) {
    return this.inMemoryLogs
      .filter(log => log.level === level.toUpperCase())
      .slice(0, count);
  }

  // Get error logs
  getErrors(count = 50) {
    return this.getLogsByLevel('error', count);
  }

  // Clear in-memory logs
  clearMemoryLogs() {
    this.inMemoryLogs = [];
  }

  // Read from log file
  async readLogFile(lines = 100) {
    try {
      const logFile = this.getLogFilePath();
      const content = await fs.readFile(logFile, 'utf-8');
      const allLines = content.split('\n').filter(line => line.trim());
      return allLines.slice(-lines);
    } catch (error) {
      return [];
    }
  }
}

// Singleton manager for all provider loggers
class ProviderLoggerManager {
  constructor() {
    this.loggers = new Map();
  }

  getLogger(providerName, options = {}) {
    if (!this.loggers.has(providerName)) {
      this.loggers.set(providerName, new ProviderLogger(providerName, options));
    }
    return this.loggers.get(providerName);
  }

  getAllLoggers() {
    return Array.from(this.loggers.values());
  }

  // Get combined recent logs from all providers
  getAllRecentLogs(count = 200) {
    const allLogs = [];
    for (const logger of this.loggers.values()) {
      allLogs.push(...logger.getRecentLogs());
    }
    // Sort by timestamp
    allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return allLogs.slice(0, count);
  }

  // Get stats from all providers
  getStats() {
    const stats = {};
    for (const [name, logger] of this.loggers.entries()) {
      stats[name] = {
        total_logs: logger.inMemoryLogs.length,
        errors: logger.getErrors(1000).length,
        warnings: logger.getLogsByLevel('warn', 1000).length
      };
    }
    return stats;
  }
}

// Export singleton instance
export const providerLoggerManager = new ProviderLoggerManager();

export default { ProviderLogger, providerLoggerManager };
