/**
 * ATLAS Provider
 * Groups 58 GitHub Models API models into a single provider
 * Supports token rotation for high availability
 */
import { Provider } from './base.mjs';
import OpenAI from 'openai';

export class ATLASProvider extends Provider {
  /**
   * Перевизначає чи цей провайдер обробляє модель (з префіксом або без)
   */
  handlesModel(modelName) {
    if (!modelName) return false;
    // Дозволяємо як atlas-<model>, так і просто <model> з getGitHubModels
    if (modelName.startsWith(this.modelPrefix)) return true;
    // Без префікса, але є в списку моделей (без префікса)
    const allModels = this.getGitHubModels().map(m => {
      const parts = m.split('/');
      return parts[1] || parts[0];
    });
    return allModels.includes(modelName);
  }
  constructor(config = {}) {
    super({
      name: 'atlas',
      apiKey: config.apiKey || process.env.GITHUB_TOKEN,
      baseURL: config.baseURL || process.env.ATLAS_BASE_URL || 'https://models.inference.ai.azure.com',
      modelPrefix: 'atlas-',
      ...config
    });
    
    // Support for multiple GitHub tokens (rotation)
    this.tokens = [];
    this.currentTokenIndex = 0;
    this.initializeTokens(config);
    
    // OpenAI client for GitHub Models
    this.client = null;
    this.updateClient();
  }

  /**
   * Initialize token rotation support
   */
  initializeTokens(config) {
    // Collect all GITHUB_TOKEN* from environment
    const tokenKeys = Object.keys(process.env)
      .filter(key => key.startsWith('GITHUB_TOKEN'))
      .sort(); // Sort to ensure consistent order
    
    for (const key of tokenKeys) {
      const token = process.env[key];
      if (token && token.trim() && (token.startsWith('gho_') || token.startsWith('ghp_') || token.startsWith('ghu_'))) {
        this.tokens.push({
          key,
          value: token.trim(),
          blocked: false,
          blockedUntil: 0,
          failures: 0,
          lastUsed: 0
        });
      }
    }

    console.log(`[ATLAS] Initialized with ${this.tokens.length} GitHub tokens`);
  }

  /**
   * Get current active token
   */
  getCurrentToken() {
    if (this.tokens.length === 0) return null;
    
    const now = Date.now();
    const current = this.tokens[this.currentTokenIndex];
    
    // Check if current token is blocked
    if (current.blocked && current.blockedUntil > now) {
      // Try to find next available token
      const availableIndex = this.tokens.findIndex((t, idx) => 
        idx !== this.currentTokenIndex && (!t.blocked || t.blockedUntil <= now)
      );
      
      if (availableIndex !== -1) {
        console.log(`[ATLAS] Switching from blocked token to index ${availableIndex}`);
        this.currentTokenIndex = availableIndex;
        this.updateClient();
        return this.tokens[availableIndex].value;
      }
    }
    
    return current.value;
  }

  /**
   * Update OpenAI client with current token
   */
  updateClient() {
    const token = this.getCurrentToken();
    if (token) {
      this.client = new OpenAI({
        baseURL: this.baseURL,
        apiKey: token
      });
    }
  }

  /**
   * Rotate to next token (on rate limit)
   */
  rotateToken() {
    if (this.tokens.length <= 1) {
      console.log('[ATLAS] No additional tokens available for rotation');
      return;
    }

    const currentToken = this.tokens[this.currentTokenIndex];
    currentToken.blocked = true;
    currentToken.blockedUntil = Date.now() + 60000; // Block for 1 minute
    currentToken.failures++;

    this.currentTokenIndex = (this.currentTokenIndex + 1) % this.tokens.length;
    this.updateClient();
    
    console.log(`[ATLAS] Rotated to token ${this.tokens[this.currentTokenIndex].key}`);
  }

