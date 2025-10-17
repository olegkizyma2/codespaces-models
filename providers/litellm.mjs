/**
 * LiteLLM Provider - Gateway to 100+ LLM providers
 */
import { Provider } from './base.mjs';

export class LiteLLMProvider extends Provider {
  constructor(config = {}) {
    super({
      name: 'litellm',
      apiKey: config.apiKey || process.env.LITELLM_API_KEY,
      baseURL: config.baseURL || process.env.LITELLM_BASE_URL || 'http://localhost:4000',
      modelPrefix: 'ext-litellm-',
      ...config
    });
  }

  requiresApiKey() {
    return false; // LiteLLM proxy might not require API key
  }

  async getModels() {
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
        id: this.getPrefixedModelName(model.id),
        object: 'model',
        owned_by: model.owned_by || 'litellm',
        provider: 'litellm'
      }));
    } catch (error) {
      console.error('[LiteLLM Provider] Error fetching models:', error);
      return [];
    }
  }

  async chatCompletion(params) {
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
    return {
      ...data,
      model: this.getPrefixedModelName(originalModel)
    };
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
