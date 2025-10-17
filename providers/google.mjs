/**
 * Google AI (Gemini) Provider
 * Adapted from Goose architecture
 */
import { Provider, ProviderMetadata, ModelInfo, Usage, ProviderUsage, ProviderError } from './base.mjs';

// Google Gemini known models
const GOOGLE_KNOWN_MODELS = [
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-8b',
  'gemini-pro',
  'gemini-pro-vision'
];

const GOOGLE_DEFAULT_MODEL = 'gemini-1.5-pro';
const GOOGLE_DOC_URL = 'https://ai.google.dev/gemini-api/docs/models';

export class GoogleProvider extends Provider {
  constructor(config = {}) {
    super({
      name: 'google',
      apiKey: config.apiKey || process.env.GOOGLE_API_KEY,
      baseURL: config.baseURL || 'https://generativelanguage.googleapis.com/v1beta',
      modelPrefix: 'ext-google-',
      ...config
    });
  }

  /**
   * Provider metadata (like Goose)
   */
  static metadata() {
    return ProviderMetadata.create(
      'google',
      'Google AI',
      'Google Gemini models via official API',
      GOOGLE_DEFAULT_MODEL,
      GOOGLE_KNOWN_MODELS.map(name => new ModelInfo({ name })),
      GOOGLE_DOC_URL,
      [
        { name: 'GOOGLE_API_KEY', required: true, description: 'Google API key' }
      ]
    );
  }

  /**
   * Create from environment (like Goose from_env)
   */
  static async fromEnv(modelConfig = {}) {
    const apiKey = Provider.getEnvSecret('GOOGLE_API_KEY');
    const baseURL = Provider.getEnvConfig('GOOGLE_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta');
    
    return new GoogleProvider({
      apiKey,
      baseURL,
      model: modelConfig.model || GOOGLE_DEFAULT_MODEL,
      ...modelConfig
    });
  }

  /**
   * Fetch supported models from API
   */
  async fetchSupportedModels() {
    try {
      const response = await fetch(`${this.baseURL}/models?key=${this.apiKey}`);
      if (!response.ok) return GOOGLE_KNOWN_MODELS;
      
      const data = await response.json();
      return (data.models || [])
        .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
        .map(model => model.name.replace('models/', ''));
    } catch (error) {
      console.error('[Google] Error fetching models:', error);
      return GOOGLE_KNOWN_MODELS;
    }
  }

  async getModels() {
    try {
      const models = await this.fetchSupportedModels();
      return models.map(model => ({
        id: this.getPrefixedModelName(model),
        object: 'model',
        owned_by: 'google',
        provider: 'google'
      }));
    } catch (error) {
      console.error('[Google Provider] Error fetching models:', error);
      return GOOGLE_KNOWN_MODELS.map(model => ({
        id: this.getPrefixedModelName(model),
        object: 'model',
        owned_by: 'google',
        provider: 'google'
      }));
    }
  }

  /**
   * Extract usage from Google response
   */
  extractUsage(response) {
    const usage = response.usageMetadata;
    if (!usage) return ProviderUsage.empty(this.name);

    return new ProviderUsage(this.name, new Usage({
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      totalTokens: usage.totalTokenCount || 0
    }));
  }

  /**
   * Handle Google errors
   */
  handleError(error) {
    const message = error.message || 'Unknown error';
    
    if (message.includes('API_KEY') || message.includes('authentication')) {
      return ProviderError.authError('Invalid Google API key', { originalError: error });
    }
    if (message.includes('quota') || message.includes('limit')) {
      return ProviderError.rateLimitError('Google rate limit exceeded', { originalError: error });
    }
    if (message.includes('INVALID_ARGUMENT') && message.includes('token')) {
      return ProviderError.contextLengthError('Context length exceeded', { originalError: error });
    }
    return ProviderError.apiError(message, { originalError: error });
  }

  async chatCompletion(params) {
    try {
      const { model, messages, temperature = 1, max_tokens, stream = false } = params;
      const originalModel = this.getOriginalModelName(model);

      // Convert OpenAI messages to Google format
      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const requestBody = {
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: max_tokens
        }
      };

      const endpoint = stream ? 'streamGenerateContent' : 'generateContent';
      const response = await fetch(
        `${this.baseURL}/models/${originalModel}:${endpoint}?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google API error: ${error}`);
      }

      if (stream) {
        return response;
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];

      return {
        id: `google-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: this.getPrefixedModelName(originalModel),
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: candidate?.content?.parts?.[0]?.text || ''
          },
          finish_reason: candidate?.finishReason?.toLowerCase() || 'stop'
        }],
        usage: this.extractUsage(data)
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async *streamChatCompletion(params) {
    const { model, messages, temperature = 1, max_tokens } = params;
    const originalModel = this.getOriginalModelName(model);

    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const requestBody = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: max_tokens
      }
    };

    const modelPath = originalModel.startsWith('models/') ? originalModel : `models/${originalModel}`;
    
    const response = await fetch(`${this.baseURL}/${modelPath}:streamGenerateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API error: ${error}`);
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
            const candidate = data.candidates?.[0];
            if (candidate?.content?.parts?.[0]?.text) {
              yield {
                id: `google-${Date.now()}`,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: this.getPrefixedModelName(originalModel),
                choices: [{
                  index: 0,
                  delta: {
                    content: candidate.content.parts[0].text
                  },
                  finish_reason: null
                }]
              };
            }
          } catch (e) {
            console.error('Error parsing Google stream:', e);
          }
        }
      }
    }
  }
}

export default GoogleProvider;
