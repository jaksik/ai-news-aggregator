// Acts as a central hub that ensures all news sources are 
// properly configured before the fetcher processes them, 
// preventing runtime errors and providing consistent behavior 
// across different source types.

import { ScrapingConfig } from '../scrapers/htmlScraper';
import { getWebsiteConfig } from '../scrapers/websiteConfigs';
import { getMaxArticlesPerSource } from '../config/articleLimits';

export interface SourceConfiguration {
    id: string;
    name: string;
    url: string;
    type: 'rss' | 'html';
    websiteId?: string;
    customSelectors?: Partial<Pick<ScrapingConfig, 
        'articleSelector' | 'titleSelector' | 'urlSelector' | 'dateSelector' | 'descriptionSelector'>>;
}

export interface MergedScrapingConfig extends ScrapingConfig {
    source: {
        id: string;
        name: string;
        url: string;
    };
}

export interface ConfigurationContext {
    maxArticles: number;
    environment: string;
    debug: boolean;
}

export interface ConfigurationValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export class ConfigurationManager {
    private static instance: ConfigurationManager;
    private context: ConfigurationContext;

    private constructor() {
        this.context = this.initializeContext();
    }

    static getInstance(): ConfigurationManager {
        if (!ConfigurationManager.instance) {
            ConfigurationManager.instance = new ConfigurationManager();
        }
        return ConfigurationManager.instance;
    }

    /**
     * Initialize configuration context from environment
     */
    private initializeContext(): ConfigurationContext {
        return {
            maxArticles: getMaxArticlesPerSource(),
            environment: process.env.NODE_ENV || 'development',
            debug: process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development'
        };
    }

    /**
     * Get the current configuration context
     */
    getContext(): ConfigurationContext {
        return { ...this.context };
    }

    /**
     * Refresh context (useful for tests or dynamic config changes)
     */
    refreshContext(): void {
        this.context = this.initializeContext();
    }

    /**
     * Validate source configuration
     */
    validateSourceConfiguration(source: SourceConfiguration): ConfigurationValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Basic validation
        if (!source.id || source.id.trim() === '') {
            errors.push('Source ID is required');
        }

        if (!source.name || source.name.trim() === '') {
            errors.push('Source name is required');
        }

        if (!source.url || source.url.trim() === '') {
            errors.push('Source URL is required');
        } else {
            try {
                new URL(source.url);
            } catch {
                errors.push('Source URL is not valid');
            }
        }

        if (!['rss', 'html'].includes(source.type)) {
            errors.push('Source type must be either "rss" or "html"');
        }

        // HTML-specific validation
        if (source.type === 'html') {
            if (!source.websiteId) {
                errors.push('HTML sources require websiteId');
            } else {
                const websiteConfig = getWebsiteConfig(source.websiteId);
                if (!websiteConfig) {
                    errors.push(`No configuration found for websiteId: ${source.websiteId}`);
                }
            }

            // Check for custom selectors without base config
            if (source.customSelectors && !source.websiteId) {
                warnings.push('Custom selectors provided but no websiteId specified');
            }
        }

        // RSS-specific validation
        if (source.type === 'rss') {
            if (source.websiteId) {
                warnings.push('RSS sources do not need websiteId');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Create merged scraping configuration for HTML sources
     */
    createScrapingConfiguration(source: SourceConfiguration): MergedScrapingConfig {
        if (source.type !== 'html') {
            throw new Error('Scraping configuration is only applicable to HTML sources');
        }

        const validation = this.validateSourceConfiguration(source);
        if (!validation.isValid) {
            throw new Error(`Invalid source configuration: ${validation.errors.join(', ')}`);
        }

        const websiteConfig = getWebsiteConfig(source.websiteId!);
        if (!websiteConfig) {
            throw new Error(`No configuration found for websiteId: ${source.websiteId!}`);
        }

        // Merge configurations with proper precedence
        const mergedConfig: MergedScrapingConfig = {
            ...websiteConfig,
            maxArticles: this.context.maxArticles,
            source: {
                id: source.id,
                name: source.name,
                url: source.url
            }
        };

        // Apply custom selectors if provided
        if (source.customSelectors) {
            const custom = source.customSelectors;
            
            if (custom.articleSelector) {
                mergedConfig.articleSelector = custom.articleSelector;
            }
            if (custom.titleSelector) {
                mergedConfig.titleSelector = custom.titleSelector;
            }
            if (custom.urlSelector) {
                mergedConfig.urlSelector = custom.urlSelector;
            }
            if (custom.dateSelector) {
                mergedConfig.dateSelector = custom.dateSelector;
            }
            if (custom.descriptionSelector) {
                mergedConfig.descriptionSelector = custom.descriptionSelector;
            }

            if (this.context.debug) {
                console.log(`Applied custom selectors for ${source.name}:`, custom);
            }
        }

        return mergedConfig;
    }

    /**
     * Create configuration for RSS sources
     */
    createRSSConfiguration(source: SourceConfiguration): { maxArticles: number; source: { id: string; name: string; url: string } } {
        if (source.type !== 'rss') {
            throw new Error('RSS configuration is only applicable to RSS sources');
        }

        const validation = this.validateSourceConfiguration(source);
        if (!validation.isValid) {
            throw new Error(`Invalid source configuration: ${validation.errors.join(', ')}`);
        }

        return {
            maxArticles: this.context.maxArticles,
            source: {
                id: source.id,
                name: source.name,
                url: source.url
            }
        };
    }

    /**
     * Get configuration defaults
     */
    getDefaults(): {
        maxArticles: number;
        scrapingTimeout: number;
        retryAttempts: number;
        retryDelay: number;
    } {
        return {
            maxArticles: this.context.maxArticles,
            scrapingTimeout: 30000, // 30 seconds
            retryAttempts: 3,
            retryDelay: 1000 // 1 second
        };
    }

    /**
     * Log configuration info (for debugging)
     */
    logConfiguration(source: SourceConfiguration): void {
        if (!this.context.debug) return;

        console.log(`Configuration for ${source.name}:`, {
            type: source.type,
            url: source.url,
            websiteId: source.websiteId,
            hasCustomSelectors: !!source.customSelectors,
            maxArticles: this.context.maxArticles
        });
    }

    /**
     * Get all available website configurations
     */
    getAvailableWebsiteConfigs(): string[] {
        // This would typically call the websiteConfigs module
        // For now, we'll return the known ones
        return ['anthropic-news', 'elevenlabs-blog', 'scale-blog'];
    }

    /**
     * Check if a website configuration exists
     */
    hasWebsiteConfig(websiteId: string): boolean {
        return getWebsiteConfig(websiteId) !== null;
    }
}
