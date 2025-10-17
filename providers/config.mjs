/**
 * Provider Configuration Manager
 * Handles loading and saving provider configurations from/to .env
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

export class ProviderConfigManager {
  constructor(envPath = '.env') {
    this.envPath = envPath;
    this.config = {};
    this.loadConfig();
  }

  /**
   * Load configuration from .env file
   */
  loadConfig() {
    try {
      dotenv.config({ path: this.envPath });
      
      // Parse provider configurations from environment variables
      this.config = {
        anthropic: {
          enabled: this.getBoolEnv('ANTHROPIC_ENABLED', false),
          apiKey: process.env.ANTHROPIC_API_KEY,
          baseURL: process.env.ANTHROPIC_BASE_URL
        },
        openai: {
          enabled: this.getBoolEnv('EXT_OPENAI_ENABLED', false),
          apiKey: process.env.EXT_OPENAI_API_KEY,
          baseURL: process.env.EXT_OPENAI_BASE_URL
        },
        azure: {
          enabled: this.getBoolEnv('AZURE_OPENAI_ENABLED', false),
          apiKey: process.env.AZURE_OPENAI_API_KEY,
          baseURL: process.env.AZURE_OPENAI_ENDPOINT,
          apiVersion: process.env.AZURE_OPENAI_API_VERSION,
          deployment: process.env.AZURE_OPENAI_DEPLOYMENT
        },
        ollama: {
          enabled: this.getBoolEnv('OLLAMA_ENABLED', false),
          baseURL: process.env.OLLAMA_BASE_URL
        },
        google: {
          enabled: this.getBoolEnv('GOOGLE_AI_ENABLED', false),
          apiKey: process.env.GOOGLE_API_KEY,
          baseURL: process.env.GOOGLE_BASE_URL
        },
        openrouter: {
          enabled: this.getBoolEnv('OPENROUTER_ENABLED', false),
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: process.env.OPENROUTER_BASE_URL
        }
      };

      console.log('[PROVIDER-CONFIG] Configuration loaded from', this.envPath);
    } catch (error) {
      console.error('[PROVIDER-CONFIG] Error loading configuration:', error);
    }
  }

  /**
   * Get boolean value from environment variable
   * @param {string} key - Environment variable name
   * @param {boolean} defaultValue - Default value if not set
   * @returns {boolean}
   */
  getBoolEnv(key, defaultValue = false) {
    const value = process.env[key];
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }

  /**
   * Get configuration for all providers
   * @returns {Object} Provider configurations
   */
  getConfig() {
    return this.config;
  }

  /**
   * Get configuration for specific provider
   * @param {string} providerName - Provider name
   * @returns {Object} Provider configuration
   */
  getProviderConfig(providerName) {
    return this.config[providerName] || {};
  }

  /**
   * Update provider configuration
   * @param {string} providerName - Provider name
   * @param {Object} config - New configuration
   * @returns {boolean} Success status
   */
  updateProviderConfig(providerName, config) {
    try {
      this.config[providerName] = {
        ...this.config[providerName],
        ...config
      };

      // Update in-memory environment variables
      const envPrefix = this.getEnvPrefix(providerName);
      if (config.enabled !== undefined) {
        process.env[`${envPrefix}_ENABLED`] = config.enabled ? '1' : '0';
      }
      if (config.apiKey !== undefined) {
        process.env[`${envPrefix}_API_KEY`] = config.apiKey;
      }
      if (config.baseURL !== undefined) {
        process.env[`${envPrefix}_BASE_URL`] = config.baseURL;
      }

      console.log(`[PROVIDER-CONFIG] Updated configuration for ${providerName}`);
      return true;
    } catch (error) {
      console.error(`[PROVIDER-CONFIG] Error updating configuration for ${providerName}:`, error);
      return false;
    }
  }

  /**
   * Save configuration to .env file
   * @returns {boolean} Success status
   */
  saveConfig() {
    try {
      let envContent = '';

      // Read existing .env file to preserve other variables
      if (fs.existsSync(this.envPath)) {
        envContent = fs.readFileSync(this.envPath, 'utf8');
      }

      // Update or add provider configurations
      for (const [providerName, config] of Object.entries(this.config)) {
        const envPrefix = this.getEnvPrefix(providerName);
        
        envContent = this.updateEnvLine(envContent, `${envPrefix}_ENABLED`, config.enabled ? '1' : '0');
        
        if (config.apiKey) {
          envContent = this.updateEnvLine(envContent, `${envPrefix}_API_KEY`, config.apiKey);
        }
        
        if (config.baseURL) {
          envContent = this.updateEnvLine(envContent, `${envPrefix}_BASE_URL`, config.baseURL);
        }

        // Provider-specific configs
        if (providerName === 'azure') {
          if (config.apiVersion) {
            envContent = this.updateEnvLine(envContent, 'AZURE_OPENAI_API_VERSION', config.apiVersion);
          }
          if (config.deployment) {
            envContent = this.updateEnvLine(envContent, 'AZURE_OPENAI_DEPLOYMENT', config.deployment);
          }
        }
      }

      fs.writeFileSync(this.envPath, envContent);
      console.log('[PROVIDER-CONFIG] Configuration saved to', this.envPath);
      return true;
    } catch (error) {
      console.error('[PROVIDER-CONFIG] Error saving configuration:', error);
      return false;
    }
  }

  /**
   * Get environment variable prefix for provider
   * @param {string} providerName - Provider name
   * @returns {string} Environment variable prefix
   */
  getEnvPrefix(providerName) {
    const prefixMap = {
      'anthropic': 'ANTHROPIC',
      'openai': 'EXT_OPENAI',
      'azure': 'AZURE_OPENAI',
      'ollama': 'OLLAMA',
      'google': 'GOOGLE_AI',
      'openrouter': 'OPENROUTER'
    };
    return prefixMap[providerName] || providerName.toUpperCase();
  }

  /**
   * Update or add line in .env content
   * @param {string} content - Current .env content
   * @param {string} key - Environment variable key
   * @param {string} value - Environment variable value
   * @returns {string} Updated content
   */
  updateEnvLine(content, key, value) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const line = `${key}=${value}`;
    
    if (regex.test(content)) {
      return content.replace(regex, line);
    } else {
      return content + (content.endsWith('\n') ? '' : '\n') + line + '\n';
    }
  }
}

export default ProviderConfigManager;
