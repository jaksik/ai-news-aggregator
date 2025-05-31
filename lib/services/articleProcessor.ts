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

export class ArticleProcessor {
  /**
   * Process an RSS article - check for duplicates and save if new
   */
  static async processRSSArticle(
    item: RSSArticleData, 
    sourceName: string
  ): Promise<ProcessedArticleResult> {
    try {
      const normalizedLink = item.link?.trim();
      const itemTitle = item.title?.trim();

      if (!normalizedLink) {
        return { action: 'skipped', error: 'Item missing link.' };
      }

      // Check for existing article by GUID first, then by link
      let existingArticle: IArticle | null = null;
      if (item.guid) {
        existingArticle = await Article.findOne({ guid: item.guid });
      }
      if (!existingArticle && normalizedLink) {
        existingArticle = await Article.findOne({ link: normalizedLink });
      }

      if (existingArticle) {
        return { action: 'skipped' };
      }

      // Create new article
      const newArticleDoc = new Article({
        title: itemTitle || 'Untitled Article',
        link: normalizedLink,
        sourceName: sourceName,
        publishedDate: item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : undefined),
        descriptionSnippet: item.contentSnippet || item.content?.substring(0, 300),
        guid: item.guid,
        fetchedAt: new Date(),
        isRead: false,
        isStarred: false,
        categories: item.categories,
      });

      await newArticleDoc.save();
      return { action: 'added' };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error';
      return { action: 'skipped', error: message };
    }
  }

  /**
   * Process an HTML article - check for duplicates and save if new
   */
  static async processHTMLArticle(
    article: HTMLArticleData, 
    sourceName: string
  ): Promise<ProcessedArticleResult> {
    try {
      // Check for existing article by URL
      const existingArticle = await Article.findOne({ link: article.url });

      if (existingArticle) {
        return { action: 'skipped' };
      }

      // Create new article
      const newArticleDoc = new Article({
        title: article.title,
        link: article.url,
        sourceName: sourceName,
        publishedDate: article.publishedDate ? new Date(article.publishedDate) : new Date(),
        descriptionSnippet: article.description || '',
        fetchedAt: new Date(),
        isRead: false,
        isStarred: false,
        categories: [],
      });

      await newArticleDoc.save();
      return { action: 'added' };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error';
      return { action: 'skipped', error: message };
    }
  }
}
