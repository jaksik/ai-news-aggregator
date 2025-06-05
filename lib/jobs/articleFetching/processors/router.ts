/**
 * Processor Router - Unified entry point for source processing
 * 
 * Currently supports RSS processing only. HTML processing will be added later.
 */

import { RSSProcessor } from './rss';
import { HTMLProcessor } from './html';

import { ProcessingSummary, SourceToFetch } from '../../../types';

export class ProcessorRouter {
    /**
     * Process a source using the appropriate processor
     * @param source - The source to process
     * @param rawContent - Raw content fetched from the source URL
     * @returns ProcessingSummary with detailed results
     */
    static async processSource(
        source: SourceToFetch, 
        rawContent: string
    ): Promise<ProcessingSummary> {
        try {
            switch (source.type) {
                case 'rss':
                    return await RSSProcessor.processRSSSource(source, rawContent);
                    
                                case 'html':
                    // HTML processor fetches its own content
                    return await HTMLProcessor.processSource(source);
                    
                default:
                    throw new Error(`Unknown source type: ${source.type}. Only 'rss' is currently supported.`);
            }
        } catch (error) {
            // Return a failed summary for any routing errors
            const errorMessage = error instanceof Error ? error.message : 'Unknown routing error';
            return {
                sourceUrl: source.url,
                sourceName: source.name,
                type: source.type,
                status: 'failed',
                message: `Routing error: ${errorMessage}`,
                itemsFound: 0,
                itemsConsidered: 0,
                itemsProcessed: 0,
                newItemsAdded: 0,
                itemsSkipped: 0,
                errors: [{ message: errorMessage }],
                fetchError: errorMessage
            };
        }
    }
}