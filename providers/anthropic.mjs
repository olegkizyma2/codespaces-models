/**
 * Anthropic (Claude) Provider
 * Adapted from Goose architecture
 */
import { Provider, ProviderMetadata, ModelInfo, Usage, ProviderUsage, ProviderError } from './base.mjs';

// Anthropic known models
const ANTHROPIC_KNOWN_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307'
];

const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const ANTHROPIC_DOC_URL = 'https://docs.anthropic.com/en/docs/models-overview';
const ANTHROPIC_API_VERSION = '2023-06-01';

export class AnthropicProvider extends Provider {
  constructor(config = {}) {
    super({
      name: 'anthropic',
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
      baseURL: config.baseURL || 'https://api.anthropic.com',
      modelPrefix: 'ext-anthropic-',
      ...config
    });
    this.apiVersion = config.apiVersion || ANTHROPIC_API_VERSION;
  }

  /**
   * Provider metadata (like Goose)
   */
  static metadata() {
    return ProviderMetadata.create(
      'anthropic',
      'Anthropic',
      'Anthropic Claude models via official API',
      ANTHROPIC_DEFAULT_MODEL,
      ANTHROPIC_KNOWN_MODELS.map(name => new ModelInfo({ name })),
      ANTHROPIC_DOC_URL,
      [
        { name: 'ANTHROPIC_API_KEY', required: true, description: 'Anthropic API key' }
      ]
    );
  }

  /**
   * Create from environment (like Goose from_env)
   */
  static async fromEnv(modelConfig = {}) {
    const apiKey = Provider.getEnvSecret('ANTHROPIC_API_KEY');
    const baseURL = Provider.getEnvConfig('ANTHROPIC_BASE_URL', 'https://api.anthropic.com');
    
    return new AnthropicProvider({
      apiKey,
      baseURL,
      model: modelConfig.model || ANTHROPIC_DEFAULT_MODEL,
      ...modelConfig
    });
  }

  async getModels() {
    return ANTHROPIC_KNOWN_MODELS.map(id => ({
      id: this.getPrefixedModelName(id),
      object: 'model',
      owned_by: 'anthropic',
      provider: 'anthropic'
    }));
  }

  /**
   * Extract usage from Anthropic response
   */
  extractUsage(response) {
    const usage = response.usage;
    if (!usage) return ProviderUsage.empty(this.name);

    return new ProviderUsage(this.name, new Usage({
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
      totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
      cacheCreationTokens: usage.cache_creation_input_tokens || 0,
      cacheReadTokens: usage.cache_read_input_tokens || 0
    }));
  }

  /**
   * Convert OpenAI messages to Anthropic format
   */
  convertMessages(messages) {
    return messages
      .filter(msg => msg.role !== 'system') // Remove system messages, handled separately
      .map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));
  }

  /**
   * Extract system prompt from messages
   */
  extractSystemPrompt(messages) {
    const systemMsg = messages.find(msg => msg.role === 'system');
    return systemMsg?.content || '';
  }

  async chatCompletion(params) {
    try {
      const { model, messages, temperature = 1, max_tokens = 1024, stream = false } = params;
      const originalModel = this.getOriginalModelName(model);

      const systemPrompt = this.extractSystemPrompt(messages);
      const anthropicMessages = this.convertMessages(messages);

      const requestBody = {
        model: originalModel,
        messages: anthropicMessages,
        max_tokens,
        temperature,
        stream,
        ...(systemPrompt && { system: systemPrompt })
      };

      const response = await fetch(`${this.baseURL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic API error: ${error}`);
      }

      const data = await response.json();

      // Convert Anthropic response to OpenAI format
      return {
        id: data.id,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: this.getPrefixedModelName(originalModel),
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: data.content[0]?.text || ''
          },
          finish_reason: data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason
        }],
        usage: this.extractUsage(data)
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle Anthropic errors
   */
  handleError(error) {
    const message = error.message || 'Unknown error';
    
    if (message.includes('authentication') || message.includes('api_key')) {
      return ProviderError.authError('Invalid Anthropic API key', { originalError: error });
    }
    if (message.includes('rate_limit')) {
      return ProviderError.rateLimitError('Anthropic rate limit exceeded', { originalError: error });
    }
    if (message.includes('tokens') || message.includes('context_length')) {
      return ProviderError.contextLengthError('Context length exceeded', { originalError: error });
    }
    return ProviderError.apiError(message, { originalError: error });
  }

  async *streamChatCompletion(params) {
    const { model, messages, temperature = 1, max_tokens = 1024 } = params;
    const originalModel = this.getOriginalModelName(model);

    const anthropicMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    const requestBody = {
      model: originalModel,
      messages: anthropicMessages,
      max_tokens,
      temperature,
      stream: true
    };

    const response = await fetch(`${this.baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.apiVersion
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
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
            if (parsed.type === 'content_block_delta') {
              yield {
                id: parsed.message?.id,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: this.getPrefixedModelName(originalModel),
                choices: [{
                  index: 0,
                  delta: {
                    content: parsed.delta?.text || ''
                  },
                  finish_reason: null
                }]
              };
            }
          } catch (e) {
            console.error('Error parsing Anthropic stream:', e);
          }
        }
      }
    }
  }
}

export default AnthropicProvider;
