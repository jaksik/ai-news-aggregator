import { NextApiRequest, NextApiResponse } from 'next';
import { HTMLScraper } from '../../../lib/scrapers/htmlScraper';
import { getWebsiteConfig } from '../../../lib/scrapers/websiteConfigs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { websiteId, url, sourceName } = req.body;

    if (!websiteId || !url || !sourceName) {
      return res.status(400).json({ 
        error: 'Missing required fields: websiteId, url, sourceName' 
      });
    }

    // Get website configuration
    const config = getWebsiteConfig(websiteId);
    if (!config) {
      return res.status(400).json({ 
        error: `Unsupported website: ${websiteId}. Supported websites: anthropic-news, elevenlabs-blog`
      });
    }

    console.log(`Scraping ${sourceName} from ${url} using config for ${websiteId}`);

    // Create scraper with configuration
    const scraper = new HTMLScraper(config);
    const articles = await scraper.scrapeWebsite(url, config, sourceName);

    res.status(200).json({
      success: true,
      websiteId,
      sourceName,
      url,
      articlesFound: articles.length,
      articles: articles.slice(0, 10), // Return first 10 for testing
      totalArticles: articles.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scraping test error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to scrape website',
      timestamp: new Date().toISOString()
    });
  }
}
