#!/usr/bin/env node

import 'dotenv/config';

const token = '[REDACTED_GITHUB_PAT]';
const endpoints = [
  'https://models.inference.ai.azure.com',
  'https://models.github.ai/inference'
];

async function testEndpoint(baseURL) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📡 Endpoint: ${baseURL}`);
  console.log('='.repeat(60));
  
  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
    await new Promise(r => setTimeout(r, 500));
  }
}

main();
