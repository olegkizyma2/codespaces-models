#!/usr/bin/env node

import 'dotenv/config';

const baseURL = 'http://localhost:4000/v1/chat/completions';
const model = 'phi-4-mini-reasoning';

async function testModel() {
  console.log(`\nТестую модель: ${model} через локальний сервер`);
  try {
    const response = await fetch(baseURL, {
      method: 'POST',
      headers: {
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
      console.log(`Відповідь: ${data.choices?.[0]?.message?.content || JSON.stringify(data)}`);
    } else {
      const error = await response.text();
      console.log('❌ ПОМИЛКА:');
      console.log(error.substring(0, 300));
    }
  } catch (error) {
    console.log(`❌ Помилка: ${error.message}`);
  }
}

testModel();
