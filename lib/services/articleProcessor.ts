// Purpose: Acts as the final processing step in the news aggregation pipeline, ensuring that:

// Articles are properly formatted before database storage
// No duplicate articles are saved
// Both RSS and HTML content sources are handled consistently
// The database maintains clean, deduplicated article data

import Article, { IArticle } from '../../models/Article';

export interface ProcessedArticleResult {
  action: 'added' | 'skipped';
  error?: string;
}

export interface RSSArticleData {
  title?: string;
  link?: string;
  guid?: string;
  isoDate?: string;
  pubDate?: string;
  contentSnippet?: string;
  content?: string;
  categories?: string[];
}

export interface HTMLArticleData {
  title: string;
  url: string;
  description?: string;
  publishedDate?: string;
}

/**
 * Normalized article data interface for unified processing
 */
export interface NormalizedArticleData {
  title: string;
  link?: string;
  publishedDate?: Date;
  description: string;
  guid?: string;
  categories: string[];
}

export class ArticleProcessor {
  /**
   * Unified article processing method - handles both RSS and HTML articles
   * Consolidates duplicate checking and article creation logic
   */
  static async processArticle(
    data: RSSArticleData | HTMLArticleData,
    sourceName: string,
    type: 'rss' | 'html'
  ): Promise<ProcessedArticleResult> {
    try {
      const normalizedData = this.normalizeArticleData(data, type);
      
      if (!normalizedData.link) {
        return { action: 'skipped', error: 'Item missing link.' };
      }

      // Check for existing article using unified duplicate checking
      const existingArticle = await this.checkForDuplicate(normalizedData, type);
      if (existingArticle) {
        return { action: 'skipped' };
      }

      // Create new article using unified creation logic
      const newArticle = await this.createArticle(normalizedData, sourceName);
      await newArticle.save();
      return { action: 'added' };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error';
      return { action: 'skipped', error: message };
    }
  }

  /**
   * Legacy RSS article processing method (maintained for backward compatibility)
   * @deprecated Use processArticle() instead
   */
  static async processRSSArticle(
    item: RSSArticleData, 
    sourceName: string
  ): Promise<ProcessedArticleResult> {
    return this.processArticle(item, sourceName, 'rss');
  }

  /**
   * Legacy HTML article processing method (maintained for backward compatibility) 
   * @deprecated Use processArticle() instead
   */
  static async processHTMLArticle(
    article: HTMLArticleData, 
    sourceName: string
  ): Promise<ProcessedArticleResult> {
    return this.processArticle(article, sourceName, 'html');
  }

  /**
   * Normalize article data from different sources into a unified format
   */
  private static normalizeArticleData(
    data: RSSArticleData | HTMLArticleData,
    type: 'rss' | 'html'
  ): NormalizedArticleData {
    if (type === 'rss') {
      const rssData = data as RSSArticleData;
      return {
        title: rssData.title?.trim() || 'Untitled Article',
        link: rssData.link?.trim(),
        publishedDate: rssData.isoDate ? new Date(rssData.isoDate) : 
                      (rssData.pubDate ? new Date(rssData.pubDate) : undefined),
        description: rssData.contentSnippet || rssData.content?.substring(0, 300) || '',
        guid: rssData.guid,
        categories: rssData.categories || []
      };
    } else {
      const htmlData = data as HTMLArticleData;
      return {
        title: htmlData.title?.trim() || 'Untitled Article',
        link: htmlData.url?.trim(),
        publishedDate: htmlData.publishedDate ? new Date(htmlData.publishedDate) : new Date(),
        description: htmlData.description || '',
        categories: []
      };
    }
  }

  /**
   * Check for duplicate articles using unified logic
   */
  private static async checkForDuplicate(
    data: NormalizedArticleData,
    type: 'rss' | 'html'
  ): Promise<IArticle | null> {
    if (!data.link) return null;

    // For RSS articles, check GUID first if available
    if (type === 'rss' && data.guid) {
      const existingByGuid = await Article.findOne({ guid: data.guid });
      if (existingByGuid) return existingByGuid;
    }

    // Check by URL for all article types
    return await Article.findOne({ link: data.link });
  }

  /**
   * Create new article document using unified logic
   */
  private static createArticle(
    data: NormalizedArticleData,
    sourceName: string
  ): IArticle {
    return new Article({
      title: data.title,
      link: data.link,
      sourceName: sourceName,
      publishedDate: data.publishedDate,
      descriptionSnippet: data.description,
      guid: data.guid,
      fetchedAt: new Date(),
      isRead: false,
      isStarred: false,
      categories: data.categories
    });
  }
}
