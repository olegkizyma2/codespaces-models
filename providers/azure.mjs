/**
 * Azure OpenAI Provider
 */
import { Provider } from './base.mjs';
import OpenAI from 'openai';

export class AzureProvider extends Provider {
  constructor(config = {}) {
    super({
      name: 'azure',
      apiKey: config.apiKey || process.env.AZURE_OPENAI_API_KEY,
      baseURL: config.baseURL || process.env.AZURE_OPENAI_ENDPOINT,
      modelPrefix: 'ext-azure-',
      ...config
    });
    
    this.apiVersion = config.apiVersion || process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
    this.deployment = config.deployment || process.env.AZURE_OPENAI_DEPLOYMENT;
  }

  validate() {
    const errors = [];
    
    if (!this.apiKey) {
      errors.push('Azure API key required');
    }
    
    if (!this.baseURL) {
      errors.push('Azure endpoint required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  async getModels() {
    try {
      // Azure doesn't have a models list endpoint, return common deployments
      const deployments = this.deployment ? [this.deployment] : [
        'gpt-4',
        'gpt-4-32k',
        'gpt-35-turbo',
        'gpt-35-turbo-16k'
      ];

      return deployments.map(deployment => ({
        id: this.getPrefixedModelName(deployment),
        object: 'model',
        owned_by: 'azure',
        provider: 'azure'
      }));
    } catch (error) {
      console.error('[Azure Provider] Error fetching models:', error);
      return [];
    }
  }

  async chatCompletion(params) {
    const { model, messages, temperature, max_tokens, stream = false, ...rest } = params;
    const originalModel = this.getOriginalModelName(model);
    const deployment = this.deployment || originalModel;

    const url = `${this.baseURL}/openai/deployments/${deployment}/chat/completions?api-version=${this.apiVersion}`;

    const requestBody = {
      messages,
      temperature,
      max_tokens,
      stream,
      ...rest
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Azure API error: ${error}`);
    }

    const data = await response.json();
    return {
      ...data,
      model: this.getPrefixedModelName(deployment)
    };
  }

  async *streamChatCompletion(params) {
    const { model, messages, temperature, max_tokens, ...rest } = params;
    const originalModel = this.getOriginalModelName(model);
    const deployment = this.deployment || originalModel;

    const url = `${this.baseURL}/openai/deployments/${deployment}/chat/completions?api-version=${this.apiVersion}`;

    const requestBody = {
      messages,
      temperature,
      max_tokens,
      stream: true,
      ...rest
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Azure API error: ${error}`);
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
              model: this.getPrefixedModelName(deployment)
            };
          } catch (e) {
            console.error('Error parsing Azure stream:', e);
          }
        }
      }
    }
  }
}

export default AzureProvider;
