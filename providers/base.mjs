/**
 * Base Provider class - defines common interface for all LLM providers
 * Based on goose providers architecture
 */

/**
 * Provider metadata (like Goose ProviderMetadata)
 */
export class ProviderMetadata {
  constructor({
    name,
    displayName,
    description,
    defaultModel,
    knownModels = [],
    modelDocLink = '',
    configKeys = []
  }) {
    this.name = name;
    this.displayName = displayName;
    this.description = description;
    this.defaultModel = defaultModel;
    this.knownModels = knownModels;
    this.modelDocLink = modelDocLink;
    this.configKeys = configKeys;
  }

  static create(name, displayName, description, defaultModel, knownModels = [], modelDocLink = '', configKeys = []) {
    return new ProviderMetadata({
      name,
      displayName,
      description,
      defaultModel,
      knownModels,
      modelDocLink,
      configKeys
    });
  }
}

/**
 * Model information
 */
export class ModelInfo {
  constructor({
    name,
    contextLimit = null,
    inputTokenCost = null,
    outputTokenCost = null,
    currency = 'USD',
    supportsCacheControl = false
  }) {
    this.name = name;
    this.contextLimit = contextLimit;
    this.inputTokenCost = inputTokenCost;
    this.outputTokenCost = outputTokenCost;
    this.currency = currency;
    this.supportsCacheControl = supportsCacheControl;
  }
}

/**
 * Usage tracking (like Goose Usage)
 */
export class Usage {
  constructor({
    inputTokens = 0,
    outputTokens = 0,
    totalTokens = 0,
    cacheCreationTokens = 0,
    cacheReadTokens = 0
  } = {}) {
    this.inputTokens = inputTokens;
    this.outputTokens = outputTokens;
    this.totalTokens = totalTokens || (inputTokens + outputTokens);
    this.cacheCreationTokens = cacheCreationTokens;
    this.cacheReadTokens = cacheReadTokens;
  }

  add(other) {
    return new Usage({
      inputTokens: this.inputTokens + other.inputTokens,
      outputTokens: this.outputTokens + other.outputTokens,
      totalTokens: this.totalTokens + other.totalTokens,
      cacheCreationTokens: this.cacheCreationTokens + (other.cacheCreationTokens || 0),
      cacheReadTokens: this.cacheReadTokens + (other.cacheReadTokens || 0)
    });
  }
}

/**
 * Provider usage (like Goose ProviderUsage)
 */
export class ProviderUsage {
  constructor(providerName, usage) {
    this.providerName = providerName;
    this.usage = usage instanceof Usage ? usage : new Usage(usage);
  }

  static empty(providerName) {
    return new ProviderUsage(providerName, new Usage());
  }
}

/**
 * Provider errors
 */
export class ProviderError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.details = details;
  }

  static authError(message, details) {
    return new ProviderError(message, 'AUTH_ERROR', details);
  }

  static apiError(message, details) {
    return new ProviderError(message, 'API_ERROR', details);
  }

  static rateLimitError(message, details) {
    return new ProviderError(message, 'RATE_LIMIT', details);
  }

  static contextLengthError(message, details) {
    return new ProviderError(message, 'CONTEXT_LENGTH_EXCEEDED', details);
  }
}

export class Provider {
  constructor(config = {}) {
    this.name = config.name || 'unknown';
    this.apiKey = config.apiKey || '';
    this.baseURL = config.baseURL || '';
    this.enabled = config.enabled !== false;
    this.modelPrefix = config.modelPrefix || `ext-${this.name}-`;
    this.model = config.model || null;
    
    // Token rotation support
    // Parse comma-separated tokens from apiKey if provided
    let tokensArray = config.tokens;
    if (!tokensArray && this.apiKey) {
      // Split by comma to support multiple tokens
      const tokenKeys = this.apiKey.split(',').map(t => t.trim()).filter(t => t);
      tokensArray = tokenKeys.map(key => ({
        key: key,
        requestCount: 0,
        errorCount: 0,
        active: false,
        lastUsed: null
      }));
      // Set first token as active
      if (tokensArray.length > 0) {
        tokensArray[0].active = true;
        this.apiKey = tokensArray[0].key; // Set first token as current
      }
    }
    
    this.tokens = tokensArray || [];
    this.currentTokenIndex = 0;
    this.requestCount = 0;
    this.rotationInterval = config.rotationInterval || 10; // Rotate every 10 requests by default
    this.autoRotateOnError = config.autoRotateOnError !== false; // Auto-rotate on errors by default
  }

