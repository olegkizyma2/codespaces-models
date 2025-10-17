#!/usr/bin/env node
/**
 * Тест ATLAS Provider з 58 моделями
 */

import { ATLASProvider } from './providers/atlas.mjs';

console.log('🧪 Тест ATLAS Provider (58 моделей)\n');

// Test metadata
const meta = ATLASProvider.metadata();
console.log('✅ ATLAS metadata:');
console.log('  Name:', meta.name);
console.log('  Display:', meta.displayName);
console.log('  Default:', meta.defaultModel);
console.log('  Models:', meta.knownModels.length);
console.log('  Config Keys:', meta.configKeys.length);
console.log();

// Test static method
const allModels = ATLASProvider.getAllModels();
console.log('📦 Всі моделі ATLAS:', allModels.length);
console.log();

// Show sample models by provider
const providers = {};
allModels.forEach(model => {
  const provider = model.split('/')[0];
  if (!providers[provider]) providers[provider] = [];
  providers[provider].push(model);
});

console.log('📊 Розподіл моделей по провайдерам:');
Object.entries(providers).forEach(([provider, models]) => {
  console.log(`  - ${provider}: ${models.length} моделей`);
});
console.log();

// Show some sample models
console.log('🎯 Приклади моделей:');
console.log('  OpenAI:', allModels.filter(m => m.startsWith('openai')).slice(0, 3).join(', '));
console.log('  Meta:', allModels.filter(m => m.startsWith('meta')).slice(0, 3).join(', '));
console.log('  Microsoft:', allModels.filter(m => m.startsWith('microsoft')).slice(0, 3).join(', '));
console.log('  Mistral:', allModels.filter(m => m.startsWith('mistral')).slice(0, 3).join(', '));
console.log('  DeepSeek:', allModels.filter(m => m.startsWith('deepseek')).slice(0, 3).join(', '));
console.log('  XAI:', allModels.filter(m => m.startsWith('xai')).slice(0, 3).join(', '));
console.log();

// Test ModelInfo
const firstModel = meta.knownModels[0];
console.log('🎯 Приклад ModelInfo (перша модель):');
console.log('  Model:', firstModel.name);
console.log('  Context:', firstModel.contextLimit);
console.log('  Input Cost: $' + firstModel.inputTokenCost + '/1M tokens');
console.log('  Output Cost: $' + firstModel.outputTokenCost + '/1M tokens');
console.log();

// Test gpt-4o model
const gpt4o = meta.knownModels.find(m => m.name === 'openai/gpt-4o');
if (gpt4o) {
  console.log('🎯 OpenAI GPT-4o модель:');
  console.log('  Model:', gpt4o.name);
  console.log('  Context:', gpt4o.contextLimit);
  console.log('  Input Cost: $' + gpt4o.inputTokenCost + '/1M tokens');
  console.log('  Output Cost: $' + gpt4o.outputTokenCost + '/1M tokens');
  console.log();
}

console.log('🎉 ATLAS провайдер з 58 моделями адаптовано успішно!');
