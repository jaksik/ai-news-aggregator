import puppeteer from 'puppeteer';
import { ScrapingConfig, ScrapedArticle } from '../cheerio';

export class EnhancedHTMLScraper {
  /**
   * Scrape articles from a URL using Puppeteer (enhanced scraping for complex sites)
   */
  static async scrapeArticles(url: string, config: ScrapingConfig): Promise<ScrapedArticle[]> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      
      // Set realistic viewport and user agent
      await page.setViewport({ width: 1366, height: 768 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to page with timeout
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });

      // Wait a bit for any dynamic content to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract articles using the same selectors as Cheerio
      const articles = await page.evaluate((config: ScrapingConfig) => {
        const articles: ScrapedArticle[] = [];
        const elements = document.querySelectorAll(config.articleSelector);

        elements.forEach((element, index) => {
          try {
            // Extract title
            const titleSelector = config.titleSelector || 'h1, h2, h3, .title, .post-title, a';
            const titleElement = element.querySelector(titleSelector) || element;
            const title = titleElement.textContent?.trim() || 
                         titleElement.getAttribute('title') || '';
            
            if (!title) return;

            // Extract URL
            const urlSelector = config.urlSelector || 'a';
            const linkElement = element.querySelector(urlSelector) as HTMLAnchorElement || 
                               element as HTMLAnchorElement;
            let url = linkElement.href || linkElement.getAttribute('href') || '';
            
            if (!url) return;

            // Make URL absolute
            if (url.startsWith('/')) {
              url = config.baseUrl + url;
            } else if (!url.startsWith('http')) {
              url = config.baseUrl + '/' + url;
            }

            // Extract description
            let description = '';
            if (config.descriptionSelector) {
              const descElement = element.querySelector(config.descriptionSelector);
              description = descElement?.textContent?.trim() || '';
            }

            // Extract date
            let publishedDate = '';
            if (config.dateSelector) {
              const dateElement = element.querySelector(config.dateSelector);
              publishedDate = dateElement?.getAttribute('datetime') || 
                             dateElement?.textContent?.trim() || '';
            }

            // Skip articles without dates if required
            if (config.skipArticlesWithoutDates && !publishedDate) {
              return;
            }

            // Clean title if configured
            let cleanedTitle = title;
            if (config.titleCleaning) {
              if (config.titleCleaning.removePrefixes) {
                for (const prefix of config.titleCleaning.removePrefixes) {
                  cleanedTitle = cleanedTitle.replace(new RegExp(`^${prefix}\\s*:?\\s*`, 'i'), '');
                }
              }
              if (config.titleCleaning.removePatterns) {
                for (const pattern of config.titleCleaning.removePatterns) {
                  cleanedTitle = cleanedTitle.replace(new RegExp(pattern, 'gi'), '');
                }
              }
            }

            articles.push({
              title: cleanedTitle.trim(),
              url: url,
              description: description || undefined,
              publishedDate: publishedDate || undefined,
              source: config.name
            });

          } catch (error) {
            console.warn(`Failed to extract article at index ${index}:`, error);
          }
        });

        return articles.slice(0, config.maxArticles || 50);
      }, config);

      return articles;

    } catch (error) {
      console.error(`Puppeteer scraping failed for ${url}:`, error);
      throw error;        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
}