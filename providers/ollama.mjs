/**
 * Ollama Provider (for local LLM models) - Goose-compatible
 */
import { Provider, ProviderMetadata, ModelInfo, ProviderUsage, ProviderError } from './base.mjs';

export class OllamaProvider extends Provider {
  /**
   * Returns provider metadata following Goose architecture
   */
  static metadata() {
    return ProviderMetadata.create(
      'ollama',
      'Ollama',
      'Run large language models locally with Ollama',
      'llama3.3',
      [
        new ModelInfo({
          name: 'llama3.3',
          contextLimit: 128000,
          inputTokenCost: 0,
          outputTokenCost: 0,
          currency: 'USD',
          supportsCacheControl: false
        }),
        new ModelInfo({
          name: 'llama3.1',
          contextLimit: 128000,
          inputTokenCost: 0,
          outputTokenCost: 0,
          currency: 'USD',
          supportsCacheControl: false
        }),
        new ModelInfo({
          name: 'qwen2.5',
          contextLimit: 32768,
          inputTokenCost: 0,
          outputTokenCost: 0,
          currency: 'USD',
          supportsCacheControl: false
        }),
        new ModelInfo({
          name: 'mistral',
          contextLimit: 32768,
          inputTokenCost: 0,
          outputTokenCost: 0,
          currency: 'USD',
          supportsCacheControl: false
        }),
        new ModelInfo({
          name: 'codellama',
          contextLimit: 16384,
          inputTokenCost: 0,
          outputTokenCost: 0,
          currency: 'USD',
          supportsCacheControl: false
        })
      ],
      'https://ollama.com/library',
      [
        { name: 'OLLAMA_BASE_URL', required: false, description: 'Ollama server URL (default: http://localhost:11434)' }
      ]
    );
  }

  /**
   * Creates provider instance from environment variables
   */
  static fromEnv(modelConfig = {}) {
    const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    
    return new OllamaProvider({
      baseURL,
      ...modelConfig
    });
  }

  constructor(config = {}) {
    super({
      name: 'ollama',
      baseURL: config.baseURL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      modelPrefix: 'ext-ollama-',
      enabled: config.enabled !== false,
      ...config
    });
  }

  /**
   * Extracts usage information from Ollama API response
   */
  extractUsage(response) {
    const promptTokens = response?.prompt_eval_count || response?.usage?.prompt_tokens || 0;
    const completionTokens = response?.eval_count || response?.usage?.completion_tokens || 0;

    return ProviderUsage.create('ollama', {
      inputTokens: promptTokens,
      outputTokens: completionTokens,
      totalTokens: promptTokens + completionTokens
    });
  }

  /**
   * Handles Ollama-specific errors
   */
  handleError(error) {
    const message = error.message || String(error);
    
    // Ollama connection errors
    if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
      throw ProviderError.apiError('Ollama server not running. Start it with: ollama serve');
    }
    
    // Model not found
    if (message.includes('model') && message.includes('not found')) {
      throw ProviderError.apiError('Model not found. Pull it with: ollama pull <model-name>');
    }
    
    // Context length errors
    if (message.includes('context length') || message.includes('too long')) {
      throw ProviderError.contextLengthError('Request exceeds Ollama model context length.');
    }
    
    // Generic Ollama error
    throw ProviderError.apiError(`Ollama API error: ${message}`);
  }

  requiresApiKey() {
    return false; // Ollama doesn't require API key
  }

  /**
   * Fetch supported models from Ollama
   */
  async fetchSupportedModels() {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return (data.models || []).map(model => ({
        id: model.name,
        name: model.name,
        size: model.size,
        provider: 'ollama'
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
        owned_by: 'ollama',
        provider: 'ollama',
        size: model.size
      }));
    } catch (error) {
      this.handleError(error);
      return [];
    }
  }

  async chatCompletion(params) {
    try {
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

      const result = {
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

      // Return with usage tracking
      const usage = this.extractUsage(data);
      return usage || result;
    } catch (error) {
      this.handleError(error);
    }
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
