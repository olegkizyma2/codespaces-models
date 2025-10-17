#!/usr/bin/env node

/**
 * Test GitHub token validity
 */

import 'dotenv/config';

const tokens = [
  process.env.GITHUB_TOKEN,
  process.env.GITHUB_TOKEN_2,
  process.env.GITHUB_TOKEN_3,
  process.env.GITHUB_TOKEN_4
].filter(Boolean);

console.log('🔐 Перевірка GitHub токенів\n');

async function testToken(token, name) {
  console.log(`\n📝 Тест: ${name}`);
  console.log('='.repeat(60));
  
  try {
    // Test GitHub API
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    
    console.log(`Статус: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Токен валідний`);
      console.log(`   Користувач: ${data.login}`);
      console.log(`   ID: ${data.id}`);
    } else {
      const error = await response.text();
      console.log(`❌ Токен невалідний`);
      console.log(`   Помилка: ${error.substring(0, 200)}`);
    }
    
    // Test GitHub Models API
    console.log('\n🤖 Тест GitHub Models API:');
    const modelsResponse = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10
      })
    });
    
    console.log(`   Статус: ${modelsResponse.status} ${modelsResponse.statusText}`);
    
    if (modelsResponse.ok) {
      const data = await modelsResponse.json();
      console.log(`   ✅ GitHub Models API доступний`);
      console.log(`   Відповідь: ${data.choices[0].message.content}`);
    } else {
      const error = await modelsResponse.text();
      console.log(`   ❌ GitHub Models API помилка`);
      console.log(`   Деталі: ${error.substring(0, 300)}`);
    }
    
    return { success: response.ok, name };
    
  } catch (error) {
    console.log(`❌ Помилка запиту: ${error.message}`);
    return { success: false, name, error: error.message };
  }
}

async function main() {
  console.log(`Знайдено токенів: ${tokens.length}\n`);
  
  const tokenNames = [
    'GITHUB_TOKEN',
    'GITHUB_TOKEN_2',
    'GITHUB_TOKEN_3',
    'GITHUB_TOKEN_4'
  ];
  
  const results = [];
  
  for (let i = 0; i < tokens.length; i++) {
    const result = await testToken(tokens[i], tokenNames[i]);
    results.push(result);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 ПІДСУМОК');
  console.log('='.repeat(60));
  
  const valid = results.filter(r => r.success);
  const invalid = results.filter(r => !r.success);
  
  console.log(`\n✅ Валідні токени: ${valid.length}/${results.length}`);
  valid.forEach(r => console.log(`   - ${r.name}`));
  
  if (invalid.length > 0) {
    console.log(`\n❌ Невалідні токени: ${invalid.length}/${results.length}`);
    invalid.forEach(r => console.log(`   - ${r.name}: ${r.error || 'Unauthorized'}`));
  }
}

main();
