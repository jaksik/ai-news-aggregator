// Shared utilities for article fetching
// Contains core fetch and process logic used by both single and bulk processors

import dbConnect from '../../db';
import { ProcessorRouter } from './processors/router';
import { scraping } from '../../config';
import { SourceToFetch, ProcessingSummary } from './types';

/**
 * Enhanced fetch function with proper headers and timeout
 */
export const fetchWithUserAgent = async (url: string): Promise<Response> => {
  return fetch(url, {
    headers: {
      'User-Agent': scraping.userAgent,
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    },
    signal: AbortSignal.timeout(scraping.defaultTimeout),
  });
};

/**
 * Core function for processing a single source
 * Used by both single source processor and bulk processor
 */
export async function fetchParseAndStoreSource(
    source: SourceToFetch
): Promise<ProcessingSummary> {
    const summary: ProcessingSummary = {
        sourceUrl: source.url,
        sourceName: source.name,
        type: source.type,
        status: 'failed',
        message: '',
        itemsFound: 0,
        itemsConsidered: 0,
        itemsProcessed: 0,
        newItemsAdded: 0,
        itemsSkipped: 0,
        errors: [],
    };

    try {
        await dbConnect();
        const response = await fetchWithUserAgent(source.url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const rawContent = await response.text();

        // Use unified processor router for all source types
        const processingResult = await ProcessorRouter.processSource(source, rawContent);
        
        // Copy results from processor to main summary
        Object.assign(summary, processingResult);
    } catch (error: unknown) {
        let message = 'Failed to fetch or process source.';
        if (error instanceof Error) {
            message = `Failed to fetch or process source: ${error.message}`;
        }
        summary.fetchError = (error instanceof Error) ? error.message : String(error);
        summary.message = message;
        summary.status = 'failed';
    }
    return summary;
}