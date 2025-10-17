/**
 * Claude Code Provider
 * Specialized Claude provider for code-related tasks
 */
import { Provider } from './base.mjs';

export class ClaudeCodeProvider extends Provider {
  constructor(config = {}) {
    super({
      name: 'claude_code',
      apiKey: config.apiKey || process.env.CLAUDE_CODE_API_KEY,
      baseURL: config.baseURL || process.env.CLAUDE_CODE_BASE_URL || 'https://api.anthropic.com',
      modelPrefix: 'ext-claude-code-',
      ...config
    });
    
    this.apiVersion = '2023-06-01';
    
    // Support for multiple tokens (rotation)
    this.tokens = [];
    this.currentTokenIndex = 0;
    this.initializeTokens(config);
  }

  /**
   * Initialize token rotation support
   */
  initializeTokens(config) {
    // Collect all CLAUDE_CODE_TOKEN* from environment
    const tokenKeys = Object.keys(process.env).filter(key => 
      key.startsWith('CLAUDE_CODE_TOKEN')
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
        key: 'CLAUDE_CODE_API_KEY',
        value: this.apiKey,
        blocked: false,
        blockedUntil: 0,
        failures: 0
      });
    }

    console.log(`[CLAUDE-CODE] Initialized with ${this.tokens.length} tokens`);
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
        console.log(`[CLAUDE-CODE] Switching from blocked token to index ${availableIndex}`);
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
      console.log('[CLAUDE-CODE] No additional tokens available for rotation');
      return;
    }

    const currentToken = this.tokens[this.currentTokenIndex];
    currentToken.blocked = true;
    currentToken.blockedUntil = Date.now() + 60000;
    currentToken.failures++;

    this.currentTokenIndex = (this.currentTokenIndex + 1) % this.tokens.length;
    
    console.log(`[CLAUDE-CODE] Rotated to token ${this.tokens[this.currentTokenIndex].key}`);
  }

  async getModels() {
    // Claude models optimized for code
    const models = [
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];

    return models.map(id => ({
      id: this.getPrefixedModelName(id),
      object: 'model',
      owned_by: 'anthropic',
      provider: 'claude_code',
      description: 'Code-optimized Claude model'
    }));
  }

  async chatCompletion(params) {
    const { model, messages, temperature = 0.5, max_tokens = 4096, stream = false } = params;
    const originalModel = this.getOriginalModelName(model);
    const token = this.getCurrentToken();

    if (!token) {
      throw new Error('No Claude Code token available');
    }

    // Convert OpenAI format to Anthropic format
    const anthropicMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    const requestBody = {
      model: originalModel,
      messages: anthropicMessages,
      max_tokens,
      temperature,
      stream
    };

    try {
      const response = await fetch(`${this.baseURL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': token,
          'anthropic-version': this.apiVersion
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.log('[CLAUDE-CODE] Rate limit hit, rotating token');
          this.rotateToken();
          throw new Error('Rate limit exceeded, token rotated');
        }
        
        const error = await response.text();
        throw new Error(`Claude Code API error: ${error}`);
      }

      const data = await response.json();

      // Convert Anthropic response to OpenAI format
      return {
        id: data.id,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: this.getPrefixedModelName(originalModel),
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: data.content[0]?.text || ''
          },
          finish_reason: data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason
        }],
        usage: {
          prompt_tokens: data.usage?.input_tokens || 0,
          completion_tokens: data.usage?.output_tokens || 0,
          total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        }
      };
    } catch (error) {
      console.error('[CLAUDE-CODE] Error:', error.message);
      throw error;
    }
  }

  async *streamChatCompletion(params) {
    const { model, messages, temperature = 0.5, max_tokens = 4096 } = params;
    const originalModel = this.getOriginalModelName(model);
    const token = this.getCurrentToken();

    if (!token) {
      throw new Error('No Claude Code token available');
    }

    const anthropicMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    const requestBody = {
      model: originalModel,
      messages: anthropicMessages,
      max_tokens,
      temperature,
      stream: true
    };

    const response = await fetch(`${this.baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': token,
        'anthropic-version': this.apiVersion
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.log('[CLAUDE-CODE] Rate limit hit in stream, rotating token');
        this.rotateToken();
        throw new Error('Rate limit exceeded, token rotated');
      }
      const error = await response.text();
      throw new Error(`Claude Code API error: ${error}`);
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
            if (parsed.type === 'content_block_delta') {
              yield {
                id: parsed.message?.id,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: this.getPrefixedModelName(originalModel),
                choices: [{
                  index: 0,
                  delta: {
                    content: parsed.delta?.text || ''
                  },
                  finish_reason: null
                }]
              };
            }
          } catch (e) {
            console.error('[CLAUDE-CODE] Error parsing stream:', e);
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

export default ClaudeCodeProvider;
