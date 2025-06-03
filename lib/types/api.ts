// API-related types and interfaces
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  message: string;
  details?: unknown;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ItemError {
  itemTitle?: string;
  itemLink?: string;
  message: string;
}

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
  errors: ItemError[];
  fetchError?: string;
  logId?: string;
}

export interface OverallFetchRunResult {
  startTime: Date;
  endTime: Date;
  status: 'completed' | 'completed_with_errors' | 'failed' | 'in-progress';
  totalSourcesAttempted: number;
  totalSourcesSuccessfullyProcessed: number;
  totalSourcesFailedWithError: number;
  totalNewArticlesAddedAcrossAllSources: number;
  detailedSummaries: ProcessingSummary[];
  orchestrationErrors: string[];
  logId?: string;
}

export interface ScrapeSourceResult extends ProcessingSummary {
  sourceId: string;
  sourceName: string;
  success: boolean;
  duration: number;
  logId?: string;
}
