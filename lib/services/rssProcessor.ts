// File: /lib/services/rssProcessor.ts
/**
 * RSS-specific processing service that handles RSS feed parsing and article extraction.
 * This service is responsible for:
 * - RSS feed parsing using rss-parser
 * - Configuration management for RSS sources
 * - Article limiting and processing coordination
 * - Error handling and status reporting specific to RSS feeds
 */

import Parser from 'rss-parser';
import { ArticleProcessor } from './articleProcessor';
import { ConfigurationManager, SourceConfiguration } from './configurationManager';
import { ProcessingSummary, SourceToFetch } from './fetcher';

export class RSSProcessor {
    private static readonly rssParser = new Parser();

    /**
     * Process an RSS source from URL to articles
     * @param source - The RSS source to process
     * @param rawContent - The raw RSS feed content
     * @returns ProcessingSummary with detailed results
     */
    static async processRSSSource(
        source: SourceToFetch,
        rawContent: string
    ): Promise<ProcessingSummary> {
        const summary: ProcessingSummary = {
            sourceUrl: source.url,
            sourceName: source.name,
            type: 'rss',
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
            // Parse RSS feed
            const parsedFeed = await this.rssParser.parseString(rawContent);
            summary.itemsFound = parsedFeed.items?.length || 0;

            // Get configuration for RSS processing
            const config = this.getRSSConfiguration(source);
            
            // Apply article limiting
            const itemsToProcess = this.applyArticleLimit(
                parsedFeed.items || [],
                config.maxArticles,
                summary
            );

            // Process articles
            if (itemsToProcess.length > 0) {
                await this.processRSSArticles(itemsToProcess, source.name, summary);
            }

            // Set final status and message
            this.setProcessingSummaryStatus(summary, config.maxArticles);

        } catch (error: unknown) {
            this.handleProcessingError(error, summary);
        }

        return summary;
    }

    /**
     * Get RSS configuration using ConfigurationManager
     */
    private static getRSSConfiguration(source: SourceToFetch) {
        const configManager = ConfigurationManager.getInstance();
        
        const sourceConfig: SourceConfiguration = {
            id: source.name,
            name: source.name,
            url: source.url,
            type: 'rss'
        };

        const rssConfig = configManager.createRSSConfiguration(sourceConfig);
        configManager.logConfiguration(sourceConfig);
        
        return rssConfig;
    }

    /**
     * Apply article limiting to RSS items
     */
    private static applyArticleLimit(
        items: Parser.Item[],
        maxArticles: number | undefined,
        summary: ProcessingSummary
    ): Parser.Item[] {
        let itemsToProcess = items;

        if (maxArticles && items.length > maxArticles) {
            console.log(`RSS Processor: Source ${summary.sourceName} has ${items.length} items, limiting to first ${maxArticles}.`);
            itemsToProcess = items.slice(0, maxArticles);
        }

        summary.itemsConsidered = itemsToProcess.length;
        return itemsToProcess;
    }

    /**
     * Process individual RSS articles
     */
    private static async processRSSArticles(
        items: Parser.Item[],
        sourceName: string,
        summary: ProcessingSummary
    ): Promise<void> {
        for (const item of items) {
            summary.itemsProcessed++;
            
            const result = await ArticleProcessor.processRSSArticle(item, sourceName);
            
            if (result.action === 'added') {
                summary.newItemsAdded++;
            } else if (result.action === 'skipped') {
                summary.itemsSkipped++;
                
                if (result.error) {
                    summary.errors.push({ 
                        itemTitle: item.title?.trim(), 
                        itemLink: item.link?.trim(), 
                        message: result.error 
                    });
                }
            }
        }
    }

    /**
     * Set final processing status and message
     */
    private static setProcessingSummaryStatus(
        summary: ProcessingSummary,
        maxArticles: number | undefined
    ): void {
        const limitMessagePart = maxArticles && summary.itemsFound > maxArticles 
            ? ` (limited to first ${summary.itemsConsidered} of ${summary.itemsFound} found).`
            : '';

        const processedStatsMessage = `Processed ${summary.itemsProcessed} items${limitMessagePart}. Added: ${summary.newItemsAdded}, Skipped: ${summary.itemsSkipped}.`;

        if (summary.errors.length > 0) {
            summary.status = 'partial_success';
            summary.message = `Completed with ${summary.errors.length} errors. ${processedStatsMessage}`;
        } else if (summary.itemsConsidered === 0 && summary.itemsFound === 0) {
            summary.status = 'success';
            summary.message = "No items found in RSS feed.";
        } else if (summary.itemsConsidered === 0 && summary.itemsFound > 0) {
            summary.status = 'success';
            summary.message = `Found ${summary.itemsFound} items, but 0 considered after limit (or limit was 0). No items processed.`;
        } else {
            summary.status = 'success';
            summary.message = `Successfully ${processedStatsMessage}`;
        }
    }

    /**
     * Handle processing errors
     */
    private static handleProcessingError(error: unknown, summary: ProcessingSummary): void {
        let message = 'Failed to process RSS source.';
        if (error instanceof Error) {
            message = `Failed to process RSS source: ${error.message}`;
        }
        summary.fetchError = (error instanceof Error) ? error.message : String(error);
        summary.message = message;
        summary.status = 'failed';
    }
}
