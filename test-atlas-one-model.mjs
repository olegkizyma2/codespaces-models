#!/usr/bin/env node

import 'dotenv/config';

const token = process.env.ATLAS_TOKEN || '';
const baseURL = 'https://models.inference.ai.azure.com';

const model = process.argv[2];
if (!model) {
  console.error('Вкажіть назву моделі як аргумент!');
  process.exit(1);
}

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

testModel(model);
