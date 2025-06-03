// Source-related types and interfaces
export interface ISource {
  _id?: string;
  name: string;
  url: string;
  type: 'rss' | 'html';
  isEnabled: boolean;
  websiteId?: string;
  lastFetchedAt?: Date;
  lastStatus?: string;
  lastFetchMessage?: string;
  lastError?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SourceToFetch {
  url: string;
  type: 'rss' | 'html';
  name: string;
  websiteId?: string;
  customSelectors?: {
    articleSelector?: string;
    titleSelector?: string;
    urlSelector?: string;
    dateSelector?: string;
    descriptionSelector?: string;
  };
}

export interface SourceConfiguration {
  id: string;
  name: string;
  url: string;
  type: 'rss' | 'html';
  websiteId?: string;
  customSelectors?: {
    articleSelector?: string;
    titleSelector?: string;
    urlSelector?: string;
    dateSelector?: string;
    descriptionSelector?: string;
  };
}

export interface SourcesListQuery {
  type?: string;
  isEnabled?: string;
  sortBy?: string;
  sortOrder?: string;
}
