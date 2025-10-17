/**
 * Cursor AI Provider
 * Integration with Cursor AI for code assistance
 */
import { Provider } from './base.mjs';

export class CursorAgentProvider extends Provider {
  constructor(config = {}) {
    super({
      name: 'cursor_agent',
      apiKey: config.apiKey || process.env.CURSOR_AGENT_API_KEY,
      baseURL: config.baseURL || process.env.CURSOR_AGENT_BASE_URL || 'https://api.cursor.sh',
      modelPrefix: 'ext-cursor-',
      ...config
    });
    
    // Support for multiple tokens (rotation)
    this.tokens = [];
    this.currentTokenIndex = 0;
    this.initializeTokens(config);
  }

  /**
   * Initialize token rotation support
   */
  initializeTokens(config) {
    // Collect all CURSOR_AGENT_TOKEN* from environment
    const tokenKeys = Object.keys(process.env).filter(key => 
      key.startsWith('CURSOR_AGENT_TOKEN')
    );
    
    for (const key of tokenKeys) {
      const token = process.env[key];
      if (token && token.trim()) {
        this.tokens.push({
          key,
          value: token.trim(),
          blocked: false,
          blockedUntil: 0,
          failures: 0
        });
      }
    }

    // If single API key provided, use it
    if (this.apiKey && !this.tokens.some(t => t.value === this.apiKey)) {
      this.tokens.unshift({
        key: 'CURSOR_AGENT_API_KEY',
        value: this.apiKey,
        blocked: false,
        blockedUntil: 0,
        failures: 0
      });
    }

    console.log(`[CURSOR-AGENT] Initialized with ${this.tokens.length} tokens`);
  }

  /**
   * Get current active token
   */
  getCurrentToken() {
    if (this.tokens.length === 0) return null;
    
    const now = Date.now();
    const current = this.tokens[this.currentTokenIndex];
    
    if (current.blocked && current.blockedUntil > now) {
      const availableIndex = this.tokens.findIndex((t, idx) => 
        idx !== this.currentTokenIndex && (!t.blocked || t.blockedUntil <= now)
      );
      
      if (availableIndex !== -1) {
        console.log(`[CURSOR-AGENT] Switching from blocked token to index ${availableIndex}`);
        this.currentTokenIndex = availableIndex;
        return this.tokens[availableIndex].value;
      }
    }
    
    return current.value;
  }

  /**
   * Rotate to next token (on rate limit)
   */
  rotateToken() {
    if (this.tokens.length <= 1) {
      console.log('[CURSOR-AGENT] No additional tokens available for rotation');
      return;
    }

    const currentToken = this.tokens[this.currentTokenIndex];
    currentToken.blocked = true;
    currentToken.blockedUntil = Date.now() + 60000;
    currentToken.failures++;

    this.currentTokenIndex = (this.currentTokenIndex + 1) % this.tokens.length;
    
    console.log(`[CURSOR-AGENT] Rotated to token ${this.tokens[this.currentTokenIndex].key}`);
  }

  async getModels() {
    // Cursor AI models
    const models = [
      'gpt-4-cursor',
      'gpt-3.5-turbo-cursor',
      'claude-cursor',
      'cursor-small',
      'cursor-medium'
    ];

    return models.map(id => ({
      id: this.getPrefixedModelName(id),
      object: 'model',
      owned_by: 'cursor',
      provider: 'cursor_agent',
      description: 'Cursor AI code assistant model'
    }));
  }

  async chatCompletion(params) {
    const { model, messages, temperature = 0.7, max_tokens = 2048, stream = false } = params;
    const originalModel = this.getOriginalModelName(model);
    const token = this.getCurrentToken();

    if (!token) {
      throw new Error('No Cursor Agent token available');
    }

    const requestBody = {
      model: originalModel,
      messages,
      temperature,
      max_tokens,
      stream
    };

    try {
      const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.log('[CURSOR-AGENT] Rate limit hit, rotating token');
          this.rotateToken();
          throw new Error('Rate limit exceeded, token rotated');
        }
        
        const error = await response.text();
        throw new Error(`Cursor Agent API error: ${error}`);
      }

      const data = await response.json();

      // Return in OpenAI format
      return {
        id: data.id || `cursor-${Date.now()}`,
        object: 'chat.completion',
        created: data.created || Math.floor(Date.now() / 1000),
        model: this.getPrefixedModelName(originalModel),
        choices: data.choices || [{
          index: 0,
          message: data.message || { role: 'assistant', content: '' },
          finish_reason: data.finish_reason || 'stop'
        }],
        usage: data.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      };
    } catch (error) {
      console.error('[CURSOR-AGENT] Error:', error.message);
      throw error;
    }
  }

  async *streamChatCompletion(params) {
    const { model, messages, temperature = 0.7, max_tokens = 2048 } = params;
    const originalModel = this.getOriginalModelName(model);
    const token = this.getCurrentToken();

    if (!token) {
      throw new Error('No Cursor Agent token available');
    }

    const requestBody = {
      model: originalModel,
      messages,
      temperature,
      max_tokens,
      stream: true
    };

    const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.log('[CURSOR-AGENT] Rate limit hit in stream, rotating token');
        this.rotateToken();
        throw new Error('Rate limit exceeded, token rotated');
      }
      const error = await response.text();
      throw new Error(`Cursor Agent API error: ${error}`);
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
              id: parsed.id || `cursor-stream-${Date.now()}`,
              object: 'chat.completion.chunk',
              created: parsed.created || Math.floor(Date.now() / 1000),
              model: this.getPrefixedModelName(originalModel),
              choices: parsed.choices || [{
                index: 0,
                delta: parsed.delta || {},
                finish_reason: parsed.finish_reason || null
              }]
            };
          } catch (e) {
            console.error('[CURSOR-AGENT] Error parsing stream:', e);
          }
        }
      }
    }
  }

  /**
   * Get token statistics
   */
  getTokenStats() {
    return this.tokens.map((token, idx) => ({
      key: token.key,
      active: idx === this.currentTokenIndex,
      blocked: token.blocked,
      blockedUntil: token.blockedUntil,
      failures: token.failures
    }));
  }
}

export default CursorAgentProvider;
