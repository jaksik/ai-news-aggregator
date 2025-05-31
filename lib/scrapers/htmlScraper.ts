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
          : new Date().toISOString();

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
      
      // Remove patterns
      if (this.config.titleCleaning.removePatterns) {
        for (const pattern of this.config.titleCleaning.removePatterns) {
          const regex = new RegExp(pattern, 'gi');
          title = title.replace(regex, '');
        }
      }
    } else {
      // Default cleaning for backward compatibility
      title = title.replace(/^(Announcements|Product|Policy|Societal Impacts|Interpretability|Alignment|Education|Event)\s*·?\s*/i, '');
      title = title.replace(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}$/i, '');
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

  private extractDate($element: cheerio.Cheerio, dateSelector: string): string {
    const dateText = $element.find(dateSelector).first().text() || 
                     $element.find(dateSelector).first().attr('datetime') ||
                     $element.find(dateSelector).first().attr('content');
    
    if (!dateText) {
      // Try to extract date from the text content for Anthropic format
      const text = $element.text();
      const dateMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/);
      if (dateMatch) {
        try {
          return new Date(dateMatch[0]).toISOString();
        } catch {
          return new Date().toISOString();
        }
      }
      return new Date().toISOString();
    }
    
    try {
      return new Date(dateText).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
}
