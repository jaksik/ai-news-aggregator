/**
 * HTML Processing Service - Main entry point for HTML content processing
 * 
 * This service provides a unified interface for HTML content processing and routes
 * to the appropriate scraper (Cheerio or Puppeteer) based on website requirements.
 * 
 * Key Features:
 * - Automatic scraper selection (standard Cheerio vs enhanced Puppeteer)
 * - Self-contained processing with integrated article saving
 * - Comprehensive error handling and status reporting
 * - Support for website-specific configurations
 */

import { ArticleSaver } from '../../articleSaver';
import { ProcessingStatusManager } from '../../statusManager';
import { ProcessingSummary, SourceToFetch } from '../../../../types';
import { ScraperSelector } from './scraperSelector';
import { getWebsiteScrapeConfig } from './websiteScrapeConfigs';
import { getMaxArticlesPerSource } from '../../../../config/articleLimits';

export class HTMLProcessor {
    /**
     * Process an HTML source from URL to articles
     * This method handles the complete flow: fetch -> scrape -> save articles
     */
    static async processSource(
        sourceToFetch: SourceToFetch
    ): Promise<ProcessingSummary> {
        const summary: ProcessingSummary = {
            sourceUrl: sourceToFetch.url,
            sourceName: sourceToFetch.name,
            type: 'html',
            status: 'failed',
            message: '',
            itemsFound: 0,
            itemsConsidered: 0,
            itemsProcessed: 0,
            newItemsAdded: 0,
            itemsSkipped: 0,
            errors: [],
        };
        
        try {
            // Get website-specific scraping configuration
            const websiteConfig = getWebsiteScrapeConfig(sourceToFetch.websiteId || sourceToFetch.name);
            if (!websiteConfig) {
                throw new Error(`No scraping configuration found for website: ${sourceToFetch.websiteId || sourceToFetch.name}`);
            }

            // Select appropriate scraper strategy
            const scraperSelection = ScraperSelector.selectScraper({
                websiteId: sourceToFetch.websiteId || sourceToFetch.name,
                sourceName: sourceToFetch.name,
                scrapingConfig: websiteConfig,
                // Use custom strategy if specified in source customSelectors
                forceStrategy: undefined // Could be extended later with sourceToFetch.htmlProcessor
            });

            // Scrape articles using selected scraper
            const scrapedArticles = await scraperSelection.scraper.scrapeArticles(
                sourceToFetch.url,
                websiteConfig
            );

            summary.itemsFound = scrapedArticles.length;

            if (!scrapedArticles || scrapedArticles.length === 0) {
                ProcessingStatusManager.setProcessingStatus(summary, {
                    sourceType: 'html'
                });
                return summary;
            }

            // Apply article limits
            const maxArticles = getMaxArticlesPerSource();
            const limitedArticles = scrapedArticles.slice(0, maxArticles);
            summary.itemsConsidered = limitedArticles.length;

            // Save articles
            for (const article of limitedArticles) {
                try {
                    const result = await ArticleSaver.saveArticle(article, sourceToFetch.name, 'html');
                    summary.itemsProcessed++;
                    
                    if (result.action === 'added') {
                        summary.newItemsAdded++;
                    } else if (result.action === 'skipped') {
                        summary.itemsSkipped++;
                        
                        if (result.error) {
                            summary.errors.push({
                                itemTitle: article.title,
                                itemLink: article.url,
                                message: result.error
                            });
                        }
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    summary.errors.push({
                        itemTitle: article.title,
                        itemLink: article.url,
                        message: `Failed to save article: ${errorMessage}`
                    });
                }
            }

            // Set final status using the centralized status manager
            ProcessingStatusManager.setProcessingStatus(summary, {
                maxArticles,
                sourceType: 'html'
            });
            
            return summary;

        } catch (error) {
            ProcessingStatusManager.handleProcessingError(error, summary, 'html');
            return summary;
        }
    }
}
