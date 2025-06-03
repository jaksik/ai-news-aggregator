// Article-related types and interfaces
export interface IArticle {
  _id?: string;
  title: string;
  url: string;
  description?: string;
  publishedDate?: Date;
  source: string;
  sourceUrl: string;
  category?: string;
  summary?: string;
  isRead?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ArticleFilters {
  source?: string;
  category?: string;
  isRead?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface ArticleListQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: ArticleFilters;
}
