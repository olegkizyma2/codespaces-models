#!/usr/bin/env node

/**
 * Test GitHub Copilot Chat models
 */

const API_BASE = 'http://localhost:4000/v1';

async function testModel(modelName, prompt) {
  console.log(`\n🧪 Тестування: ${modelName}`);
  console.log(`   Запит: "${prompt}"`);
  
  try {
    const response = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 50
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`   ❌ Помилка ${response.status}: ${error.substring(0, 100)}`);
      return false;
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || 'No response';
    const tokens = data.usage?.total_tokens || 0;
    
    console.log(`   ✅ Відповідь: "${answer.substring(0, 60)}..."`);
    console.log(`   📊 Токенів: ${tokens}`);
    return true;
  } catch (error) {
    console.log(`   ❌ Помилка: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     Тестування GitHub Copilot Chat Models           ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  const tests = [
    { model: 'copilot-gpt-4o', prompt: 'Say hi in Ukrainian' },
    { model: 'copilot-claude-sonnet-4.5', prompt: 'What is 2+2?' },
    { model: 'copilot-gemini-2.5-pro', prompt: 'Name one color' },
  ];

  let passed = 0;
  for (const test of tests) {
    const success = await testModel(test.model, test.prompt);
    if (success) passed++;
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`\n📊 РЕЗУЛЬТАТ: ${passed}/${tests.length} тестів пройдено`);
  console.log(passed === tests.length ? '✅ ВСІ ТЕСТИ УСПІШНІ!' : '⚠️  Деякі тести не пройшли');
  console.log('═'.repeat(60) + '\n');
}

main().catch(console.error);
