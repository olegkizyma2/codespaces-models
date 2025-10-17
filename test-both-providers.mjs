#!/usr/bin/env node

/**
 * Тест обох провайдерів: Atlas та GitHub Copilot
 * Виконує запити до обох провайдерів з однаковими моделями
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:4000';

console.log('\n' + '='.repeat(70));
console.log('🤖 ТЕСТУВАННЯ ATLAS та GITHUB COPILOT ПРОВАЙДЕРІВ');
console.log('='.repeat(70) + '\n');

// Тестові запити для обох провайдерів
const tests = [
  {
    name: 'Atlas: Meta Llama 3.2',
    model: 'atlas-meta/llama-3.2-11b-vision-instruct',
    prompt: 'Say Hello in one word'
  },
  {
    name: 'Copilot: Meta Llama 3.2',
    model: 'copilot-meta/llama-3.2-11b-vision-instruct',
    prompt: 'Say Hello in one word'
  },
  {
    name: 'Atlas: Cohere Command R',
    model: 'atlas-cohere/cohere-command-r-08-2024',
    prompt: 'What is AI?'
  },
  {
    name: 'Copilot: Cohere Command R',
    model: 'copilot-cohere/cohere-command-r-08-2024',
    prompt: 'What is AI?'
  }
];

async function testProvider(index, test) {
  console.log(`\n${index}. ${test.name}`);
  console.log('-'.repeat(70));
  console.log(`Model: ${test.model}`);
  console.log(`Prompt: "${test.prompt}"\n`);
  
  try {
    const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: test.model,
        messages: [{ role: 'user', content: test.prompt }],
        max_tokens: 100,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error?.message || 'Unknown error'}`);
    }

    const message = data.choices?.[0]?.message?.content || 'No response';
    const tokens = data.usage?.total_tokens || 0;
    
    console.log(`✅ Успіх!`);
    console.log(`Response: "${message.substring(0, 80)}..."`);
    console.log(`Tokens: ${tokens}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Помилка: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < tests.length; i++) {
    const success = await testProvider(i + 1, tests[i]);
    if (success) {
      successful++;
    } else {
      failed++;
    }
    
    // Затримка між запитами
    if (i < tests.length - 1) {
      console.log('\n⏳ Затримка 2 секунди...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Резюме
  console.log('\n' + '='.repeat(70));
  console.log('📊 РЕЗЮМЕ ТЕСТУВАННЯ');
  console.log('='.repeat(70));
  console.log(`✅ Успішно: ${successful}/${tests.length}`);
  console.log(`❌ Помилки: ${failed}/${tests.length}`);
  console.log('='.repeat(70) + '\n');

  if (successful === tests.length) {
    console.log('🎉 ВСІ ЗАПИТИ УСПІШНІ!\n');
    console.log('📊 Статистика провайдерів:');
    console.log('   Atlas: 2/2 ✅');
    console.log('   Copilot: 2/2 ✅');
    console.log('\n✨ ОБИДВА ПРОВАЙДЕРИ ПРАЦЮЮТЬ ІДЕАЛЬНО!\n');
    process.exit(0);
  } else {
    console.log(`⚠️  Деякі запити не вдалися.\n`);
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
