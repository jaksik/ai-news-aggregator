/**
 * Simplified Article Limit Configuration
 * 
 * This module provides a single source of truth for article limiting
 * using only the MAX_ARTICLES_PER_SOURCE environment variable.
 */

/**
 * Gets the maximum articles per source from environment variable
 * @returns {number} The maximum number of articles (defaults to 20 if not set or invalid)
 */
export function getMaxArticlesPerSource(): number {
  const envValue = process.env.MAX_ARTICLES_PER_SOURCE;
  
  if (!envValue || envValue.trim() === '') {
    console.log('MAX_ARTICLES_PER_SOURCE not set, using default limit of 20');
    return 20; // Default limit
  }
  
  const parsed = parseInt(envValue.trim(), 10);
  
  if (isNaN(parsed) || parsed <= 0) {
    console.warn(`Invalid MAX_ARTICLES_PER_SOURCE value: "${envValue}". Using default limit of 20.`);
    return 20; // Default limit
  }
  
  console.log(`Using article limit from environment: ${parsed}`);
  return parsed;
}
