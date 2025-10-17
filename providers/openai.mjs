/**
 * OpenAI Provider (for compatibility with direct OpenAI API)
 */
import { Provider } from './base.mjs';
import OpenAI from 'openai';

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

  async getModels() {
    try {
      const response = await this.client.models.list();
      return response.data.map(model => ({
        id: this.getPrefixedModelName(model.id),
        object: 'model',
        owned_by: model.owned_by || 'openai',
        provider: 'openai'
      }));
    } catch (error) {
      console.error('[OpenAI Provider] Error fetching models:', error);
      return [];
    }
  }

  async chatCompletion(params) {
    const { model, messages, temperature, max_tokens, stream = false, ...rest } = params;
    const originalModel = this.getOriginalModelName(model);

    const completion = await this.client.chat.completions.create({
      model: originalModel,
      messages,
      temperature,
      max_tokens,
      stream,
      ...rest
    });

    if (stream) {
      return completion;
    }

    return {
      ...completion,
      model: this.getPrefixedModelName(originalModel)
    };
  }

  async *streamChatCompletion(params) {
    const { model, messages, temperature, max_tokens, ...rest } = params;
    const originalModel = this.getOriginalModelName(model);

    const stream = await this.client.chat.completions.create({
      model: originalModel,
      messages,
      temperature,
      max_tokens,
      stream: true,
      ...rest
    });

    for await (const chunk of stream) {
      yield {
        ...chunk,
        model: this.getPrefixedModelName(originalModel)
      };
    }
  }
}

export default OpenAIProvider;