  /**
   * Static metadata method (like Goose) - must be implemented by each provider
   * @returns {ProviderMetadata}
   */
  static metadata() {
    throw new Error('metadata() must be implemented by provider');
  }

  /**
   * Create provider from environment variables (like Goose from_env)
   * @param {Object} modelConfig - Model configuration
   * @returns {Promise<Provider>}
   */
  static async fromEnv(modelConfig = {}) {
    throw new Error('fromEnv() must be implemented by provider');
  }

  /**
   * Get model configuration
   * @returns {Object} Model config
   */
  getModelConfig() {
    return this.model;
  }

  /**
   * Get list of available models from this provider
   * @returns {Promise<Array>} Array of model objects
   */
  async getModels() {
    throw new Error('getModels() must be implemented by provider');
  }

  /**
   * Fetch supported models from provider API (like Goose)
   * @returns {Promise<Array<string>|null>} Array of model names or null
   */
  async fetchSupportedModels() {
    return null; // Override in providers that support dynamic model discovery
  }

  /**
   * Send chat completion request
   * @param {Object} params - Chat completion parameters
   * @returns {Promise<{response: Object, usage: ProviderUsage}>}
   */
  async chatCompletion(params) {
    throw new Error('chatCompletion() must be implemented by provider');
  }

  /**
   * Complete with specific model (like Goose complete_with_model)
   * @param {Object} modelConfig - Model configuration
   * @param {string} system - System prompt
   * @param {Array} messages - Conversation messages
   * @param {Array} tools - Available tools
   * @returns {Promise<{message: Object, usage: ProviderUsage}>}
   */
  async completeWithModel(modelConfig, system, messages, tools = []) {
    // Default implementation using chatCompletion
    const allMessages = system ? [{ role: 'system', content: system }, ...messages] : messages;
    const params = {
      model: modelConfig.model || this.model,
      messages: allMessages,
      temperature: modelConfig.temperature,
      max_tokens: modelConfig.maxTokens,
      tools: tools.length > 0 ? tools : undefined
    };

    const result = await this.chatCompletion(params);
    return {
      message: result.choices?.[0]?.message || result.message,
      usage: result.usage instanceof ProviderUsage ? result.usage : ProviderUsage.empty(this.name)
    };
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
   * Check if provider supports streaming
   * @returns {boolean}
   */
  supportsStreaming() {
    return true; // Most providers support streaming
  }

  /**
   * Check if provider supports embeddings
   * @returns {boolean}
   */
  supportsEmbeddings() {
    return false; // Override in providers that support embeddings
  }

  /**
   * Create embeddings for texts
   * @param {Array<string>} texts - Texts to embed
   * @returns {Promise<Array<Array<number>>>} Embeddings
   */
  async createEmbeddings(texts) {
    throw new ProviderError('Embeddings not supported', 'NOT_SUPPORTED');
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

  /**
   * Get configuration from environment (helper)
   * @param {string} key - Environment variable key
   * @param {string} defaultValue - Default value if not found
   * @returns {string}
   */
  static getEnvConfig(key, defaultValue = '') {
    return process.env[key] || defaultValue;
  }

  /**
   * Get secret from environment (required)
   * @param {string} key - Environment variable key
   * @returns {string}
   * @throws {ProviderError} If secret not found
   */
  static getEnvSecret(key) {
    const value = process.env[key];
    if (!value) {
      throw ProviderError.authError(`Missing required environment variable: ${key}`);
    }
    return value;
  }
  
  // ========== TOKEN ROTATION METHODS ==========
  
  /**
   * Get current active token
   * @returns {string|null} Current token or null
   */
  getCurrentToken() {
    if (this.tokens.length === 0) return null;
    const token = this.tokens[this.currentTokenIndex];
    return token ? token.key : null;
  }
  
  /**
   * Add a new token to the rotation pool
   * @param {string} tokenKey - Token to add
   */
  addToken(tokenKey) {
    if (!tokenKey) return;
    
    // Check if token already exists
    const exists = this.tokens.some(t => t.key === tokenKey);
    if (exists) {
      console.log(`[${this.name}] Token already exists`);
      return;
    }
    
    this.tokens.push({
      key: tokenKey,
      requestCount: 0,
      errorCount: 0,
      active: true,
      lastUsed: null
    });
    
    console.log(`[${this.name}] Token added, total: ${this.tokens.length}`);
    
    // Update apiKey if this is the first token
    if (this.tokens.length === 1) {
      this.apiKey = tokenKey;
    }
  }
  
  /**
   * Remove token by index
   * @param {number} index - Index of token to remove
   */
  removeToken(index) {
    if (index < 0 || index >= this.tokens.length) {
      throw new Error('Invalid token index');
    }
    
    this.tokens.splice(index, 1);
    console.log(`[${this.name}] Token removed, remaining: ${this.tokens.length}`);
    
    // Adjust current index if needed
    if (this.currentTokenIndex >= this.tokens.length) {
      this.currentTokenIndex = 0;
    }
    
    // Update apiKey
    if (this.tokens.length > 0) {
      this.apiKey = this.tokens[this.currentTokenIndex].key;
    } else {
      this.apiKey = '';
    }
  }
  
  /**
   * Rotate to next token in pool
   * @returns {string|null} New current token
   */
  rotateToken() {
    if (this.tokens.length <= 1) {
      console.log(`[${this.name}] Cannot rotate, only ${this.tokens.length} token(s)`);
      return this.getCurrentToken();
    }
    
    // Move to next token
    this.currentTokenIndex = (this.currentTokenIndex + 1) % this.tokens.length;
    const newToken = this.tokens[this.currentTokenIndex];
    
    if (newToken) {
      this.apiKey = newToken.key;
      newToken.active = true;
      newToken.lastUsed = new Date();
      console.log(`[${this.name}] Token rotated to index ${this.currentTokenIndex}`);
    }
    
    return this.getCurrentToken();
  }
  
  /**
   * Get token statistics
   * @returns {Array} Array of token stats
   */
  getTokenStats() {
    return this.tokens.map((token, index) => ({
      key: token.key.substring(0, 8) + '...' + token.key.substring(token.key.length - 4),
      requestCount: token.requestCount || 0,
      errorCount: token.errorCount || 0,
      active: index === this.currentTokenIndex,
      lastUsed: token.lastUsed
    }));
  }
  
  /**
   * Track request and auto-rotate if needed
   * @param {boolean} isError - Whether this request resulted in an error
   */
  trackRequest(isError = false) {
    if (this.tokens.length === 0) return;
    
    const currentToken = this.tokens[this.currentTokenIndex];
    if (currentToken) {
      currentToken.requestCount = (currentToken.requestCount || 0) + 1;
      currentToken.lastUsed = new Date();
      
      if (isError) {
        currentToken.errorCount = (currentToken.errorCount || 0) + 1;
        
        // Auto-rotate on error if enabled and multiple tokens available
        if (this.autoRotateOnError && this.tokens.length > 1) {
          console.log(`[${this.name}] Error detected, auto-rotating token...`);
          this.rotateToken();
          return;
        }
      }
    }
    
    // Increment global request count
    this.requestCount++;
    
    // Check if rotation interval reached
    if (this.tokens.length > 1 && this.requestCount % this.rotationInterval === 0) {
      console.log(`[${this.name}] Rotation interval (${this.rotationInterval}) reached, rotating token...`);
      this.rotateToken();
    }
  }
  
  /**
   * Wrap API call with request tracking
   * @param {Function} apiCall - Async function to call
   * @returns {Promise} Result of API call
   */
  async withRequestTracking(apiCall) {
    try {
      const result = await apiCall();
      this.trackRequest(false); // Success
      return result;
    } catch (error) {
      this.trackRequest(true); // Error
      throw error;
    }
  }
}

export default Provider;
