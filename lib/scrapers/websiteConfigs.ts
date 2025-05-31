import { ScrapingConfig } from './htmlScraper';

export const websiteConfigs: Record<string, ScrapingConfig> = {
  'anthropic-news': {
    websiteId: 'anthropic-news',
    name: 'Anthropic News',
    baseUrl: 'https://www.anthropic.com',
    articleSelector: 'a[href*="/news/"]',
    titleCleaning: {
      removePrefixes: ['Featured', 'Announcements', 'Product', 'Policy', 'Societal Impacts', 'Interpretability', 'Alignment', 'Education', 'Event'],
      removePatterns: ['(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+\\d{1,2},?\\s+\\d{4}$']
    },
    customExtraction: {
      dateFromText: true,
      dateRegex: '(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+\\d{1,2},?\\s+\\d{4}'
    }
  },

  'elevenlabs-blog': {
    websiteId: 'elevenlabs-blog',
    name: 'ElevenLabs Blog',
    baseUrl: 'https://elevenlabs.io',
    articleSelector: 'article, [data-post], .post, div:has(a[href*="/blog/"]:not([href="/blog"]))',
    titleSelector: 'h1, h2, h3, .title, .post-title',
    descriptionSelector: '.excerpt, .summary, p:first-of-type',
    dateSelector: 'time, .date, .published'
  }
};

export function getWebsiteConfig(websiteId: string): ScrapingConfig | null {
  return websiteConfigs[websiteId] || null;
}
