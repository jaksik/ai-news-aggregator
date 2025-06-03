// Centralized configuration management
// Consolidates all environment variables and configuration into one place

export interface DatabaseConfig {
  uri: string;
  options?: {
    maxPoolSize?: number;
    serverSelectionTimeoutMS?: number;
  };
}

export interface ScrapingConfig {
  defaultTimeout: number;
  maxRetries: number;
  userAgent: string;
  requestDelay: number;
  maxConcurrentRequests: number;
}

export interface AuthConfig {
  cronSecret: string;
  nextAuthSecret: string;
  nextAuthUrl: string;
  googleClientId: string;
  googleClientSecret: string;
  authorizedEmail: string;
}

export interface AppConfig {
  nodeEnv: string;
  isDevelopment: boolean;
  isProduction: boolean;
  port: number;
  database: DatabaseConfig;
  scraping: ScrapingConfig;
  auth: AuthConfig;
}

// Helper function to safely get environment variables
function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number for environment variable ${key}: ${value}`);
  }
  return parsed;
}

// Create the centralized configuration
export const config: AppConfig = {
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  isDevelopment: getEnvVar('NODE_ENV', 'development') === 'development',
  isProduction: getEnvVar('NODE_ENV', 'development') === 'production',
  port: getEnvNumber('PORT', 3000),

  database: {
    uri: getEnvVar('MONGODB_URI'),
    options: {
      maxPoolSize: getEnvNumber('DB_MAX_POOL_SIZE', 10),
      serverSelectionTimeoutMS: getEnvNumber('DB_TIMEOUT_MS', 5000),
    },
  },

  scraping: {
    defaultTimeout: getEnvNumber('SCRAPING_TIMEOUT', 30000),
    maxRetries: getEnvNumber('MAX_RETRIES', 3),
    userAgent: getEnvVar(
      'USER_AGENT',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ),
    requestDelay: getEnvNumber('REQUEST_DELAY_MS', 1000),
    maxConcurrentRequests: getEnvNumber('MAX_CONCURRENT_REQUESTS', 5),
  },

  auth: {
    cronSecret: getEnvVar('CRON_SECRET'),
    nextAuthSecret: getEnvVar('NEXTAUTH_SECRET'),
    nextAuthUrl: getEnvVar('NEXTAUTH_URL', 'http://localhost:3000'),
    googleClientId: getEnvVar('GOOGLE_CLIENT_ID'),
    googleClientSecret: getEnvVar('GOOGLE_CLIENT_SECRET'),
    authorizedEmail: getEnvVar('AUTHORIZED_EMAIL'),
  },
};

// Export individual config sections for convenience
export const { database, scraping, auth } = config;

// Validation function to ensure all required config is present
export function validateConfig(): void {
  const requiredFields = [
    'database.uri',
    'ai.openaiApiKey',
    'auth.cronSecret',
    'auth.nextAuthSecret',
  ];

  for (const field of requiredFields) {
    const keys = field.split('.');
    let value: unknown = config;
    for (const key of keys) {
      value = (value as Record<string, unknown>)[key];
    }
    if (!value) {
      throw new Error(`Missing required configuration: ${field}`);
    }
  }
}

// Helper to get configuration with environment-specific overrides
export function getConfig(): AppConfig {
  if (config.isDevelopment) {
    // Development-specific overrides
    return {
      ...config,
      scraping: {
        ...config.scraping,
        defaultTimeout: 10000, // Shorter timeout in dev
        maxRetries: 2,
      },
    };
  }
  return config;
}
