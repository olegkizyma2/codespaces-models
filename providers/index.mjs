/**
 * Providers Module - Main export file
 * 
 * This module provides a multi-provider system for LLM integrations
 * Based on the goose providers architecture
 */

import { Provider } from './base.mjs';
import { AnthropicProvider } from './anthropic.mjs';
import { OpenAIProvider } from './openai.mjs';
import { AzureProvider } from './azure.mjs';
import { OllamaProvider } from './ollama.mjs';
import { GoogleProvider } from './google.mjs';
import { OpenRouterProvider } from './openrouter.mjs';
import { ProviderRegistry } from './registry.mjs';
import { ProviderConfigManager } from './config.mjs';

export {
  Provider,
  AnthropicProvider,
  OpenAIProvider,
  AzureProvider,
  OllamaProvider,
  GoogleProvider,
  OpenRouterProvider,
  ProviderRegistry,
  ProviderConfigManager
};

/**
 * Initialize provider system
 * @returns {Object} Initialized registry and config manager
 */
export function initializeProviders() {
  const configManager = new ProviderConfigManager();
  const registry = new ProviderRegistry();
  
  // Initialize providers from configuration
  registry.initializeFromConfig(configManager.getConfig());
  
  return {
    registry,
    configManager
  };
}

export default {
  Provider,
  AnthropicProvider,
  OpenAIProvider,
  AzureProvider,
  OllamaProvider,
  GoogleProvider,
  OpenRouterProvider,
  ProviderRegistry,
  ProviderConfigManager,
  initializeProviders
};
