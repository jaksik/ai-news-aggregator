// File: /pages/api/test/phase4-complete.ts
// Test endpoint for Phase 4 complete implementation - RSS/HTML Processing Separation

import { NextApiRequest, NextApiResponse } from 'next';
import { fetchParseAndStoreSource, SourceToFetch } from '../../../lib/services/fetcher';

interface TestResult {
  test: string;
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

interface TestResponse {
  message: string;
  timestamp: string;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<TestResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      message: 'Method not allowed',
      timestamp: new Date().toISOString(),
      tests: [],
      summary: { total: 0, passed: 0, failed: 0 }
    });
  }

  const tests: TestResult[] = [];

  // Test 1: RSS Processing via RSSProcessor
  try {
    console.log('Testing RSS processing...');
    const rssSource: SourceToFetch = {
      url: 'https://feeds.feedburner.com/oreilly/radar',
      type: 'rss',
      name: 'O\'Reilly Radar Test'
    };

    const rssResult = await fetchParseAndStoreSource(rssSource);
    
    tests.push({
      test: 'RSS Processing via RSSProcessor',
      success: rssResult.status === 'success' || rssResult.status === 'partial_success',
      message: `RSS processed: ${rssResult.message}`,
      data: {
        itemsFound: rssResult.itemsFound,
        itemsProcessed: rssResult.itemsProcessed,
        newItemsAdded: rssResult.newItemsAdded,
        status: rssResult.status
      }
    });
  } catch (error) {
    tests.push({
      test: 'RSS Processing via RSSProcessor',
      success: false,
      message: 'RSS processing failed',
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 2: HTML Processing via HTMLProcessor (Scale AI)
  try {
    console.log('Testing HTML processing with Scale AI...');
    const htmlSource: SourceToFetch = {
      url: 'https://scale.com/blog',
      type: 'html',
      name: 'Scale AI Blog Test',
      scrapingConfig: {
        websiteId: 'scale-ai',
        customSelectors: {
          articleSelector: 'article, .blog-post, [data-testid="blog-post"]',
          titleSelector: 'h1, h2, .title, [data-testid="title"]',
          urlSelector: 'a[href*="/blog/"], a[href*="/post/"]',
          dateSelector: 'time, .date, .publish-date, [data-testid="date"]',
          descriptionSelector: 'p, .description, .excerpt, [data-testid="description"]'
        }
      }
    };

    const htmlResult = await fetchParseAndStoreSource(htmlSource);
    
    tests.push({
      test: 'HTML Processing via HTMLProcessor (Scale AI)',
      success: htmlResult.status === 'success' || htmlResult.status === 'partial_success',
      message: `HTML processed: ${htmlResult.message}`,
      data: {
        itemsFound: htmlResult.itemsFound,
        itemsProcessed: htmlResult.itemsProcessed,
        newItemsAdded: htmlResult.newItemsAdded,
        status: htmlResult.status,
        errors: htmlResult.errors.length
      }
    });
  } catch (error) {
    tests.push({
      test: 'HTML Processing via HTMLProcessor (Scale AI)',
      success: false,
      message: 'HTML processing failed',
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 3: Mixed Processing (Both RSS and HTML in sequence)
  try {
    console.log('Testing mixed processing...');
    const techCrunchSource: SourceToFetch = {
      url: 'https://feeds.feedburner.com/TechCrunch/',
      type: 'rss',
      name: 'TechCrunch RSS Test'
    };

    const vergeSource: SourceToFetch = {
      url: 'https://www.theverge.com',
      type: 'html',
      name: 'The Verge HTML Test',
      scrapingConfig: {
        websiteId: 'the-verge',
        customSelectors: {
          articleSelector: 'article, .c-entry-box--compact',
          titleSelector: 'h2, .c-entry-box--compact__title',
          urlSelector: 'a',
          dateSelector: 'time, .c-byline__item',
          descriptionSelector: '.c-entry-summary'
        }
      }
    };

    const [rssResult, htmlResult] = await Promise.all([
      fetchParseAndStoreSource(techCrunchSource),
      fetchParseAndStoreSource(vergeSource)
    ]);
    
    tests.push({
      test: 'Mixed Processing (RSS + HTML)',
      success: (rssResult.status === 'success' || rssResult.status === 'partial_success') &&
               (htmlResult.status === 'success' || htmlResult.status === 'partial_success'),
      message: `Mixed processing completed. RSS: ${rssResult.status}, HTML: ${htmlResult.status}`,
      data: {
        rss: {
          itemsFound: rssResult.itemsFound,
          status: rssResult.status
        },
        html: {
          itemsFound: htmlResult.itemsFound,
          status: htmlResult.status
        }
      }
    });
  } catch (error) {
    tests.push({
      test: 'Mixed Processing (RSS + HTML)',
      success: false,
      message: 'Mixed processing failed',
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Calculate summary
  const summary = {
    total: tests.length,
    passed: tests.filter(t => t.success).length,
    failed: tests.filter(t => !t.success).length
  };

  const response: TestResponse = {
    message: `Phase 4 Complete Implementation Test - ${summary.passed}/${summary.total} tests passed`,
    timestamp: new Date().toISOString(),
    tests,
    summary
  };

  console.log('Phase 4 Complete test results:', response);
  
  res.status(200).json(response);
}
