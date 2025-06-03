// All shared types for article fetching
export interface ProcessingSummary {
    sourceUrl: string;
    sourceName: string;
    type: 'rss' | 'html';
    status: 'success' | 'partial_success' | 'failed';
    message: string;
    itemsFound: number;
    itemsConsidered: number;
    itemsProcessed: number;
    newItemsAdded: number;
    itemsSkipped: number;
    errors: Array<{ message: string }>;
    fetchError?: string;
}

export interface SourceToFetch {
    name: string;
    url: string;
    type: 'rss' | 'html';
    websiteId?: string;
}

export interface OverallFetchRunResult {
    startTime: Date;
    endTime: Date;
    status: 'completed' | 'completed_with_errors' | 'failed';
    totalSourcesAttempted: number;
    totalSourcesSuccessfullyProcessed: number;
    totalSourcesFailedWithError: number;
    totalNewArticlesAddedAcrossAllSources: number;
    detailedSummaries: ProcessingSummary[];
    orchestrationErrors: string[];
    logId?: string;
}

// Single source API response
export interface SingleSourceResult extends ProcessingSummary {
    sourceId: string;
    sourceName: string;
    success: boolean;
    duration: number;
    logId?: string;
}

// RSS-specific types (when you add HTML back)
export interface RSSArticleData {
    title?: string;
    link?: string;
    guid?: string;
    isoDate?: string;
    pubDate?: string;
    contentSnippet?: string;
    content?: string;
    categories?: string[];
}

// HTML-specific types (for future)
export interface ScrapingConfig {
    name: string;
    articleSelector: string;
    titleSelector: string;
    urlSelector: string;
    descriptionSelector?: string;
    dateSelector?: string;
    maxArticles?: number;
}