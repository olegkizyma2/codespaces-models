#!/usr/bin/env node
/**
 * Тест валідації ATLAS Provider
 */

import { ATLASProvider } from './providers/atlas.mjs';

console.log('🧪 Тест валідації ATLAS Provider\n');

// Test 1: Без токенів (має провалитись)
console.log('='.repeat(60));
console.log('Test 1: Валідація без токенів');
console.log('='.repeat(60));

const atlas1 = new ATLASProvider({ apiKey: 'dummy' });
const validation1 = atlas1.validate();

console.log('  Результат валідації:');
console.log('    Valid:', validation1.valid);
console.log('    Tokens count:', atlas1.tokens.length);

if (!validation1.valid) {
  console.log('  ❌ Валідація провалена (очікувано):');
  validation1.errors.forEach((error, idx) => {
    console.log(`    ${idx + 1}. ${error}`);
  });
} else {
  console.log('  ✅ Валідація пройдена');
}
console.log();

// Test 2: З dummy GITHUB_TOKEN (не формату gho_)
console.log('='.repeat(60));
console.log('Test 2: Валідація з невалідним токеном');
console.log('='.repeat(60));

process.env.GITHUB_TOKEN_TEST = 'invalid_token_format';
const atlas2 = new ATLASProvider({ apiKey: 'dummy' });
const validation2 = atlas2.validate();

console.log('  Результат валідації:');
console.log('    Valid:', validation2.valid);
console.log('    Tokens count:', atlas2.tokens.length);

if (!validation2.valid) {
  console.log('  ❌ Валідація провалена (очікувано):');
  validation2.errors.forEach((error, idx) => {
    console.log(`    ${idx + 1}. ${error}`);
  });
} else {
  console.log('  ✅ Валідація пройдена');
}
console.log();

// Test 3: З правильним форматом токену
console.log('='.repeat(60));
console.log('Test 3: Валідація з валідним форматом токену');
console.log('='.repeat(60));

process.env.GITHUB_TOKEN = 'gho_test_token_12345678901234567890';
const atlas3 = new ATLASProvider({ apiKey: process.env.GITHUB_TOKEN });
const validation3 = atlas3.validate();

console.log('  Результат валідації:');
console.log('    Valid:', validation3.valid);
console.log('    Tokens count:', atlas3.tokens.length);

if (!validation3.valid) {
  console.log('  ❌ Валідація провалена:');
  validation3.errors.forEach((error, idx) => {
    console.log(`    ${idx + 1}. ${error}`);
  });
} else {
  console.log('  ✅ Валідація пройдена!');
  console.log('  Токени:');
  atlas3.tokens.forEach((token, idx) => {
    console.log(`    ${idx + 1}. ${token.key}: ${token.value.substring(0, 10)}...`);
  });
}
console.log();

// Test 4: Множинні токени
console.log('='.repeat(60));
console.log('Test 4: Валідація з множинними токенами');
console.log('='.repeat(60));

process.env.GITHUB_TOKEN = 'gho_token_1';
process.env.GITHUB_TOKEN_2 = 'gho_token_2';
process.env.GITHUB_TOKEN_3 = 'gho_token_3';

const atlas4 = new ATLASProvider({ apiKey: process.env.GITHUB_TOKEN });
const validation4 = atlas4.validate();

console.log('  Результат валідації:');
console.log('    Valid:', validation4.valid);
console.log('    Tokens count:', atlas4.tokens.length);

if (!validation4.valid) {
  console.log('  ❌ Валідація провалена:');
  validation4.errors.forEach((error, idx) => {
    console.log(`    ${idx + 1}. ${error}`);
  });
} else {
  console.log('  ✅ Валідація пройдена!');
  console.log('  Всі токени:');
  atlas4.tokens.forEach((token, idx) => {
    console.log(`    ${idx + 1}. ${token.key}: ${token.value}`);
  });
}
console.log();

console.log('='.repeat(60));
console.log('📊 Підсумок');
console.log('='.repeat(60));
console.log(`Test 1: ${!validation1.valid ? '✅' : '❌'} (без токенів - має провалитись)`);
console.log(`Test 2: ${!validation2.valid ? '✅' : '❌'} (невалідний формат - має провалитись)`);
console.log(`Test 3: ${validation3.valid ? '✅' : '❌'} (1 валідний токен)`);
console.log(`Test 4: ${validation4.valid ? '✅' : '❌'} (3 валідні токени)`);
console.log();

// Cleanup
delete process.env.GITHUB_TOKEN;
delete process.env.GITHUB_TOKEN_2;
delete process.env.GITHUB_TOKEN_3;
delete process.env.GITHUB_TOKEN_TEST;

console.log('✅ Тестування завершено!');
