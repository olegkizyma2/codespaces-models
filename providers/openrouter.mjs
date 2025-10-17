/**
 * OpenRouter Provider
 * Adapted from Goose architecture
 */
import { Provider, ProviderMetadata, ModelInfo, Usage, ProviderUsage, ProviderError } from './base.mjs';

const OPENROUTER_DEFAULT_MODEL = 'openai/gpt-4o';
const OPENROUTER_DOC_URL = 'https://openrouter.ai/docs';

export class OpenRouterProvider extends Provider {
  constructor(config = {}) {
    super({
      name: 'openrouter',
      apiKey: config.apiKey || process.env.OPENROUTER_API_KEY,
      baseURL: config.baseURL || 'https://openrouter.ai/api/v1',
      modelPrefix: 'ext-openrouter-',
      ...config
    });
  }

  /**
   * Provider metadata (like Goose)
   */
  static metadata() {
    return ProviderMetadata.create(
      'openrouter',
      'OpenRouter',
      'OpenRouter unified API for multiple LLM models',
      OPENROUTER_DEFAULT_MODEL,
      [], // Dynamic models from API
      OPENROUTER_DOC_URL,
      [
        { name: 'OPENROUTER_API_KEY', required: true, description: 'OpenRouter API key' }
      ]
    );
  }

  /**
   * Create from environment (like Goose from_env)
   */
  static async fromEnv(modelConfig = {}) {
    const apiKey = Provider.getEnvSecret('OPENROUTER_API_KEY');
    const baseURL = Provider.getEnvConfig('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1');
    
    return new OpenRouterProvider({
      apiKey,
      baseURL,
      model: modelConfig.model || OPENROUTER_DEFAULT_MODEL,
      ...modelConfig
    });
  }

  /**
   * Fetch supported models from API
   */
  async fetchSupportedModels() {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      if (!response.ok) return [];

      const data = await response.json();
      return (data.data || []).map(model => model.id);
    } catch (error) {
      console.error('[OpenRouter] Error fetching models:', error);
      return [];
    }
  }

  async getModels() {
    try {
      const models = await this.fetchSupportedModels();
      return models.map(model => ({
        id: this.getPrefixedModelName(model),
        object: 'model',
        owned_by: 'openrouter',
        provider: 'openrouter'
      }));
    } catch (error) {
      console.error('[OpenRouter Provider] Error fetching models:', error);
      return [];
    }
  }

  /**
   * Extract usage from OpenRouter response
   */
  extractUsage(response) {
    const usage = response.usage;
    if (!usage) return ProviderUsage.empty(this.name);

    return new ProviderUsage(this.name, new Usage({
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0
    }));
  }

  /**
   * Handle OpenRouter errors
   */
  handleError(error) {
    const message = error.message || 'Unknown error';
    
    if (error.status === 401 || message.includes('authentication')) {
      return ProviderError.authError('Invalid OpenRouter API key', { originalError: error });
    }
    if (error.status === 429 || message.includes('rate limit')) {
      return ProviderError.rateLimitError('OpenRouter rate limit exceeded', { originalError: error });
    }
    if (message.includes('context') || message.includes('token limit')) {
      return ProviderError.contextLengthError('Context length exceeded', { originalError: error });
    }
    return ProviderError.apiError(message, { originalError: error });
  }

  async chatCompletion(params) {
    try {
      const { model, messages, temperature, max_tokens, stream = false, ...rest } = params;
      const originalModel = this.getOriginalModelName(model);

      const requestBody = {
        model: originalModel,
        messages,
        temperature,
        max_tokens,
        stream,
        ...rest
      };

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/codespaces-models',
          'X-Title': 'Codespaces Models'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${error}`);
      }

      if (stream) {
        return response;
      }

      const data = await response.json();

      return {
        ...data,
        model: this.getPrefixedModelName(originalModel),
        usage: this.extractUsage(data)
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async *streamChatCompletion(params) {
    const { model, messages, temperature, max_tokens, ...rest } = params;
    const originalModel = this.getOriginalModelName(model);

    const requestBody = {
      model: originalModel,
      messages,
      temperature,
      max_tokens,
      stream: true,
      ...rest
    };

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://github.com/olegkizyma2/codespaces-models',
        'X-Title': 'Codespaces Models Proxy'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${error}`);
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
            console.error('Error parsing OpenRouter stream:', e);
          }
        }
      }
    }
  }
}

export default OpenRouterProvider;
