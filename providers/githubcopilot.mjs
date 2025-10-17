/**
 * GitHub Copilot Provider
 * Real GitHub Copilot API integration (like Goose)
 * Uses OAuth Device Code Flow for authentication
 */
import { Provider } from './base.mjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GitHub Copilot OAuth Constants
const GITHUB_COPILOT_CLIENT_ID = 'Iv1.b507a08c87ecfe98';
const GITHUB_COPILOT_DEVICE_CODE_URL = 'https://github.com/login/device/code';
const GITHUB_COPILOT_ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_COPILOT_API_KEY_URL = 'https://api.github.com/copilot_internal/v2/token';

// Known models from Goose
const GITHUB_COPILOT_KNOWN_MODELS = [
  'gpt-4o',
  'o1',
  'o3-mini',
  'claude-3.7-sonnet',
  'claude-sonnet-4',
  'gpt-4.1',
];

export class GitHubCopilotProvider extends Provider {
  constructor(config = {}) {
    super({
      name: 'githubcopilot',
      apiKey: config.apiKey || process.env.GITHUB_COPILOT_TOKEN,
      baseURL: config.baseURL || null, // Will be fetched dynamically
      modelPrefix: 'copilot-',
      ...config
    });
    
    this.tokenCache = null;
    this.tokenExpiry = null;
    this.apiEndpoint = null;
    this.cacheFile = path.join(__dirname, '..', '.cache', 'githubcopilot-token.json');
  }

