#!/usr/bin/env node

/**
 * Test ATLAS models through the server API
 */

import 'dotenv/config';

const serverUrl = 'http://localhost:4000';

async function testModelThroughServer(model) {
  console.log(`\n📝 Тест моделі: ${model}`);
  console.log('='.repeat(60));
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${serverUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: 'Say "Hello from ATLAS!" in one sentence.' }
        ],
        temperature: 0.7,
        max_tokens: 50
      })
    });
    
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ Помилка ${response.status}: ${error.substring(0, 200)}`);
      return { success: false, model, error: `${response.status} ${response.statusText}` };
    }
    
    const data = await response.json();
    
    console.log(`✅ Успіх (${duration}ms)`);
    console.log(`Відповідь: ${data.choices[0].message.content}`);
    console.log(`Використання: ${data.usage?.total_tokens || 'N/A'} токенів`);
    
    return { success: true, duration, model };
    
  } catch (error) {
    console.log(`❌ Помилка: ${error.message}`);
    return { success: false, error: error.message, model };
  }
}

async function main() {
  console.log('🧪 Тестування ATLAS моделей через сервер\n');
  console.log(`Server: ${serverUrl}\n`);
  
  const testModels = [
    'atlas-openai/gpt-4o-mini',
    'atlas-openai/gpt-4o',
    'atlas-meta/llama-3.3-70b-instruct',
    'atlas-microsoft/phi-4-mini-instruct',
    'atlas-mistral-ai/mistral-small-2503'
  ];
  
  console.log(`📋 Тестуємо ${testModels.length} моделей...\n`);
  
  const results = [];
  
  for (const model of testModels) {
    const result = await testModelThroughServer(model);
    results.push(result);
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
  
  console.log('\n✅ Тестування завершено!');
}

main();
