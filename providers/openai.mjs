/**
 * OpenAI Provider (for compatibility with direct OpenAI API)
 * Adapted from Goose architecture
 */
import { Provider, ProviderMetadata, ModelInfo, Usage, ProviderUsage, ProviderError } from './base.mjs';
import OpenAI from 'openai';

// OpenAI known models
const OPENAI_KNOWN_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
  'o1',
  'o1-mini',
  'o1-preview'
];

const OPENAI_DEFAULT_MODEL = 'gpt-4o';
const OPENAI_DOC_URL = 'https://platform.openai.com/docs/models';

export class OpenAIProvider extends Provider {
  constructor(config = {}) {
    super({
      name: 'openai',
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      baseURL: config.baseURL || 'https://api.openai.com/v1',
      modelPrefix: 'ext-openai-',
      ...config
    });
    
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL
    });
  }

  /**
   * Provider metadata (like Goose)
   */
  static metadata() {
    return ProviderMetadata.create(
      'openai',
      'OpenAI',
      'Official OpenAI API provider with GPT models',
      OPENAI_DEFAULT_MODEL,
      OPENAI_KNOWN_MODELS.map(name => new ModelInfo({ name })),
      OPENAI_DOC_URL,
      [
        { name: 'OPENAI_API_KEY', required: true, description: 'OpenAI API key' },
        { name: 'OPENAI_BASE_URL', required: false, description: 'Custom base URL' }
      ]
    );
  }

  /**
   * Create from environment (like Goose from_env)
   */
  static async fromEnv(modelConfig = {}) {
    const apiKey = Provider.getEnvSecret('OPENAI_API_KEY');
    const baseURL = Provider.getEnvConfig('OPENAI_BASE_URL', 'https://api.openai.com/v1');
    
    return new OpenAIProvider({
      apiKey,
      baseURL,
      model: modelConfig.model || OPENAI_DEFAULT_MODEL,
      ...modelConfig
    });
  }

  /**
   * Fetch supported models from API
   */
  async fetchSupportedModels() {
    try {
      const response = await this.client.models.list();
      return response.data
        .filter(model => model.id.startsWith('gpt-') || model.id.startsWith('o1'))
        .map(model => model.id);
    } catch (error) {
      console.error('[OpenAI] Error fetching models:', error);
      return OPENAI_KNOWN_MODELS;
    }
  }

  async getModels() {
    try {
      const models = await this.fetchSupportedModels();
      return models.map(model => ({
        id: this.getPrefixedModelName(model),
        object: 'model',
        owned_by: 'openai',
        provider: 'openai'
      }));
    } catch (error) {
      console.error('[OpenAI Provider] Error fetching models:', error);
      return OPENAI_KNOWN_MODELS.map(model => ({
        id: this.getPrefixedModelName(model),
        object: 'model',
        owned_by: 'openai',
        provider: 'openai'
      }));
    }
  }

  /**
   * Extract usage from OpenAI response
   */
  extractUsage(response) {
    const usage = response.usage;
    if (!usage) {
      return ProviderUsage.empty(this.name);
    }

    return new ProviderUsage(this.name, new Usage({
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      cacheCreationTokens: usage.prompt_tokens_details?.cached_tokens || 0,
      cacheReadTokens: usage.completion_tokens_details?.cached_tokens || 0
    }));
  }

  async chatCompletion(params) {
    try {
      const { model, messages, temperature, max_tokens, stream = false, tools, ...rest } = params;
      const originalModel = this.getOriginalModelName(model);

      const completion = await this.client.chat.completions.create({
        model: originalModel,
        messages,
        temperature,
        max_tokens,
        stream,
        tools,
        ...rest
      });

      if (stream) {
        return completion;
      }

      return {
        ...completion,
        model: this.getPrefixedModelName(originalModel),
        usage: this.extractUsage(completion)
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Complete with model (Goose-style)
   */
  async completeWithModel(modelConfig, system, messages, tools = []) {
    try {
      const allMessages = system 
        ? [{ role: 'system', content: system }, ...messages] 
        : messages;

      const params = {
        model: modelConfig.model || this.model,
        messages: allMessages,
        temperature: modelConfig.temperature,
        max_tokens: modelConfig.maxTokens,
        tools: tools.length > 0 ? tools : undefined
      };

      const result = await this.chatCompletion(params);
      
      return {
        message: result.choices[0].message,
        usage: result.usage
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle OpenAI errors
   */
  handleError(error) {
    if (error.status === 401) {
      return ProviderError.authError('Invalid OpenAI API key', { originalError: error });
    }
    if (error.status === 429) {
      return ProviderError.rateLimitError('OpenAI rate limit exceeded', { originalError: error });
    }
    if (error.status === 400 && error.message?.includes('context_length_exceeded')) {
      return ProviderError.contextLengthError('Context length exceeded', { originalError: error });
    }
    return ProviderError.apiError(error.message || 'OpenAI API error', { originalError: error });
  }

  async *streamChatCompletion(params) {
    try {
      const { model, messages, temperature, max_tokens, tools, ...rest } = params;
      const originalModel = this.getOriginalModelName(model);

      const stream = await this.client.chat.completions.create({
        model: originalModel,
        messages,
        temperature,
        max_tokens,
        stream: true,
        tools,
        ...rest
      });

      for await (const chunk of stream) {
        yield {
          ...chunk,
          model: this.getPrefixedModelName(originalModel)
        };
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Supports embeddings
   */
  supportsEmbeddings() {
    return true;
  }

  /**
   * Create embeddings
   */
  async createEmbeddings(texts) {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts
      });
      
      return response.data.map(item => item.embedding);
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

export default OpenAIProvider;

