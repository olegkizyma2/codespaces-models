/**
 * LiteLLM Provider - Gateway to 100+ LLM providers - Goose-compatible
 */
import { Provider, ProviderMetadata, ModelInfo, ProviderUsage, ProviderError } from './base.mjs';

export class LiteLLMProvider extends Provider {
  /**
   * Returns provider metadata following Goose architecture
   */
  static metadata() {
    return ProviderMetadata.create(
      'litellm',
      'LiteLLM',
      'Unified API gateway supporting 100+ LLM providers',
      'gpt-4o',
      [], // Dynamic - fetched from LiteLLM proxy
      'https://docs.litellm.ai/docs/providers',
      [
        { name: 'LITELLM_API_KEY', required: false, description: 'LiteLLM proxy API key' },
        { name: 'LITELLM_BASE_URL', required: false, description: 'LiteLLM proxy URL (default: http://localhost:4000)' }
      ]
    );
  }

  /**
   * Creates provider instance from environment variables
   */
  static fromEnv(modelConfig = {}) {
    const apiKey = process.env.LITELLM_API_KEY;
    const baseURL = process.env.LITELLM_BASE_URL || 'http://localhost:4000';
    
    return new LiteLLMProvider({
      apiKey,
      baseURL,
      ...modelConfig
    });
  }

  constructor(config = {}) {
    super({
      name: 'litellm',
      apiKey: config.apiKey || process.env.LITELLM_API_KEY,
      baseURL: config.baseURL || process.env.LITELLM_BASE_URL || 'http://localhost:4000',
      modelPrefix: 'ext-litellm-',
      ...config
    });
  }

  /**
   * Extracts usage information from LiteLLM API response
   */
  extractUsage(response) {
    const usage = response?.usage;
    if (!usage) return null;

    return ProviderUsage.create('litellm', {
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0
    });
  }

  /**
   * Handles LiteLLM-specific errors
   */
  handleError(error) {
    const message = error.message || String(error);
    
    // LiteLLM connection errors
    if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
      throw ProviderError.apiError('LiteLLM proxy not running. Start it with: litellm --config config.yaml');
    }
    
    // Authentication errors
    if (message.includes('401') || message.includes('Unauthorized') || message.includes('Invalid API key')) {
      throw ProviderError.authError('LiteLLM authentication failed. Check your LITELLM_API_KEY.');
    }
    
    // Rate limiting
    if (message.includes('429') || message.includes('Rate limit')) {
      throw ProviderError.rateLimitError('LiteLLM rate limit exceeded. Please retry later.');
    }
    
    // Context length errors
    if (message.includes('context_length') || message.includes('maximum context length')) {
      throw ProviderError.contextLengthError('Request exceeds model context length.');
    }
    
    // Generic LiteLLM error
    throw ProviderError.apiError(`LiteLLM API error: ${message}`);
  }

  requiresApiKey() {
    return false; // LiteLLM proxy might not require API key
  }

  /**
   * Fetch supported models from LiteLLM proxy
   */
  async fetchSupportedModels() {
    try {
      const headers = {};
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseURL}/v1/models`, { headers });
      if (!response.ok) {
        throw new Error(`LiteLLM API error: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.data || []).map(model => ({
        id: model.id,
        name: model.id,
        owned_by: model.owned_by || 'litellm',
        provider: 'litellm'
      }));
    } catch (error) {
      this.handleError(error);
      return [];
    }
  }

  async getModels() {
    try {
      const models = await this.fetchSupportedModels();
      return models.map(model => ({
        id: this.getPrefixedModelName(model.id),
        object: 'model',
        owned_by: model.owned_by || 'litellm',
        provider: 'litellm'
      }));
    } catch (error) {
      this.handleError(error);
      return [];
    }
  }

  async chatCompletion(params) {
    try {
      const { model, messages, temperature, max_tokens, stream = false, ...rest } = params;
      const originalModel = this.getOriginalModelName(model);

      const headers = {
        'Content-Type': 'application/json'
      };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const requestBody = {
        model: originalModel,
        messages,
        temperature,
        max_tokens,
        stream,
        ...rest
      };

      const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`LiteLLM API error: ${error}`);
      }

      const data = await response.json();
      const result = {
        ...data,
        model: this.getPrefixedModelName(originalModel)
      };

      // Return with usage tracking
      const usage = this.extractUsage(result);
      return usage || result;
    } catch (error) {
      this.handleError(error);
    }
  }

  async *streamChatCompletion(params) {
    const { model, messages, temperature, max_tokens, ...rest } = params;
    const originalModel = this.getOriginalModelName(model);

    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const requestBody = {
      model: originalModel,
      messages,
      temperature,
      max_tokens,
      stream: true,
      ...rest
    };

    const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LiteLLM API error: ${error}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            yield {
              ...parsed,
              model: this.getPrefixedModelName(originalModel)
            };
          } catch (e) {
            console.error('Error parsing LiteLLM stream:', e);
          }
        }
      }
    }
  }
}

export default LiteLLMProvider;
