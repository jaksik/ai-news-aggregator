// File: /lib/services/htmlProcessor.ts
/**
 * HTML-specific processing service that handles website scraping and article extraction.
 * This service is responsible for:
 * - Website scraping configuration management
 * - Scraper selection and coordination
 * - Article extraction from HTML sources
 * - Error handling and status reporting specific to HTML scraping
 */

import { ArticleProcessor } from './articleProcessor';
import { ScraperSelector } from './scraperSelector';
import { ConfigurationManager, SourceConfiguration } from './configurationManager';
import { ProcessingStatusManager } from './processingStatusManager';
import { ProcessingSummary, SourceToFetch } from './fetcher';
import { HTMLScraper, ScrapingConfig } from '../scrapers/htmlScraper';
import { EnhancedHTMLScraper } from '../scrapers/puppeteerScraper';

export class HTMLProcessor {

    /**
     * Process an HTML source from URL to articles
     * @param source - The HTML source to process
     * @param _rawContent - The raw HTML content (currently unused but kept for consistency)
     * @returns ProcessingSummary with detailed results
     */
    static async processHTMLSource(
        source: SourceToFetch,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _rawContent?: string // Optional for now, may be used for future optimizations
    ): Promise<ProcessingSummary> {
        const summary: ProcessingSummary = {
            sourceUrl: source.url,
            sourceName: source.name,
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

        let scraper: HTMLScraper | EnhancedHTMLScraper | null = null;

        try {
            // Get configuration for HTML scraping
            const config = this.getHTMLConfiguration(source);
            
            // Select and initialize scraper
            const scraperSelection = this.selectScraper(source, config);
            scraper = scraperSelection.scraper;
            
            // Scrape articles from website
            if (!scraper) {
                throw new Error('Failed to initialize scraper');
            }
            const scrapedArticles = await scraper.scrapeWebsite(source.url, config, source.name);
            
            summary.itemsFound = scrapedArticles.length;
            summary.itemsConsidered = scrapedArticles.length;

            // Process scraped articles
            if (scrapedArticles.length > 0) {
                await this.processHTMLArticles(scrapedArticles, source.name, summary);
            }

            // Set final status and message
            ProcessingStatusManager.setProcessingStatus(summary, {
                sourceType: 'html'
            });

        } catch (error: unknown) {
            ProcessingStatusManager.handleProcessingError(error, summary, 'html');
        } finally {
            // Always cleanup scraper resources
            if (scraper) {
                await this.cleanupScraper(scraper);
            }
        }

        return summary;
    }

    /**
     * Get HTML configuration using ConfigurationManager
     */
    private static getHTMLConfiguration(source: SourceToFetch) {
        const configManager = ConfigurationManager.getInstance();
        
        const sourceConfig: SourceConfiguration = {
            id: source.name,
            name: source.name,
            url: source.url,
            type: 'html',
            websiteId: source.websiteId
        };

        configManager.logConfiguration(sourceConfig);
        const mergedConfig = configManager.createScrapingConfiguration(sourceConfig);
        
        return mergedConfig;
    }

    /**
     * Select appropriate scraper using ScraperSelector service
     */
    private static selectScraper(source: SourceToFetch, config: ScrapingConfig) {
        if (!source.websiteId) {
            throw new Error(`Invalid source configuration: HTML sources require websiteId`);
        }

        const scraperSelection = ScraperSelector.selectScraper({
            websiteId: source.websiteId,
            sourceName: source.name,
            scrapingConfig: config
        });
        
        console.log(`HTML Processor: Selected ${scraperSelection.useEnhancedScraper ? 'enhanced' : 'standard'} scraper for ${source.name} using ${scraperSelection.strategy} strategy`);
        
        return scraperSelection;
    }

    /**
     * Process individual HTML articles
     */
    private static async processHTMLArticles(
        scrapedArticles: { title: string; url: string; description?: string; publishedDate?: string; source: string }[],
        sourceName: string,
        summary: ProcessingSummary
    ): Promise<void> {
        for (const scrapedArticle of scrapedArticles) {
            summary.itemsProcessed++;
            
            const result = await ArticleProcessor.processArticle(scrapedArticle, sourceName, 'html');
            
            if (result.action === 'added') {
                summary.newItemsAdded++;
            } else if (result.action === 'skipped') {
                summary.itemsSkipped++;
                
                if (result.error) {
                    summary.errors.push({ 
                        itemTitle: scrapedArticle.title, 
                        itemLink: scrapedArticle.url, 
                        message: result.error 
                    });
                }
            }
        }
    }

    /**
     * Cleanup scraper resources
     */
    private static async cleanupScraper(scraper: HTMLScraper | EnhancedHTMLScraper): Promise<void> {
        try {
            await ScraperSelector.cleanupScraper(scraper);
        } catch (error) {
            console.error('HTML Processor: Error cleaning up scraper:', error);
            // Don't throw here - we don't want cleanup errors to affect the main processing
        }
    }
}
