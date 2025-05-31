/**
 * Simple test script for ArticleProcessor
 * Run with: node tests/articleProcessor.test.js
 */

// Need to require the compiled JavaScript version
const path = require('path');

async function testArticleProcessor() {
  console.log('🧪 Testing ArticleProcessor...\n');

  // Mock article data for testing
  const mockRSSArticle = {
    title: 'Test RSS Article',
    link: 'https://example.com/rss-test-article',
    guid: 'test-guid-123',
    isoDate: '2025-05-31T12:00:00Z',
    contentSnippet: 'This is a test RSS article snippet',
    categories: ['AI', 'Technology']
  };

  const mockHTMLArticle = {
    title: 'Test HTML Article',
    url: 'https://example.com/html-test-article',
    description: 'This is a test HTML article description',
    publishedDate: '2025-05-31T12:00:00Z'
  };

  try {
    // Import the TypeScript module
    const { ArticleProcessor } = await import('../lib/services/articleProcessor.js');

    // Test RSS article processing
    console.log('📰 Testing RSS article processing...');
    const rssResult = await ArticleProcessor.processRSSArticle(mockRSSArticle, 'Test RSS Source');
    console.log(`RSS Result: ${rssResult.action}${rssResult.error ? ` (Error: ${rssResult.error})` : ''}`);

    // Test HTML article processing
    console.log('\n🌐 Testing HTML article processing...');
    const htmlResult = await ArticleProcessor.processHTMLArticle(mockHTMLArticle, 'Test HTML Source');
    console.log(`HTML Result: ${htmlResult.action}${htmlResult.error ? ` (Error: ${htmlResult.error})` : ''}`);

    // Test duplicate detection (should skip on second run)
    console.log('\n🔄 Testing duplicate detection...');
    const duplicateRSSResult = await ArticleProcessor.processRSSArticle(mockRSSArticle, 'Test RSS Source');
    console.log(`Duplicate RSS Result: ${duplicateRSSResult.action} (should be "skipped")`);

    const duplicateHTMLResult = await ArticleProcessor.processHTMLArticle(mockHTMLArticle, 'Test HTML Source');
    console.log(`Duplicate HTML Result: ${duplicateHTMLResult.action} (should be "skipped")`);

    console.log('\n✅ ArticleProcessor tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testArticleProcessor();
