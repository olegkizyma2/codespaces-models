#!/usr/bin/env node

/**
 * Демонстрация трех успешных запросов к GitHub Models API
 * Используются примеры из успешных тестов
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const TOKEN = process.env.GITHUB_TOKEN || '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';
const BASE_URL = 'https://models.github.ai/inference';

console.log('\n' + '='.repeat(70));
console.log('🤖 ТЕСТИРОВАНИЕ ЗАПРОСІВ ДО GITHUB MODELS API');
console.log('='.repeat(70) + '\n');

const requests = [
  {
    name: '📝 Запрос 1: Meta Llama 3.2 (Vision модель)',
    model: 'meta/llama-3.2-11b-vision-instruct',
    prompt: 'Скажи привіт коротко'
  },
  {
    name: '💡 Запрос 2: Microsoft Phi-3.5 Mini (Мала мовна модель)',
    model: 'microsoft/phi-3.5-mini-instruct',
    prompt: 'What is AI?'
  },
  {
    name: '🎯 Запрос 3: Cohere Command R (Універсальна модель)',
    model: 'cohere/cohere-command-r-08-2024',
    prompt: 'Напиши короткий твір про осінь'
  }
];

async function makeRequest(index, request) {
  console.log(`\n${request.name}`);
  console.log('-'.repeat(70));
  console.log(`Model: ${request.model}`);
  console.log(`Prompt: "${request.prompt}"\n`);
  
  try {
    const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        model: request.model,
        messages: [
          {
            role: 'user',
            content: request.prompt
          }
        ],
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
    console.log(`Response: "${message.substring(0, 100)}..."`);
    console.log(`Tokens: ${tokens}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Помилка: ${error.message}`);
    return false;
  }
}

async function runTests() {
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < requests.length; i++) {
    const success = await makeRequest(i + 1, requests[i]);
    if (success) {
      successful++;
    } else {
      failed++;
    }
    
    // Затримка між запитами
    if (i < requests.length - 1) {
      console.log('\n⏳ Затримка 2 секунди...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Резюме
  console.log('\n' + '='.repeat(70));
  console.log('📊 РЕЗЮМЕ ТЕСТУВАННЯ');
  console.log('='.repeat(70));
  console.log(`✅ Успішно: ${successful}/${requests.length}`);
  console.log(`❌ Помилки: ${failed}/${requests.length}`);
  console.log('='.repeat(70) + '\n');

  if (successful === requests.length) {
    console.log('🎉 ВСІ ЗАПИТИ УСПІШНІ!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Деякі запити не вдалися. Перевірте конфігурацію.\n');
    process.exit(1);
  }
}

// Показуємо конфігурацію
console.log('⚙️  Конфігурація:');
console.log(`  Base URL: ${BASE_URL}`);
console.log(`  Token: ${TOKEN.substring(0, 10)}...${TOKEN.substring(TOKEN.length - 5)}`);
console.log('\n' + '='.repeat(70) + '\n');

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
