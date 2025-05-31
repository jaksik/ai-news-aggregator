import { NextApiRequest, NextApiResponse } from 'next';
import { ScraperSelector } from '../../../lib/services/scraperSelector';
import { getWebsiteConfig } from '../../../lib/scrapers/websiteConfigs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Testing ScraperSelector service...'); 

    // Test 1: Test Scale AI (should use enhanced scraper)
    const scaleConfig = getWebsiteConfig('scale-blog');
    if (!scaleConfig) {
      throw new Error('Scale blog config not found');
    }

    const scaleSelection = ScraperSelector.selectScraper({
      websiteId: 'scale-blog',
      sourceName: 'Scale AI Blog',
      scrapingConfig: scaleConfig
    });

    console.log('Scale AI scraper selection:', {
      strategy: scaleSelection.strategy,
      useEnhancedScraper: scaleSelection.useEnhancedScraper,
      scraperType: scaleSelection.scraper.constructor.name
    });

    // Test 2: Test a hypothetical standard site (should use standard scraper)
    const testSelection = ScraperSelector.selectScraper({
      websiteId: 'test-site',
      sourceName: 'Test Site',
      scrapingConfig: scaleConfig, // Using scale config just for testing
      forceStrategy: 'standard'
    });

    console.log('Test site scraper selection:', {
      strategy: testSelection.strategy,
      useEnhancedScraper: testSelection.useEnhancedScraper,
      scraperType: testSelection.scraper.constructor.name
    });

    // Test 3: Test enhanced scraper sites list
    const enhancedSites = ScraperSelector.getEnhancedScraperSites();
    console.log('Enhanced scraper sites:', enhancedSites);

    // Test 4: Test adding/removing sites
    const originalSiteCount = enhancedSites.length;
    ScraperSelector.addToEnhancedScraperList('test-difficult-site');
    const afterAddCount = ScraperSelector.getEnhancedScraperSites().length;
    
    ScraperSelector.removeFromEnhancedScraperList('test-difficult-site');
    const afterRemoveCount = ScraperSelector.getEnhancedScraperSites().length;

    // Cleanup any test scrapers
    await ScraperSelector.cleanupScraper(scaleSelection.scraper);
    await ScraperSelector.cleanupScraper(testSelection.scraper);

    const results = {
      success: true,
      tests: {
        scaleAI: {
          strategy: scaleSelection.strategy,
          useEnhancedScraper: scaleSelection.useEnhancedScraper,
          scraperType: scaleSelection.scraper.constructor.name
        },
        testSite: {
          strategy: testSelection.strategy,
          useEnhancedScraper: testSelection.useEnhancedScraper,
          scraperType: testSelection.scraper.constructor.name
        },
        siteManagement: {
          originalCount: originalSiteCount,
          afterAddCount: afterAddCount,
          afterRemoveCount: afterRemoveCount,
          addWorked: afterAddCount === originalSiteCount + 1,
          removeWorked: afterRemoveCount === originalSiteCount
        },
        enhancedSites: enhancedSites
      }
    };

    console.log('ScraperSelector test results:', results);

    return res.status(200).json(results);

  } catch (error) {
    console.error('ScraperSelector test error:', error);
    return res.status(500).json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
