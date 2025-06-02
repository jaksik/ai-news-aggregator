/**
 * Centralized application configuration management
 * Consolidates all configuration scattered across multiple files
 */

export interface DatabaseConfig {
  connectionString: string;
  retryAttempts: number;
  retryDelay: number;
}

export interface ScrapingConfig {
  defaultTimeout: number;
  defaultUserAgent: string;
  maxRetries: number;
  retryDelay: number;
  puppeteerConfig: {
    headless: boolean;
    args: string[];
    timeout: number;
  };
}

export interface APIConfig {
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    origin: string[];
    credentials: boolean;
  };
  pagination: {
    defaultLimit: number;
    maxLimit: number;
  };
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  enableConsole: boolean;
  enableFile: boolean;
  maxFileSize: string;
  maxFiles: number;
}

export interface AppConfiguration {
  env: 'development' | 'production' | 'test';
  port: number;
  database: DatabaseConfig;
  scraping: ScrapingConfig;
  api: APIConfig;
  logging: LoggingConfig;
  features: {
    enableCaching: boolean;
    enableAnalytics: boolean;
    enableNewsletter: boolean;
  };
}

class AppConfig {
  private static instance: AppConfig;
  private config: AppConfiguration;

  private constructor() {
    this.config = this.loadConfiguration();
  }

  public static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig();
    }
    return AppConfig.instance;
  }

  private loadConfiguration(): AppConfiguration {
    const env = (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development';
    
    return {
      env,
      port: parseInt(process.env.PORT || '3000'),
      
      database: {
        connectionString: process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-news-aggregator',
        retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3'),
        retryDelay: parseInt(process.env.DB_RETRY_DELAY || '1000'),
      },

      scraping: {
        defaultTimeout: parseInt(process.env.SCRAPING_TIMEOUT || '30000'),
        defaultUserAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        maxRetries: parseInt(process.env.SCRAPING_MAX_RETRIES || '3'),
        retryDelay: parseInt(process.env.SCRAPING_RETRY_DELAY || '2000'),
        puppeteerConfig: {
          headless: process.env.PUPPETEER_HEADLESS !== 'false',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--window-size=1920,1080'
          ],
          timeout: parseInt(process.env.PUPPETEER_TIMEOUT || '60000'),
        },
      },

      api: {
        rateLimit: {
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
          maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
        },
        cors: {
          origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
          credentials: process.env.CORS_CREDENTIALS === 'true',
        },
        pagination: {
          defaultLimit: parseInt(process.env.API_DEFAULT_LIMIT || '10'),
          maxLimit: parseInt(process.env.API_MAX_LIMIT || '100'),
        },
      },

      logging: {
        level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
        enableConsole: process.env.LOG_CONSOLE !== 'false',
        enableFile: process.env.LOG_FILE === 'true',
        maxFileSize: process.env.LOG_MAX_SIZE || '10m',
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
      },

      features: {
        enableCaching: process.env.ENABLE_CACHING === 'true',
        enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
        enableNewsletter: process.env.ENABLE_NEWSLETTER !== 'false',
      },
    };
  }

  // Getter methods for accessing configuration
  public get(): AppConfiguration {
    return this.config;
  }

  public getDatabase(): DatabaseConfig {
    return this.config.database;
  }

  public getScraping(): ScrapingConfig {
    return this.config.scraping;
  }

  public getAPI(): APIConfig {
    return this.config.api;
  }

  public getLogging(): LoggingConfig {
    return this.config.logging;
  }

  public isProduction(): boolean {
    return this.config.env === 'production';
  }

  public isDevelopment(): boolean {
    return this.config.env === 'development';
  }

  public isTest(): boolean {
    return this.config.env === 'test';
  }

  // Feature flag methods
  public isCachingEnabled(): boolean {
    return this.config.features.enableCaching;
  }

  public isAnalyticsEnabled(): boolean {
    return this.config.features.enableAnalytics;
  }

  public isNewsletterEnabled(): boolean {
    return this.config.features.enableNewsletter;
  }

  // Environment-specific configurations
  public getCronSecret(): string | undefined {
    return process.env.CRON_SECRET;
  }

  public getOpenAIKey(): string | undefined {
    return process.env.OPENAI_API_KEY;
  }

  public getNextAuthSecret(): string | undefined {
    return process.env.NEXTAUTH_SECRET;
  }

  // Validation method
  public validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.database.connectionString) {
      errors.push('Database connection string is required');
    }

    if (this.isProduction()) {
      if (!this.getCronSecret()) {
        errors.push('CRON_SECRET is required in production');
      }
      if (!this.getNextAuthSecret()) {
        errors.push('NEXTAUTH_SECRET is required in production');
      }
    }

    if (this.config.scraping.defaultTimeout < 5000) {
      errors.push('Scraping timeout should be at least 5 seconds');
    }

    if (this.config.api.pagination.defaultLimit > this.config.api.pagination.maxLimit) {
      errors.push('Default pagination limit cannot exceed maximum limit');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Refresh configuration (useful for testing)
  public refresh(): void {
    this.config = this.loadConfiguration();
  }
}

// Export singleton instance
export default AppConfig.getInstance();
