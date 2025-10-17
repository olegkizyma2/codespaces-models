/**
 * ATLAS Provider
 * Groups 58 GitHub Models API models into a single provider
 * Supports token rotation for high availability
 */
import { Provider } from './base.mjs';
import OpenAI from 'openai';

export class ATLASProvider extends Provider {
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
      if (token && token.trim() && token.startsWith('gho_')) {
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
      "ai21-labs/ai21-jamba-1.5-large",
      "ai21-labs/ai21-jamba-1.5-mini",
      "cohere/cohere-command-a",
      "cohere/cohere-command-r-08-2024",
      "cohere/cohere-command-r-plus-08-2024",
      "cohere/cohere-embed-v3-english",
      "cohere/cohere-embed-v3-multilingual",
      "core42/jais-30b-chat",
      "deepseek/deepseek-r1",
      "deepseek/deepseek-r1-0528",
      "deepseek/deepseek-v3-0324",
      "meta/llama-3.2-11b-vision-instruct",
      "meta/llama-3.2-90b-vision-instruct",
      "meta/llama-3.3-70b-instruct",
      "meta/llama-4-maverick-17b-128e-instruct-fp8",
      "meta/llama-4-scout-17b-16e-instruct",
      "meta/meta-llama-3.1-405b-instruct",
      "meta/meta-llama-3.1-8b-instruct",
      "microsoft/mai-ds-r1",
      "microsoft/phi-3-medium-128k-instruct",
      "microsoft/phi-3-medium-4k-instruct",
      "microsoft/phi-3-mini-128k-instruct",
      "microsoft/phi-3-mini-4k-instruct",
      "microsoft/phi-3-small-128k-instruct",
      "microsoft/phi-3-small-8k-instruct",
      "microsoft/phi-3.5-mini-instruct",
      "microsoft/phi-3.5-moe-instruct",
      "microsoft/phi-3.5-vision-instruct",
      "microsoft/phi-4",
      "microsoft/phi-4-mini-instruct",
      "microsoft/phi-4-mini-reasoning",
      "microsoft/phi-4-multimodal-instruct",
      "microsoft/phi-4-reasoning",
      "mistral-ai/codestral-2501",
      "mistral-ai/ministral-3b",
      "mistral-ai/mistral-large-2411",
      "mistral-ai/mistral-medium-2505",
      "mistral-ai/mistral-nemo",
      "mistral-ai/mistral-small-2503",
      "openai/gpt-4.1",
      "openai/gpt-4.1-mini",
      "openai/gpt-4.1-nano",
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "openai/gpt-5",
      "openai/gpt-5-chat",
      "openai/gpt-5-mini",
      "openai/gpt-5-nano",
      "openai/o1",
      "openai/o1-mini",
      "openai/o1-preview",
      "openai/o3",
      "openai/o3-mini",
      "openai/o4-mini",
      "openai/text-embedding-3-large",
      "openai/text-embedding-3-small",
      "xai/grok-3",
      "xai/grok-3-mini"
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
    const originalModel = this.getOriginalModelName(model);
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
