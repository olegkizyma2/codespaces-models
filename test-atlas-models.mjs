#!/usr/bin/env node

/**
 * Test ATLAS models with real API calls
 */

import 'dotenv/config';
import { ATLASProvider } from './providers/atlas.mjs';

console.log('🧪 Тестування моделей ATLAS\n');

async function testModel(atlas, modelName) {
  console.log(`\n📝 Тест моделі: ${modelName}`);
  console.log('='.repeat(60));
  
  try {
    const startTime = Date.now();
    
    const response = await atlas.chat({
      model: modelName,
      messages: [
        { role: 'user', content: 'Say "Hello from ATLAS!" in one sentence.' }
      ],
      temperature: 0.7,
      max_tokens: 50
    });
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Успіх (${duration}ms)`);
    console.log(`Відповідь: ${response.choices[0].message.content}`);
    
    // Usage info
    const usage = atlas.extractUsage(response);
    if (usage) {
      console.log(`Використання: ${usage.inputTokens} вхідних + ${usage.outputTokens} вихідних = ${usage.totalTokens} токенів`);
    }
    
    // Token rotation info
    console.log(`Поточний токен: ${atlas.currentTokenIndex + 1}/${atlas.tokens.length}`);
    
    return { success: true, duration, model: modelName };
    
  } catch (error) {
    console.log(`❌ Помилка: ${error.message}`);
    if (error.response) {
      console.log(`   Статус: ${error.response.status}`);
      console.log(`   Деталі: ${JSON.stringify(error.response.data).substring(0, 200)}`);
    }
    return { success: false, error: error.message, model: modelName };
  }
}

async function main() {
  try {
    // Initialize provider
    console.log('🚀 Ініціалізація ATLAS провайдера...\n');
    const atlas = ATLASProvider.fromEnv();
    
    console.log(`Токенів в ротації: ${atlas.tokens.length}`);
    console.log(`Доступно моделей: ${ATLASProvider.getAllModels().length}`);
    
    // Test different provider models
    const testModels = [
      'openai/gpt-4o-mini',           // OpenAI (most reliable)
      'openai/gpt-4o',                // OpenAI flagship
      'meta/llama-3.3-70b-instruct',  // Meta
      'microsoft/phi-4-mini-instruct', // Microsoft
      'mistral-ai/mistral-small-2503', // Mistral
    ];
    
    console.log(`\n📋 Тестуємо ${testModels.length} моделей...\n`);
    
    const results = [];
    
    for (const model of testModels) {
      const result = await testModel(atlas, model);
      results.push(result);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 ПІДСУМОК ТЕСТУВАННЯ');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`\n✅ Успішно: ${successful.length}/${results.length}`);
    if (successful.length > 0) {
      successful.forEach(r => {
        console.log(`   - ${r.model} (${r.duration}ms)`);
      });
    }
    
    if (failed.length > 0) {
      console.log(`\n❌ Провалено: ${failed.length}/${results.length}`);
      failed.forEach(r => {
        console.log(`   - ${r.model}: ${r.error}`);
      });
    }
    
    // Token rotation status
    console.log(`\n🔄 Стан токенів:`);
    atlas.tokens.forEach((token, idx) => {
      const status = token.blocked ? '🔒 Заблокований' : '✅ Активний';
      const current = idx === atlas.currentTokenIndex ? '👈 Поточний' : '';
      console.log(`   ${idx + 1}. ${token.key}: ${status} ${current}`);
      if (token.failures > 0) {
        console.log(`      Помилок: ${token.failures}`);
      }
    });
    
    console.log('\n✅ Тестування завершено!');
    
  } catch (error) {
    console.error('\n❌ Критична помилка:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
