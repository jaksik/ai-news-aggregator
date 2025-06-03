// Acts as a central hub that ensures all news sources are 
// properly configured before the fetcher processes them, 
// preventing runtime errors and providing consistent behavior 
// across different source types.

export class ConfigurationManager {
    /**
     * ==================================================
     * Maximum articles to fetch per source (configurable)
     */
    private static readonly DEFAULT_MAX_ARTICLES = 20;

    /**
     * ==================================================
     * Gets the maximum articles per source from environment variable or default
     */
    private static getMaxArticlesPerSource(): number {
        const envValue = process.env.MAX_ARTICLES_PER_SOURCE;
        
        if (!envValue || envValue.trim() === '') {
            console.log('MAX_ARTICLES_PER_SOURCE not set, using default limit of 20');
            return this.DEFAULT_MAX_ARTICLES;
        }
        
        const parsed = parseInt(envValue.trim(), 10);
        if (isNaN(parsed) || parsed <= 0) {
            console.warn(`Invalid MAX_ARTICLES_PER_SOURCE value: "${envValue}". Using default limit of 20.`);
            return this.DEFAULT_MAX_ARTICLES;
        }
        
        console.log(`Using article limit from environment: ${parsed}`);
        return parsed;
    }
    /**
     * Get article limit for RSS sources
     */
    static getArticleLimit(customLimit?: number): number {
        if (customLimit && customLimit > 0) {
            return customLimit;
        }
        return this.getMaxArticlesPerSource();
    }

    /**
     * Get processing configuration for RSS sources
     */
    static getRSSConfiguration(source: { id: string; name: string; url: string; type: string }): { 
        maxArticles: number; 
        source: { id: string; name: string; url: string } 
    } {
        if (source.type !== 'rss') {
            throw new Error('RSS configuration is only applicable to RSS sources');
        }

        return {
            maxArticles: this.getArticleLimit(),
            source: {
                id: source.id,
                name: source.name,
                url: source.url
            }
        };
    }

    /**
     * Validate basic source configuration
     */
    static validateSource(source: { id?: string; name?: string; url?: string; type?: string }): { 
        isValid: boolean; 
        errors: string[] 
    } {
        const errors: string[] = [];

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

        if (source.type !== 'rss') {
            errors.push('Only RSS sources are currently supported');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
