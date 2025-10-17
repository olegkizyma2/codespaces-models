#!/usr/bin/env node

import 'dotenv/config';

const token = '[REDACTED_GITHUB_PAT]';
const baseURL = 'https://models.inference.ai.azure.com';
const models = [
  'gpt-4o-mini',
  'meta/llama-3.3-70b-instruct',
  'microsoft/phi-4-mini-instruct'
];

async function testModel(model) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Тест моделі: ${model}`);
  console.log('='.repeat(60));
  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Say hi' }],
        max_tokens: 10
      })
    });
    console.log(`Статус: ${response.status} ${response.statusText}`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ УСПІХ!');
      console.log(`Відповідь: ${data.choices[0].message.content}`);
    } else {
      const error = await response.text();
      console.log('❌ ПОМИЛКА:');
      console.log(error.substring(0, 300));
    }
  } catch (error) {
    console.log(`❌ Помилка: ${error.message}`);
  }
}

async function main() {
  for (const model of models) {
    await testModel(model);
    await new Promise(r => setTimeout(r, 500));
  }
}

main();
