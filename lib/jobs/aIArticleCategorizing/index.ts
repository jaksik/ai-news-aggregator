// Main orchestrator for AI article categorization with comprehensive logging
import dbConnect from '../../db';
import Article from '../../../models/Article';
import CategorizationRunLog, {
  ICategorizationRunLog,
  IArticleCategorizationSummary,
  ICategoryDistribution,
  ITechCategoryDistribution
} from '../../../models/CategorizationRunLog';
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
   * Main method to categorize uncategorized articles with comprehensive logging
   */
  async categorizeUncategorizedArticles(
    limit: number = 20,
    triggeredBy: 'manual' | 'scheduled' | 'api' = 'manual'
  ): Promise<CategorizationResult> {
    const startTime = Date.now();
    let runLog: ICategorizationRunLog | null = null;

    console.log(`🚀 Starting AI categorization job for ${limit} articles...`);

    try {
      // Ensure database connection
      console.log('📊 Step 1: Ensuring database connection...');
      await dbConnect();
      console.log('✅ Database connection established');

      // Create initial run log
      console.log('📝 Step 2: Creating categorization run log...');
      runLog = await this.createRunLog(limit, triggeredBy);
      console.log(`✅ Created run log: ${runLog._id}`);

      // Step 1: Fetch uncategorized articles
      console.log('📋 Step 3: Fetching uncategorized articles from database...');
      const uncategorizedArticles = await this.fetchUncategorizedArticles(limit);

      if (uncategorizedArticles.length === 0) {
        console.log('✅ No uncategorized articles found - job complete');
        await this.finalizeRunLog(runLog, {
          categorizedArticles: [],
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, modelUsed: 'none' },
          updateResults: { successful: 0, failed: 0, errors: [] }
        }, startTime);

        return {
          success: true,
          totalProcessed: 0,
          successfulUpdates: 0,
          failedUpdates: 0,
          errors: [],
          categorizedArticles: [],
          runLogId: runLog._id?.toString()
        };
      }

      console.log(`📋 Found ${uncategorizedArticles.length} uncategorized articles`);

      // Update run log with attempted count
      await this.updateRunLogProgress(runLog, uncategorizedArticles.length);

      // Step 2: Format articles for OpenAI
      console.log('🔄 Step 4: Formatting articles for OpenAI API...');
      const articlesForAI = this.formatArticlesForAI(uncategorizedArticles);
      console.log(`✅ Formatted ${articlesForAI.length} articles for AI processing`);

      // Step 3: Send to OpenAI for categorization
      console.log('🤖 Step 5: Sending articles to OpenAI for categorization...');
      const openaiResponse = await this.openaiService.categorizeArticles(articlesForAI);
      console.log(`✅ Received ${openaiResponse.categorizedArticles.length} categorized articles from OpenAI`);

      // Step 4: Update articles in database
      console.log('💾 Step 6: Updating articles in database...');
      const updateResults = await this.updateArticlesInDatabase(openaiResponse.categorizedArticles);

      // Step 5: Finalize run log
      console.log('📝 Step 7: Finalizing run log...');
      await this.finalizeRunLog(runLog, {
        categorizedArticles: openaiResponse.categorizedArticles,
        usage: openaiResponse.usage,
        updateResults
      }, startTime);

      const duration = Date.now() - startTime;
      console.log(`✅ Categorization job completed in ${duration}ms`);
      console.log(`📊 Final results: ${updateResults.successful} successful, ${updateResults.failed} failed`);

      return {
        success: true,
        totalProcessed: uncategorizedArticles.length,
        successfulUpdates: updateResults.successful,
        failedUpdates: updateResults.failed,
        errors: updateResults.errors,
        categorizedArticles: openaiResponse.categorizedArticles,
        runLogId: runLog._id?.toString()
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Categorization job failed after ${duration}ms:`, error);

      // Update run log with failure
      if (runLog) {
        try {
          await this.markRunLogAsFailed(runLog, error, startTime);
        } catch (logError) {
          console.error('❌ Failed to update run log with failure:', logError);
        }
      }

      return {
        success: false,
        totalProcessed: 0,
        successfulUpdates: 0,
        failedUpdates: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        categorizedArticles: [],
        runLogId: runLog?._id?.toString()
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
        .sort({ publishedDate: -1 })  // ← CHANGED: from createdAt to publishedDate
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
            categoryRationale: categorizedArticle.brief_rationale,
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

  /**
   * Create initial run log
   */
  private async createRunLog(
    articleLimit: number,
    triggeredBy: 'manual' | 'scheduled' | 'api'
  ): Promise<ICategorizationRunLog> {
    const runLog = new CategorizationRunLog({
      startTime: new Date(),
      status: 'in-progress',
      totalArticlesAttempted: 0,
      totalArticlesSuccessful: 0,
      totalArticlesFailed: 0,
      newsCategoryDistribution: {
        'Top Story Candidate': 0,
        'Solid News': 0,
        'Interesting but Lower Priority': 0,
        'Likely Noise or Opinion': 0
      },
      techCategoryDistribution: {
        'Products and Updates': 0,
        'Developer Tools': 0,
        'Research and Innovation': 0,
        'Industry Trends': 0,
        'Startups and Funding': 0,
        'Not Relevant': 0
      },
      openaiUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUSD: 0,
        modelUsed: 'gpt-4o-mini'
      },
      articleSummaries: [],
      orchestrationErrors: [],
      articleLimit,
      openaiModel: 'gpt-4o-mini',
      triggeredBy
    });

    return await runLog.save();
  }

  /**
   * Update run log with attempted article count
   */
  private async updateRunLogProgress(
    runLog: ICategorizationRunLog,
    attemptedCount: number
  ): Promise<void> {
    runLog.totalArticlesAttempted = attemptedCount;
    await runLog.save();
  }

  /**
   * Calculate cost estimate for OpenAI usage
   */
  private calculateOpenAICost(usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    modelUsed: string;
  }): number {
    // GPT-4o-mini pricing (as of 2024): $0.15 per 1M input tokens, $0.60 per 1M output tokens
    const inputCostPer1M = 0.15;
    const outputCostPer1M = 0.60;

    const inputCost = (usage.promptTokens / 1_000_000) * inputCostPer1M;
    const outputCost = (usage.completionTokens / 1_000_000) * outputCostPer1M;

    return inputCost + outputCost;
  }

  /**
   * Calculate category distributions
   */
  private calculateCategoryDistributions(categorizedArticles: CategorizedArticleResponse[]): {
    newsCategoryDistribution: ICategoryDistribution;
    techCategoryDistribution: ITechCategoryDistribution;
  } {
    const newsCategoryDistribution: ICategoryDistribution = {
      'Top Story Candidate': 0,
      'Solid News': 0,
      'Interesting but Lower Priority': 0,
      'Likely Noise or Opinion': 0
    };

    const techCategoryDistribution: ITechCategoryDistribution = {
      'Products and Updates': 0,
      'Developer Tools': 0,
      'Research and Innovation': 0,
      'Industry Trends': 0,
      'Startups and Funding': 0,
      'Not Relevant': 0
    };

    categorizedArticles.forEach(article => {
      if (article.newsCategory in newsCategoryDistribution) {
        newsCategoryDistribution[article.newsCategory as keyof ICategoryDistribution]++;
      }
      if (article.techCategory in techCategoryDistribution) {
        techCategoryDistribution[article.techCategory as keyof ITechCategoryDistribution]++;
      }
    });

    return { newsCategoryDistribution, techCategoryDistribution };
  }

  /**
   * Create article summaries for logging
   */
  private createArticleSummaries(
    categorizedArticles: CategorizedArticleResponse[],
    updateResults: { successful: number; failed: number; errors: string[] }
  ): IArticleCategorizationSummary[] {
    const summaries: IArticleCategorizationSummary[] = [];

    categorizedArticles.forEach(article => {
      summaries.push({
        articleId: article.objectId,
        title: article.original_title,
        newsCategory: article.newsCategory,
        techCategory: article.techCategory,
        aiRationale: article.brief_rationale,
        status: 'success', // We'll handle failures separately
        processingTimeMs: undefined // We don't track individual article processing time yet
      });
    });

    // Add failed articles if we have error information
    updateResults.errors.forEach(error => {
      const articleIdMatch = error.match(/article ([a-f\d]{24})/i);
      if (articleIdMatch) {
        summaries.push({
          articleId: articleIdMatch[1],
          title: 'Failed to update',
          newsCategory: '',
          techCategory: '',
          aiRationale: '',
          status: 'failed',
          errorMessage: error
        });
      }
    });

    return summaries;
  }

  /**
   * Finalize run log with results
   */
  private async finalizeRunLog(
    runLog: ICategorizationRunLog,
    results: {
      categorizedArticles: CategorizedArticleResponse[];
      usage: { promptTokens: number; completionTokens: number; totalTokens: number; modelUsed: string };
      updateResults: { successful: number; failed: number; errors: string[] };
    },
    startTime: number
  ): Promise<void> {
    const endTime = new Date();
    const processingTimeMs = Date.now() - startTime;

    // Calculate distributions
    const { newsCategoryDistribution, techCategoryDistribution } =
      this.calculateCategoryDistributions(results.categorizedArticles);

    // Calculate cost
    const estimatedCostUSD = this.calculateOpenAICost(results.usage);

    // Create article summaries
    const articleSummaries = this.createArticleSummaries(results.categorizedArticles, results.updateResults);

    // Determine final status
    let status: 'completed' | 'completed_with_errors' | 'failed';
    if (results.updateResults.failed === 0) {
      status = 'completed';
    } else if (results.updateResults.successful > 0) {
      status = 'completed_with_errors';
    } else {
      status = 'failed';
    }

    // Update run log
    runLog.endTime = endTime;
    runLog.status = status;
    runLog.processingTimeMs = processingTimeMs;
    runLog.totalArticlesSuccessful = results.updateResults.successful;
    runLog.totalArticlesFailed = results.updateResults.failed;
    runLog.newsCategoryDistribution = newsCategoryDistribution;
    runLog.techCategoryDistribution = techCategoryDistribution;
    runLog.openaiUsage = {
      promptTokens: results.usage.promptTokens,
      completionTokens: results.usage.completionTokens,
      totalTokens: results.usage.totalTokens,
      estimatedCostUSD,
      modelUsed: results.usage.modelUsed
    };
    runLog.articleSummaries = articleSummaries;
    runLog.orchestrationErrors = results.updateResults.errors;

    await runLog.save();
  }

  /**
   * Mark run log as failed
   */
  private async markRunLogAsFailed(
    runLog: ICategorizationRunLog,
    error: unknown,
    startTime: number
  ): Promise<void> {
    const endTime = new Date();
    const processingTimeMs = Date.now() - startTime;

    runLog.endTime = endTime;
    runLog.status = 'failed';
    runLog.processingTimeMs = processingTimeMs;
    runLog.orchestrationErrors = [error instanceof Error ? error.message : 'Unknown error occurred'];

    await runLog.save();
  }
}

/**
 * Factory function to create and run categorization job
 */
export async function runAiCategorizationJob(
  openaiApiKey: string,
  articleLimit: number = 20,
  triggeredBy: 'manual' | 'scheduled' | 'api' = 'manual'
): Promise<CategorizationResult> {
  const orchestrator = new AiArticleCategorizationOrchestrator(openaiApiKey);
  return await orchestrator.categorizeUncategorizedArticles(articleLimit, triggeredBy);
}

/**
 * Default export for the main orchestrator
 */
export default AiArticleCategorizationOrchestrator;
