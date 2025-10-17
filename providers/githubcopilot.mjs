/**
 * GitHub Copilot Provider
 * Main provider for GitHub Copilot integration
 */
import { Provider } from './base.mjs';

export class GitHubCopilotProvider extends Provider {
  constructor(config = {}) {
    super({
      name: 'githubcopilot',
      apiKey: config.apiKey || process.env.GITHUB_COPILOT_API_KEY,
      baseURL: config.baseURL || process.env.GITHUB_COPILOT_BASE_URL || 'https://api.githubcopilot.com',
      modelPrefix: 'ext-copilot-',
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
    // Collect all GITHUB_COPILOT_TOKEN* from environment
    const tokenKeys = Object.keys(process.env).filter(key => 
      key.startsWith('GITHUB_COPILOT_TOKEN')
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
        key: 'GITHUB_COPILOT_API_KEY',
        value: this.apiKey,
        blocked: false,
        blockedUntil: 0,
        failures: 0
      });
    }

    console.log(`[GITHUB-COPILOT] Initialized with ${this.tokens.length} tokens`);
  }

  /**
   * Get current active token
   */
  getCurrentToken() {
    if (this.tokens.length === 0) return null;
    
    // Check if current token is blocked
    const now = Date.now();
    const current = this.tokens[this.currentTokenIndex];
    
    if (current.blocked && current.blockedUntil > now) {
      // Try to find next available token
      const availableIndex = this.tokens.findIndex((t, idx) => 
        idx !== this.currentTokenIndex && (!t.blocked || t.blockedUntil <= now)
      );
      
      if (availableIndex !== -1) {
        console.log(`[GITHUB-COPILOT] Switching from blocked token to index ${availableIndex}`);
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
      console.log('[GITHUB-COPILOT] No additional tokens available for rotation');
      return;
    }

    const currentToken = this.tokens[this.currentTokenIndex];
    currentToken.blocked = true;
    currentToken.blockedUntil = Date.now() + 60000; // Block for 1 minute
    currentToken.failures++;

    this.currentTokenIndex = (this.currentTokenIndex + 1) % this.tokens.length;
    
    console.log(`[GITHUB-COPILOT] Rotated to token ${this.tokens[this.currentTokenIndex].key}`);
  }

  async getModels() {
    // GitHub Copilot models
    const models = [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
      'claude-3-opus',
      'claude-3-sonnet'
    ];

    return models.map(id => ({
      id: this.getPrefixedModelName(id),
      object: 'model',
      owned_by: 'github-copilot',
      provider: 'githubcopilot'
    }));
  }

  async chatCompletion(params) {
    const { model, messages, temperature = 0.7, max_tokens = 2048, stream = false } = params;
    const originalModel = this.getOriginalModelName(model);
    const token = this.getCurrentToken();

    if (!token) {
      throw new Error('No GitHub Copilot token available');
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
        // Handle rate limit
        if (response.status === 429) {
          console.log('[GITHUB-COPILOT] Rate limit hit, rotating token');
          this.rotateToken();
          throw new Error('Rate limit exceeded, token rotated');
        }
        
        const error = await response.text();
        throw new Error(`GitHub Copilot API error: ${error}`);
      }

      const data = await response.json();

      // Return in OpenAI format
      return {
        id: data.id || `copilot-${Date.now()}`,
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
      // Log error but don't expose internal details
      console.error('[GITHUB-COPILOT] Error:', error.message);
      throw error;
    }
  }

  async *streamChatCompletion(params) {
    const { model, messages, temperature = 0.7, max_tokens = 2048 } = params;
    const originalModel = this.getOriginalModelName(model);
    const token = this.getCurrentToken();

    if (!token) {
      throw new Error('No GitHub Copilot token available');
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
        console.log('[GITHUB-COPILOT] Rate limit hit in stream, rotating token');
        this.rotateToken();
        throw new Error('Rate limit exceeded, token rotated');
      }
      const error = await response.text();
      throw new Error(`GitHub Copilot API error: ${error}`);
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
              id: parsed.id || `copilot-stream-${Date.now()}`,
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
            console.error('[GITHUB-COPILOT] Error parsing stream:', e);
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

export default GitHubCopilotProvider;
