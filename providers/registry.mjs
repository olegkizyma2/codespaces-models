/**
 * Provider Registry - manages all available providers
 */
import { AnthropicProvider } from './anthropic.mjs';
import { OpenAIProvider } from './openai.mjs';
import { AzureProvider } from './azure.mjs';
import { OllamaProvider } from './ollama.mjs';
import { GoogleProvider } from './google.mjs';
import { OpenRouterProvider } from './openrouter.mjs';

export class ProviderRegistry {
  constructor() {
    this.providers = new Map();
    this.availableProviders = {
      'anthropic': AnthropicProvider,
      'openai': OpenAIProvider,
      'azure': AzureProvider,
      'ollama': OllamaProvider,
      'google': GoogleProvider,
      'openrouter': OpenRouterProvider
    };
  }

  /**
   * Register a provider instance
   * @param {string} name - Provider name
   * @param {Provider} provider - Provider instance
   */
  register(name, provider) {
    this.providers.set(name, provider);
    console.log(`[PROVIDER-REGISTRY] Registered provider: ${name}`);
  }

  /**
   * Get provider by name
   * @param {string} name - Provider name
   * @returns {Provider|null}
   */
  get(name) {
    return this.providers.get(name) || null;
  }

  /**
   * Get all registered providers
   * @returns {Array} Array of provider instances
   */
  getAll() {
    return Array.from(this.providers.values());
  }

  /**
   * Get enabled providers
   * @returns {Array} Array of enabled provider instances
   */
  getEnabled() {
    return this.getAll().filter(p => p.enabled);
  }

  /**
   * Find provider that handles a specific model
   * @param {string} modelName - Model name to check
   * @returns {Provider|null}
   */
  findProviderForModel(modelName) {
    for (const provider of this.providers.values()) {
      if (provider.enabled && provider.handlesModel(modelName)) {
        return provider;
      }
    }
    return null;
  }

  /**
   * Get all available models from all enabled providers
   * @returns {Promise<Array>} Array of all models
   */
  async getAllModels() {
    const enabledProviders = this.getEnabled();
    const modelPromises = enabledProviders.map(async (provider) => {
      try {
        const models = await provider.getModels();
        return models;
      } catch (error) {
        console.error(`[PROVIDER-REGISTRY] Error fetching models from ${provider.name}:`, error);
        return [];
      }
    });

    const modelArrays = await Promise.all(modelPromises);
    return modelArrays.flat();
  }

  /**
   * Get status of all providers
   * @returns {Array} Array of provider statuses
   */
  getStatus() {
    return this.getAll().map(provider => provider.getStatus());
  }

  /**
   * Initialize providers from configuration
   * @param {Object} config - Configuration object with provider settings
   */
  initializeFromConfig(config = {}) {
    console.log('[PROVIDER-REGISTRY] Initializing providers from config');
    
    for (const [name, ProviderClass] of Object.entries(this.availableProviders)) {
      try {
        const providerConfig = config[name] || {};
        
        // Check if provider is explicitly disabled
        if (providerConfig.enabled === false) {
          console.log(`[PROVIDER-REGISTRY] Provider ${name} is disabled in config`);
          continue;
        }

        const provider = new ProviderClass(providerConfig);
        
        // Validate provider configuration
        const validation = provider.validate();
        if (!validation.valid) {
          console.log(`[PROVIDER-REGISTRY] Provider ${name} validation failed:`, validation.errors);
          provider.enabled = false;
        }
        
        this.register(name, provider);
      } catch (error) {
        console.error(`[PROVIDER-REGISTRY] Error initializing provider ${name}:`, error);
      }
    }

    const enabledCount = this.getEnabled().length;
    console.log(`[PROVIDER-REGISTRY] Initialized ${this.providers.size} providers (${enabledCount} enabled)`);
  }

  /**
   * Get list of available provider types
   * @returns {Array} Array of provider type names
   */
  getAvailableProviderTypes() {
    return Object.keys(this.availableProviders);
  }
}

export default ProviderRegistry;
