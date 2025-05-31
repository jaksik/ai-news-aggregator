/**
 * Test script to verify the simplified article limit system
 * This script tests the single source of truth for article limits
 */

const { getMaxArticlesPerSource } = require('./lib/config/articleLimits');

async function runTests() {
  // Test environment variable reading
  console.log('=== Testing Simplified Article Limit Configuration ===\n');

  // Test 1: Environment variable reading
  console.log('Test 1: Environment Variable Reading');
  const maxArticles = getMaxArticlesPerSource();
  console.log(`getMaxArticlesPerSource(): ${maxArticles}`);
  console.log(`Current MAX_ARTICLES_PER_SOURCE from env: ${process.env.MAX_ARTICLES_PER_SOURCE}`);
  console.log(`Expected: 5 (from .env.local)`);
  console.log(`✓ ${maxArticles === 5 ? 'PASS' : 'FAIL'}\n`);

  // Test 2: Default behavior when environment variable is not set
  console.log('Test 2: Default Behavior without Environment Variable');
  const originalEnv = process.env.MAX_ARTICLES_PER_SOURCE;
  delete process.env.MAX_ARTICLES_PER_SOURCE;

  const defaultLimit = getMaxArticlesPerSource();
  console.log(`getMaxArticlesPerSource() without env: ${defaultLimit}`);
  console.log(`Expected: 20 (default fallback)`);
  console.log(`✓ ${defaultLimit === 20 ? 'PASS' : 'FAIL'}\n`);

  // Test 3: Invalid environment variable handling
  console.log('Test 3: Invalid Environment Variable Handling');
  process.env.MAX_ARTICLES_PER_SOURCE = 'invalid';
  const invalidLimit = getMaxArticlesPerSource();
  console.log(`getMaxArticlesPerSource() with invalid env: ${invalidLimit}`);
  console.log(`Expected: 20 (default fallback for invalid value)`);
  console.log(`✓ ${invalidLimit === 20 ? 'PASS' : 'FAIL'}\n`);

  // Restore environment variable
  process.env.MAX_ARTICLES_PER_SOURCE = originalEnv;

  console.log('=== All Tests Complete ===');
  console.log('System now uses a single source of truth: MAX_ARTICLES_PER_SOURCE environment variable');
}

runTests().catch(console.error);
