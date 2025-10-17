/**
 * xAI (Grok) Provider
 * Adapted from Goose architecture
 */
import { Provider, ProviderMetadata, ModelInfo, Usage, ProviderUsage, ProviderError } from './base.mjs';

// xAI known models
const XAI_KNOWN_MODELS = [
  'grok-beta',
  'grok-vision-beta',
  'grok-2-latest',
  'grok-2-vision-latest'
];

const XAI_DEFAULT_MODEL = 'grok-beta';
const XAI_DOC_URL = 'https://docs.x.ai/docs';

export class XAIProvider extends Provider {
  constructor(config = {}) {
    super({
      name: 'xai',
      apiKey: config.apiKey || process.env.XAI_API_KEY,
      baseURL: config.baseURL || 'https://api.x.ai/v1',
      modelPrefix: 'ext-xai-',
      ...config
    });
  }

  /**
   * Provider metadata (like Goose)
   */
  static metadata() {
    return ProviderMetadata.create(
      'xai',
      'xAI',
      'xAI Grok models via official API',
      XAI_DEFAULT_MODEL,
      XAI_KNOWN_MODELS.map(name => new ModelInfo({ name })),
      XAI_DOC_URL,
      [
        { name: 'XAI_API_KEY', required: true, description: 'xAI API key' }
      ]
    );
  }

  /**
   * Create from environment (like Goose from_env)
   */
  static async fromEnv(modelConfig = {}) {
    const apiKey = Provider.getEnvSecret('XAI_API_KEY');
    const baseURL = Provider.getEnvConfig('XAI_BASE_URL', 'https://api.x.ai/v1');
    
    return new XAIProvider({
      apiKey,
      baseURL,
      model: modelConfig.model || XAI_DEFAULT_MODEL,
      ...modelConfig
    });
  }

  async getModels() {
    return XAI_KNOWN_MODELS.map(id => ({
      id: this.getPrefixedModelName(id),
      object: 'model',
      owned_by: 'xai',
      provider: 'xai'
    }));
  }

  /**
   * Extract usage from xAI response
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
   * Handle xAI errors
   */
  handleError(error) {
    const message = error.message || 'Unknown error';
    
    if (error.status === 401 || message.includes('authentication')) {
      return ProviderError.authError('Invalid xAI API key', { originalError: error });
    }
    if (error.status === 429 || message.includes('rate limit')) {
      return ProviderError.rateLimitError('xAI rate limit exceeded', { originalError: error });
    }
    if (message.includes('context') || message.includes('token')) {
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
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`xAI API error: ${error}`);
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
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`xAI API error: ${error}`);
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
            console.error('Error parsing xAI stream:', e);
          }
        }
      }
    }
  }
}

export default XAIProvider;
