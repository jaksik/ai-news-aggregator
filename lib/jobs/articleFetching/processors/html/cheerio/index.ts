import axios from 'axios';
import cheerio from 'cheerio';
import { scraping } from '../../../../../config';

// Self-contained types for Cheerio processor
export interface ScrapingConfig {
  websiteId: string;
  name: string;
  baseUrl: string;
  articleSelector: string;
  titleSelector?: string;
  descriptionSelector?: string;
  dateSelector?: string;
  urlSelector?: string;
  skipArticlesWithoutDates?: boolean;
  titleCleaning?: {
    removePrefixes?: string[];
    removePatterns?: string[];
  };
  maxArticles?: number;
}

export interface ScrapedArticle {
  title: string;
  url: string;
  description?: string;
  publishedDate?: string;
  source: string;
}

export class HTMLScraper {
  /**
   * Scrape articles from a URL using Cheerio (standard scraping)
   */
  static async scrapeArticles(url: string, config: ScrapingConfig): Promise<ScrapedArticle[]> {
    try {
      const html = await this.fetchHTML(url);
      return this.extractArticles(html, config);
    } catch (error) {
      console.error(`Cheerio scraping failed for ${url}:`, error);
      throw error;
    }
  }

  private static async fetchHTML(url: string): Promise<string> {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': scraping.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
      timeout: 30000,
    });
    
    return response.data;
  }

  private static extractArticles(html: string, config: ScrapingConfig): ScrapedArticle[] {
    const $ = cheerio.load(html);
    const articles: ScrapedArticle[] = [];

    $(config.articleSelector).each((index, element) => {
      try {
        const article = this.extractSingleArticle($, element, config);
        if (article) {
          articles.push(article);
        }
      } catch (error) {
        console.warn(`Failed to extract article at index ${index}:`, error);
      }
    });

    return articles.slice(0, config.maxArticles || 50);
  }

  private static extractSingleArticle($: cheerio.Root, element: cheerio.Element, config: ScrapingConfig): ScrapedArticle | null {
    const $element = $(element);
    
    // Extract title
    const titleSelector = config.titleSelector || 'h1, h2, h3, .title, .post-title, a';
    const title = $element.find(titleSelector).first().text().trim() || 
                  $element.text().trim() || 
                  $element.attr('title') || '';
    
    if (!title) {
      return null;
    }

    // Extract URL
    const urlSelector = config.urlSelector || 'a';
    let url = $element.find(urlSelector).first().attr('href') || 
              $element.attr('href') || '';
    
    if (!url) {
      return null;
    }

    // Make URL absolute
    if (url.startsWith('/')) {
      url = config.baseUrl + url;
    } else if (!url.startsWith('http')) {
      url = config.baseUrl + '/' + url;
    }

    // Extract description
    let description = '';
    if (config.descriptionSelector) {
      description = $element.find(config.descriptionSelector).first().text().trim();
    }

    // Extract date
    let publishedDate = '';
    if (config.dateSelector) {
      const dateElement = $element.find(config.dateSelector).first();
      publishedDate = dateElement.attr('datetime') || 
                     dateElement.text().trim() || '';
    }

    // Skip articles without dates if required
    if (config.skipArticlesWithoutDates && !publishedDate) {
      return null;
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

    return {
      title: cleanedTitle.trim(),
      url: url,
      description: description || undefined,
      publishedDate: publishedDate || undefined,
      source: config.name
    };
  }
}