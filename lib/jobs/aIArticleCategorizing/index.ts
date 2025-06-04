// Main orchestrator for AI article categorization
import dbConnect from '../../db';
import Article from '../../../models/Article';
import { OpenAICategorizationService } from './openAIService';
import type { 
  UncategorizedArticle, 
  ArticleForCategorization, 
  CategorizationResult,
  CategorizedArticleResponse 
} from './types';

export class AiArticleCategorizationOrchestrator {
  private openaiService: OpenAICategorizationService;

  constructor(openaiApiKey: string) {
    this.openaiService = new OpenAICategorizationService(openaiApiKey);
  }

  /**
   * Main method to categorize uncategorized articles
   */
  async categorizeUncategorizedArticles(limit: number = 20): Promise<CategorizationResult> {
    const startTime = Date.now();
    console.log(`🚀 Starting AI categorization job for ${limit} articles...`);

    try {
      // Ensure database connection
      console.log('📊 Step 1: Ensuring database connection...');
      await dbConnect();
      console.log('✅ Database connection established');

      // Step 1: Fetch uncategorized articles
      console.log('📋 Step 2: Fetching uncategorized articles from database...');
      const uncategorizedArticles = await this.fetchUncategorizedArticles(limit);
      
      if (uncategorizedArticles.length === 0) {
        console.log('✅ No uncategorized articles found - job complete');
        return {
          success: true,
          totalProcessed: 0,
          successfulUpdates: 0,
          failedUpdates: 0,
          errors: [],
          categorizedArticles: []
        };
      }

      console.log(`📋 Found ${uncategorizedArticles.length} uncategorized articles`);

      // Step 2: Format articles for OpenAI
      console.log('🔄 Step 3: Formatting articles for OpenAI API...');
      const articlesForAI = this.formatArticlesForAI(uncategorizedArticles);
      console.log(`✅ Formatted ${articlesForAI.length} articles for AI processing`);

      // Step 3: Send to OpenAI for categorization
      console.log('🤖 Step 4: Sending articles to OpenAI for categorization...');
      const categorizedArticles = await this.openaiService.categorizeArticles(articlesForAI);
      console.log(`✅ Received ${categorizedArticles.length} categorized articles from OpenAI`);

      // Step 4: Update articles in database
      console.log('💾 Step 5: Updating articles in database...');
      const updateResults = await this.updateArticlesInDatabase(categorizedArticles);

      const duration = Date.now() - startTime;
      console.log(`✅ Categorization job completed in ${duration}ms`);
      console.log(`📊 Final results: ${updateResults.successful} successful, ${updateResults.failed} failed`);

      return {
        success: true,
        totalProcessed: uncategorizedArticles.length,
        successfulUpdates: updateResults.successful,
        failedUpdates: updateResults.failed,
        errors: updateResults.errors,
        categorizedArticles: categorizedArticles
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Categorization job failed after ${duration}ms:`, error);
      
      return {
        success: false,
        totalProcessed: 0,
        successfulUpdates: 0,
        failedUpdates: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        categorizedArticles: []
      };
    }
  }

  /**
   * Fetch articles that need categorization from database
   */
  private async fetchUncategorizedArticles(limit: number): Promise<UncategorizedArticle[]> {
    try {
      const articles = await Article.find({
        $and: [
          {
            $or: [
              { newsCategory: { $exists: false } },
              { newsCategory: null },
              { newsCategory: '' }
            ]
          },
          {
            $or: [
              { techCategory: { $exists: false } },
              { techCategory: null },
              { techCategory: '' }
            ]
          }
        ]
      })
      .limit(limit)
      .sort({ createdAt: -1 })
      .select('_id title descriptionSnippet')
      .lean();

      return articles.map(article => ({
        _id: article._id.toString(),
        title: article.title || 'No title available',
        descriptionSnippet: article.descriptionSnippet || ''
      }));

    } catch (error) {
      console.error('❌ Failed to fetch uncategorized articles:', error);
      throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format articles for OpenAI API
   */
  private formatArticlesForAI(articles: UncategorizedArticle[]): ArticleForCategorization[] {
    return articles.map(article => ({
      objectId: article._id,
      title: article.title,
      meta_description: this.truncateDescription(article.descriptionSnippet || '', 358)
    }));
  }

  /**
   * Truncate description to specified character limit
   */
  private truncateDescription(description: string, maxLength: number): string {
    if (!description || description.length <= maxLength) {
      return description || 'No description available';
    }
    return description.substring(0, maxLength).trim() + '...';
  }

  /**
   * Update articles in database with categorization results
   */
  private async updateArticlesInDatabase(categorizedArticles: CategorizedArticleResponse[]): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    console.log(`💾 Updating ${categorizedArticles.length} articles in database...`);

    for (const categorizedArticle of categorizedArticles) {
      try {
        // Update the article with the categories directly from OpenAI
        const updateResult = await Article.findByIdAndUpdate(
          categorizedArticle.objectId,
          {
            newsCategory: categorizedArticle.newsCategory,
            techCategory: categorizedArticle.techCategory,
            categorizationStatus: 'completed',
            categorizedAt: new Date(),
            // Store AI categorization metadata
            aiCategorizationData: {
              newsCategory: categorizedArticle.newsCategory,
              techCategory: categorizedArticle.techCategory,
              rationale: categorizedArticle.brief_rationale,
              categorizedAt: new Date()
            }
          },
          { new: true }
        );

        if (updateResult) {
          successful++;
          console.log(`✅ Updated article: ${categorizedArticle.original_title} -> News: ${categorizedArticle.newsCategory}, Tech: ${categorizedArticle.techCategory}`);
        } else {
          failed++;
          const errorMsg = `Article not found: ${categorizedArticle.objectId}`;
          errors.push(errorMsg);
          console.warn(`⚠️ ${errorMsg}`);
        }

      } catch (error) {
        failed++;
        const errorMsg = `Failed to update article ${categorizedArticle.objectId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log(`💾 Database updates completed: ${successful} successful, ${failed} failed`);

    return { successful, failed, errors };
  }
}

/**
 * Factory function to create and run categorization job
 */
export async function runAiCategorizationJob(
  openaiApiKey: string,
  articleLimit: number = 20
): Promise<CategorizationResult> {
  const orchestrator = new AiArticleCategorizationOrchestrator(openaiApiKey);
  return await orchestrator.categorizeUncategorizedArticles(articleLimit);
}

/**
 * Default export for the main orchestrator
 */
export default AiArticleCategorizationOrchestrator;
