// Purpose: Acts as an intelligent router that automatically selects the most 
// appropriate scraping method for each website, balancing efficiency (standard scraper) 
// with capability (enhanced scraper) to handle various website protection mechanisms.

import { HTMLScraper, ScrapingConfig } from './cheerio';
import { EnhancedHTMLScraper } from './puppeteer';

export type ScrapeStrategy = 'standard' | 'enhanced' | 'auto';

export interface ScraperSelectionResult {
    scraper: typeof HTMLScraper | typeof EnhancedHTMLScraper;
    strategy: ScrapeStrategy;
    useEnhancedScraper: boolean;
}

export interface ScraperSelectionConfig {
    websiteId: string;
    sourceName: string;
    scrapingConfig: ScrapingConfig;
    forceStrategy?: ScrapeStrategy;
}

export class ScraperSelector {
    // Sites that typically require enhanced scraping due to anti-bot protection
    private static readonly ENHANCED_SCRAPER_SITES = new Set<string>([
        'scale-blog',
        // Add more sites here as needed
    ]);

    // Sites that should always use standard scraping (e.g., known to work well)
    private static readonly STANDARD_SCRAPER_SITES = new Set<string>([
        // Add sites here that should never use enhanced scraping
    ]);

    /**
     * Determines which scraper to use for a given website
     */
    static selectScraper(config: ScraperSelectionConfig): ScraperSelectionResult {
        const { websiteId, sourceName, forceStrategy } = config;
        
        let strategy: ScrapeStrategy;
        let useEnhancedScraper: boolean;

        // If a specific strategy is forced, use that
        if (forceStrategy) {
            strategy = forceStrategy;
            useEnhancedScraper = forceStrategy === 'enhanced';
        }
        // If site is known to require enhanced scraping
        else if (this.ENHANCED_SCRAPER_SITES.has(websiteId)) {
            strategy = 'enhanced';
            useEnhancedScraper = true;
        }
        // If site is known to work well with standard scraping
        else if (this.STANDARD_SCRAPER_SITES.has(websiteId)) {
            strategy = 'standard';
            useEnhancedScraper = false;
        }
        // Default to auto strategy (try standard first, fallback to enhanced)
        else {
            strategy = 'auto';
            useEnhancedScraper = false; // Start with standard scraper for auto strategy
        }

        const scraper = this.createScraper(useEnhancedScraper);

        if (useEnhancedScraper) {
            console.log(`Using enhanced scraper for ${sourceName} (${websiteId}) - strategy: ${strategy}`);
        } else {
            console.log(`Using standard scraper for ${sourceName} (${websiteId}) - strategy: ${strategy}`);
        }

        return {
            scraper,
            strategy,
            useEnhancedScraper
        };
    }

    /**
     * Creates the appropriate scraper instance
     */
    private static createScraper(useEnhancedScraper: boolean): typeof HTMLScraper | typeof EnhancedHTMLScraper {
        if (useEnhancedScraper) {
            return EnhancedHTMLScraper;
        } else {
            return HTMLScraper;
        }
    }

    /**
     * Checks if a website should use enhanced scraping
     */
    static shouldUseEnhancedScraper(websiteId: string): boolean {
        return this.ENHANCED_SCRAPER_SITES.has(websiteId);
    }

    /**
     * Adds a website to the enhanced scraper list
     */
    static addToEnhancedScraperList(websiteId: string): void {
        this.ENHANCED_SCRAPER_SITES.add(websiteId);
    }

    /**
     * Removes a website from the enhanced scraper list
     */
    static removeFromEnhancedScraperList(websiteId: string): void {
        this.ENHANCED_SCRAPER_SITES.delete(websiteId);
    }

    /**
     * Gets all websites that use enhanced scraping
     */
    static getEnhancedScraperSites(): string[] {
        return Array.from(this.ENHANCED_SCRAPER_SITES);
    }

    /**
     * Cleans up scraper resources if applicable (currently not needed for static scrapers)
     */
    static async cleanupScraper(): Promise<void> {
        // No cleanup needed for static scrapers
        // If we later need cleanup for Puppeteer browser instances, it will be handled internally
    }
}
