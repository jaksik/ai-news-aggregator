import puppeteer, { Browser, Page } from 'puppeteer';
import { ScrapingConfig, ScrapedArticle, HTMLScraper } from './htmlScraper';

export class PuppeteerScraper {
  private browser: Browser | null = null;
  private config: ScrapingConfig;

  constructor(config: ScrapingConfig) {
    this.config = config;
  }

  async initBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true, // Use headless mode
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--window-size=1920,1080'
        ]
      });
    }
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeWebsite(url: string, config: ScrapingConfig, sourceName: string): Promise<ScrapedArticle[]> {
    let page: Page | null = null;
    
    try {
      console.log(`[Puppeteer] Scraping ${sourceName} from ${url}`);
      
      await this.initBrowser();
      
      if (!this.browser) {
        throw new Error('Failed to initialize browser');
      }

      page = await this.browser.newPage();

      // Set realistic browser headers and viewport
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });

      // Set extra headers to look more like a real browser
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      });

      // Navigate to the page with a longer timeout
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });

      // Wait for content to load
      await page.waitForFunction(() => document.readyState === 'complete', { timeout: 5000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try to wait for article elements to appear
      try {
        await page.waitForSelector(config.articleSelector, { timeout: 10000 });
      } catch {
        console.log(`[Puppeteer] Warning: Could not find selector ${config.articleSelector}, continuing anyway`);
      }

      // Extract articles using page.evaluate to run code in browser context
      const articles = await page.evaluate((config) => {
        const articles: {
          title: string;
          url: string;
          description?: string;
          publishedDate?: string;
          source: string;
        }[] = [];
        const seenUrls = new Set<string>();

        // Helper function to clean text
        const cleanText = (text: string): string => {
          return text.replace(/\s+/g, ' ').trim();
        };

        // Helper function to resolve URLs
        const resolveUrl = (url: string, baseUrl: string): string => {
          if (!url) return '';
          if (url.startsWith('http')) return url;
          if (url.startsWith('/')) return new URL(url, baseUrl).href;
          return new URL(url, baseUrl).href;
        };

        // Find all article elements
        const articleElements = document.querySelectorAll(config.articleSelector);
        
        articleElements.forEach((element, index) => {
          if (config.maxArticles && articles.length >= config.maxArticles) return;

          try {
            // Extract title
            let title = '';
            if (config.titleSelector) {
              const titleElement = element.querySelector(config.titleSelector);
              title = titleElement ? cleanText(titleElement.textContent || '') : '';
            } else {
              title = cleanText(element.textContent || '');
            }

            if (!title || title.length < 5) return;

            // Extract URL
            let articleUrl = '';
            if (config.urlSelector) {
              const urlElement = element.querySelector(config.urlSelector);
              articleUrl = urlElement ? (urlElement as HTMLAnchorElement).href || '' : '';
            } else if (element.tagName === 'A') {
              articleUrl = (element as HTMLAnchorElement).href;
            } else {
              const linkElement = element.querySelector('a');
              articleUrl = linkElement ? linkElement.href : '';
            }

            if (!articleUrl) return;
            
            // Resolve relative URLs
            articleUrl = resolveUrl(articleUrl, window.location.origin);
            
            // Skip duplicates
            if (seenUrls.has(articleUrl)) return;
            seenUrls.add(articleUrl);

            // Extract description
            let description = '';
            if (config.descriptionSelector) {
              const descElement = element.querySelector(config.descriptionSelector);
              description = descElement ? cleanText(descElement.textContent || '') : '';
            }

            // Extract date
            let publishedDate = '';
            if (config.dateSelector) {
              const dateElement = element.querySelector(config.dateSelector);
              if (dateElement) {
                publishedDate = dateElement.getAttribute('datetime') || 
                              dateElement.getAttribute('content') || 
                              cleanText(dateElement.textContent || '');
              }
            }

            articles.push({
              title: title,
              url: articleUrl,
              description: description,
              publishedDate: publishedDate || undefined,
              source: config.name
            });

          } catch (error) {
            console.log(`Error processing article ${index}:`, error);
          }
        });

        return articles;
      }, config);

      console.log(`[Puppeteer] Found ${articles.length} articles from ${sourceName}`);
      return articles;

    } catch (error) {
      console.error(`[Puppeteer] Error scraping ${sourceName}:`, error);
      return [];
    } finally {
      if (page) {
        await page.close();
      }
    }
  }
}

// Enhanced version of HTMLScraper that falls back to Puppeteer for difficult sites
export class EnhancedHTMLScraper {
  private htmlScraper: HTMLScraper;
  private puppeteerScraper: PuppeteerScraper;
  private config: ScrapingConfig;

  constructor(config: ScrapingConfig) {
    this.config = config;
    this.htmlScraper = new HTMLScraper(config);
    this.puppeteerScraper = new PuppeteerScraper(config);
  }

  async scrapeWebsite(url: string, config: ScrapingConfig, sourceName: string): Promise<ScrapedArticle[]> {
    // First try standard HTTP scraping
    console.log(`[Enhanced] Trying standard HTTP scraping for ${sourceName}`);
    const standardResults = await this.htmlScraper.scrapeWebsite(url, config, sourceName);
    
    // If we got good results (more than just a few articles), use them
    if (standardResults.length >= 3) {
      console.log(`[Enhanced] Standard scraping successful, found ${standardResults.length} articles`);
      return standardResults;
    }

    // Fall back to Puppeteer for difficult sites
    console.log(`[Enhanced] Standard scraping found few results (${standardResults.length}), trying Puppeteer`);
    try {
      const puppeteerResults = await this.puppeteerScraper.scrapeWebsite(url, config, sourceName);
      
      // Clean up browser resources
      await this.puppeteerScraper.closeBrowser();
      
      return puppeteerResults;
    } catch (error) {
      console.error(`[Enhanced] Puppeteer scraping failed:`, error);
      
      // Clean up browser resources even on error
      try {
        await this.puppeteerScraper.closeBrowser();
      } catch (cleanupError) {
        console.error(`[Enhanced] Error cleaning up browser:`, cleanupError);
      }
      
      // Return standard results as fallback, even if minimal
      return standardResults;
    }
  }

  async cleanup(): Promise<void> {
    await this.puppeteerScraper.closeBrowser();
  }
}