  /**
   * All 58 GitHub Models
   */
  getGitHubModels() {
    return [
      "ai21-jamba-1.5-large",
      "ai21-jamba-1.5-mini",
      "cohere-command-a",
      "cohere-command-r-08-2024",
      "cohere-command-r-plus-08-2024",
      "cohere-embed-v3-english",
      "cohere-embed-v3-multilingual",
      "jais-30b-chat",
      "deepseek-r1",
      "deepseek-r1-0528",
      "deepseek-v3-0324",
      "llama-3.2-11b-vision-instruct",
      "llama-3.2-90b-vision-instruct",
      "llama-3.3-70b-instruct",
      "llama-4-maverick-17b-128e-instruct-fp8",
      "llama-4-scout-17b-16e-instruct",
      "meta-llama-3.1-405b-instruct",
      "meta-llama-3.1-8b-instruct",
      "mai-ds-r1",
      "phi-3-medium-128k-instruct",
      "phi-3-medium-4k-instruct",
      "phi-3-mini-128k-instruct",
      "phi-3-mini-4k-instruct",
      "phi-3-small-128k-instruct",
      "phi-3-small-8k-instruct",
      "phi-3.5-mini-instruct",
      "phi-3.5-moe-instruct",
      "phi-3.5-vision-instruct",
      "phi-4",
      "phi-4-mini-instruct",
      "phi-4-mini-reasoning",
      "phi-4-multimodal-instruct",
      "phi-4-reasoning",
      "codestral-2501",
      "ministral-3b",
      "mistral-large-2411",
      "mistral-medium-2505",
      "mistral-nemo",
      "mistral-small-2503",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-5",
      "gpt-5-chat",
      "gpt-5-mini",
      "gpt-5-nano",
      "o1",
      "o1-mini",
      "o1-preview",
      "o3",
      "o3-mini",
      "o4-mini",
      "text-embedding-3-large",
      "text-embedding-3-small",
      "grok-3",
      "grok-3-mini"
    ];
  }

  async getModels() {
    const githubModels = this.getGitHubModels();
    
    return githubModels.map(id => ({
      id: this.getPrefixedModelName(id),
      original_id: id,
      object: 'model',
      created: 1677610602,
      owned_by: id.split('/')[0],
      provider: 'atlas'
    }));
  }

  async chatCompletion(params) {
    const { model, messages, temperature, max_tokens, stream = false, ...rest } = params;
    // Дозволяємо як atlas-<model>, так і просто <model> (без префікса)
    let originalModel = this.getOriginalModelName(model);
    // Якщо model не містить префікса і не містить '/', але є в списку моделей — знайти повний id
    if (!model.startsWith(this.modelPrefix) && !model.includes('/')) {
      const found = this.getGitHubModels().find(m => {
        const parts = m.split('/');
        return parts[1] === model;
      });
      if (found) originalModel = found;
    }
    const token = this.getCurrentToken();

    if (!token) {
      throw new Error('No ATLAS token available');
    }

    if (!this.client) {
      this.updateClient();
    }

    try {
      const response = await this.client.chat.completions.create({
        model: originalModel,
        messages,
        temperature,
        max_tokens,
        stream,
        ...rest
      });

      // If not streaming, format response
      if (!stream) {
        return {
          ...response,
          model: this.getPrefixedModelName(originalModel)
        };
      }

      return response;
    } catch (error) {
      // Handle rate limit
      if (error.status === 429 || error.message?.includes('429')) {
        console.log('[ATLAS] Rate limit hit, rotating token');
        this.rotateToken();
        throw new Error('Rate limit exceeded, token rotated. Please retry.');
      }
      
      console.error('[ATLAS] Error:', error.message);
      throw error;
    }
  }

  async *streamChatCompletion(params) {
    const { model, messages, temperature, max_tokens, ...rest } = params;
    const originalModel = this.getOriginalModelName(model);
    const token = this.getCurrentToken();

    if (!token) {
      throw new Error('No ATLAS token available');
    }

    if (!this.client) {
      this.updateClient();
    }

    try {
      const stream = await this.client.chat.completions.create({
        model: originalModel,
        messages,
        temperature,
        max_tokens,
        stream: true,
        ...rest
      });

      for await (const chunk of stream) {
        yield {
          ...chunk,
          model: this.getPrefixedModelName(originalModel)
        };
      }
    } catch (error) {
      if (error.status === 429 || error.message?.includes('429')) {
        console.log('[ATLAS] Rate limit hit in stream, rotating token');
        this.rotateToken();
        throw new Error('Rate limit exceeded, token rotated. Please retry.');
      }
      
      console.error('[ATLAS] Stream error:', error.message);
      throw error;
    }
  }

  /**
   * Override requiresApiKey - ATLAS needs GitHub token
   */
  requiresApiKey() {
    return true;
  }

  /**
   * Get token statistics
   */
  getTokenStats() {
    return this.tokens.map((token, idx) => ({
      key: token.key,
      active: idx === this.currentTokenIndex,
      blocked: token.blocked,
      blockedUntil: token.blockedUntil,
      failures: token.failures,
      lastUsed: token.lastUsed
    }));
  }

  /**
   * Record successful request
   */
  recordSuccess() {
    if (this.tokens.length > 0) {
      const current = this.tokens[this.currentTokenIndex];
      current.lastUsed = Date.now();
      // Reset failures on success
      if (current.failures > 0) {
        current.failures = Math.max(0, current.failures - 1);
      }
    }
  }
}

export default ATLASProvider;
