import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapingConfig {
  websiteId: string;
  name: string;
  baseUrl: string;
  articleSelector: string;
  titleSelector?: string;
  urlSelector?: string;
  dateSelector?: string;
  descriptionSelector?: string;
  dateFormat?: string;
  maxArticles?: number;
  skipArticlesWithoutDates?: boolean; // Skip articles that don't have extractable dates (useful for filtering featured/promotional content)
  titleCleaning?: {
    removePrefixes?: string[];
    removeSuffixes?: string[];
    removePatterns?: string[];
  };
  customExtraction?: {
    dateFromText?: boolean;
    dateRegex?: string;
  };
}

export interface ScrapedArticle {
  title: string;
  url: string;
  description?: string;
  publishedDate?: string;
  source: string;
}

export class HTMLScraper {
  private config: ScrapingConfig;

  constructor(config: ScrapingConfig) {
    this.config = config;
  }

  async scrapeWebsite(url: string, config: ScrapingConfig, sourceName: string): Promise<ScrapedArticle[]> {
    try {
      console.log(`Scraping ${sourceName} from ${url} with limit: ${config.maxArticles}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)',
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const articles: ScrapedArticle[] = [];
      const seenUrls = new Set<string>(); // Track URLs to avoid duplicates

      $(config.articleSelector).each((index, element) => {
        if (config.maxArticles && articles.length >= config.maxArticles) return false;

        const $element = $(element);
        
        // Extract title
        const title = this.extractTitle($element, config.titleSelector);
        if (!title || title.length < 5) return; // Skip if no meaningful title found

        // Extract URL
        const articleUrl = this.extractUrl($element, config.urlSelector, config.baseUrl || url);
        if (!articleUrl) return; // Skip if no URL found
        
        // Skip duplicates
        if (seenUrls.has(articleUrl)) return;
        seenUrls.add(articleUrl);

        // Extract description (optional)
        const description = config.descriptionSelector 
          ? this.extractText($element, config.descriptionSelector)
          : '';

        // Extract date (optional)
        const publishedDate = config.dateSelector 
          ? this.extractDate($element, config.dateSelector)
          : undefined;

        // Skip articles without dates if specifically configured to do so (useful for filtering featured/promotional content)
        if (config.skipArticlesWithoutDates && config.dateSelector && !publishedDate) {
          console.log(`[DEBUG] Skipping article without date: "${title.substring(0, 50)}..."`);
          return;
        }

        articles.push({
          title: title.trim(),
          url: articleUrl,
          description: description?.trim() || '',
          publishedDate,
          source: sourceName
        });
      });

      console.log(`Found ${articles.length} articles from ${sourceName}`);
      return articles;

    } catch (error) {
      console.error(`Error scraping ${sourceName}:`, error);
      return [];
    }
  }

  private extractTitle($element: cheerio.Cheerio, titleSelector?: string): string {
    if (titleSelector) {
      return $element.find(titleSelector).first().text();
    }
    
    // Get raw title text
    let title = $element.text().trim();
    
    // Apply cleaning from config if available
    if (this.config?.titleCleaning) {
      // Remove prefixes
      if (this.config.titleCleaning.removePrefixes) {
        for (const prefix of this.config.titleCleaning.removePrefixes) {
          const regex = new RegExp(`^${prefix}\\s*·?\\s*`, 'i');
          title = title.replace(regex, '');
        }
      }
      
      // Remove suffixes
      if (this.config.titleCleaning.removeSuffixes) {
        for (const suffix of this.config.titleCleaning.removeSuffixes) {
          const regex = new RegExp(`\\s*${suffix}\\s*$`, 'i');
          title = title.replace(regex, '');
        }
      }
      
      // Remove patterns
      if (this.config.titleCleaning.removePatterns) {
        for (const pattern of this.config.titleCleaning.removePatterns) {
          const regex = new RegExp(pattern, 'gi');
          title = title.replace(regex, '');
        }
      }
    }
    
    // Clean up whitespace
    title = title.replace(/\s+/g, ' ').trim();
    
    return title;
  }

  private extractUrl($element: cheerio.Cheerio, urlSelector?: string, baseUrl?: string): string {
    let url = '';
    
    if (urlSelector) {
      url = $element.find(urlSelector).attr('href') || '';
    } else {
      // Default: find href attribute or first link
      url = $element.attr('href') || $element.find('a').first().attr('href') || '';
    }

    if (!url) return '';

    // Handle relative URLs
    if (url.startsWith('/') && baseUrl) {
      const base = new URL(baseUrl);
      return `${base.protocol}//${base.host}${url}`;
    }

    if (!url.startsWith('http') && baseUrl) {
      return `${baseUrl}/${url.replace(/^\//, '')}`;
    }

    return url;
  }

  private extractText($element: cheerio.Cheerio, selector: string): string {
    return $element.find(selector).first().text();
  }

  private extractDate($element: cheerio.Cheerio, dateSelector: string): string | undefined {
    const dateText = $element.find(dateSelector).first().text() || 
                     $element.find(dateSelector).first().attr('datetime') ||
                     $element.find(dateSelector).first().attr('content');
    
    console.log(`[DEBUG] Date extraction - Selector: ${dateSelector}, Found text: "${dateText}"`);
    
    if (!dateText) {
      // Check if config specifies custom date extraction
      if (this.config?.customExtraction?.dateFromText && this.config.customExtraction.dateRegex) {
        const text = $element.text();
        const dateMatch = text.match(new RegExp(this.config.customExtraction.dateRegex));
        console.log(`[DEBUG] Fallback regex search in: "${text.substring(0, 200)}..." - Match: ${dateMatch?.[0] || 'none'}`);
        if (dateMatch) {
          try {
            const extractedDate = new Date(dateMatch[0]).toISOString();
            console.log(`[DEBUG] Fallback date extracted: ${extractedDate}`);
            return extractedDate;
          } catch {
            console.log(`[DEBUG] Fallback date parsing failed for: ${dateMatch[0]}`);
            return undefined; // Don't save inaccurate dates
          }
        }
      }
      console.log(`[DEBUG] No date found, returning undefined`);
      return undefined; // Don't save inaccurate dates
    }
    
    try {
      const parsedDate = new Date(dateText).toISOString();
      console.log(`[DEBUG] Date parsed successfully: ${parsedDate}`);
      return parsedDate;
    } catch {
      console.log(`[DEBUG] Date parsing failed for: "${dateText}"`);
      return undefined; // Don't save inaccurate dates
    }
  }
}
