#!/usr/bin/env node

/**
 * Test GitHub tokens and make requests to GitHub Models API
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Get all GitHub tokens from .env
const tokens = [];
const tokenKeys = Object.keys(process.env)
  .filter(key => key.startsWith('GITHUB_TOKEN'))
  .sort();

for (const key of tokenKeys) {
  const token = process.env[key];
  if (token && token.trim() && token.startsWith('gho_')) {
    tokens.push({
      key,
      value: token,
      masked: token.substring(0, 20) + '...' + token.substring(token.length - 10)
    });
  }
}

console.log(`\n🔑 Found ${tokens.length} GitHub tokens:\n`);
tokens.forEach((t, i) => {
  console.log(`  ${i + 1}. ${t.key}: ${t.masked}`);
});

if (tokens.length === 0) {
  console.error('\n❌ No valid GitHub tokens found!');
  process.exit(1);
}

// Test each token
async function testToken(token, index) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n📝 Testing Token #${index + 1} (${token.key})...`);
  console.log(`   Value: ${token.masked}\n`);

  const client = new OpenAI({
    baseURL: 'https://models.inference.ai.azure.com',
    apiKey: token.value,
  });

  try {
    // Test 1: Get models list
    console.log('  1️⃣  Fetching models list...');
    const models = await client.models.list();
    console.log(`  ✅ Models list received! Total: ${models.data.length} models`);
    
    // Show first 3 models
    console.log('     First 3 models:');
    models.data.slice(0, 3).forEach(m => {
      console.log(`       - ${m.id}`);
    });

    // Test 2: Chat completion with small model
    console.log('\n  2️⃣  Testing chat completion (Phi-3.5 mini)...');
    const response = await client.chat.completions.create({
      model: 'microsoft/phi-3.5-mini-instruct',
      messages: [
        {
          role: 'user',
          content: 'Say "Hello" in one word only'
        }
      ],
      max_tokens: 20,
      temperature: 0.7
    });

    console.log(`  ✅ Chat completion succeeded!`);
    console.log(`     Response: "${response.choices[0].message.content}"`);
    console.log(`     Tokens used: ${response.usage.total_tokens}`);

    return { status: 'success', token: token.key };
  } catch (error) {
    console.error(`  ❌ Error: ${error.status} - ${error.message}`);
    if (error.error?.message) {
      console.error(`     Details: ${error.error.message}`);
    }
    return { status: 'failed', token: token.key, error: error.message };
  }
}

// Test all tokens sequentially
async function runAllTests() {
  const results = [];

  for (let i = 0; i < tokens.length; i++) {
    const result = await testToken(tokens[i], i);
    results.push(result);
    
    // Wait between requests to avoid rate limiting
    if (i < tokens.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next token...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('📊 TEST SUMMARY\n');
  
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');

  console.log(`  ✅ Successful: ${successful.length}/${results.length}`);
  if (successful.length > 0) {
    successful.forEach(r => {
      console.log(`     - ${r.token}`);
    });
  }

  console.log(`\n  ❌ Failed: ${failed.length}/${results.length}`);
  if (failed.length > 0) {
    failed.forEach(r => {
      console.log(`     - ${r.token}: ${r.error}`);
    });
  }

  console.log(`\n${'='.repeat(60)}\n`);

  if (successful.length === 0) {
    console.error('⚠️  No tokens are working! Check your .env file.');
    process.exit(1);
  } else {
    console.log(`✅ Found ${successful.length} working token(s)!`);
  }
}

// Run tests
runAllTests().catch(console.error);
