#!/usr/bin/env node
/**
 * Діагностика ATLAS Provider
 */

import { ATLASProvider } from './providers/atlas.mjs';

console.log('🔍 Діагностика ATLAS Provider\n');

try {
  // Test 1: Metadata
  console.log('='.repeat(60));
  console.log('Test 1: Metadata');
  console.log('='.repeat(60));
  const meta = ATLASProvider.metadata();
  console.log('✅ Metadata працює');
  console.log('  Provider:', meta.name);
  console.log('  Display:', meta.displayName);
  console.log('  Models:', meta.knownModels.length);
  console.log('  Default:', meta.defaultModel);
  console.log();

  // Test 2: Environment Check
  console.log('='.repeat(60));
  console.log('Test 2: Environment Check');
  console.log('='.repeat(60));
  const hasToken = !!process.env.GITHUB_TOKEN;
  console.log('  GITHUB_TOKEN exists:', hasToken);
  
  if (hasToken) {
    const token = process.env.GITHUB_TOKEN;
    const tokenPrefix = token.substring(0, 4);
    const isValidFormat = token.startsWith('gho_');
    console.log('  Token prefix:', tokenPrefix);
    console.log('  Is valid format (gho_*):', isValidFormat);
    console.log('  Token length:', token.length);
  } else {
    console.log('  ⚠️  GITHUB_TOKEN not found in environment');
    console.log('  Set it with: export GITHUB_TOKEN=gho_your_token_here');
  }
  console.log();

  // Test 3: fromEnv
  console.log('='.repeat(60));
  console.log('Test 3: fromEnv (create provider)');
  console.log('='.repeat(60));
  try {
    const atlas = ATLASProvider.fromEnv();
    console.log('✅ Provider created successfully');
    console.log('  Name:', atlas.name);
    console.log('  Base URL:', atlas.baseURL);
    console.log('  Tokens initialized:', atlas.tokens.length);
    console.log('  Current token index:', atlas.currentTokenIndex);
    
    if (atlas.tokens.length > 0) {
      console.log('\n  Token details:');
      atlas.tokens.forEach((token, idx) => {
        console.log(`    ${idx + 1}. ${token.key} - ${token.value.substring(0, 10)}...`);
      });
    }
  } catch (error) {
    console.log('❌ fromEnv failed:', error.message);
    if (error.code) {
      console.log('  Error code:', error.code);
    }
  }
  console.log();

  // Test 4: Manual creation
  console.log('='.repeat(60));
  console.log('Test 4: Manual Provider Creation');
  console.log('='.repeat(60));
  try {
    const atlas = new ATLASProvider({
      apiKey: process.env.GITHUB_TOKEN || 'dummy_token'
    });
    console.log('✅ Provider instance created');
    console.log('  Name:', atlas.name);
    console.log('  Has client:', !!atlas.client);
    console.log('  Tokens count:', atlas.tokens.length);
  } catch (error) {
    console.log('❌ Manual creation failed:', error.message);
  }
  console.log();

  // Test 5: Static methods
  console.log('='.repeat(60));
  console.log('Test 5: Static Methods');
  console.log('='.repeat(60));
  const allModels = ATLASProvider.getAllModels();
  console.log('✅ getAllModels() works');
  console.log('  Total models:', allModels.length);
  console.log('  First 5 models:');
  allModels.slice(0, 5).forEach((model, idx) => {
    console.log(`    ${idx + 1}. ${model}`);
  });
  console.log();

  // Test 6: Sample models by provider
  console.log('='.repeat(60));
  console.log('Test 6: Models Distribution');
  console.log('='.repeat(60));
  const providers = {};
  allModels.forEach(model => {
    const provider = model.split('/')[0];
    if (!providers[provider]) providers[provider] = [];
    providers[provider].push(model);
  });
  
  console.log('  Providers in ATLAS:');
  Object.entries(providers).sort((a, b) => b[1].length - a[1].length).forEach(([provider, models]) => {
    console.log(`    ${provider}: ${models.length} models`);
  });

} catch (error) {
  console.error('\n❌ CRITICAL ERROR:', error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}

console.log('\n' + '='.repeat(60));
console.log('✅ Діагностика завершена');
console.log('='.repeat(60));
