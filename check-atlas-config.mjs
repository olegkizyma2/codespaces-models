#!/usr/bin/env node

import 'dotenv/config';

console.log('🔍 ДІАГНОСТИКА КОНФІГУРАЦІЇ ATLAS\n');
console.log('='.repeat(60));

console.log('\n📋 Змінні середовища:');
console.log(`ATLAS_ENABLED: ${process.env.ATLAS_ENABLED || '❌ НЕ ВСТАНОВЛЕНО'}`);
console.log(`ATLAS_BASE_URL: ${process.env.ATLAS_BASE_URL || '❌ НЕ ВСТАНОВЛЕНО'}`);

// Перевіряємо всі GITHUB_TOKEN*
const githubTokens = Object.keys(process.env)
  .filter(key => key.startsWith('GITHUB_TOKEN'))
  .sort();

console.log(`\n🔑 GitHub токени (знайдено ${githubTokens.length}):`);
githubTokens.forEach(key => {
  const token = process.env[key];
  if (token) {
    const preview = token.substring(0, 8) + '...' + token.slice(-4);
    const prefix = token.substring(0, 4);
    console.log(`  ${key}: ${preview} (префікс: ${prefix})`);
  } else {
    console.log(`  ${key}: ❌ ПОРОЖНІЙ`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('\n💡 Має бути:');
console.log('  ATLAS_ENABLED=1');
console.log('  ATLAS_BASE_URL=https://models.inference.ai.azure.com');
console.log('  GITHUB_TOKEN=ghp_... (або gho_... або ghu_...)');
