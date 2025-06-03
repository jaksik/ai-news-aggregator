/**
 * Legacy configuration file - DEPRECATED
 * Use lib/config/index.ts instead for centralized configuration
 * This file is kept for backward compatibility during migration
 */

// Re-export from the new centralized config
export * from './index';

// Legacy exports for backward compatibility
import { config } from './index';

export const appConfig = config;
export const databaseConfig = config.database;
export const scrapingConfig = config.scraping;

// Export singleton instance for backward compatibility
export default config;
