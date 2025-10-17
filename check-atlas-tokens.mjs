#!/usr/bin/env node

/**
 * Quick check of ATLAS token rotation status
 */

import 'dotenv/config';
import { ATLASProvider } from './providers/atlas.mjs';

console.log('🔍 Перевірка токенів ATLAS\n');

// Check environment
console.log('📋 Токени в .env:');
const envTokens = [
  'GITHUB_TOKEN',
  'GITHUB_TOKEN_2', 
  'GITHUB_TOKEN_3',
  'GITHUB_TOKEN_4'
];

envTokens.forEach(key => {
  const value = process.env[key];
  if (value) {
    console.log(`  ✅ ${key}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`  ❌ ${key}: не знайдено`);
  }
});

console.log('\n🚀 Створення ATLAS провайдера:\n');

try {
  const atlas = ATLASProvider.fromEnv();
  
  console.log(`Провайдер створено успішно!`);
  console.log(`Кількість токенів: ${atlas.tokens.length}`);
  console.log(`Поточний індекс: ${atlas.currentTokenIndex}`);
  
  console.log('\n📊 Список токенів:');
  atlas.tokens.forEach((token, idx) => {
    console.log(`  ${idx + 1}. ${token.key}: ${token.value.substring(0, 10)}...`);
    console.log(`     Заблокований: ${token.blocked}`);
    console.log(`     Помилок: ${token.failures}`);
  });
  
  console.log('\n✅ Валідація:');
  const validation = atlas.validate();
  console.log(`  Valid: ${validation.valid}`);
  if (!validation.valid) {
    console.log('  Помилки:');
    validation.errors.forEach(err => console.log(`    - ${err}`));
  }
  
  console.log('\n🎯 Метадані:');
  const metadata = ATLASProvider.metadata();
  console.log(`  Моделей: ${metadata.knownModels.length}`);
  console.log(`  Дефолтна модель: ${metadata.defaultModel}`);
  
} catch (error) {
  console.error('❌ Помилка:', error.message);
  if (error.code) {
    console.error(`   Код помилки: ${error.code}`);
  }
}
