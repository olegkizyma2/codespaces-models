/**
 * Google AI (Gemini) Provider
 */
import { Provider } from './base.mjs';

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

  async getModels() {
    try {
      const response = await fetch(`${this.baseURL}/models?key=${this.apiKey}`);
      if (!response.ok) {
        throw new Error(`Google API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return (data.models || [])
        .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
        .map(model => ({
          id: this.getPrefixedModelName(model.name.replace('models/', '')),
          object: 'model',
          owned_by: 'google',
          provider: 'google',
          displayName: model.displayName
        }));
    } catch (error) {
      console.error('[Google Provider] Error fetching models:', error);
      return [];
    }
  }

  async chatCompletion(params) {
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

    const modelPath = originalModel.startsWith('models/') ? originalModel : `models/${originalModel}`;
    const endpoint = stream ? 'streamGenerateContent' : 'generateContent';
    
    const response = await fetch(`${this.baseURL}/${modelPath}:${endpoint}?key=${this.apiKey}`, {
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
      usage: {
        prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata?.totalTokenCount || 0
      }
    };
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
