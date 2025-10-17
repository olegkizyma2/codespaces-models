/**
 * OpenRouter Provider
 */
import { Provider } from './base.mjs';

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

  async getModels() {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.data || []).map(model => ({
        id: this.getPrefixedModelName(model.id),
        object: 'model',
        owned_by: 'openrouter',
        provider: 'openrouter',
        context_length: model.context_length,
        pricing: model.pricing
      }));
    } catch (error) {
      console.error('[OpenRouter Provider] Error fetching models:', error);
      return [];
    }
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
