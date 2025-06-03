/**
 * Processing Status Manager
 * 
 * Centralizes the logic for determining processing status and generating status messages
 * for both RSS and HTML processing operations. This eliminates duplication across
 * RSSProcessor and HTMLProcessor services.
 */

import { ProcessingSummary } from './types';

export interface StatusOptions {
  maxArticles?: number;
  sourceType: 'rss' | 'html';
}

export class ProcessingStatusManager {
  
  /**
   * Set final processing status and message for a processing summary
   */
  static setProcessingStatus(
    summary: ProcessingSummary, 
    options: StatusOptions
  ): void {
    const { maxArticles, sourceType } = options;
    
    // Generate appropriate message components
    const limitMessagePart = this.getLimitMessage(summary, maxArticles);
    const processedStatsMessage = this.getProcessedStatsMessage(summary, limitMessagePart);
    
    // Determine status and set message
    if (summary.errors.length > 0) {
      summary.status = 'partial_success';
      summary.message = `Completed with ${summary.errors.length} errors. ${processedStatsMessage}`;
    } else if (this.isNoItemsScenario(summary)) {
      summary.status = 'success';
      summary.message = this.getNoItemsMessage(summary, sourceType);
    } else if (this.isLimitedButZeroConsideredScenario(summary)) {
      summary.status = 'success';
      summary.message = `Found ${summary.itemsFound} items, but 0 considered after limit (or limit was 0). No items processed.`;
    } else {
      summary.status = 'success';
      summary.message = `Successfully ${processedStatsMessage}`;
    }
  }

  /**
   * Handle processing errors with consistent error messages
   */
  static handleProcessingError(
    error: unknown, 
    summary: ProcessingSummary,
    sourceType: 'rss' | 'html'
  ): void {
    const typeLabel = sourceType.toUpperCase();
    let message = `Failed to process ${typeLabel} source.`;
    
    if (error instanceof Error) {
      message = `Failed to process ${typeLabel} source: ${error.message}`;
    }
    
    summary.fetchError = (error instanceof Error) ? error.message : String(error);
    summary.message = message;
    summary.status = 'failed';
  }

  /**
   * Generate limit message part for RSS sources
   */
  private static getLimitMessage(
    summary: ProcessingSummary, 
    maxArticles?: number
  ): string {
    return maxArticles && summary.itemsFound > maxArticles 
      ? ` (limited to first ${summary.itemsConsidered} of ${summary.itemsFound} found).`
      : '';
  }

  /**
   * Generate processed statistics message
   */
  private static getProcessedStatsMessage(
    summary: ProcessingSummary, 
    limitMessagePart: string
  ): string {
    const itemLabel = summary.type === 'rss' ? 'items' : 'articles';
    return `Processed ${summary.itemsProcessed} ${itemLabel}${limitMessagePart}. Added: ${summary.newItemsAdded}, Skipped: ${summary.itemsSkipped}.`;
  }

  /**
   * Check if this is a "no items found" scenario
   */
  private static isNoItemsScenario(summary: ProcessingSummary): boolean {
    return summary.itemsConsidered === 0 && summary.itemsFound === 0;
  }

  /**
   * Check if this is a "limited but zero considered" scenario (RSS only)
   */
  private static isLimitedButZeroConsideredScenario(summary: ProcessingSummary): boolean {
    return summary.type === 'rss' && 
           summary.itemsConsidered === 0 && 
           summary.itemsFound > 0;
  }

  /**
   * Get appropriate "no items" message based on source type
   */
  private static getNoItemsMessage(
    summary: ProcessingSummary, 
    sourceType: 'rss' | 'html'
  ): string {
    if (sourceType === 'rss') {
      return "No items found in RSS feed.";
    } else {
      return "No articles found on website.";
    }
  }
}
