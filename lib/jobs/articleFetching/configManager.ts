// Acts as a central hub that ensures all news sources are 
// properly configured before the fetcher processes them, 
// preventing runtime errors and providing consistent behavior 
// across different source types.

import { getMaxArticlesPerSource } from '../../config/articleLimits';

export class ConfigurationManager {
    /**
     * Get article limit for RSS sources
     */
    static getArticleLimit(customLimit?: number): number {
        if (customLimit && customLimit > 0) {
            return customLimit;
        }
        return getMaxArticlesPerSource();
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
