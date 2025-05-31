const axios = require('axios');
const cheerio = require('cheerio');

async function debugAnthropicStructure() {
  try {
    console.log('Fetching Anthropic news page...');
    const response = await axios.get('https://www.anthropic.com/news', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)',
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    
    console.log('\n=== DEBUGGING ANTHROPIC HTML STRUCTURE ===\n');
    
    // Find all article links
    const articles = $('a[href*="/news/"]');
    console.log(`Found ${articles.length} article links`);
    
    // Examine first 10 articles in detail
    articles.slice(0, 10).each((index, element) => {
      const $element = $(element);
      const title = $element.text().trim();
      const url = $element.attr('href');
      
      console.log(`\n--- Article ${index + 1} ---`);
      console.log(`Title: ${title.substring(0, 50)}...`);
      console.log(`URL: ${url}`);
      
      // Try different date selectors
      const dateSelectors = [
        '.PostList_post-date__djrOA',
        '.PostCard_post-timestamp__etH9K',
        '.post-date',
        '.date',
        'time',
        '[datetime]'
      ];
      
      console.log('Date extraction attempts:');
      dateSelectors.forEach(selector => {
        const dateText = $element.find(selector).first().text() || 
                        $element.find(selector).first().attr('datetime') ||
                        $element.find(selector).first().attr('content') || 
                        'not found';
        console.log(`  ${selector}: "${dateText}"`);
      });
      
      // Look for any text that might contain dates
      const fullText = $element.text();
      const datePattern = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/g;
      const dateMatches = fullText.match(datePattern);
      console.log(`Date patterns in text: ${dateMatches ? dateMatches.join(', ') : 'none'}`);
      
      // Show HTML structure around this element
      console.log('HTML structure (first 200 chars):');
      console.log($element.prop('outerHTML').substring(0, 200) + '...');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugAnthropicStructure();
