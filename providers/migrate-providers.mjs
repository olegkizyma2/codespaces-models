#!/usr/bin/env node
/**
 * Provider Migration Script
 * Автоматично адаптує провайдери до Goose-стилю
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Конфігурація провайдерів для міграції
const providersConfig = {
  google: {
    name: 'google',
    displayName: 'Google',
    description: 'Google Gemini models via official API',
    defaultModel: 'gemini-1.5-pro',
    knownModels: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'],
    docUrl: 'https://ai.google.dev/gemini-api/docs/models',
    envKeys: [
      { name: 'GOOGLE_API_KEY', required: true, description: 'Google API key' }
    ]
  },
  azure: {
    name: 'azure',
    displayName: 'Azure OpenAI',
    description: 'Azure OpenAI Service',
    defaultModel: 'gpt-4o',
    knownModels: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    docUrl: 'https://learn.microsoft.com/azure/ai-services/openai/',
    envKeys: [
      { name: 'AZURE_OPENAI_API_KEY', required: true, description: 'Azure API key' },
      { name: 'AZURE_OPENAI_ENDPOINT', required: true, description: 'Azure endpoint URL' },
      { name: 'AZURE_OPENAI_DEPLOYMENT', required: false, description: 'Deployment name' }
    ]
  },
  openrouter: {
    name: 'openrouter',
    displayName: 'OpenRouter',
    description: 'OpenRouter unified API for multiple models',
    defaultModel: 'openai/gpt-4o',
    knownModels: [],
    docUrl: 'https://openrouter.ai/docs',
    envKeys: [
      { name: 'OPENROUTER_API_KEY', required: true, description: 'OpenRouter API key' }
    ]
  },
  ollama: {
    name: 'ollama',
    displayName: 'Ollama',
    description: 'Local Ollama models',
    defaultModel: 'llama3.1:latest',
    knownModels: [],
    docUrl: 'https://ollama.ai/',
    envKeys: [
      { name: 'OLLAMA_HOST', required: false, description: 'Ollama host URL (default: http://localhost:11434)' }
    ]
  },
  xai: {
    name: 'xai',
    displayName: 'xAI',
    description: 'xAI Grok models',
    defaultModel: 'grok-beta',
    knownModels: ['grok-beta', 'grok-vision-beta'],
    docUrl: 'https://docs.x.ai/docs',
    envKeys: [
      { name: 'XAI_API_KEY', required: true, description: 'xAI API key' }
    ]
  }
};

async function main() {
  console.log('🔄 Починаємо адаптацію провайдерів...\n');

  for (const [providerName, config] of Object.entries(providersConfig)) {
    console.log(`📝 Обробка ${config.displayName}...`);
    
    const filePath = path.join(__dirname, `${providerName}.mjs`);
    
    try {
      // Читаємо файл
      const content = await fs.readFile(filePath, 'utf8');
      
      // Перевіряємо чи вже має metadata
      if (content.includes('static metadata()')) {
        console.log(`   ✓ ${providerName}.mjs вже має metadata(), пропускаємо\n`);
        continue;
      }

      console.log(`   ⚙️ Файл потребує оновлення`);
      console.log(`   Рекомендації для ${providerName}.mjs:`);
      console.log(`     1. Додати import: { Provider, ProviderMetadata, ModelInfo, Usage, ProviderUsage, ProviderError }`);
      console.log(`     2. Додати metadata() метод`);
      console.log(`     3. Додати fromEnv() метод`);
      console.log(`     4. Додати extractUsage() метод`);
      console.log(`     5. Додати handleError() метод`);
      console.log(`     6. Оновити chatCompletion() для повернення usage\n`);
    } catch (error) {
      console.log(`   ⚠️ Помилка читання ${providerName}.mjs: ${error.message}\n`);
    }
  }

  console.log('✅ Аналіз завершено!');
  console.log('\n📋 Перегляньте MIGRATION_GUIDE.md для деталей');
}

main().catch(console.error);
