// File: /lib/services/fetcher.ts
import axios from 'axios';
import Parser from 'rss-parser'; // For RSS feeds
import * as cheerio from 'cheerio'; // For HTML scraping

// Define a type for the source for clarity
export interface SourceToFetch {
  url: string;
  type: 'rss' | 'html'; // To distinguish how to process
}

export interface FetchResult {
  sourceUrl: string;
  type: 'rss' | 'html';
  success: boolean;
  data?: any; // Will hold parsed RSS object or basic HTML extract
  error?: string;
  rawContentLength?: number; // Optional: just to see if we got something
}

// Initialize rss-parser
const rssParser = new Parser();

export async function fetchAndInitiallyProcessSource(
  source: SourceToFetch
): Promise<FetchResult> {
  try {
    console.log(`Fetching ${source.type} from: ${source.url}`);
    const response = await axios.get(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': source.type === 'rss' ? 'application/rss+xml, application/xml, text/xml' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      timeout: 10000, // 10 seconds
    });

    const rawContent = response.data;
    const rawContentLength = typeof rawContent === 'string' ? rawContent.length : 0;

    if (source.type === 'rss') {
      const parsedFeed = await rssParser.parseString(rawContent);
      return {
        sourceUrl: source.url,
        type: source.type,
        success: true,
        data: parsedFeed,
        rawContentLength,
      };
    } else if (source.type === 'html') {
      const $ = cheerio.load(rawContent);
      const pageTitle = $('title').text();
      const bodyTextSnippet = $('body').text().trim().substring(0, 200) + '...';

      return {
        sourceUrl: source.url,
        type: source.type,
        success: true,
        data: {
          title: pageTitle,
          bodySnippet: bodyTextSnippet,
        },
        rawContentLength,
      };
    } else {
      // This case should ideally not be hit if type is validated before calling
      return {
        sourceUrl: source.url,
        type: source.type,
        success: false,
        error: 'Unknown source type provided to fetcher function.',
        rawContentLength,
      };
    }
  } catch (error: any) {
    console.error(`Error fetching ${source.url}:`, error.message);
    let errorMessage = `Failed to fetch or process ${source.url}.`;
    if (axios.isAxiosError(error)) {
        errorMessage += ` Axios error: ${error.message}.`;
        if (error.response) {
            errorMessage += ` Status: ${error.response.status}.`;
        }
    } else {
        errorMessage += ` Non-Axios error: ${error.message}.`;
    }
    return {
      sourceUrl: source.url,
      type: source.type,
      success: false,
      error: errorMessage,
    };
  }
}