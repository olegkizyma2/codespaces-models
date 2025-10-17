#!/usr/bin/env node
/**
 * Комплексний тест всіх 10 провайдерів
 * Перевіряє metadata(), fromEnv(), extractUsage(), handleError()
 */

import { OpenAIProvider } from './providers/openai.mjs';
import { AnthropicProvider } from './providers/anthropic.mjs';
import { GitHubCopilotProvider } from './providers/githubcopilot.mjs';
import { GoogleProvider } from './providers/google.mjs';
import { OpenRouterProvider } from './providers/openrouter.mjs';
import { XAIProvider } from './providers/xai.mjs';
import { AzureProvider } from './providers/azure.mjs';
import { OllamaProvider } from './providers/ollama.mjs';
import { LiteLLMProvider } from './providers/litellm.mjs';
import { ATLASProvider } from './providers/atlas.mjs';

console.log('🧪 КОМПЛЕКСНИЙ ТЕСТ ВСІХ ПРОВАЙДЕРІВ\n');
console.log('='.repeat(60));

const providers = [
  { name: 'OpenAI', class: OpenAIProvider },
  { name: 'Anthropic', class: AnthropicProvider },
  { name: 'GitHub Copilot', class: GitHubCopilotProvider },
  { name: 'Google', class: GoogleProvider },
  { name: 'OpenRouter', class: OpenRouterProvider },
  { name: 'XAI', class: XAIProvider },
  { name: 'Azure', class: AzureProvider },
  { name: 'Ollama', class: OllamaProvider },
  { name: 'LiteLLM', class: LiteLLMProvider },
  { name: 'ATLAS', class: ATLASProvider }
];

let totalTests = 0;
let passedTests = 0;

// Тест 1: Метадані
console.log('\n📊 Тест 1: Перевірка metadata()\n');
for (const provider of providers) {
  try {
    const meta = provider.class.metadata();
    const hasName = !!meta.name;
    const hasDisplayName = !!meta.displayName;
    const hasDefaultModel = !!meta.defaultModel;
    const hasKnownModels = Array.isArray(meta.knownModels);
    const hasConfigKeys = Array.isArray(meta.configKeys);
    
    if (hasName && hasDisplayName && hasDefaultModel && hasKnownModels && hasConfigKeys) {
      console.log(`✅ ${provider.name}`);
      console.log(`   Name: ${meta.name}`);
      console.log(`   Display: ${meta.displayName}`);
      console.log(`   Default: ${meta.defaultModel}`);
      console.log(`   Models: ${meta.knownModels.length}`);
      console.log(`   Config: ${meta.configKeys.length} keys`);
      passedTests++;
    } else {
      console.log(`❌ ${provider.name} - incomplete metadata`);
    }
    totalTests++;
  } catch (error) {
    console.log(`❌ ${provider.name} - error: ${error.message}`);
    totalTests++;
  }
}

// Тест 2: Структура класу
console.log('\n📋 Тест 2: Перевірка структури класу\n');
for (const provider of providers) {
  try {
    const hasMethods = [
      typeof provider.class.metadata === 'function',
      typeof provider.class.fromEnv === 'function',
      typeof provider.class.prototype.extractUsage === 'function',
      typeof provider.class.prototype.handleError === 'function'
    ];
    
    if (hasMethods.every(Boolean)) {
      console.log(`✅ ${provider.name} - всі методи присутні`);
      passedTests++;
    } else {
      console.log(`❌ ${provider.name} - відсутні методи`);
    }
    totalTests++;
  } catch (error) {
    console.log(`❌ ${provider.name} - error: ${error.message}`);
    totalTests++;
  }
}

// Тест 3: Метадані моделей
console.log('\n🎯 Тест 3: Перевірка ModelInfo\n');
for (const provider of providers) {
  try {
    const meta = provider.class.metadata();
    if (meta.knownModels.length > 0) {
      const firstModel = meta.knownModels[0];
      const hasName = !!firstModel.name;
      const hasContextLimit = firstModel.contextLimit !== undefined;
      const hasCosts = firstModel.inputTokenCost !== undefined;
      
      if (hasName && hasContextLimit && hasCosts) {
        console.log(`✅ ${provider.name} - ModelInfo valid`);
        console.log(`   Model: ${firstModel.name}`);
        console.log(`   Context: ${firstModel.contextLimit || 'dynamic'}`);
        console.log(`   Input: $${firstModel.inputTokenCost}/1M tokens`);
        passedTests++;
      } else {
        console.log(`❌ ${provider.name} - incomplete ModelInfo`);
      }
    } else {
      console.log(`⚠️  ${provider.name} - dynamic models (OK)`);
      passedTests++;
    }
    totalTests++;
  } catch (error) {
    console.log(`❌ ${provider.name} - error: ${error.message}`);
    totalTests++;
  }
}

// Підсумок
console.log('\n' + '='.repeat(60));
console.log(`\n📊 РЕЗУЛЬТАТИ: ${passedTests}/${totalTests} тестів пройдено`);
console.log(`   ✅ Успішно: ${passedTests}`);
console.log(`   ❌ Провалено: ${totalTests - passedTests}`);
console.log(`   📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('\n🎉 ВСІ ТЕСТИ ПРОЙДЕНО! Всі провайдери адаптовані успішно!\n');
} else {
  console.log('\n⚠️  Деякі тести провалені. Потрібна додаткова робота.\n');
  process.exit(1);
}