  /**
   * Get GitHub headers (like Goose)
   */
  getGitHubHeaders() {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'GithubCopilot/1.155.0',
      'editor-version': 'vscode/1.85.1',
      'editor-plugin-version': 'copilot/1.155.0'
    };
  }

  /**
   * Load token from .env and metadata from cache
   */
  async loadCachedToken() {
    try {
      // Always read token from .env
      const envToken = process.env.GITHUB_COPILOT_TOKEN;
      if (!envToken) {
        return false;
      }

      // Try to load metadata (endpoints, expiry) from cache
      try {
        const data = await fs.readFile(this.cacheFile, 'utf8');
        const cached = JSON.parse(data);
        
        if (new Date(cached.expires_at) > new Date()) {
          this.tokenCache = envToken; // Use token from .env, not cache
          this.tokenExpiry = new Date(cached.expires_at);
          this.apiEndpoint = cached.info.endpoints?.api;
          return true;
        }
      } catch (err) {
        // Cache doesn't exist or is invalid - that's OK
      }

      // If we have token but no valid cache, use token anyway
      this.tokenCache = envToken;
      return true;
    } catch (err) {
      console.error('[GITHUB-COPILOT] Error loading token:', err);
    }
    return false;
  }

  /**
   * Save metadata to cache (without token - token stays in .env only)
   */
  async saveTokenCache(info) {
    try {
      const cacheDir = path.dirname(this.cacheFile);
      await fs.mkdir(cacheDir, { recursive: true });
      
      const expiresAt = new Date(Date.now() + info.refresh_in * 1000);
      
      // Save only metadata, NOT the token
      const cacheData = {
        expires_at: expiresAt.toISOString(),
        info: {
          endpoints: info.endpoints,
          expires_at: info.expires_at,
          refresh_in: info.refresh_in,
          sku: info.sku,
          chat_enabled: info.chat_enabled,
          // NO TOKEN - it stays in .env only
        }
      };
      
      await fs.writeFile(this.cacheFile, JSON.stringify(cacheData, null, 2));
      
      // Use token from .env
      this.tokenCache = process.env.GITHUB_COPILOT_TOKEN || info.token;
      this.tokenExpiry = expiresAt;
      this.apiEndpoint = info.endpoints.api;
    } catch (err) {
      console.error('[GITHUB-COPILOT] Failed to save cache:', err);
    }
  }

  /**
   * OAuth Device Code Flow - Step 1: Get device code
   */
  async getDeviceCode() {
    const response = await fetch(GITHUB_COPILOT_DEVICE_CODE_URL, {
      method: 'POST',
      headers: {
        ...this.getGitHubHeaders()
      },
      body: JSON.stringify({
        client_id: GITHUB_COPILOT_CLIENT_ID,
        scope: 'read:user'
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get device code: ${response.status}`);
    }

    const data = await response.json();
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║           🔐 GITHUB COPILOT AUTHENTICATION                   ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    console.log(`Please visit: ${data.verification_uri}`);
    console.log(`Enter code: ${data.user_code}\n`);
    console.log('Waiting for authorization...\n');

    return data;
  }

  /**
   * OAuth Device Code Flow - Step 2: Poll for access token
   */
  async pollForAccessToken(deviceCode) {
    const MAX_ATTEMPTS = 36; // 3 minutes (36 * 5 seconds)
    
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const response = await fetch(GITHUB_COPILOT_ACCESS_TOKEN_URL, {
        method: 'POST',
        headers: {
          ...this.getGitHubHeaders()
        },
        body: JSON.stringify({
          client_id: GITHUB_COPILOT_CLIENT_ID,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to poll for token: ${response.status}`);
      }

      const data = await response.json();

      if (data.access_token) {
        console.log('✅ Authorization successful!\n');
        return data.access_token;
      } else if (data.error === 'authorization_pending') {
        console.log(`⏳ Waiting for authorization (attempt ${attempt + 1}/${MAX_ATTEMPTS})...`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      } else if (data.error) {
        throw new Error(`OAuth error: ${data.error}`);
      }
    }

    throw new Error('Authorization timeout - please try again');
  }

  /**
   * OAuth Device Code Flow - Complete flow
   */
  async performOAuthFlow() {
    try {
      const deviceCodeInfo = await this.getDeviceCode();
      const accessToken = await this.pollForAccessToken(deviceCodeInfo.device_code);
      
      // Save to .env file
      const envPath = path.join(__dirname, '..', '.env');
      let envContent = await fs.readFile(envPath, 'utf8');
      
      // Update or add GITHUB_COPILOT_TOKEN
      if (envContent.includes('GITHUB_COPILOT_TOKEN=')) {
        envContent = envContent.replace(
          /GITHUB_COPILOT_TOKEN=.*/,
          `GITHUB_COPILOT_TOKEN=${accessToken}`
        );
      } else {
        envContent += `\nGITHUB_COPILOT_TOKEN=${accessToken}\n`;
      }
      
      await fs.writeFile(envPath, envContent);
      console.log('✅ Token saved to .env file\n');
      
      this.apiKey = accessToken;
      return accessToken;
    } catch (error) {
      console.error('❌ OAuth flow failed:', error.message);
      throw error;
    }
  }

  /**
   * Get Copilot API token
   */
  async getCopilotToken() {
    // Check if we have valid cached token
    if (this.tokenCache && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.tokenCache;
    }

    // Try to load from cache
    if (await this.loadCachedToken()) {
      if (this.tokenExpiry > new Date()) {
        return this.tokenCache;
      }
    }

    // Need to refresh
    let accessToken = this.apiKey || process.env.GITHUB_COPILOT_TOKEN;
    
    // If no token, start OAuth flow
    if (!accessToken || accessToken === 'your_copilot_token_here') {
      console.log('\n⚠️  No GitHub Copilot token found. Starting OAuth flow...\n');
      accessToken = await this.performOAuthFlow();
    }

    const response = await fetch(GITHUB_COPILOT_API_KEY_URL, {
      headers: {
        ...this.getGitHubHeaders(),
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      // If 404, token might be invalid - try OAuth flow
      if (response.status === 404 || response.status === 401) {
        console.log('\n⚠️  GitHub Copilot token invalid. Starting OAuth flow...\n');
        accessToken = await this.performOAuthFlow();
        
        // Retry with new token
        const retryResponse = await fetch(GITHUB_COPILOT_API_KEY_URL, {
          headers: {
            ...this.getGitHubHeaders(),
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (!retryResponse.ok) {
          throw new Error(`Failed to get Copilot token: ${retryResponse.status} ${retryResponse.statusText}`);
        }
        
        const tokenInfo = await retryResponse.json();
        await this.saveTokenCache(tokenInfo);
        return tokenInfo.token;
      }
      
      throw new Error(`Failed to get Copilot token: ${response.status} ${response.statusText}`);
    }

    const tokenInfo = await response.json();
    await this.saveTokenCache(tokenInfo);
    
    return tokenInfo.token;
  }

  /**
   * Get API endpoint and token
   */
  async getApiInfo() {
    const token = await this.getCopilotToken();
    const endpoint = this.apiEndpoint || 'https://api.githubcopilot.com';
    return { endpoint, token };
  }

  /**
   * Fetch real models from GitHub Copilot API
   */
  async getModels() {
    try {
      // Перевіряємо кеш спочатку без OAuth
      const hasCachedToken = await this.loadCachedToken();
      
      if (!hasCachedToken) {
        // Немає валідного токена - повертаємо fallback моделі без OAuth
        console.log('[GITHUB-COPILOT] No cached token available, returning fallback models');
        return this.getFallbackModels();
      }
      
      // Використовуємо кешований токен
      const response = await fetch(`${this.apiEndpoint}/models`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Copilot-Integration-Id': 'vscode-chat',
          'Authorization': `Bearer ${this.tokenCache}`
        }
      });

      if (!response.ok) {
        console.warn(`[GITHUB-COPILOT] Failed to fetch models: ${response.status}`);
        return this.getFallbackModels();
      }

      const data = await response.json();
      const models = data.data || [];
      
      return models.map(model => {
        const modelId = typeof model === 'string' ? model : model.id;
        return {
          id: this.getPrefixedModelName(modelId),
          original_id: modelId,
          object: 'model',
          created: Date.now(),
          owned_by: this.getModelOwner(modelId),
          provider: 'githubcopilot',
          description: `GitHub Copilot model: ${modelId}`
        };
      });
    } catch (error) {
      console.error('[GITHUB-COPILOT] Error fetching models:', error.message);
      return this.getFallbackModels();
    }
  }

  /**
   * Fallback models if API fetch fails
   */
  getFallbackModels() {
    return GITHUB_COPILOT_KNOWN_MODELS.map(modelId => ({
      id: this.getPrefixedModelName(modelId),
      original_id: modelId,
      object: 'model',
      created: Date.now(),
      owned_by: this.getModelOwner(modelId),
      provider: 'githubcopilot',
      description: `GitHub Copilot model: ${modelId}`
    }));
  }

  /**
   * Determine model owner from model name
   */
  getModelOwner(modelId) {
    if (modelId.startsWith('gpt-') || modelId.startsWith('o1') || modelId.startsWith('o3') || modelId.startsWith('o4')) {
      return 'openai';
    } else if (modelId.startsWith('claude-')) {
      return 'anthropic';
    } else if (modelId.startsWith('gemini-')) {
      return 'google';
    }
    return 'github-copilot';
  }

  async chatCompletion(params) {
    const { model, messages, temperature, max_tokens, stream = false, ...rest } = params;
    const originalModel = this.getOriginalModelName(model);
    const { endpoint, token } = await this.getApiInfo();

    const requestBody = {
      model: originalModel,
      messages,
      temperature,
      max_tokens,
      stream,
      ...rest
    };

    try {
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          ...this.getGitHubHeaders(),
          'Authorization': `Bearer ${token}`,
          'Copilot-Integration-Id': 'vscode-chat'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub Copilot API error (${response.status}): ${errorText}`);
      }

      if (stream) {
        return response;
      }

      const data = await response.json();
      return {
        ...data,
        model: this.getPrefixedModelName(originalModel)
      };
    } catch (error) {
      console.error('[GITHUB-COPILOT] Error:', error.message);
      throw error;
    }
  }

  async *streamChatCompletion(params) {
    const { model, messages, temperature, max_tokens, ...rest } = params;
    const originalModel = this.getOriginalModelName(model);
    const { endpoint, token } = await this.getApiInfo();

    const requestBody = {
      model: originalModel,
      messages,
      temperature,
      max_tokens,
      stream: true,
      ...rest
    };

    try {
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          ...this.getGitHubHeaders(),
          'Authorization': `Bearer ${token}`,
          'Copilot-Integration-Id': 'vscode-chat'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub Copilot API error (${response.status}): ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            yield {
              ...parsed,
              model: this.getPrefixedModelName(originalModel)
            };
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    } catch (error) {
      console.error('[GITHUB-COPILOT] Stream error:', error.message);
      throw error;
    }
  }

  getTokenStats() {
    return {
      cached: !!this.tokenCache,
      expires_at: this.tokenExpiry?.toISOString() || null,
      api_endpoint: this.apiEndpoint || null
    };
  }

  /**
   * Override requiresApiKey - GitHub Copilot token can be obtained via OAuth
   */
  requiresApiKey() {
    return false; // Token can be obtained dynamically
  }
}
