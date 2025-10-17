/**
 * Base Provider class - defines common interface for all LLM providers
 * Based on goose providers architecture
 */

export class Provider {
  constructor(config = {}) {
    this.name = config.name || 'unknown';
    this.apiKey = config.apiKey || '';
    this.baseURL = config.baseURL || '';
    this.enabled = config.enabled !== false;
    this.modelPrefix = config.modelPrefix || `ext-${this.name}-`;
  }

  /**
   * Get list of available models from this provider
   * @returns {Promise<Array>} Array of model objects
   */
  async getModels() {
    throw new Error('getModels() must be implemented by provider');
  }

  /**
   * Send chat completion request
   * @param {Object} params - Chat completion parameters
   * @returns {Promise<Object>} Chat completion response
   */
  async chatCompletion(params) {
    throw new Error('chatCompletion() must be implemented by provider');
  }

  /**
   * Stream chat completion request
   * @param {Object} params - Chat completion parameters
   * @returns {AsyncIterator} Stream of chat completion chunks
   */
  async *streamChatCompletion(params) {
    throw new Error('streamChatCompletion() must be implemented by provider');
  }

  /**
   * Validate provider configuration
   * @returns {Object} Validation result with { valid: boolean, errors: Array }
   */
  validate() {
    const errors = [];
    
    if (!this.apiKey && this.requiresApiKey()) {
      errors.push(`API key required for ${this.name}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if provider requires API key
   * @returns {boolean}
   */
  requiresApiKey() {
    return true; // Most providers require API key
  }

  /**
   * Get provider status
   * @returns {Object} Provider status
   */
  getStatus() {
    const validation = this.validate();
    return {
      name: this.name,
      enabled: this.enabled,
      configured: validation.valid,
      errors: validation.errors
    };
  }

  /**
   * Transform model name with prefix
   * @param {string} modelName - Original model name
   * @returns {string} Prefixed model name
   */
  getPrefixedModelName(modelName) {
    return `${this.modelPrefix}${modelName}`;
  }

  /**
   * Remove prefix from model name
   * @param {string} prefixedName - Prefixed model name
   * @returns {string} Original model name
   */
  getOriginalModelName(prefixedName) {
    if (prefixedName.startsWith(this.modelPrefix)) {
      return prefixedName.substring(this.modelPrefix.length);
    }
    return prefixedName;
  }

  /**
   * Check if this provider handles the given model
   * @param {string} modelName - Model name to check
   * @returns {boolean}
   */
  handlesModel(modelName) {
    return modelName && modelName.startsWith(this.modelPrefix);
  }
}

export default Provider;
