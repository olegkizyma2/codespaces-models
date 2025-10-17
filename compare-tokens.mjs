#!/usr/bin/env node

import 'dotenv/config';
import OpenAI from 'openai';

const ghToken = process.env.GITHUB_TOKEN;
const copilotToken = process.env.GITHUB_COPILOT_TOKEN;

console.log('🔍 Порівняння токенів\n');
console.log(`GITHUB_TOKEN: ${ghToken?.substring(0, 15)}... (${ghToken?.length} символів)`);
console.log(`GITHUB_COPILOT_TOKEN: ${copilotToken?.substring(0, 15)}... (${copilotToken?.length} символів)\n`);

async function testToken(token, name, baseURL) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Тест: ${name}`);
  console.log(`Endpoint: ${baseURL}`);
  console.log('='.repeat(60));
  
  try {
    const client = new OpenAI({ baseURL, apiKey: token });
    
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 10
    });
    
    console.log(`✅ ПРАЦЮЄ!`);
    console.log(`Відповідь: ${response.choices[0].message.content}`);
    return true;
    
  } catch (error) {
    console.log(`❌ Не працює: ${error.status} ${error.message}`);
    return false;
  }
}

async function main() {
  const endpoints = [
    'https://models.inference.ai.azure.com',
    'https://api.githubcopilot.com'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n${'*'.repeat(60)}`);
    console.log(`ENDPOINT: ${endpoint}`);
    console.log('*'.repeat(60));
    
    await testToken(ghToken, 'GITHUB_TOKEN (gho_)', endpoint);
    await testToken(copilotToken, 'GITHUB_COPILOT_TOKEN (ghu_)', endpoint);
    
    await new Promise(r => setTimeout(r, 500));
  }
}

main();
