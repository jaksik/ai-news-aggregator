import { NextApiRequest, NextApiResponse } from 'next';
import { EnhancedHTMLScraper } from '../../../lib/scrapers/puppeteerScraper';
import { getWebsiteConfig } from '../../../lib/scrapers/websiteConfigs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Testing Scale AI blog scraping with Puppeteer...');

    // Get Scale AI configuration
    const config = getWebsiteConfig('scale-blog');
    if (!config) {
      return res.status(400).json({ 
        error: 'Scale AI configuration not found'
      });
    }

    // Create enhanced scraper
    const scraper = new EnhancedHTMLScraper(config);
    
    // Test scraping
    const articles = await scraper.scrapeWebsite(
      'https://scale.com/blog', 
      config, 
      'Scale AI Blog'
    );

    // Clean up
    await scraper.cleanup();

    res.status(200).json({
      success: true,
      articlesFound: articles.length,
      articles: articles.slice(0, 5), // Return first 5 for testing
      timestamp: new Date().toISOString(),
      message: `Successfully scraped ${articles.length} articles from Scale AI blog`
    });

  } catch (error) {
    console.error('Scale AI scraping test error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to scrape Scale AI blog',
      timestamp: new Date().toISOString()
    });
  }
}
