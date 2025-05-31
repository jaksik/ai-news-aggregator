"use strict";
/**
 * Centralized Article Limit Configuration
 *
 * This module provides a single, robust source of truth for article limiting
 * across the entire application. It ensures consistent behavior regardless
 * of source configuration hierarchies.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMaxArticlesPerSource = getMaxArticlesPerSource;
exports.getEffectiveArticleLimit = getEffectiveArticleLimit;
exports.logArticleLimitConfig = logArticleLimitConfig;
/**
 * Gets the effective maximum articles per source from environment variable
 * @returns {number | null} The maximum number of articles, or null for no limit
 */
function getMaxArticlesPerSource() {
    const envValue = process.env.MAX_ARTICLES_PER_SOURCE;
    if (!envValue || envValue.trim() === '') {
        return null; // No limit if not set
    }
    const parsed = parseInt(envValue.trim(), 10);
    if (isNaN(parsed) || parsed <= 0) {
        console.warn(`Invalid MAX_ARTICLES_PER_SOURCE value: "${envValue}". Using no limit.`);
        return null;
    }
    return parsed;
}
/**
 * Applies the global article limit to any source-specific configuration
 * The environment variable takes absolute precedence over all other configurations
 *
 * @param sourceSpecificLimit - Limit from source configuration (may be undefined)
 * @param websiteConfigLimit - Limit from website configuration (may be undefined)
 * @param fallbackLimit - Default fallback limit
 * @returns {number} The effective limit to use
 */
function getEffectiveArticleLimit(sourceSpecificLimit, websiteConfigLimit, fallbackLimit = 20) {
    const globalLimit = getMaxArticlesPerSource();
    // Global environment variable takes absolute precedence
    if (globalLimit !== null) {
        console.log(`Using global article limit from environment: ${globalLimit}`);
        return globalLimit;
    }
    // Otherwise, use the hierarchy: source-specific > website config > fallback
    const effectiveLimit = sourceSpecificLimit || websiteConfigLimit || fallbackLimit;
    console.log(`Using configuration-based article limit: ${effectiveLimit}`);
    return effectiveLimit;
}
/**
 * Validates and logs the current article limit configuration
 * Useful for debugging and monitoring
 */
function logArticleLimitConfig() {
    const globalLimit = getMaxArticlesPerSource();
    if (globalLimit !== null) {
        console.log(`Article Limit Config: Global limit active (MAX_ARTICLES_PER_SOURCE=${globalLimit})`);
    }
    else {
        console.log(`Article Limit Config: No global limit set, using source-specific configurations`);
    }
}
