#!/usr/bin/env node

/**
 * Test different GitHub Models API endpoints
 */

import 'dotenv/config';
import OpenAI from 'openai';

const token = process.env.GITHUB_TOKEN;

console.log('🔍 Тестування GitHub Models API endpoints\n');
console.log(`Token: ${token?.substring(0, 10)}...`);
console.log(`Token length: ${token?.length}\n`);

const endpoints = [
  'https://models.inference.ai.azure.com',
  'https://models.github.ai/inference',
  'https://api.githubcopilot.com',
  'https://models.githubusercontent.com'
];

async function testEndpoint(baseURL) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📡 Endpoint: ${baseURL}`);
  console.log('='.repeat(60));
  
  try {
    const client = new OpenAI({
      baseURL,
      apiKey: token
    });
    
    console.log('Створено OpenAI клієнт');
    console.log('Надсилаємо запит...\n');
    
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say hi' }],
      max_tokens: 10
    });
    
    console.log('✅ УСПІХ!');
    console.log(`Модель: ${response.model}`);
    console.log(`Відповідь: ${response.choices[0].message.content}`);
    console.log(`Токени: ${response.usage?.total_tokens || 'N/A'}`);
    
    return { success: true, baseURL };
    
  } catch (error) {
    console.log('❌ ПОМИЛКА');
    console.log(`Статус: ${error.status || error.code || 'N/A'}`);
    console.log(`Повідомлення: ${error.message}`);
    
    if (error.response) {
      console.log(`Response status: ${error.response.status}`);
      console.log(`Response data: ${JSON.stringify(error.response.data || error.response).substring(0, 200)}`);
    }
    
    return { success: false, baseURL, error: error.message };
  }
}

async function main() {
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 ПІДСУМОК');
  console.log('='.repeat(60));
  
  const working = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (working.length > 0) {
    console.log(`\n✅ Працюючі endpoints: ${working.length}`);
    working.forEach(r => console.log(`   - ${r.baseURL}`));
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ Не працюють: ${failed.length}`);
    failed.forEach(r => console.log(`   - ${r.baseURL}`));
  }
}

main();
