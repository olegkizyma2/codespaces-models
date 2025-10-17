/**
 * xAI (Grok) Provider
 */
import { Provider } from './base.mjs';

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

  async getModels() {
    // xAI known models
    const models = [
      'grok-beta',
      'grok-vision-beta'
    ];

    return models.map(id => ({
      id: this.getPrefixedModelName(id),
      object: 'model',
      owned_by: 'xai',
      provider: 'xai'
    }));
  }

  async chatCompletion(params) {
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

    const data = await response.json();
    return {
      ...data,
      model: this.getPrefixedModelName(originalModel)
    };
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
