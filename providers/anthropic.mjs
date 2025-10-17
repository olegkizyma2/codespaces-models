/**
 * Anthropic (Claude) Provider
 */
import { Provider } from './base.mjs';

export class AnthropicProvider extends Provider {
  constructor(config = {}) {
    super({
      name: 'anthropic',
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
      baseURL: config.baseURL || 'https://api.anthropic.com',
      modelPrefix: 'ext-anthropic-',
      ...config
    });
    this.apiVersion = '2023-06-01';
  }

  async getModels() {
    // Anthropic doesn't have a models list endpoint, so return known models
    const models = [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];

    return models.map(id => ({
      id: this.getPrefixedModelName(id),
      object: 'model',
      owned_by: 'anthropic',
      provider: 'anthropic'
    }));
  }

  async chatCompletion(params) {
    const { model, messages, temperature = 1, max_tokens = 1024, stream = false } = params;
    const originalModel = this.getOriginalModelName(model);

    // Convert OpenAI format to Anthropic format
    const anthropicMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    const requestBody = {
      model: originalModel,
      messages: anthropicMessages,
      max_tokens,
      temperature,
      stream
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
      usage: {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      }
    };
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
