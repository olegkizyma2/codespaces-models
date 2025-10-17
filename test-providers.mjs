#!/usr/bin/env node
/**
 * Test script for new providers
 */
import { initializeProviders } from './providers/index.mjs';

console.log('Testing provider initialization...\n');

// Initialize providers
const { registry, configManager } = initializeProviders();

// Get all providers
const allProviders = registry.getAll();
console.log(`Total providers registered: ${allProviders.length}`);

// Display each provider
allProviders.forEach(provider => {
  const status = provider.getStatus();
  console.log(`\n[${provider.name.toUpperCase()}]`);
  console.log(`  Enabled: ${status.enabled}`);
  console.log(`  Configured: ${status.configured}`);
  console.log(`  Prefix: ${provider.modelPrefix}`);
  
  if (status.errors.length > 0) {
    console.log(`  Errors: ${status.errors.join(', ')}`);
  }
  
  // Check for token rotation support
  if (typeof provider.getTokenStats === 'function') {
    const tokenStats = provider.getTokenStats();
    console.log(`  Supports Token Rotation: Yes (${tokenStats.length} tokens)`);
  } else {
    console.log(`  Supports Token Rotation: No`);
  }
});

// Test getting models from special providers
console.log('\n\nTesting special providers (even if not configured)...\n');

const specialProviders = ['githubcopilot', 'claude_code', 'cursor_agent', 'lead_worker', 'atlas'];

for (const name of specialProviders) {
  const provider = registry.get(name);
  if (provider) {
    try {
      const models = await provider.getModels();
      console.log(`[${name.toUpperCase()}] ${models.length} models available`);
      if (models.length > 0) {
        console.log(`  Sample: ${models[0].id}`);
      }
    } catch (error) {
      console.log(`[${name.toUpperCase()}] Error: ${error.message}`);
    }
  } else {
    console.log(`[${name.toUpperCase()}] Not found in registry`);
  }
}

console.log('\n✅ Provider test completed!');
