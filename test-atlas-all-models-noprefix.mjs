#!/usr/bin/env node

import 'dotenv/config';

// Токени для тестування (читаємо з .env)
const tokens = [
  process.env.GITHUB_TOKEN,
  process.env.GITHUB_TOKEN2
].filter(t => t && t.trim()); // Фільтруємо порожні

const baseURL = 'https://models.inference.ai.azure.com';

const models = [
  "ai21-jamba-1.5-large",
  "ai21-jamba-1.5-mini",
  "cohere-command-a",
  "cohere-command-r-08-2024",
  "cohere-command-r-plus-08-2024",
  "cohere-embed-v3-english",
  "cohere-embed-v3-multilingual",
  "jais-30b-chat",
  "deepseek-r1",
  "deepseek-r1-0528",
  "deepseek-v3-0324",
  "llama-3.2-11b-vision-instruct",
  "llama-3.2-90b-vision-instruct",
  "llama-3.3-70b-instruct",
  "llama-4-maverick-17b-128e-instruct-fp8",
  "llama-4-scout-17b-16e-instruct",
  "meta-llama-3.1-405b-instruct",
  "meta-llama-3.1-8b-instruct",
  "mai-ds-r1",
  "phi-3-medium-128k-instruct",
  "phi-3-medium-4k-instruct",
  "phi-3-mini-128k-instruct",
  "phi-3-mini-4k-instruct",
  "phi-3-small-128k-instruct",
  "phi-3-small-8k-instruct",
  "phi-3.5-mini-instruct",
  "phi-3.5-moe-instruct",
  "phi-3.5-vision-instruct",
  "phi-4",
  "phi-4-mini-instruct",
  "phi-4-mini-reasoning",
  "phi-4-multimodal-instruct",
  "phi-4-reasoning",
  "codestral-2501",
  "ministral-3b",
  "mistral-large-2411",
  "mistral-medium-2505",
  "mistral-nemo",
  "mistral-small-2503",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-5",
  "gpt-5-chat",
  "gpt-5-mini",
  "gpt-5-nano",
  "o1",
  "o1-mini",
  "o1-preview",
  "o3",
  "o3-mini",
  "o4-mini",
  "text-embedding-3-large",
  "text-embedding-3-small",
  "grok-3",
  "grok-3-mini"
];

async function testModel(model, token) {
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
    if (response.ok) {
      const data = await response.json();
      return { model, status: 'OK', reply: data.choices[0].message.content };
    } else {
      const error = await response.text();
      return { model, status: response.status, error: error.substring(0, 200) };
    }
  } catch (error) {
    return { model, status: 'ERR', error: error.message };
  }
}

(async () => {
  console.log('🚀 Тестую всі моделі ATLAS без префікса з 2 токенами...\n');
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const tokenPreview = token.substring(0, 8) + '...' + token.slice(-4);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 ТОКЕН ${i + 1}: ${tokenPreview}`);
    console.log('='.repeat(60));
    
    const results = [];
    let successCount = 0;
    
    // Тестуємо тільки перші 5 моделей для швидкості
    const testModels = models.slice(0, 5);
    
    for (const model of testModels) {
      process.stdout.write(`${model} ... `);
      const res = await testModel(model, token);
      if (res.status === 'OK') {
        console.log('✅ OK');
        successCount++;
      } else {
        console.log(`❌ ${res.status}`);
      }
      results.push(res);
      
      // Пауза 100ms між запитами
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n📊 Результат: ${successCount}/${testModels.length} моделей працюють`);
    
    if (successCount === 0) {
      console.log('\n⚠️  Помилки:');
      results.slice(0, 2).forEach(r => {
        if (r.status !== 'OK') {
          console.log(`   ${r.model}: ${r.error?.substring(0, 100)}`);
        }
      });
    } else {
      console.log('\n✅ Робочі моделі:');
      results.filter(r => r.status === 'OK').forEach(r => {
        console.log(`   • ${r.model}`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ ТЕСТУВАННЯ ЗАВЕРШЕНО');
  console.log('='.repeat(60));
})();
