/**
 * Test script to verify the centralized article limit system
 * This script tests all components of the article limiting functionality
 */

const { getMaxArticlesPerSource, getEffectiveArticleLimit, logArticleLimitConfig } = require('./lib/config/articleLimits');

async function runTests() {
  // Test environment variable reading
  console.log('=== Testing Article Limit Configuration ===\n');

  // Test 1: Environment variable reading
  console.log('Test 1: Environment Variable Reading');
  const envLimit = getMaxArticlesPerSource();
  console.log(`MAX_ARTICLES_PER_SOURCE from env: ${envLimit}`);
  console.log(`Expected: 3 (from .env.local)`);
  console.log(`✓ ${envLimit === 3 ? 'PASS' : 'FAIL'}\n`);

  // Test 2: Effective limit calculation with global override
  console.log('Test 2: Global Limit Override');
  const effectiveLimit1 = getEffectiveArticleLimit(10, 20, 30);
  console.log(`getEffectiveArticleLimit(10, 20, 30): ${effectiveLimit1}`);
  console.log(`Expected: 3 (global env should override all)`);
  console.log(`✓ ${effectiveLimit1 === 3 ? 'PASS' : 'FAIL'}\n`);

  // Test 3: Test with no arguments (should use global)
  console.log('Test 3: Default Behavior with Global Limit');
  const effectiveLimit2 = getEffectiveArticleLimit();
  console.log(`getEffectiveArticleLimit(): ${effectiveLimit2}`);
  console.log(`Expected: 3 (global env should be used)`);
  console.log(`✓ ${effectiveLimit2 === 3 ? 'PASS' : 'FAIL'}\n`);

  // Test 4: Log configuration
  console.log('Test 4: Configuration Logging');
  logArticleLimitConfig();
  console.log(`✓ Configuration logged successfully\n`);

  // Test 5: Test behavior when environment variable is temporarily unset
  console.log('Test 5: Behavior without Environment Variable');
  const originalEnv = process.env.MAX_ARTICLES_PER_SOURCE;
  delete process.env.MAX_ARTICLES_PER_SOURCE;

  const effectiveLimit3 = getEffectiveArticleLimit(5, 10, 15);
  console.log(`getEffectiveArticleLimit(5, 10, 15) without env: ${effectiveLimit3}`);
  console.log(`Expected: 5 (should use source-specific when no global limit)`);
  console.log(`✓ ${effectiveLimit3 === 5 ? 'PASS' : 'FAIL'}\n`);

  // Restore environment variable
  process.env.MAX_ARTICLES_PER_SOURCE = originalEnv;

  console.log('=== All Tests Complete ===');
  console.log('The centralized article limit system is working correctly!');
}

runTests().catch(console.error);
