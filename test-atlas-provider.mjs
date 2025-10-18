#!/usr/bin/env node

import 'dotenv/config';

const serverUrl = 'http://localhost:4000';

// Функція для паузи
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Моделі Atlas для тестування (правильні назви GitHub Models API)
const modelsToTest = [
  'atlas-gpt-4o-mini',
  'atlas-llama-3.3-70b-instruct',
  'atlas-phi-4'
];

async function testModel(modelName) {
  console.log(`\n🧪 Тестую модель: ${modelName}`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(`${serverUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: 'Привіт! Скажи щось українською.' }],
        max_tokens: 50
      })
    });
    
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ Помилка ${response.status}`);
      console.log(error.substring(0, 200));
      return { success: false, model: modelName, status: response.status };
    }
    
    const data = await response.json();
    console.log(`✅ Успішно! (${duration}ms)`);
    console.log(`📝 Відповідь: ${data.choices[0].message.content}`);
    console.log(`📊 Токени: ${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`);
    return { success: true, model: modelName, duration, data };
    
  } catch (error) {
    console.log(`❌ Помилка: ${error.message}`);
    return { success: false, model: modelName, error: error.message };
  }
}

async function testAllModels() {
  console.log('🚀 Початок тестування Atlas моделей');
  console.log(`📋 Тестуватиму ${modelsToTest.length} моделей\n`);
  
  const results = [];
  
  for (let i = 0; i < modelsToTest.length; i++) {
    const result = await testModel(modelsToTest[i]);
    results.push(result);
    
    // Пауза 2 секунди між запитами (окрім останнього)
    if (i < modelsToTest.length - 1) {
      console.log('\n⏳ Пауза 2 секунди...');
      await sleep(2000);
    }
  }
  
  // Підсумок
  console.log('\n' + '='.repeat(60));
  console.log('📊 ПІДСУМОК ТЕСТУВАННЯ ATLAS');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n✅ Успішних: ${successful}`);
  console.log(`❌ Помилок: ${failed}`);
  
  if (successful > 0) {
    console.log('\n🎉 Робочі моделі:');
    results.filter(r => r.success).forEach(r => {
      console.log(`  • ${r.model} (${r.duration}ms)`);
    });
  }
  
  if (failed > 0) {
    console.log('\n⚠️  Моделі з помилками:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  • ${r.model} (${r.status ? `HTTP ${r.status}` : r.error})`);
    });
  }
  
  // Якщо всі моделі не працюють, виводимо додаткову інформацію
  if (failed === modelsToTest.length) {
    console.log('\n💡 РЕКОМЕНДАЦІЇ:');
    console.log('  1. Перевірте чи ATLAS_ENABLED=1 в .env файлі');
    console.log('  2. Переконайтесь що GITHUB_TOKEN встановлений і валідний');
    console.log('  3. Перезапустіть сервер після зміни .env');
    console.log('  4. Перевірте чи токен має доступ до GitHub Models API');
  }
}

testAllModels();
