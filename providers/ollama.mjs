/**
 * Ollama Provider (for local LLM models)
 */
import { Provider } from './base.mjs';

export class OllamaProvider extends Provider {
  constructor(config = {}) {
    super({
      name: 'ollama',
      baseURL: config.baseURL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      modelPrefix: 'ext-ollama-',
      enabled: config.enabled !== false,
      ...config
    });
  }

  requiresApiKey() {
    return false; // Ollama doesn't require API key
  }

  async getModels() {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return (data.models || []).map(model => ({
        id: this.getPrefixedModelName(model.name),
        object: 'model',
        owned_by: 'ollama',
        provider: 'ollama',
        size: model.size
      }));
    } catch (error) {
      console.error('[Ollama Provider] Error fetching models:', error);
      return [];
    }
  }

  async chatCompletion(params) {
    const { model, messages, temperature = 0.8, max_tokens, stream = false } = params;
    const originalModel = this.getOriginalModelName(model);

    const requestBody = {
      model: originalModel,
      messages,
      stream,
      options: {
        temperature
      }
    };

    if (max_tokens) {
      requestBody.options.num_predict = max_tokens;
    }

    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${error}`);
    }

    const data = await response.json();

    return {
      id: `ollama-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: this.getPrefixedModelName(originalModel),
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: data.message?.content || ''
        },
        finish_reason: data.done ? 'stop' : null
      }],
      usage: {
        prompt_tokens: data.prompt_eval_count || 0,
        completion_tokens: data.eval_count || 0,
        total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      }
    };
  }

  async *streamChatCompletion(params) {
    const { model, messages, temperature = 0.8, max_tokens } = params;
    const originalModel = this.getOriginalModelName(model);

    const requestBody = {
      model: originalModel,
      messages,
      stream: true,
      options: {
        temperature
      }
    };

    if (max_tokens) {
      requestBody.options.num_predict = max_tokens;
    }

    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${error}`);
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
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              yield {
                id: `ollama-${Date.now()}`,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: this.getPrefixedModelName(originalModel),
                choices: [{
                  index: 0,
                  delta: {
                    content: data.message.content
                  },
                  finish_reason: data.done ? 'stop' : null
                }]
              };
            }
          } catch (e) {
            console.error('Error parsing Ollama stream:', e);
          }
        }
      }
    }
  }
}

export default OllamaProvider;
