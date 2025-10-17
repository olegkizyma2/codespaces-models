/**
 * Azure OpenAI Provider - Goose-compatible
 */
import { Provider, ProviderMetadata, ModelInfo, ProviderUsage, ProviderError } from './base.mjs';
import OpenAI from 'openai';

export class AzureProvider extends Provider {
  /**
   * Returns provider metadata following Goose architecture
   */
  static metadata() {
    return ProviderMetadata.create(
      'azure',
      'Azure OpenAI',
      'Microsoft Azure OpenAI Service with enterprise-grade security and compliance',
      'gpt-4',
      [
        new ModelInfo({
          name: 'gpt-4',
          contextLimit: 8192,
          inputTokenCost: 0.03,
          outputTokenCost: 0.06,
          currency: 'USD',
          supportsCacheControl: false
        }),
        new ModelInfo({
          name: 'gpt-4-32k',
          contextLimit: 32768,
          inputTokenCost: 0.06,
          outputTokenCost: 0.12,
          currency: 'USD',
          supportsCacheControl: false
        }),
        new ModelInfo({
          name: 'gpt-35-turbo',
          contextLimit: 4096,
          inputTokenCost: 0.0015,
          outputTokenCost: 0.002,
          currency: 'USD',
          supportsCacheControl: false
        }),
        new ModelInfo({
          name: 'gpt-35-turbo-16k',
          contextLimit: 16384,
          inputTokenCost: 0.003,
          outputTokenCost: 0.004,
          currency: 'USD',
          supportsCacheControl: false
        })
      ],
      'https://learn.microsoft.com/azure/ai-services/openai/concepts/models',
      [
        { name: 'AZURE_OPENAI_API_KEY', required: true, description: 'Azure OpenAI API key' },
        { name: 'AZURE_OPENAI_ENDPOINT', required: true, description: 'Azure OpenAI endpoint URL' },
        { name: 'AZURE_OPENAI_API_VERSION', required: false, description: 'API version (default: 2024-02-15-preview)' },
        { name: 'AZURE_OPENAI_DEPLOYMENT', required: false, description: 'Deployment name' }
      ]
    );
  }

  /**
   * Creates provider instance from environment variables
   */
  static fromEnv(modelConfig = {}) {
    const apiKey = Provider.getEnvSecret('AZURE_OPENAI_API_KEY');
    const endpoint = Provider.getEnvSecret('AZURE_OPENAI_ENDPOINT');
    
    if (!apiKey || !endpoint) {
      throw ProviderError.authError(
        'Azure OpenAI requires AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT environment variables'
      );
    }

    return new AzureProvider({
      apiKey,
      baseURL: endpoint,
      ...modelConfig
    });
  }

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

  /**
   * Extracts usage information from Azure API response
   */
  extractUsage(response) {
    const usage = response?.usage;
    if (!usage) return null;

    return ProviderUsage.create('azure', {
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0
    });
  }

  /**
   * Handles Azure-specific errors
   */
  handleError(error) {
    const message = error.message || String(error);
    
    // Azure authentication errors
    if (message.includes('401') || message.includes('Unauthorized') || message.includes('api-key')) {
      throw ProviderError.authError('Azure OpenAI authentication failed. Check your AZURE_OPENAI_API_KEY.');
    }
    
    // Azure rate limiting
    if (message.includes('429') || message.includes('Rate limit') || message.includes('quota')) {
      throw ProviderError.rateLimitError('Azure OpenAI rate limit exceeded. Please retry later.');
    }
    
    // Azure context length errors
    if (message.includes('context_length') || message.includes('maximum context length')) {
      throw ProviderError.contextLengthError('Request exceeds Azure OpenAI model context length.');
    }
    
    // Generic Azure API error
    throw ProviderError.apiError(`Azure OpenAI API error: ${message}`);
  }

  /**
   * Fetch supported models from Azure (returns deployment names)
   */
  async fetchSupportedModels() {
    try {
      // Azure doesn't have a models list endpoint, return common deployments
      const deployments = this.deployment ? [this.deployment] : [
        'gpt-4',
        'gpt-4-32k',
        'gpt-35-turbo',
        'gpt-35-turbo-16k'
      ];

      return deployments.map(deployment => ({
        id: deployment,
        name: deployment,
        provider: 'azure'
      }));
    } catch (error) {
      console.error('[Azure Provider] Error fetching models:', error);
      return [];
    }
  }

  async getModels() {
    try {
      const models = await this.fetchSupportedModels();
      return models.map(model => ({
        id: this.getPrefixedModelName(model.id),
        object: 'model',
        owned_by: 'azure',
        provider: 'azure'
      }));
    } catch (error) {
      this.handleError(error);
      return [];
    }
  }

  async chatCompletion(params) {
    try {
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
      const result = {
        ...data,
        model: this.getPrefixedModelName(deployment)
      };

      // Return with usage tracking
      const usage = this.extractUsage(result);
      return usage || result;
    } catch (error) {
      this.handleError(error);
    }
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
