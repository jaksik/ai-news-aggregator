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
import { ProcessingStatusManager } from './processingStatusManager';
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
            ProcessingStatusManager.setProcessingStatus(summary, {
                maxArticles: config.maxArticles,
                sourceType: 'rss'
            });

        } catch (error: unknown) {
            ProcessingStatusManager.handleProcessingError(error, summary, 'rss');
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
            
            const result = await ArticleProcessor.processArticle(item, sourceName, 'rss');
            
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
}
