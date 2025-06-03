// Configuration-related types and interfaces
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

export interface ScrapingConfig {
  websiteId: string;
  name: string;
  baseUrl: string;
  articleSelector: string;
  titleSelector?: string;
  urlSelector?: string;
  dateSelector?: string;
  descriptionSelector?: string;
  skipArticlesWithoutDates?: boolean;
  titleCleaning?: {
    removePrefixes?: string[];
    removePatterns?: string[];
  };
  maxArticles?: number;
}

export interface MergedScrapingConfig extends ScrapingConfig {
  source: {
    id: string;
    name: string;
    url: string;
  };
}
